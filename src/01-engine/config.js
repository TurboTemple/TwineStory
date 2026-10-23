/*
 * config.js — game configuration and SugarCube Config.* settings (§5.5).
 *
 * setup.config  : static configuration (not saved).
 * setup.balance : tunable numbers, filled in by the user over time. Modules
 *                 read from it with neutral defaults, e.g.
 *                 `setup.balance.someKey ?? defaultValue`.
 *
 * This is the only file allowed to touch Config.* and State.prng directly;
 * everything else goes through sc-adapter.js.
 */
(function () {
	"use strict";

	/** True when the page URL contains `?debug` (or `&debug`). */
	const debug = (function () {
		try {
			return new URLSearchParams(window.location.search).has("debug");
		}
		catch (ex) {
			return false;
		}
	})();

	/**
	 * Save-schema version. Bump whenever any module's `version` bumps (§6.10).
	 * @type {number}
	 */
	setup.SCHEMA_VERSION = 1;

	/** Static game configuration. */
	setup.config = {
		// DESIGN: user to decide — game title (also set in StoryTitle).
		title: "Life Sim",
		// DESIGN: user to decide — the city the game is set in.
		city: "Placeholder City",
		// DESIGN: user to decide — language, currency and clock format.
		locale: {
			lang: "en-GB",
			currency: "GBP",
			currencySymbol: "£",
			minorPerMajor: 100,
			clock: "24h",
		},
		// DESIGN: user to decide — calendar day 0 (UTC). $time.t counts minutes from here.
		epoch: "2026-09-01T00:00:00Z",
		// DESIGN: user to decide — when a new game starts, relative to the epoch.
		start: { day: 0, time: "07:00" },
		// DESIGN: user to decide — how many manual save slots the Menu offers.
		saves: { slots: 8 },
		// Debug tools (§13). Pinned so a CDN update can't break debugging.
		devtools: { erudaUrl: "https://cdn.jsdelivr.net/npm/eruda@3.4.3/eruda.js" },
		debug,
	};

	/** Tunable numbers. Intentionally empty — see the PR "Needs your decision" lists. */
	setup.balance = {};

	/* SugarCube configuration (§4). */
	Config.history.maxStates = 1;
	Config.history.controls = false;
	Config.cleanupWikifierOutput = true;
	Config.debug = debug;
	Config.enableOptionalDebugging = debug;
	Config.saves.version = setup.SCHEMA_VERSION;
	Config.saves.maxSlotSaves = setup.config.saves.slots;

	/* Seeded PRNG (§4.5). Must be called from Story JavaScript or StoryInit. */
	State.prng.init();
})();
