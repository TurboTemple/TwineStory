/*
 * boot.js — setup.boot() and setup.newGame() (§5.2, §6.1).
 *
 * Phase 0 skeleton: boots the debug tools and creates $meta. Phase 1 adds the
 * module system (topological install, content loading, registry freeze and
 * validation) here.
 */
(function () {
	"use strict";

	let booted = false;

	/**
	 * Start the engine. Runs once, from the `Sys_Boot` init passage, after all
	 * Story JavaScript has been evaluated.
	 */
	setup.boot = function boot() {
		if (booted) {
			return;
		}
		booted = true;

		if (setup.config.debug) {
			setup.devtools.init();
		}
	};

	/**
	 * Create the state for a new game. Called only from StoryInit.
	 */
	setup.newGame = function newGame() {
		const V = setup.vars();
		V.meta = {
			schemaVersion: setup.SCHEMA_VERSION,
			schema: {},
		};
	};
})();
