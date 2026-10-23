/*
 * cond.js — requirements written as data (setup.cond, §6.5).
 *
 * Forms:
 *   true / false
 *   [a, b]            same as { all: [a, b] }
 *   { all: [...] }    every one must pass
 *   { any: [...] }    at least one must pass
 *   { not: c }        c must fail
 *   { op: spec }      a leaf operator registered by a module
 *   { a: 1, b: 2 }    several leaves in one object: all must pass
 * A missing condition (undefined/null) passes.
 */
(function () {
	"use strict";

	const COMBINATORS = new Set(["all", "any", "not"]);

	function createCond() {
		/** @type {Map<string, {test: Function, describe?: Function}>} */
		const ops = new Map();

		const leaves = (cond) => Object.keys(cond).filter((k) => !COMBINATORS.has(k));

		const cond = {
			/**
			 * Register a leaf operator.
			 * @param {string} name
			 * @param {{ test: (spec: any, ctx: object) => boolean, describe?: (spec: any, ctx: object) => string }} def
			 */
			register(name, def) {
				if (COMBINATORS.has(name)) throw new setup.GameError(`"${name}" is reserved`);
				if (ops.has(name)) throw new setup.GameError(`Condition "${name}" already registered`);
				ops.set(name, def);
			},

			/** @returns {boolean} */
			has: (name) => ops.has(name),

			/**
			 * @param {unknown} c  Condition data.
			 * @param {object} [ctx]
			 * @returns {boolean}
			 */
			test(c, ctx = {}) {
				if (c == null || c === true) return true;
				if (c === false) return false;
				if (Array.isArray(c)) return c.every((x) => cond.test(x, ctx));
				if (typeof c !== "object") throw new setup.GameError(`Bad condition: ${JSON.stringify(c)}`);
				if ("all" in c && !c.all.every((x) => cond.test(x, ctx))) return false;
				if ("any" in c && !c.any.some((x) => cond.test(x, ctx))) return false;
				if ("not" in c && cond.test(c.not, ctx)) return false;
				for (const name of leaves(c)) {
					const op = ops.get(name);
					if (!op) throw new setup.GameError(`Unknown condition "${name}"`);
					if (!op.test(c[name], ctx)) return false;
				}
				return true;
			},

			/**
			 * Explain each leaf, so the UI can say why something is locked.
			 * @param {unknown} c
			 * @param {object} [ctx]
			 * @returns {{ ok: boolean, text: string }[]}
			 */
			explain(c, ctx = {}) {
				if (c == null || c === true) return [];
				if (c === false) return [{ ok: false, text: "Not available" }];
				if (Array.isArray(c)) return c.flatMap((x) => cond.explain(x, ctx));
				const out = [];
				if ("all" in c) out.push(...c.all.flatMap((x) => cond.explain(x, ctx)));
				if ("any" in c) {
					const parts = c.any.map((x) => cond.explain(x, ctx));
					out.push({ ok: cond.test({ any: c.any }, ctx), text: `One of: ${parts.map((p) => p.map((e) => e.text).join(" and ")).join("; or ")}` });
				}
				if ("not" in c) {
					const inner = cond.explain(c.not, ctx).map((e) => e.text).join(" and ");
					out.push({ ok: !cond.test(c.not, ctx), text: `Not: ${inner}` });
				}
				for (const name of leaves(c)) {
					const op = ops.get(name);
					const ok = cond.test({ [name]: c[name] }, ctx);
					const text = op && op.describe ? op.describe(c[name], ctx) : `${name}: ${JSON.stringify(c[name])}`;
					out.push({ ok, text });
				}
				return out;
			},

			/**
			 * List every leaf operator name used (for validation).
			 * @param {unknown} c
			 * @returns {string[]}
			 */
			ops(c) {
				if (c == null || typeof c !== "object") return [];
				if (Array.isArray(c)) return c.flatMap(cond.ops);
				const out = leaves(c);
				if (Array.isArray(c.all)) out.push(...c.all.flatMap(cond.ops));
				if (Array.isArray(c.any)) out.push(...c.any.flatMap(cond.ops));
				if ("not" in c) out.push(...cond.ops(c.not));
				return out;
			},
		};
		return cond;
	}

	setup.createCond = createCond;
})();
