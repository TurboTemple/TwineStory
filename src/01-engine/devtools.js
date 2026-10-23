/*
 * ============================================================================
 *  devtools.js — debug-mode helpers (§13)
 * ============================================================================
 *
 * Only runs when the address ends in ?debug. It:
 * - loads the Eruda on-screen console (pinned version, see setup.config.devtools)
 * - exposes `window.GAME = setup` for poking at the engine from the console
 */
(function () {
	"use strict";

	setup.devtools = {
		/** Called by setup.boot() in debug mode only. */
		init() {
			window.GAME = setup;
			setup.sc.loadScript(setup.config.devtools.erudaUrl)
				.then(() => {
					window.eruda.init();
				})
				.catch((err) => setup.reportError(err, "devtools"));
		},
	};
})();
