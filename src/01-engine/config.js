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
	setup.SCHEMA_VERSION = 2;

	/** Static game configuration. */
	setup.config = {
		// Decided by the user ("for now"); also set in StoryTitle.
		title: "Life Sim",
		// Decided by the user.
		city: "Mooresville",
		// Decided by the user: language, currency and clock format.
		locale: {
			lang: "en-GB",
			currency: "GBP",
			currencySymbol: "£",
			minorPerMajor: 100,
			clock: "24h",
		},
		// Decided by the user: calendar day 0 (UTC). $time.t counts minutes from here.
		epoch: "2026-09-01T00:00:00Z",
		// Decided by the user: when a new game starts, relative to the epoch.
		start: { day: 0, time: "07:00" },
		// Decided by the user (§1): the player character is 18 at game start.
		pc: { startAge: 18 },
		// Random events (see the events module README).
		events: {
			// Decided by the user: random events roll each event's own `chance`.
			// "none" turns random events off.
			selector: "chance",
			// Proposed by Claude at the user's request; adjust freely.
			// At most this many random events per in-game day (null = no limit).
			maxRandomPerDay: 4,
			// At least this many minutes between two random events.
			minGapMins: 60,
		},
		// Decided by the user: manual save slots in the Menu.
		saves: { slots: 12 },
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
