/*
 * actions — things the PC can do that take time. See README.md.
 *
 * do(id): conditions → costs → advance time (split at checkpoints, with
 * per-hour effects) → effects → Result → events.
 *
 * Events:
 *   action:start      { action, ctx }
 *   action:checkpoint { action, elapsed, ctx, result, interrupt(reason) }
 *   action:end        { action, elapsed, interrupted, result, ctx }
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "actions",
		version: 1,
		deps: ["world"],

		install({ registry, cond, effects, time, bus, ui, flow, fmt }) {
			registry.defineType("action", {
				required: ["label"],
				defaults: {
					at: [], atTag: null, whenClosed: false, desc: "", tags: [], mins: 0, durations: null, checkpoints: [], conditions: null,
					costs: [], effects: [], perHour: [], always: [], interruptible: true, passage: null,
					// Decided by the user: a locked action shows its requirements but not
					// what it is. `hidden: true` hides it completely instead.
					hidden: false,
				},
				refs: { at: "location" },
				passages: ["passage"],
				conditions: ["conditions"],
				effects: ["costs", "effects", "perHour", "always"],
				check(def) {
					const errs = [];
					const ok = (n) => Number.isInteger(n) && n >= 0;
					if (!ok(def.mins)) errs.push("mins must be a whole number ≥ 0");
					const hm = (d) => typeof d === "string" && /^\d{1,2}:\d{2}$/.test(d);
					if (def.durations && !def.durations.every((d) => (ok(d) && d > 0) || hm(d))) errs.push('durations must be whole minutes > 0 or "HH:MM" (until that time)');
					if (!setup.util.toArray(def.at).length && !def.atTag) errs.push("needs `at` (location ids) or `atTag`");
					if (!def.checkpoints.every((c) => ok(c) && c > 0)) errs.push("checkpoints must be whole numbers > 0");
					return errs;
				},
			});

			let running = null;

			// Per-hour effects of the running action.
			bus.on("time:hour", () => {
				if (running && running.def.perHour.length) effects.run(running.def.perHour, running.ctx, running.result);
			});

			const ctxFor = (def) => ({ action: def.id, loc: setup.world.loc(), t: time.now(), reason: `action:${def.id}` });

			/** Total pence an action's costs take (negative `money` effects). */
			const priceOf = (def) => def.costs.reduce((sum, c) => sum + (c.money && c.money.amount < 0 ? -c.money.amount : 0), 0);
			const moneyOn = () => setup.modules.has("money") && setup.money.enabled();

			/** Is the action offered where the PC is? */
			const offeredHere = (def) => {
				const here = setup.world.here();
				return Boolean(here) && (setup.util.toArray(def.at).includes(here.id) || (def.atTag != null && here.tags.includes(def.atTag)));
			};

			/**
			 * Every reason an action can't be done now: not open (unless the
			 * action has `whenClosed: true`), conditions, then price.
			 */
			const blockers = (def, ctx) => {
				const reasons = [];
				if (!def.whenClosed && ctx.loc && !setup.world.isOpen(ctx.loc)) reasons.push("It's open");
				if (!cond.test(def.conditions, ctx)) reasons.push(...cond.explain(def.conditions, ctx).filter((e) => !e.ok).map((e) => e.text));
				const price = priceOf(def);
				if (price && moneyOn() && setup.money.balance() < price) reasons.push(`${fmt.money(price)} to pay`);
				return [...new Set(reasons)];
			};

			/**
			 * Minutes for a duration option: a number, or "HH:MM" meaning until
			 * that time (the next one, at least a minute away).
			 */
			const minsFor = (d) => {
				if (typeof d !== "string") return d;
				const now = time.now();
				const until = time.nextAt(now, d);
				return until > now ? until - now : until + time.MIN_PER_DAY - now;
			};

			const actions = {
				/**
				 * Actions offered at the current location, with whether each is
				 * possible now and why not.
				 * @returns {{def: object, ok: boolean, reasons: string[]}[]}
				 */
				available() {
					if (!setup.world.here()) return [];
					return registry.all("action")
						.filter(offeredHere)
						.map((def) => {
							const reasons = blockers(def, ctxFor(def));
							return { def, ok: !reasons.length, reasons, price: priceOf(def) };
						})
						.filter((a) => a.ok || !a.def.hidden);
				},

				/** @returns {boolean} Whether an action is running. */
				isRunning: () => running !== null,

				/**
				 * Do an action.
				 * @param {string} id
				 * @param {{mins?: number|string}} [opts]  mins picks one of `durations`
				 *   (a number of minutes, or "HH:MM" for "until then").
				 * @returns {object} Result, plus { ok, action, elapsed }.
				 */
				do(id, opts = {}) {
					if (running) throw new setup.GameError(`Can't start "${id}" while "${running.def.id}" is running`);
					const def = registry.get("action", id);
					if (def.durations && opts.mins != null && !def.durations.includes(opts.mins)) throw new setup.GameError(`"${id}" can't last ${opts.mins} minutes`);
					const mins = minsFor(opts.mins ?? def.mins);
					const ctx = ctxFor(def);
					const result = Object.assign(effects.newResult(), { ok: false, action: id, elapsed: 0 });

					if (!offeredHere(def)) throw new setup.GameError(`"${id}" isn't offered at ${setup.world.loc()}`);
					const why = blockers(def, ctx);
					if (why.length) {
						result.changes.push({ kind: "blocked", text: `${def.label}: not possible right now (${why.join("; ")}).` });
						return result;
					}

					let interrupted = null;
					ctx.interrupt = (reason) => {
						interrupted ??= reason || "interrupted";
						time.interrupt(interrupted);
					};
					running = { def, ctx, result };
					try {
						effects.run(def.costs, ctx, result);
						bus.emit("action:start", { action: id, ctx });
						const points = [...new Set(def.checkpoints.filter((c) => c < mins))].sort((a, b) => a - b).concat(mins);
						let elapsed = 0;
						for (const p of points) {
							const adv = time.advance(p - elapsed, { reason: ctx.reason, interruptible: def.interruptible });
							elapsed += adv.elapsed;
							if (adv.interrupted) interrupted ??= adv.interrupted.reason;
							if (interrupted) break;
							if (p < mins) {
								ctx.t = time.now();
								bus.emit("action:checkpoint", { action: id, elapsed, ctx: { ...ctx, elapsed }, result, interrupt: ctx.interrupt });
								if (interrupted) break;
							}
						}
						result.elapsed = elapsed;
						if (!interrupted) {
							const queued = result.mins;
							effects.run(def.effects, ctx, result);
							const extra = result.mins - queued;
							if (extra > 0) result.elapsed += time.advance(extra, { reason: ctx.reason }).elapsed;
						}
						// `always` runs whether or not the action was interrupted.
						effects.run(def.always, ctx, result);
						result.ok = true;
						result.interrupted = interrupted || false;
						result.changes.unshift({
							kind: "action",
							text: interrupted
								? `${def.label} ended early after ${fmt.duration(result.elapsed)}.`
								: `${def.label} took ${fmt.duration(result.elapsed)}.`,
						});
					}
					finally {
						running = null;
					}
					bus.emit("action:end", { action: id, elapsed: result.elapsed, interrupted: result.interrupted, result, ctx });
					if (def.passage) flow.request(def.passage, flow.PRIORITY.result);
					return result;
				},
			};
			setup.actions = actions;

			// { action: "id" } or { action: [ids] } — the action in context.
			cond.register("action", {
				test: (spec, ctx) => setup.util.toArray(spec).includes(ctx.action),
				describe: (spec) => `During ${setup.util.toArray(spec).join(" or ")}`,
			});

			// { actionElapsed: { min?, max? } } — minutes into the action in context.
			cond.register("actionElapsed", {
				test: (spec, ctx) => ctx.elapsed != null && (spec.min == null || ctx.elapsed >= spec.min) && (spec.max == null || ctx.elapsed <= spec.max),
				describe: (spec) => `Between ${spec.min ?? 0} and ${spec.max ?? "∞"} minutes in`,
			});

			/* ---- UI --------------------------------------------------------- */

			setup.world.addHereSection("actions", 30, (box) => {
				const list = actions.available();
				if (!list.length) return;
				box.append(ui.el("h2", { text: "Things to do" }));
				const ul = ui.el("ul", { class: "m-actions" });
				for (const { def, ok, reasons } of list) {
					const li = ui.el("li");
					if (!ok) {
						// Locked: show what's needed, not what the action is.
						li.append(
							ui.button("Locked", () => {}, { disabled: true, class: "btn-locked" }),
							ui.el("p", { class: "locked", text: `Needs: ${reasons.join("; ")}` }),
						);
						ul.append(li);
						continue;
					}
					const options = def.durations ?? [def.mins];
					const price = priceOf(def);
					for (const d of options) {
						const parts = [];
						if (typeof d === "string") parts.push(`until ${d}`);
						else if (d) parts.push(fmt.duration(d));
						if (price) parts.push(fmt.money(price));
						const label = parts.length ? `${def.label} (${parts.join(", ")})` : def.label;
						li.append(ui.action(label, () => actions.do(def.id, def.durations ? { mins: d } : {})));
					}
					if (def.desc) li.append(ui.el("p", { class: "note", text: def.desc }));
					ul.append(li);
				}
				box.append(ul);
			});
		},
	});
})();
