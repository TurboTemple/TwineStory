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
	setup.SCHEMA_VERSION = 4;

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
		// The player character. Age 18 at start was decided by the user (§1);
		// the default name and pronoun choices are Claude's proposals.
		pc: {
			startAge: 18,
			defaultName: "Alex",
			pronounOptions: ["she/her", "he/him", "they/them"],
		},
		// Where a new game starts (falls back to a location tagged "start").
		startLocation: "home_bedroom",
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
		// Clothing (proposed by Claude): to go out you need something on top,
		// something on the bottom (or a dress covering both) and shoes, and
		// no sleepwear.
		clothing: {
			dressed: { cover: [["top"], ["bottom"], ["feet"]], notOutside: ["sleepwear"] },
		},
		// Decided by the user: manual save slots in the Menu.
		saves: { slots: 12, autosaves: 1 },
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
	// One autosave slot. SugarCube autosaves as a passage finishes, when the
	// rule allows: the journal allows it only on the wake-up summary.
	Config.saves.maxAutoSaves = setup.config.saves.autosaves;

	/*
	 * Player preferences (Setting API). SugarCube loads saved settings straight
	 * after Story JavaScript runs, so they must be registered here rather than
	 * at boot. They apply as data attributes on <html> for the CSS to use.
	 */
	const applyPrefs = () => {
		const root = document.documentElement;
		root.dataset.theme = String(settings.theme ?? "Auto").toLowerCase();
		root.dataset.textsize = String(settings.textSize ?? "Medium").toLowerCase();
	};
	Setting.addList("theme", { label: "Theme", list: ["Auto", "Light", "Dark"], default: "Auto", onInit: applyPrefs, onChange: applyPrefs });
	Setting.addList("textSize", { label: "Text size", list: ["Small", "Medium", "Large"], default: "Medium", onInit: applyPrefs, onChange: applyPrefs });
	Setting.addList("clock", { label: "Clock", list: ["24-hour", "12-hour"], default: setup.config.locale.clock === "12h" ? "12-hour" : "24-hour" });

	/* Seeded PRNG (§4.5). Must be called from Story JavaScript or StoryInit. */
	State.prng.init();
})();
