/*
 * status — active effects on the PC (tipsy, caffeinated, needs the toilet, …).
 *
 * A status can last a set time, last until removed, or follow a stat
 * (`while`: active whenever that stat is in a range). Active statuses feed
 * modifiers into the stats pipeline.
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-needs.js (most effects)
 *   src/content/mooresville/town-clothing.js, town-weather.js (clothing and weather effects)
 * Every field, condition, effect and event is listed in src/modules/status/README.md.
 */
(function () {
	"use strict";

	const STACKING = ["refresh", "extend", "stack", "ignore"];

	(setup.__modules ??= []).push({
		id: "status",
		version: 1,
		deps: ["stats"],
		state: "status",
		defaultState: () => ({ active: {} }),

		install({ registry, cond, effects, time, bus }) {
			registry.defineType("statusEffect", {
				required: ["label"],
				defaults: {
					desc: "", mins: null, stacking: "refresh", maxStacks: 1, stackLabels: null, expire: "all",
					modifiers: [], while: null, whileCond: null, onExpire: [], tags: [], hidden: false, good: null,
					// Multipliers other systems ask for by name: { actionTime: 1.25, relGain: 0.5 }.
					factors: {},
				},
				refs: { "modifiers[].stat": "stat", "while.stat": "stat" },
				effects: ["onExpire"],
				conditions: ["whileCond"],
				check(def) {
					const errs = [];
					if (!STACKING.includes(def.stacking)) errs.push(`stacking must be one of ${STACKING.join(", ")}`);
					if (!["all", "one"].includes(def.expire)) errs.push('expire must be "all" or "one"');
					if (def.mins != null && !(Number.isInteger(def.mins) && def.mins > 0)) errs.push("mins must be whole minutes > 0 (or null)");
					if ((def.while || def.whileCond) && def.mins != null) errs.push("a `while`/`whileCond` status can't also have mins");
					return errs;
				},
			});

			const A = () => setup.vars().status.active;

			const status = {
				/** @returns {boolean} */
				has: (id) => id in A(),

				/** @returns {number} Current stacks (0 if not active). */
				stacks: (id) => A()[id]?.stacks ?? 0,

				/**
				 * Add (or re-apply) a status.
				 * @param {string} id
				 * @param {{mins?: number}} [opts]  Override the duration.
				 */
				add(id, opts = {}) {
					const def = registry.get("statusEffect", id);
					const now = time.now();
					const mins = opts.mins ?? def.mins;
					const until = mins == null ? null : now + mins;
					const cur = A()[id];
					if (!cur) {
						A()[id] = { stacks: 1, since: now, until };
						bus.emit("status:added", { id });
						return;
					}
					switch (def.stacking) {
						case "ignore":
							return;
						case "extend":
							if (cur.until != null && mins != null) cur.until += mins;
							break;
						case "stack":
							cur.stacks = Math.min(def.maxStacks, cur.stacks + 1);
							cur.until = until;
							break;
						default:
							cur.until = until;
					}
					bus.emit("status:changed", { id, stacks: cur.stacks });
				},

				/** Remove a status completely. */
				remove(id) {
					if (!(id in A())) return;
					delete A()[id];
					bus.emit("status:removed", { id });
				},

				/** @returns {string} Label, using stackLabels when stacked. */
				label(id) {
					const def = registry.get("statusEffect", id);
					const n = status.stacks(id);
					return def.stackLabels?.[Math.min(n, def.stackLabels.length) - 1] ?? def.label;
				},

				/**
				 * Active statuses for display.
				 * @returns {{def: object, label: string, stacks: number, remaining: number|null}[]}
				 */
				list() {
					const now = time.now();
					return Object.entries(A()).map(([id, a]) => ({
						def: registry.get("statusEffect", id),
						label: status.label(id),
						stacks: a.stacks,
						remaining: a.until == null ? null : Math.max(0, a.until - now),
					}));
				},

				/**
				 * Bring condition-driven statuses in line: `while` (a stat in range)
				 * and `whileCond` (any condition, e.g. what you're wearing).
				 */
				sync() {
					for (const def of registry.all("statusEffect")) {
						if (!def.while && !def.whileCond) continue;
						let on;
						if (def.while) {
							const v = setup.stats.base(def.while.stat);
							on = (def.while.min == null || v >= def.while.min) && (def.while.max == null || v <= def.while.max);
						}
						else on = cond.test(def.whileCond, {});
						if (on && !status.has(def.id)) status.add(def.id);
						else if (!on && status.has(def.id)) status.remove(def.id);
					}
				},

				/**
				 * Combined multiplier from every active status's `factors[name]`
				 * (1 when none). E.g. factor("actionTime"), factor("relGain").
				 * @param {string} name @returns {number}
				 */
				factor(name) {
					let f = 1;
					for (const [id, a] of Object.entries(A())) {
						const v = registry.tryGet("statusEffect", id)?.factors[name];
						if (typeof v === "number") f *= v ** a.stacks;
					}
					return f;
				},

				/** Expire timed statuses whose time is up. */
				expire(t = time.now()) {
					for (const [id, a] of Object.entries(A())) {
						if (a.until == null || a.until > t) continue;
						const def = registry.get("statusEffect", id);
						if (def.expire === "one" && a.stacks > 1) {
							a.stacks -= 1;
							a.until = a.until + def.mins;
							continue;
						}
						delete A()[id];
						if (def.onExpire.length) effects.run(def.onExpire, { quiet: true }, effects.newResult());
						bus.emit("status:expired", { id });
					}
				},
			};
			setup.status = status;

			// Active statuses feed the stats pipeline (modifiers × stacks).
			setup.stats.addModifierSource(() => Object.entries(A()).flatMap(([id, a]) => {
				const def = registry.tryGet("statusEffect", id);
				if (!def) return [];
				return def.modifiers.map((m) => ({
					...m,
					value: m.op === "mul" || m.op === "rateMul" ? m.value ** a.stacks : m.value * a.stacks,
					source: id,
				}));
			}));

			bus.on("stats:ticked", ({ to }) => {
				status.expire(to);
				status.sync();
			});
			bus.on("stat:changed", () => status.sync());
			// Things that can switch a `whileCond` status on or off.
			for (const ev of ["clothing:changed", "body:changed", "inventory:added", "inventory:removed", "world:enter"]) bus.on(ev, () => status.sync());

			// { status: "id" } — that status is active.
			cond.register("status", {
				test: (spec) => setup.util.toArray(spec).some((id) => status.has(id)),
				describe: (spec) => setup.util.toArray(spec).map((id) => registry.tryGet("statusEffect", id)?.label ?? id).join(" or "),
			});

			// { status: "id" } or { status: { id, mins } } — add a status.
			effects.register("status", {
				apply(spec, ctx, result) {
					const { id, mins } = typeof spec === "string" ? { id: spec } : spec;
					const had = status.has(id);
					status.add(id, { mins });
					const def = registry.get("statusEffect", id);
					if (!def.hidden && !ctx.quiet) result.changes.push({ kind: "status", text: had ? `${status.label(id)} (renewed)` : `Now: ${status.label(id)}` });
				},
				describe: (spec) => registry.tryGet("statusEffect", typeof spec === "string" ? spec : spec.id)?.label ?? String(spec),
			});

			// { statusRemove: "id" } — remove a status.
			effects.register("statusRemove", {
				apply(spec) {
					for (const id of setup.util.toArray(spec)) status.remove(id);
				},
			});

			/** "1h 20m" style for short spaces like the sidebar. */
			status.shortDuration = (mins) => {
				if (mins == null) return "";
				const h = Math.floor(mins / 60);
				const m = mins % 60;
				return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
			};
		},

		newGame() {
			setup.status.sync();
		},
	});
})();
