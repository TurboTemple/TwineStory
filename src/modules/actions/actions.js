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
				required: ["label", "at"],
				defaults: {
					desc: "", tags: [], mins: 0, durations: null, checkpoints: [], conditions: null,
					costs: [], effects: [], perHour: [], interruptible: true, passage: null,
					// DESIGN: user to decide — show locked actions (with reasons) or hide them by default.
					hidden: false,
				},
				refs: { at: "location" },
				passages: ["passage"],
				conditions: ["conditions"],
				effects: ["costs", "effects", "perHour"],
				check(def) {
					const errs = [];
					const ok = (n) => Number.isInteger(n) && n >= 0;
					if (!ok(def.mins)) errs.push("mins must be a whole number ≥ 0");
					if (def.durations && !def.durations.every((d) => ok(d) && d > 0)) errs.push("durations must be whole numbers > 0");
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

			const actions = {
				/**
				 * Actions offered at the current location, with whether each is
				 * possible now and why not.
				 * @returns {{def: object, ok: boolean, reasons: string[]}[]}
				 */
				available() {
					const loc = setup.world.loc();
					return registry.all("action")
						.filter((def) => setup.util.toArray(def.at).includes(loc))
						.map((def) => {
							const ctx = ctxFor(def);
							const ok = cond.test(def.conditions, ctx);
							const reasons = ok ? [] : cond.explain(def.conditions, ctx).filter((e) => !e.ok).map((e) => e.text);
							return { def, ok, reasons };
						})
						.filter((a) => a.ok || !a.def.hidden);
				},

				/** @returns {boolean} Whether an action is running. */
				isRunning: () => running !== null,

				/**
				 * Do an action.
				 * @param {string} id
				 * @param {{mins?: number}} [opts]  mins picks one of `durations`.
				 * @returns {object} Result, plus { ok, action, elapsed }.
				 */
				do(id, opts = {}) {
					if (running) throw new setup.GameError(`Can't start "${id}" while "${running.def.id}" is running`);
					const def = registry.get("action", id);
					const mins = opts.mins ?? def.mins;
					if (def.durations && opts.mins != null && !def.durations.includes(mins)) throw new setup.GameError(`"${id}" can't last ${mins} minutes`);
					const ctx = ctxFor(def);
					const result = Object.assign(effects.newResult(), { ok: false, action: id, elapsed: 0 });

					if (!cond.test(def.conditions, ctx)) {
						const why = cond.explain(def.conditions, ctx).filter((e) => !e.ok).map((e) => e.text);
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
					const options = def.durations ?? [def.mins];
					for (const mins of options) {
						const label = mins ? `${def.label} (${fmt.duration(mins)})` : def.label;
						li.append(ui.action(label, () => actions.do(def.id, def.durations ? { mins } : {}), { disabled: !ok }));
					}
					if (!ok) li.append(ui.el("p", { class: "locked", text: reasons.join("; ") }));
					else if (def.desc) li.append(ui.el("p", { class: "note", text: def.desc }));
					ul.append(li);
				}
				box.append(ul);
			});
		},
	});
})();
