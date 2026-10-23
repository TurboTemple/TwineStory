/*
 * errors.js — setup.GameError and setup.reportError (§9).
 *
 * Errors are loud in debug mode (console + on-screen banner) and graceful in
 * release mode (console warning only, the game carries on where it can).
 */
(function () {
	"use strict";

	/**
	 * An error raised by the engine or a module.
	 * @param {string} message  Human-readable description.
	 * @param {object} [data]   Extra plain data to help debugging.
	 */
	class GameError extends Error {
		constructor(message, data) {
			super(message);
			this.name = "GameError";
			this.data = data;
		}
	}

	setup.GameError = GameError;

	/**
	 * Report an error. In debug mode it is shown on screen; in release mode it
	 * is only logged, so players aren't interrupted.
	 * @param {unknown} err
	 * @param {string} [where]  Short label for where it happened.
	 */
	setup.reportError = function reportError(err, where) {
		const label = where ? `[${where}] ` : "";
		const message = err instanceof Error ? err.message : String(err);
		if (setup.config && setup.config.debug) {
			console.error(`${label}${message}`, err);
			if (setup.sc && typeof setup.sc.banner === "function") {
				setup.sc.banner(`${label}${message}`, "error");
			}
		}
		else {
			console.warn(`${label}${message}`);
		}
	};
})();
