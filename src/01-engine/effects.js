/*
 * effects.js — outcomes written as data (setup.effects, §6.6).
 *
 * An effect list is an ordered array of single-key objects: [{ op: spec }, …].
 * apply() returns a Result the UI can render:
 *   { changes: [{text}], toasts: [string], goto: string|null,
 *     interrupted: false|string, mins: number }
 *
 * `time` effects are queued and the clock advances once, after the list.
 */
(function () {
	"use strict";

	/** Effect ops whose spec contains nested effect lists, and where. */
	const NESTED = {
		if: (s) => [s.then, s.else],
		check: (s) => [s.then, s.else],
		random: (s) => (Array.isArray(s) ? s : s.branches ?? []).map((b) => b.then),
	};

	/** @returns {object} A fresh, empty Result. */
	const newResult = () => ({ changes: [], toasts: [], goto: null, interrupted: false, mins: 0 });

	function createEffects() {
		/** @type {Map<string, {apply: Function, describe?: Function}>} */
		const ops = new Map();
		/** @type {Map<string, Function>} */
		const resolvers = new Map();
		const nestedOf = { ...NESTED };

		const effects = {
			newResult,

			/**
			 * Register an effect operator.
			 * @param {string} name
			 * @param {{ apply: (spec: any, ctx: object, result: object) => void, describe?: (spec: any) => string, nested?: (spec: any) => unknown[] }} def
			 */
			register(name, def) {
				if (ops.has(name)) throw new setup.GameError(`Effect "${name}" already registered`);
				ops.set(name, def);
				if (def.nested) nestedOf[name] = def.nested;
			},

			/** @returns {boolean} */
			has: (name) => ops.has(name),

			/**
			 * Register a resolver for the `check` effect. The engine ships none:
			 * how checks work is a design decision.
			 * @param {string} name
			 * @param {(spec: object, ctx: object) => boolean} fn
			 */
			registerResolver(name, fn) {
				resolvers.set(name, fn);
			},

			/** @returns {Function|undefined} */
			resolver: (name) => resolvers.get(name),

			/**
			 * Run effects into an existing result without advancing time.
			 * Used by operators that contain nested lists.
			 * @param {object[]} list
			 * @param {object} ctx
			 * @param {object} result
			 */
			run(list, ctx, result) {
				for (const item of setup.util.toArray(list)) {
					if (result.interrupted) return;
					for (const [name, spec] of Object.entries(item)) {
						const op = ops.get(name);
						if (!op) throw new setup.GameError(`Unknown effect "${name}"`);
						op.apply(spec, ctx, result);
					}
				}
			},

			/**
			 * Apply an effect list. Queued time is advanced once at the end.
			 * @param {object[]} list
			 * @param {object} [ctx]
			 * @returns {object} Result
			 */
			apply(list, ctx = {}) {
				const result = newResult();
				effects.run(list, ctx, result);
				if (result.mins > 0) {
					const adv = setup.time.advance(result.mins, { reason: ctx.reason ?? "effects" });
					if (adv.interrupted) result.interrupted = adv.interrupted.reason;
				}
				return result;
			},

			/**
			 * Merge `from` into `into` (both Results).
			 * @returns {object} into
			 */
			merge(into, from) {
				into.changes.push(...from.changes);
				into.toasts.push(...from.toasts);
				into.goto = from.goto ?? into.goto;
				into.interrupted = into.interrupted || from.interrupted;
				return into;
			},

			/**
			 * Plain-English lines describing an effect list (for previews).
			 * @returns {string[]}
			 */
			describe(list) {
				return setup.util.toArray(list).flatMap((item) =>
					Object.entries(item).map(([name, spec]) => {
						const op = ops.get(name);
						return op && op.describe ? op.describe(spec) : name;
					}));
			},

			/**
			 * List every effect operator name used, including nested lists.
			 * @returns {string[]}
			 */
			ops(list) {
				const out = [];
				for (const item of setup.util.toArray(list)) {
					if (!item || typeof item !== "object") continue;
					for (const [name, spec] of Object.entries(item)) {
						out.push(name);
						const nested = nestedOf[name];
						if (nested && spec) for (const sub of nested(spec)) out.push(...effects.ops(sub));
					}
				}
				return out;
			},
		};
		return effects;
	}

	setup.createEffects = createEffects;
})();
