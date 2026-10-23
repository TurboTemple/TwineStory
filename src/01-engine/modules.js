/*
 * ============================================================================
 *  modules.js — game systems and the order they start in (§6.2)
 * ============================================================================
 *
 * A "module" is one game system (clothing, jobs, weather…), in its own
 * folder under src/modules/. Each module file adds a descriptor object to
 * setup.__modules:
 *
 *   {
 *     id: "jobs",                 unique name
 *     version: 1,                 bump when its saved data changes shape
 *     deps: ["storylines", …],    modules that must be installed first
 *     state: "job",               its slice of saved data ($job)
 *     defaultState: () => ({…}),  that slice on a new game
 *     migrations: { 2: fn },      how to upgrade old saves to version 2, 3…
 *     install(api),               define data types, conditions, effects,
 *                                 screens and event listeners
 *     ready(api),                 after all content is defined (build indexes)
 *     newGame(api),               after every slice exists on a new game
 *     validate(),                 extra checks; return a list of problems
 *   }
 *
 * This file sorts the descriptors so every module installs after its deps,
 * and keeps the installed list (setup.modules.has("phone") etc.).
 */
(function () {
	"use strict";

	/** Engine services every module may depend on without declaring a module. */
	const SERVICES = new Set(["registry", "bus", "cond", "effects", "time", "sched", "rng", "flow", "fmt", "text", "ui", "config", "balance", "save", "media"]);

	/**
	 * Topologically sort descriptors by `deps`. Throws on a missing dependency
	 * or a cycle. Ties keep id order, so the result never depends on file order.
	 * @param {object[]} list
	 * @returns {object[]}
	 */
	function sortModules(list) {
		// A depth-first walk: before adding a module, add everything it
		// depends on. "visiting" marks modules on the current path, so
		// meeting one again means the dependencies go round in a circle.
		const byId = new Map();
		for (const m of list) {
			if (byId.has(m.id)) throw new setup.GameError(`Duplicate module "${m.id}"`);
			byId.set(m.id, m);
		}
		const order = [];
		const state = new Map(); // id -> "visiting" | "done"
		const visit = (id, path) => {
			if (state.get(id) === "done") return;
			if (state.get(id) === "visiting") throw new setup.GameError(`Module dependency cycle: ${[...path, id].join(" → ")}`);
			state.set(id, "visiting");
			const m = byId.get(id);
			for (const dep of [...(m.deps ?? [])].sort()) {
				if (SERVICES.has(dep)) continue;
				if (!byId.has(dep)) throw new setup.GameError(`Module "${id}" depends on missing module "${dep}"`);
				visit(dep, [...path, id]);
			}
			state.set(id, "done");
			order.push(m);
		};
		for (const id of [...byId.keys()].sort()) visit(id, []);
		return order;
	}

	function createModules() {
		let installed = [];
		return {
			sort: sortModules,
			/** @param {object[]} list Already-sorted descriptors. */
			setInstalled(list) {
				installed = list;
			},
			/** @returns {object[]} Installed descriptors in install order. */
			list: () => installed,
			/** @returns {object|undefined} */
			get: (id) => installed.find((m) => m.id === id),
			/** @returns {boolean} */
			has: (id) => installed.some((m) => m.id === id),
		};
	}

	setup.createModules = createModules;
	setup.sortModules = sortModules;
})();
