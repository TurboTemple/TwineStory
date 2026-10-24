/*
 * stats — the PC's stats (energy, hunger, mood, …).
 *
 * Only base values are saved. The effective value is the base adjusted by
 * modifiers that other modules supply (active effects now; traits, clothing
 * and furniture later). Modifiers are never stored.
 *
 * A stat with `derive` isn't saved at all: it's worked out from other
 * things every time it's read (e.g. Beauty from hygiene, makeup and
 * clothes). Each part of `derive` is one of:
 *   { add: 10 }                          a fixed amount
 *   { stat: "hygiene", times: 0.2 }      another stat × a number
 *   { when: CONDITION, add: 15 }         an amount while a condition is true
 * Any part can have a `label` for the Profile ("Clean", "Made up"…).
 * Modifiers still apply on top.
 *
 * Modifier: { stat, op, value }
 *   op "add"     effective + value
 *   op "mul"     effective × value
 *   op "rateAdd" + value per hour to how the stat changes over time
 *   op "rateMul" × value to how the stat changes over time
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-needs.js → part 1 (stats)
 * Every field, condition, effect and event is listed in src/modules/stats/README.md.
 */
(function () {
	"use strict";

	const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

	(setup.__modules ??= []).push({
		id: "stats",
		version: 1,
		deps: [],
		state: "stats",
		defaultState: () => ({ base: {} }),

		install({ registry, cond, effects, bus }) {
			registry.defineType("stat", {
				required: ["label"],
				defaults: { desc: "", min: 0, max: 100, start: 50, hud: true, order: 0, good: "high", change: "drift", perHour: 0, target: null, derive: null },
				refs: { "derive[].stat": "stat" },
				conditions: ["derive[].when"],
				check(def) {
					const errs = [];
					for (const part of def.derive ?? []) {
						const kinds = ["add" in part && !("when" in part), "stat" in part, "when" in part].filter(Boolean).length;
						if (kinds !== 1) errs.push('each derive part needs one of: { add }, { stat, times }, { when, add }');
						if ("stat" in part && part.stat === def.id) errs.push("a derived stat can't use itself");
					}
					// …nor go round in a circle through other derived stats (A uses B, B uses A),
					// which would never finish working out.
					const loop = (id, path) => {
						for (const part of registry.tryGet("stat", id)?.derive ?? []) {
							if (!("stat" in part)) continue;
							if (part.stat === def.id) return [...path, part.stat];
							if (!path.includes(part.stat)) {
								const found = loop(part.stat, [...path, part.stat]);
								if (found) return found;
							}
						}
						return null;
					};
					const circle = def.derive ? loop(def.id, [def.id]) : null;
					if (circle && circle.length > 2) errs.push(`derive goes round in a circle: ${circle.join(" → ")}`);
					if (!(def.max > def.min)) errs.push("max must be greater than min");
					if (!["high", "low"].includes(def.good)) errs.push('good must be "high" or "low"');
					if (def.start < def.min || def.start > def.max) errs.push("start must be between min and max");
					return errs;
				},
			});

			const B = () => setup.vars().stats.base;
			const changeHooks = new Map();
			const sources = [];

			const stats = {
				/** @returns {object[]} Stat definitions in display order. */
				defs: () => registry.all("stat").sort((a, b) => a.order - b.order),

				/** @returns {number} The saved base value (worked out, for a derived stat). */
				base(id) {
					const def = registry.get("stat", id);
					if (def.derive) return stats.breakdown(id).reduce((n, p) => n + p.value, 0);
					return B()[id] ?? def.start;
				},

				/** @returns {boolean} Whether a stat is worked out from other things (`derive`). */
				isDerived: (id) => Boolean(registry.get("stat", id).derive),

				/**
				 * The parts of a derived stat that count right now.
				 * @returns {{label: string, value: number}[]}
				 */
				breakdown(id) {
					const def = registry.get("stat", id);
					const out = [];
					for (const part of def.derive ?? []) {
						if ("stat" in part) {
							const value = stats.get(part.stat) * (part.times ?? 1);
							out.push({ label: part.label ?? registry.get("stat", part.stat).label, value });
						}
						else if ("when" in part) {
							if (cond.test(part.when, {})) out.push({ label: part.label ?? cond.explain(part.when, {})[0]?.text ?? "", value: part.add ?? 0 });
						}
						else out.push({ label: part.label ?? "Base", value: part.add ?? 0 });
					}
					return out;
				},

				/** @returns {object[]} Every active modifier for a stat. */
				modifiers: (id) => sources.flatMap((fn) => fn()).filter((m) => m.stat === id),

				/**
				 * The effective value: base plus modifiers, clamped.
				 * @param {string} id @returns {number}
				 */
				get(id) {
					const def = registry.get("stat", id);
					let v = stats.base(id);
					const mods = stats.modifiers(id);
					for (const m of mods) if (m.op === "add") v += m.value;
					for (const m of mods) if (m.op === "mul") v *= m.value;
					return clamp(v, def.min, def.max);
				},

				/** Set the base value (clamped). A derived stat can't be set. */
				set(id, value) {
					const def = registry.get("stat", id);
					if (def.derive) throw new setup.GameError(`"${id}" is worked out from other things (its derive list); change those instead`);
					const from = stats.base(id);
					const to = clamp(value, def.min, def.max);
					B()[id] = to;
					if (to !== from) bus.emit("stat:changed", { id, from, to });
				},

				/** Add to the base value (clamped). */
				add(id, delta) {
					stats.set(id, stats.base(id) + delta);
				},

				/**
				 * Per-hour rate of change right now: the stat's `perHour` adjusted by
				 * rate modifiers.
				 */
				rate(id) {
					const def = registry.get("stat", id);
					const mods = stats.modifiers(id);
					let r = def.perHour;
					for (const m of mods) if (m.op === "rateMul") r *= m.value;
					for (const m of mods) if (m.op === "rateAdd") r += m.value;
					return r;
				},

				/**
				 * Register a modifier source: a function returning modifiers.
				 * @param {() => {stat: string, op: string, value: number}[]} fn
				 */
				addModifierSource(fn) {
					sources.push(fn);
				},

				/**
				 * Register how a stat changes over time:
				 * (def, base, hours, rate) => new base.
				 * @param {string} name @param {Function} fn
				 */
				registerChangeHook: (name, fn) => changeHooks.set(name, fn),

				/** @returns {boolean} */
				hasChangeHook: (name) => changeHooks.has(name),

				/**
				 * Plain English for a modifier, e.g. "Mood +6", "Energy −1 an hour".
				 * @param {{stat: string, op: string, value: number}} m
				 */
				describeModifier(m) {
					const label = registry.tryGet("stat", m.stat)?.label ?? m.stat;
					const n = Math.round(m.value * 100) / 100;
					const signed = n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
					switch (m.op) {
						case "add": return `${label} ${signed}`;
						case "mul": return `${label} ×${n}`;
						case "rateAdd": return `${label} ${signed} an hour`;
						case "rateMul": return n < 1 ? `${label} changes ${Math.round((1 - n) * 100)}% slower` : `${label} changes ${Math.round((n - 1) * 100)}% faster`;
						default: return `${label} (${m.op} ${n})`;
					}
				},

				/** @returns {string} A value rounded for display. */
				display: (id) => String(Math.round(stats.get(id))),
			};
			setup.stats = stats;

			// "none": doesn't change by itself.
			stats.registerChangeHook("none", (def, base) => base);
			// "drift": changes by `rate` per hour.
			stats.registerChangeHook("drift", (def, base, hours, rate) => base + rate * hours);
			// "toward": pulled back toward `target` by `perHour` each hour. Rate
			// modifiers on top of that push it up or down (e.g. relaxing lowers stress).
			stats.registerChangeHook("toward", (def, base, hours, rate) => {
				const step = Math.abs(def.perHour) * hours;
				const target = def.target ?? def.start;
				const pulled = base < target ? Math.min(target, base + step) : Math.max(target, base - step);
				return pulled + (rate - def.perHour) * hours;
			});

			// Continuous change as time passes.
			bus.on("time:advanced", ({ from, to }) => {
				const hours = (to - from) / 60;
				for (const def of stats.defs()) {
					if (def.derive) continue;
					const next = changeHooks.get(def.change)(def, stats.base(def.id), hours, stats.rate(def.id));
					stats.set(def.id, next);
				}
				bus.emit("stats:ticked", { from, to });
			}, { priority: 10 });

			// { stat: { id, min?, max? } } — effective value in range.
			cond.register("stat", {
				test(spec) {
					const v = stats.get(spec.id);
					return (spec.min == null || v >= spec.min) && (spec.max == null || v <= spec.max);
				},
				describe(spec) {
					const label = registry.tryGet("stat", spec.id)?.label ?? spec.id;
					if (spec.min != null && spec.max != null) return `${label} between ${spec.min} and ${spec.max}`;
					return spec.min != null ? `${label} at least ${spec.min}` : `${label} at most ${spec.max}`;
				},
			});

			const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
			const changeText = (id, before) => {
				const def = registry.get("stat", id);
				const delta = Math.round(stats.base(id) - before);
				return delta ? `${def.label} ${sign(delta)}` : null;
			};

			// { stat: { energy: 20, mood: -5 } } — add to base values.
			effects.register("stat", {
				apply(spec, ctx, result) {
					for (const [id, delta] of Object.entries(spec)) {
						const before = stats.base(id);
						stats.add(id, delta);
						const text = changeText(id, before);
						if (text && !ctx.quiet) result.changes.push({ kind: "stat", stat: id, text });
					}
				},
				describe: (spec) => Object.entries(spec).map(([id, d]) => `${registry.tryGet("stat", id)?.label ?? id} ${sign(d)}`).join(", "),
			});

			// { statSet: { bladder: 0 } } — set base values.
			effects.register("statSet", {
				apply(spec, ctx, result) {
					for (const [id, value] of Object.entries(spec)) {
						const before = stats.base(id);
						stats.set(id, value);
						const text = changeText(id, before);
						if (text && !ctx.quiet) result.changes.push({ kind: "stat", stat: id, text });
					}
				},
			});
		},

		newGame() {
			const base = setup.vars().stats.base;
			for (const def of setup.registry.all("stat")) if (!def.derive) base[def.id] = def.start;
		},

		validate() {
			const defs = setup.registry.all("stat");
			const errs = defs.filter((d) => !setup.stats.hasChangeHook(d.change)).map((d) => `stat "${d.id}": unknown change hook "${d.change}"`);
			// Derived stats mustn't go round in a circle (A uses B, B uses A).
			const uses = (d) => (d.derive ?? []).filter((p) => "stat" in p).map((p) => p.stat);
			for (const d of defs.filter((x) => x.derive)) {
				const seen = new Set();
				const walk = (id) => {
					for (const next of uses(setup.registry.tryGet("stat", id) ?? {})) {
						if (next === d.id) return true;
						if (!seen.has(next)) {
							seen.add(next);
							if (walk(next)) return true;
						}
					}
					return false;
				};
				if (walk(d.id)) errs.push(`stat "${d.id}": its derive list goes round in a circle`);
			}
			return errs;
		},
	});
})();
