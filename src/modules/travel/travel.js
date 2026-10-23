/*
 * travel — moving between locations, with travel time. See README.md.
 *
 * Routes are data: { from, to, mins } (usable both ways). A travel mode's
 * time and cost come from named hooks, so the formulas stay a design choice.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "travel",
		version: 1,
		deps: ["world"],

		install({ registry, cond, effects, time, bus, ui, flow, fmt }) {
			registry.defineType("travelMode", {
				required: ["label"],
				defaults: { conditions: null, time: "route", cost: "none", order: 0 },
				conditions: ["conditions"],
			});
			registry.defineType("route", {
				required: ["from", "to", "mins"],
				defaults: { modes: null },
				refs: { from: "location", to: "location", modes: "travelMode" },
				check(def) {
					const errs = [];
					if (!Number.isInteger(def.mins) || def.mins <= 0) errs.push("mins must be a whole number > 0");
					if (def.from === def.to) errs.push("from and to must differ");
					return errs;
				},
			});

			const timeHooks = new Map();
			const costHooks = new Map();

			const travel = {
				/**
				 * Register a travel-time formula: (route, mode, ctx) => minutes.
				 * @param {string} name @param {Function} fn
				 */
				registerTimeHook: (name, fn) => timeHooks.set(name, fn),

				/**
				 * Register a travel-cost formula: (route, mode, ctx) => minor units.
				 * @param {string} name @param {Function} fn
				 */
				registerCostHook: (name, fn) => costHooks.set(name, fn),

				/** @returns {boolean} */
				hasTimeHook: (name) => timeHooks.has(name),

				/** @returns {boolean} */
				hasCostHook: (name) => costHooks.has(name),

				/** @returns {object[]} Routes touching a location (either direction). */
				routesFrom: (loc) => registry.query("route", (r) => r.from === loc || r.to === loc),

				/**
				 * Where the PC can go from here, and how.
				 * @returns {{to: string, route: object, options: {mode: object, mins: number, cost: number, ok: boolean, reasons: string[]}[]}[]}
				 */
				destinations() {
					const here = setup.world.loc();
					const modes = registry.all("travelMode").sort((a, b) => a.order - b.order);
					return travel.routesFrom(here).map((route) => {
						const to = route.from === here ? route.to : route.from;
						const ctx = { from: here, to, t: time.now() };
						const options = modes
							.filter((m) => !route.modes || route.modes.includes(m.id))
							.map((mode) => {
								const ok = cond.test(mode.conditions, ctx);
								return {
									mode,
									mins: timeHooks.get(mode.time)(route, mode, ctx),
									cost: costHooks.get(mode.cost)(route, mode, ctx),
									ok,
									reasons: ok ? [] : cond.explain(mode.conditions, ctx).filter((e) => !e.ok).map((e) => e.text),
								};
							});
						return { to, route, options };
					});
				},

				/**
				 * Travel to a destination by a mode: advance the clock by the
				 * travel time, then arrive.
				 * @param {string} to @param {string} modeId
				 * @returns {object} Result plus { ok, mins }.
				 */
				go(to, modeId) {
					const dest = travel.destinations().find((d) => d.to === to);
					const opt = dest?.options.find((o) => o.mode.id === modeId);
					const result = Object.assign(effects.newResult(), { ok: false, mins: 0 });
					if (!opt) throw new setup.GameError(`No ${modeId} route from ${setup.world.loc()} to ${to}`);
					if (!opt.ok) {
						result.changes.push({ kind: "blocked", text: `Can't go by ${opt.mode.label}: ${opt.reasons.join("; ")}` });
						return result;
					}
					// DESIGN: user to decide — paying travel costs (needs the money module).
					const from = setup.world.loc();
					bus.emit("travel:depart", { from, to, mode: modeId, mins: opt.mins });
					const adv = time.advance(opt.mins, { reason: "travel" });
					// DESIGN: user to decide — what an interruption mid-journey means. For now you still arrive.
					setup.world.moveTo(to);
					result.ok = true;
					result.mins = adv.elapsed;
					result.changes.push({ kind: "travel", text: `${opt.mode.label} to ${registry.get("location", to).name}: ${fmt.duration(adv.elapsed)}.` });
					bus.emit("travel:arrived", { from, to, mode: modeId, mins: adv.elapsed });
					return result;
				},
			};
			setup.travel = travel;

			// Default formulas: the route's own minutes, and free.
			travel.registerTimeHook("route", (route) => route.mins);
			travel.registerCostHook("none", () => 0);

			/* ---- UI --------------------------------------------------------- */

			setup.world.addHereSection("travel", 40, (box) => {
				if (!travel.routesFrom(setup.world.loc()).length) return;
				box.append(ui.button("Go somewhere else", () => flow.go("Travel_Pick")));
			});

			ui.view("travel", (box) => {
				box.classList.add("m-travel");
				const here = setup.world.here();
				box.append(ui.el("h1", { text: "Where to?" }));
				if (here) box.append(ui.el("p", { class: "status-line", text: `${fmt.date(time.now())} · ${fmt.time(time.now())} · leaving ${here.name}` }));
				const ul = ui.el("ul");
				for (const d of travel.destinations()) {
					const name = registry.get("location", d.to).name;
					for (const o of d.options) {
						const li = ui.el("li", {}, ui.action(`${o.mode.label} to ${name} (${fmt.duration(o.mins)})`, () => travel.go(d.to, o.mode.id), { disabled: !o.ok }));
						if (!o.ok) li.append(ui.el("p", { class: "locked", text: o.reasons.join("; ") }));
						ul.append(li);
					}
				}
				box.append(ul, ui.button("Stay here", () => flow.go(flow.home)));
			});
		},

		validate() {
			const errs = [];
			for (const m of setup.registry.all("travelMode")) {
				if (!setup.travel.hasTimeHook(m.time)) errs.push(`travelMode "${m.id}": unknown time hook "${m.time}"`);
				if (!setup.travel.hasCostHook(m.cost)) errs.push(`travelMode "${m.id}": unknown cost hook "${m.cost}"`);
			}
			return errs;
		},
	});
})();
