/*
 * modules.js — module descriptors and install order (setup.modules, §6.2).
 *
 * Descriptor: { id, version, deps[], state?, defaultState?(), migrations?{},
 *               install(api), ready?(api), newGame?(api), validate?() }
 *  - install:  define types, register operators/hooks/listeners.
 *  - ready:    after content is loaded and the registry is frozen.
 *  - newGame:  after every module's state slice exists (StoryInit).
 */
(function () {
	"use strict";

	/** Engine services every module may depend on without declaring a module. */
	const SERVICES = new Set(["registry", "bus", "cond", "effects", "time", "sched", "rng", "flow", "fmt", "text", "ui", "config", "balance", "save"]);

	/**
	 * Topologically sort descriptors by `deps`. Throws on a missing dependency
	 * or a cycle. Ties keep id order, so the result never depends on file order.
	 * @param {object[]} list
	 * @returns {object[]}
	 */
	function sortModules(list) {
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
