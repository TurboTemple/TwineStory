/*
 * ============================================================================
 *  util.js — small helpers shared by the engine (setup.util)
 * ============================================================================
 *
 *   deepFreeze(obj)        make an object (and everything inside) read-only
 *   clone(value)           a deep copy of plain data
 *   valuesAt(obj, path)    every value at a field path, walking lists marked
 *                          with []: valuesAt(npc, "schedule[].at") → each place
 *   toArray(v)             a list from a single value or a list (null → [])
 *   parseData(text)        read plain data written in a passage, e.g.
 *                          '"Help her" { stat: { mood: 5 } }' → ["Help her", { stat: { mood: 5 } }]
 */
(function () {
	"use strict";

	/**
	 * Recursively freeze an object graph.
	 * @template T
	 * @param {T} obj
	 * @returns {T}
	 */
	function deepFreeze(obj) {
		if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
			Object.freeze(obj);
			for (const key of Object.keys(obj)) deepFreeze(obj[key]);
		}
		return obj;
	}

	/**
	 * Deep-copy plain data (objects, arrays, primitives).
	 * @template T
	 * @param {T} value
	 * @returns {T}
	 */
	function clone(value) {
		if (value === undefined) return undefined;
		return JSON.parse(JSON.stringify(value));
	}

	/**
	 * Collect every value at a field path. `[]` after a segment walks arrays:
	 * "district", "actions[]", "schedule[].at".
	 * @param {object} obj
	 * @param {string} path
	 * @returns {unknown[]} Values found (undefined/null values are skipped).
	 */
	function valuesAt(obj, path) {
		let current = [obj];
		for (const raw of path.split(".")) {
			const many = raw.endsWith("[]");
			const key = many ? raw.slice(0, -2) : raw;
			const next = [];
			for (const item of current) {
				if (item == null || typeof item !== "object") continue;
				const v = item[key];
				if (v == null) continue;
				if (many) {
					if (Array.isArray(v)) next.push(...v.filter((x) => x != null));
				}
				else next.push(v);
			}
			current = next;
		}
		return current;
	}

	/** Coerce a value or array of values to an array. */
	const toArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

	/**
	 * Read plain data the way content files write it, without running any
	 * code: strings ("…" or '…'), numbers, true/false/null, [lists] and
	 * { objects } whose keys may be bare words. Values can be separated by
	 * spaces or commas. Used by the story macros (<<when>>, <<choice>>).
	 * @param {string} text
	 * @returns {unknown[]} Every value, in order.
	 * @throws {Error} With the position of anything it can't read.
	 */
	function parseData(text) {
		let i = 0;
		const s = String(text);
		const fail = (msg) => {
			throw new Error(`${msg} at character ${i + 1} of: ${s.trim()}`);
		};
		const space = () => {
			while (i < s.length && /[\s,]/.test(s[i])) i++;
		};
		const word = () => {
			const m = /^[A-Za-z_$][\w$]*/.exec(s.slice(i));
			if (!m) fail("Expected a name");
			i += m[0].length;
			return m[0];
		};
		const str = () => {
			const q = s[i++];
			let out = "";
			while (i < s.length && s[i] !== q) {
				if (s[i] === "\\" && i + 1 < s.length) {
					const c = s[++i];
					out += c === "n" ? "\n" : c;
				}
				else out += s[i];
				i++;
			}
			if (s[i] !== q) fail("Unclosed quote");
			i++;
			return out;
		};
		const value = () => {
			space();
			const c = s[i];
			if (c === '"' || c === "'") return str();
			if (c === "[") {
				i++;
				const list = [];
				for (space(); s[i] !== "]"; space()) {
					if (i >= s.length) fail("Missing ]");
					list.push(value());
				}
				i++;
				return list;
			}
			if (c === "{") {
				i++;
				const obj = {};
				for (space(); s[i] !== "}"; space()) {
					if (i >= s.length) fail("Missing }");
					const key = s[i] === '"' || s[i] === "'" ? str() : word();
					space();
					if (s[i] !== ":") fail(`Expected : after "${key}"`);
					i++;
					obj[key] = value();
				}
				i++;
				return obj;
			}
			const num = /^-?\d+(\.\d+)?/.exec(s.slice(i));
			if (num) {
				i += num[0].length;
				return Number(num[0]);
			}
			const w = word();
			if (w === "true") return true;
			if (w === "false") return false;
			if (w === "null") return null;
			i -= w.length;
			return fail(`Unexpected "${w}" (text needs quotes)`);
		};
		const out = [];
		for (space(); i < s.length; space()) out.push(value());
		return out;
	}

	setup.util = { deepFreeze, clone, valuesAt, toArray, parseData };
})();
