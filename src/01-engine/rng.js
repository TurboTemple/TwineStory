/*
 * ============================================================================
 *  rng.js — dice rolls (setup.rng, §6.7)
 * ============================================================================
 *
 * All randomness in the game goes through here, never Math.random(). Two kinds:
 *
 *   setup.rng.chance(0.5), .pick(list), .weighted(list)…
 *       The main roll, for things that happen once (does the receptionist
 *       interrupt?). It uses SugarCube's seeded generator, which is saved,
 *       so loading a save and doing the same thing gives the same result.
 *
 *   setup.rng.seeded("weather:12").float()
 *       A separate generator made from the game's seed plus a name. It
 *       always gives the same answer for the same name, so a value can be
 *       worked out again whenever it's needed instead of being saved
 *       (the weather on day 12, the atmosphere line this hour).
 *
 * weighted(list) picks one item, where each item's `weight` says how likely
 * it is relative to the others (2 is twice as likely as 1).
 */
(function () {
	"use strict";

	/** FNV-1a 32-bit hash of a string. */
	function hash(str) {
		let h = 0x811c9dc5;
		for (let i = 0; i < str.length; i++) {
			h ^= str.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return h >>> 0;
	}

	/** mulberry32 PRNG: returns a function producing floats in [0, 1). */
	function mulberry32(seed) {
		let a = seed >>> 0;
		return function () {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/**
	 * Build the generator API on top of a float source.
	 * @param {() => number} float  Returns a float in [0, 1).
	 */
	function makeGen(float) {
		const gen = {
			/** @returns {number} Float in [0, 1). */
			float: () => float(),
			/** @returns {number} Integer in [min, max] inclusive. */
			int: (min, max) => min + Math.floor(float() * (max - min + 1)),
			/** @param {number} p Probability 0–1. @returns {boolean} */
			chance: (p) => float() < p,
			/** @returns {*} A random element (undefined if empty). */
			pick: (arr) => (arr.length ? arr[Math.floor(float() * arr.length)] : undefined),
			/**
			 * Pick by weight. Items are `{ weight, … }`; non-positive weights never win.
			 * @returns {*} The chosen item (undefined if nothing has weight).
			 */
			weighted(items) {
				const total = items.reduce((s, it) => s + Math.max(0, it.weight ?? 0), 0);
				if (total <= 0) return undefined;
				let roll = float() * total;
				for (const it of items) {
					roll -= Math.max(0, it.weight ?? 0);
					if (roll < 0) return it;
				}
				return items[items.length - 1];
			},
			/** @returns {Array} A shuffled copy. */
			shuffle(arr) {
				const out = [...arr];
				for (let i = out.length - 1; i > 0; i--) {
					const j = Math.floor(float() * (i + 1));
					[out[i], out[j]] = [out[j], out[i]];
				}
				return out;
			},
		};
		return gen;
	}

	function createRng() {
		const rng = makeGen(() => setup.sc.random());
		/**
		 * Deterministic sub-generator for a key, e.g. `seeded("weather:12")`.
		 * @param {string} key
		 */
		rng.seeded = (key) => makeGen(mulberry32(hash(`${setup.vars().meta.seed}:${key}`)));
		rng.hash = hash;
		return rng;
	}

	setup.createRng = createRng;
	setup.makeRngGen = makeGen;
	setup.mulberry32 = mulberry32;
})();
