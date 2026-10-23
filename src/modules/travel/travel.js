/*
 * travel — moving between locations. Travel always takes time, and may cost
 * money. See README.md.
 *
 * Routes are links between two places on a named network ("walk" by
 * default; e.g. a bus line uses its own network). Routes work both ways.
 *
 * A travel mode says how it uses a network:
 *   - walking: one step to a neighbouring place at a time (multiHop: false)
 *   - bus:     ride along its own network to any stop (multiHop: true),
 *              passing each stop on the way
 *   - taxi:    board anywhere, go straight to a hub (destTag: "hub",
 *              stopsOnWay: false), time scaled from the walking distance
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
				defaults: {
					conditions: null,
					order: 0,
					network: "walk",
					multiHop: false,
					boardTag: null,
					destTag: null,
					stopsOnWay: true,
					timeFactor: 1,
					time: "path",
					cost: "none",
					fare: {},
					payWith: null,
				},
				refs: { payWith: "account" },
				conditions: ["conditions"],
				check(def) {
					const errs = [];
					if (!(def.timeFactor > 0)) errs.push("timeFactor must be > 0");
					return errs;
				},
			});
			registry.defineType("route", {
				required: ["from", "to", "mins"],
				defaults: { network: "walk" },
				refs: { from: "location", to: "location" },
				check(def) {
					const errs = [];
					if (!Number.isInteger(def.mins) || def.mins <= 0) errs.push("mins must be a whole number > 0");
					if (def.from === def.to) errs.push("from and to must differ");
					return errs;
				},
			});

			const timeHooks = new Map();
			const costHooks = new Map();
			let running = null;

			/** Neighbours of a place on a network: [{ to, mins }]. */
			const neighbours = (loc, network) => registry
				.query("route", (r) => r.network === network && (r.from === loc || r.to === loc))
				.map((r) => ({ to: r.from === loc ? r.to : r.from, mins: r.mins }));

			/**
			 * Shortest paths from `start` on a network (Dijkstra). Returns a map
			 * of place → legs [{from, to, mins}] to get there.
			 */
			function shortestPaths(start, network) {
				const best = new Map([[start, { mins: 0, legs: [] }]]);
				const done = new Set();
				for (;;) {
					let cur = null;
					for (const [loc, v] of best) if (!done.has(loc) && (!cur || v.mins < best.get(cur).mins)) cur = loc;
					if (cur === null) break;
					done.add(cur);
					const base = best.get(cur);
					for (const n of neighbours(cur, network)) {
						const mins = base.mins + n.mins;
						if (!best.has(n.to) || mins < best.get(n.to).mins) best.set(n.to, { mins, legs: [...base.legs, { from: cur, to: n.to, mins: n.mins }] });
					}
				}
				best.delete(start);
				return best;
			}

			const hasTag = (loc, tag) => registry.get("location", loc).tags.includes(tag);
			const moneyOn = () => setup.modules.has("money") && setup.money.enabled();

			const travel = {
				/**
				 * Register a travel-time formula: (legs, mode, ctx) => minutes per leg.
				 * @param {string} name @param {Function} fn
				 */
				registerTimeHook: (name, fn) => timeHooks.set(name, fn),

				/**
				 * Register a fare formula: (mins, legs, mode, ctx) => pence.
				 * @param {string} name @param {Function} fn
				 */
				registerCostHook: (name, fn) => costHooks.set(name, fn),

				/** @returns {boolean} */
				hasTimeHook: (name) => timeHooks.has(name),

				/** @returns {boolean} */
				hasCostHook: (name) => costHooks.has(name),

				/** @returns {boolean} Whether a journey is in progress. */
				isTravelling: () => running !== null,

				/**
				 * Every journey possible from here, by mode.
				 * @returns {{mode: object, to: string, legs: object[], legMins: number[], mins: number, cost: number, ok: boolean, reasons: string[]}[]}
				 */
				options() {
					const here = setup.world.loc();
					if (!here) return [];
					const out = [];
					const modes = registry.all("travelMode").sort((a, b) => a.order - b.order);
					for (const mode of modes) {
						if (mode.boardTag && !hasTag(here, mode.boardTag)) continue;
						const paths = mode.multiHop
							? shortestPaths(here, mode.network)
							: new Map(neighbours(here, mode.network).map((n) => [n.to, { mins: n.mins, legs: [{ from: here, to: n.to, mins: n.mins }] }]));
						for (const [to, path] of paths) {
							if (mode.destTag && !hasTag(to, mode.destTag)) continue;
							const legs = mode.stopsOnWay ? path.legs : [{ from: here, to, mins: path.mins }];
							const ctx = { mode: mode.id, from: here, to, t: time.now() };
							const legMins = timeHooks.get(mode.time)(legs, mode, ctx);
							const mins = legMins.reduce((a, b) => a + b, 0);
							const cost = costHooks.get(mode.cost)(mins, legs, mode, ctx);
							const reasons = cond.test(mode.conditions, ctx) ? [] : cond.explain(mode.conditions, ctx).filter((e) => !e.ok).map((e) => e.text);
							if (cost > 0 && moneyOn() && !reasons.length) {
								const from = mode.payWith ?? undefined;
								const can = (from ?? registry.all("account").map((a) => a.id)).some((id) => setup.money.balance(id) >= cost);
								if (!can) reasons.push(`Not enough money (${fmt.money(cost)} needed)`);
							}
							out.push({ mode, to, legs, legMins, mins, cost, ok: !reasons.length, reasons });
						}
					}
					return out;
				},

				/**
				 * Travel somewhere by a mode. Pays the fare, then advances the
				 * clock leg by leg. After each intermediate stop it emits
				 * `travel:checkpoint`, where an event may interrupt the journey.
				 * An interrupted journey leaves you at the last place reached;
				 * the interrupting event's effects can move you elsewhere.
				 * @param {string} to @param {string} modeId
				 * @returns {object} Result plus { ok, mins, cost, arrived }.
				 */
				go(to, modeId) {
					if (running) throw new setup.GameError("Already travelling");
					const opt = travel.options().find((o) => o.to === to && o.mode.id === modeId);
					const result = Object.assign(effects.newResult(), { ok: false, mins: 0, cost: 0, arrived: false });
					if (!opt) throw new setup.GameError(`Can't go to ${to} by ${modeId} from ${setup.world.loc()}`);
					const { mode } = opt;
					const name = (id) => registry.get("location", id).name;
					if (!opt.ok) {
						result.changes.push({ kind: "blocked", text: `Can't go by ${mode.label}: ${opt.reasons.join("; ")}` });
						return result;
					}
					if (opt.cost > 0 && moneyOn()) {
						const paid = setup.money.pay(opt.cost, { from: mode.payWith ?? undefined, reason: `${mode.label} to ${name(to)}` });
						if (!paid.ok) {
							result.changes.push({ kind: "blocked", text: paid.reason });
							return result;
						}
						result.cost = opt.cost;
					}

					const from = setup.world.loc();
					let interrupted = null;
					let reached = from;
					const interrupt = (reason) => {
						interrupted ??= reason || "interrupted";
						time.interrupt(interrupted);
					};
					running = { mode: modeId, from, to };
					try {
						bus.emit("travel:depart", { from, to, mode: modeId, mins: opt.mins, cost: opt.cost });
						for (let i = 0; i < opt.legs.length; i++) {
							const leg = opt.legs[i];
							const adv = time.advance(opt.legMins[i], { reason: "travel" });
							result.mins += adv.elapsed;
							if (adv.interrupted) interrupted ??= adv.interrupted.reason;
							if (interrupted) break;
							reached = leg.to;
							if (i < opt.legs.length - 1) {
								const ctx = { mode: modeId, from, to, at: reached, elapsed: result.mins, t: time.now() };
								bus.emit("travel:checkpoint", { ...ctx, ctx: { ...ctx, interrupt }, result, interrupt });
								if (interrupted) break;
							}
						}
					}
					finally {
						running = null;
					}
					// The interrupting event may already have moved the PC.
					if (setup.world.loc() === from && reached !== from) setup.world.moveTo(reached);
					result.ok = true;
					result.arrived = !interrupted;
					result.interrupted = interrupted || false;
					const fare = result.cost ? ` (${fmt.money(result.cost)})` : "";
					result.changes.unshift({
						kind: "travel",
						text: interrupted
							? `${mode.label} towards ${name(to)}${fare}: stopped at ${name(setup.world.loc())} after ${fmt.duration(result.mins)}.`
							: `${mode.label} to ${name(to)}${fare}: ${fmt.duration(result.mins)}.`,
					});
					bus.emit(interrupted ? "travel:interrupted" : "travel:arrived", { from, to, at: setup.world.loc(), mode: modeId, mins: result.mins });
					return result;
				},
			};
			setup.travel = travel;

			// Default formulas.
			// "path": each leg's minutes × the mode's timeFactor, rounded up.
			travel.registerTimeHook("path", (legs, mode) => legs.map((l) => Math.ceil(l.mins * mode.timeFactor)));
			// "none": free. "flat": fare.flat. "meter": fare.base + fare.perMin × minutes.
			travel.registerCostHook("none", () => 0);
			travel.registerCostHook("flat", (mins, legs, mode) => mode.fare.flat ?? 0);
			travel.registerCostHook("meter", (mins, legs, mode) => (mode.fare.base ?? 0) + (mode.fare.perMin ?? 0) * mins);

			// { travel: { mode?, to?, at? } } — for events during a journey (ctx from travel:checkpoint).
			cond.register("travel", {
				test: (spec, ctx) => ctx.mode != null &&
					(spec.mode == null || setup.util.toArray(spec.mode).includes(ctx.mode)) &&
					(spec.to == null || setup.util.toArray(spec.to).includes(ctx.to)) &&
					(spec.at == null || setup.util.toArray(spec.at).includes(ctx.at)),
				describe: () => "While travelling",
			});

			/* ---- UI --------------------------------------------------------- */

			setup.world.addHereSection("travel", 40, (box) => {
				if (!travel.options().length) return;
				box.append(ui.button("Go somewhere else", () => flow.go("Travel_Pick")));
			});

			ui.view("travel", (box) => {
				box.classList.add("m-travel");
				const here = setup.world.here();
				box.append(ui.el("h1", { text: "Where to?" }));
				if (here) box.append(ui.el("p", { class: "status-line", text: `${fmt.date(time.now())} · ${fmt.time(time.now())} · leaving ${here.name}` }));
				const byMode = new Map();
				for (const o of travel.options()) byMode.set(o.mode, [...(byMode.get(o.mode) ?? []), o]);
				for (const [mode, opts] of byMode) {
					box.append(ui.el("h2", { text: mode.label }));
					const ul = ui.el("ul");
					for (const o of opts) {
						const via = o.legs.length > 1 ? ` via ${o.legs.slice(0, -1).map((l) => registry.get("location", l.to).name).join(", ")}` : "";
						const fare = o.cost ? `, ${fmt.money(o.cost)}` : "";
						const li = ui.el("li", {}, ui.action(`${registry.get("location", o.to).name} (${fmt.duration(o.mins)}${fare})`, () => travel.go(o.to, mode.id), { disabled: !o.ok }));
						if (via) li.append(ui.el("p", { class: "note", text: `Stops at${via.slice(4)}` }));
						if (!o.ok) li.append(ui.el("p", { class: "locked", text: o.reasons.join("; ") }));
						ul.append(li);
					}
					box.append(ul);
				}
				box.append(ui.button("Stay here", () => flow.go(flow.home)));
			});
		},

		validate() {
			const errs = [];
			for (const m of setup.registry.all("travelMode")) {
				if (!setup.travel.hasTimeHook(m.time)) errs.push(`travelMode "${m.id}": unknown time hook "${m.time}"`);
				if (!setup.travel.hasCostHook(m.cost)) errs.push(`travelMode "${m.id}": unknown cost hook "${m.cost}"`);
				if (m.cost !== "none" && !(setup.registry.hasType("account") && setup.registry.all("account").length)) errs.push(`travelMode "${m.id}": has a fare but no money accounts exist`);
			}
			return errs;
		},
	});
})();
