/*
 * stats — the PC's stats (energy, hunger, mood, …). See README.md.
 *
 * Only base values are saved. The effective value is the base adjusted by
 * modifiers that other modules supply (active effects now; traits, clothing
 * and furniture later). Modifiers are never stored.
 *
 * Modifier: { stat, op, value }
 *   op "add"     effective + value
 *   op "mul"     effective × value
 *   op "rateAdd" + value per hour to how the stat changes over time
 *   op "rateMul" × value to how the stat changes over time
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
				defaults: { desc: "", min: 0, max: 100, start: 50, hud: true, order: 0, good: "high", change: "drift", perHour: 0, target: null },
				check(def) {
					const errs = [];
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

				/** @returns {number} The saved base value. */
				base(id) {
					const def = registry.get("stat", id);
					return B()[id] ?? def.start;
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

				/** Set the base value (clamped). */
				set(id, value) {
					const def = registry.get("stat", id);
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
			for (const def of setup.registry.all("stat")) base[def.id] = def.start;
		},

		validate() {
			return setup.registry.all("stat")
				.filter((d) => !setup.stats.hasChangeHook(d.change))
				.map((d) => `stat "${d.id}": unknown change hook "${d.change}"`);
		},
	});
})();
