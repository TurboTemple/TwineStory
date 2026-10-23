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

		// { if: { cond, then: [...], else: [...] } }
		effects.register("if", {
			apply(spec, ctx, result) {
				effects.run(cond.test(spec.cond, ctx) ? spec.then : spec.else, ctx, result);
			},
			describe: () => "Depends on the situation",
		});

		// { random: [{ weight, then: [...] }, ...] } — weighted branches.
		effects.register("random", {
			apply(spec, ctx, result) {
				const branch = setup.rng.weighted(Array.isArray(spec) ? spec : spec.branches);
				if (branch) effects.run(branch.then, ctx, result);
			},
			describe: () => "Something random happens",
		});

		// { check: { resolver: "name", ...spec, then: [...], else: [...] } }
		// The engine ships no resolvers: check rules are a design decision.
		effects.register("check", {
			apply(spec, ctx, result) {
				const fn = effects.resolver(spec.resolver);
				if (!fn) throw new setup.GameError(`No check resolver "${spec.resolver}"`);
				effects.run(fn(spec, ctx) ? spec.then : spec.else, ctx, result);
			},
			describe: (spec) => `Check (${spec.resolver})`,
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
		});

		// { counter: { name, add } } or { counter: { name, set } }
		effects.register("counter", {
			apply(spec) {
				const counters = meta().counters;
				counters[spec.name] = spec.set ?? (counters[spec.name] ?? 0) + (spec.add ?? 1);
			},
		});

		// { goto: "Passage" } or { goto: { passage, priority } }
		effects.register("goto", {
			apply(spec, ctx, result) {
				const { passage, priority } = typeof spec === "string" ? { passage: spec, priority: flow.PRIORITY.result } : spec;
				result.goto = passage;
				flow.request(passage, priority ?? flow.PRIORITY.result);
			},
		});

		// { toast: "text" } — a short notice for the player.
		effects.register("toast", {
			apply(spec, ctx, result) {
				result.toasts.push(spec);
			},
		});

		// { note: "text" } — a line in the result summary.
		effects.register("note", {
			apply(spec, ctx, result) {
				result.changes.push({ kind: "note", text: spec });
			},
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
		});
	}

	setup.coreOps = { install };
})();
