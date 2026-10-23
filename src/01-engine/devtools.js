/*
 * devtools.js — debug-mode tooling (§13). Only runs when the URL has `?debug`.
 *
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
