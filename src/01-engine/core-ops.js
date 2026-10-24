/*
 * ============================================================================
 *  core-ops.js — the built-in conditions and effects (§6.5, §6.6)
 * ============================================================================
 *
 * The general-purpose words every content file can use, whatever modules
 * are installed. Modules add their own (stat, status, money…) on top.
 * No game rules here: these only touch engine data (flags, counters, the
 * clock, which passage to show).
 *
 * Flags and counters are a free-form scratchpad for story bits that don't
 * belong to any module: { flag: "met_the_mayor" } sets one,
 * { flag: "met_the_mayor" } as a condition checks it.
 *
 * Conditions: flag, counter, time, weekday
 * Effects:    if, random, check, time, flag, counter, goto, toast, note, interrupt
 *
 * Flags and counters live in $meta.flags / $meta.counters.
 */
(function () {
	"use strict";

	function install() {
		const { cond, effects, time, flow } = setup;
		const meta = () => setup.vars().meta;

		/* ---- Conditions ------------------------------------------------- */

		// { flag: "name" } — flag is truthy;  { flag: { name, is } } — flag equals `is`.
		cond.register("flag", {
			test(spec) {
				if (typeof spec === "string") return Boolean(meta().flags[spec]);
				return meta().flags[spec.name] === spec.is;
			},
			describe: (spec) => (typeof spec === "string" ? `Flag "${spec}" is set` : `Flag "${spec.name}" is ${JSON.stringify(spec.is)}`),
		});

		// { counter: { name, min?, max? } } — inclusive bounds.
		cond.register("counter", {
			test(spec) {
				const v = meta().counters[spec.name] ?? 0;
				return (spec.min == null || v >= spec.min) && (spec.max == null || v <= spec.max);
			},
			describe: (spec) => `Counter "${spec.name}" between ${spec.min ?? "-∞"} and ${spec.max ?? "∞"}`,
		});

		// { time: { from: "HH:MM", to: "HH:MM" } } — the clock is in [from, to).
		cond.register("time", {
			test: (spec, ctx) => time.isBetween(ctx.t ?? time.now(), spec.from, spec.to),
			describe: (spec) => `Between ${spec.from} and ${spec.to}`,
		});

		// { weekday: [1, 2, 3] } — 0 = Sunday … 6 = Saturday.
		cond.register("weekday", {
			test: (spec, ctx) => setup.util.toArray(spec).includes(time.weekday(ctx.t ?? time.now())),
			describe: (spec) => `On ${setup.util.toArray(spec).map((d) => time.WEEKDAYS[d]).join(", ")}`,
		});

		/* ---- Effects ---------------------------------------------------- */

		/** "Mood +3, Tipsy" for a list of effects, or "nothing" (for describing branches). */
		const listText = (list) => effects.describe(list).filter(Boolean).join(", ") || "nothing";
		/** "Energy at least 20 and At work" for a condition. */
		const condText = (c) => cond.explain(c, {}).map((e) => e.text).join(" and ") || "always";

		// { if: { cond, then: [...], else: [...] } }
		effects.register("if", {
			apply(spec, ctx, result) {
				effects.run(cond.test(spec.cond, ctx) ? spec.then : spec.else, ctx, result);
			},
			describe: (spec) => `If ${condText(spec.cond)}: ${listText(spec.then)}${spec.else?.length ? `; otherwise: ${listText(spec.else)}` : ""}`,
		});

		// { random: [{ weight, weightIf?, then: [...] }, ...] } — weighted branches.
		// weightIf: [{ when: CONDITION, add: n }] changes a branch's weight while
		// the condition is true (e.g. a rough shift is likelier when you're tired).
		// A weight that ends up below 0 counts as 0.
		effects.register("random", {
			apply(spec, ctx, result) {
				const branches = (Array.isArray(spec) ? spec : spec.branches).map((b) => ({
					...b,
					weight: Math.max(0, (b.weight ?? 1) + (b.weightIf ?? []).reduce((n, w) => n + (cond.test(w.when, ctx) ? w.add ?? 0 : 0), 0)),
				}));
				const branch = setup.rng.weighted(branches.filter((b) => b.weight > 0));
				if (branch) effects.run(branch.then, ctx, result);
			},
			// "One of: 67% nothing; 22% Barista skill +1, Mood +3 (likelier when…)…"
			// The percentages use the base weights; weightIf changes are noted.
			describe(spec) {
				const branches = Array.isArray(spec) ? spec : spec.branches;
				const total = branches.reduce((n, b) => n + Math.max(0, b.weight ?? 1), 0) || 1;
				return `One of: ${branches.map((b) => {
					const odds = `${Math.round((Math.max(0, b.weight ?? 1) / total) * 100)}%`;
					const shifts = (b.weightIf ?? []).map((w) => `${w.add >= 0 ? "likelier" : "less likely"} when ${condText(w.when)}`);
					return `${odds} ${listText(b.then)}${shifts.length ? ` (${shifts.join("; ")})` : ""}`;
				}).join("; ")}`;
			},
		});

		// { check: { resolver: "name", ...spec, label?, then: [...], else: [...] } }
		// The engine ships no resolvers (the checks module adds "skill" and
		// "stat"). With a `label`, the summary says how it went.
		effects.register("check", {
			apply(spec, ctx, result) {
				const fn = effects.resolver(spec.resolver);
				if (!fn) throw new setup.GameError(`No check resolver "${spec.resolver}"`);
				const pass = Boolean(fn(spec, ctx));
				if (spec.label) result.changes.push({ kind: "check", text: `${spec.label}: ${pass ? "success" : "failed"}` });
				effects.run(pass ? spec.then : spec.else, ctx, result);
			},
			describe: (spec) => {
				const what = spec[spec.resolver] ?? spec.resolver;
				const label = setup.registry.tryGet(spec.resolver, what)?.label ?? what;
				return `${spec.label ? `${spec.label}: ` : ""}a ${label} check${spec.difficulty != null ? ` (difficulty ${spec.difficulty})` : ""}: success → ${listText(spec.then)}; failure → ${listText(spec.else)}`;
			},
		});

		// { time: 30 } — queue minutes; the clock advances once after the list.
		effects.register("time", {
			apply(spec, ctx, result) {
				result.mins += spec;
			},
			describe: (spec) => setup.fmt.duration(spec),
		});

		// { flag: "name" } sets true; { flag: { name, value } } sets a value (null clears).
		effects.register("flag", {
			apply(spec) {
				const flags = meta().flags;
				const [name, value] = typeof spec === "string" ? [spec, true] : [spec.name, "value" in spec ? spec.value : true];
				if (value === null) delete flags[name];
				else flags[name] = value;
			},
			describe: (spec) => (typeof spec === "string" ? `Sets "${spec}"` : `Sets "${spec.name}" to ${JSON.stringify(spec.value)}`),
		});

		// { counter: { name, add } } or { counter: { name, set } }
		effects.register("counter", {
			apply(spec) {
				const counters = meta().counters;
				counters[spec.name] = spec.set ?? (counters[spec.name] ?? 0) + (spec.add ?? 1);
			},
			describe: (spec) => (spec.set != null ? `"${spec.name}" set to ${spec.set}` : `"${spec.name}" ${(spec.add ?? 1) >= 0 ? "+" : "−"}${Math.abs(spec.add ?? 1)}`),
		});

		// { goto: "Passage" } or { goto: { passage, priority } }
		effects.register("goto", {
			apply(spec, ctx, result) {
				const { passage, priority } = typeof spec === "string" ? { passage: spec, priority: flow.PRIORITY.result } : spec;
				result.goto = passage;
				flow.request(passage, priority ?? flow.PRIORITY.result);
			},
			describe: (spec) => `Shows ${typeof spec === "string" ? spec : spec.passage}`,
		});

		// { toast: "text" } — a short notice for the player.
		effects.register("toast", {
			apply(spec, ctx, result) {
				result.toasts.push(spec);
			},
			describe: (spec) => `"${spec}"`,
		});

		// { note: "text" } — a line in the result summary.
		effects.register("note", {
			apply(spec, ctx, result) {
				result.changes.push({ kind: "note", text: spec });
			},
			describe: (spec) => `"${spec}"`,
		});

		// { interrupt: "reason" } — stop the rest of this list and whatever
		// activity is running (ctx.interrupt is supplied by that activity).
		effects.register("interrupt", {
			apply(spec, ctx, result) {
				result.interrupted = spec || "interrupted";
				if (typeof ctx.interrupt === "function") ctx.interrupt(result.interrupted);
				// Fired while the clock is moving (e.g. a time:hour event): stop it too.
				else if (time.isAdvancing()) time.interrupt(result.interrupted);
			},
			describe: () => "Stops what you're doing",
		});
	}

	setup.coreOps = { install };
})();
