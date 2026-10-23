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

	setup.util = { deepFreeze, clone, valuesAt, toArray };
})();
