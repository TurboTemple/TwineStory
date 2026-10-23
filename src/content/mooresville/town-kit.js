/*
 * ============================================================================
 *  Mooresville — shared shorthand for the content files
 * ============================================================================
 *
 * Small helpers that the other town-*.js files use, so they read more like
 * plain English. Nothing in here is game content by itself.
 *
 *   const { DAYS, hours, mod } = setup.town;
 *
 *   mod.add("mood", -6)             → a stat modifier (see `mod` below)
 *   DAYS.WEEKDAYS                   → [1, 2, 3, 4, 5]   (0 = Sunday … 6 = Saturday)
 *   hours.daily("07:00", "22:00")   → open every day 07:00–22:00
 *   hours.on(DAYS.SAT, "09:00", "17:00")  → open on Saturdays only
 *
 * Money is always whole pounds: price: 20 means £20 (decided by the user).
 *
 * Times are always 24-hour "HH:MM" text. A closing time of "24:00" means
 * midnight, and a range like "22:00"–"02:00" runs past midnight.
 */
(function () {
	"use strict";

	/** Days of the week as the game numbers them (0 = Sunday … 6 = Saturday). */
	const DAYS = Object.freeze({
		SUN: [0],
		MON: [1],
		TUE: [2],
		WED: [3],
		THU: [4],
		FRI: [5],
		SAT: [6],
		WEEKDAYS: [1, 2, 3, 4, 5],
		MON_SAT: [1, 2, 3, 4, 5, 6],
		WEEKEND: [0, 6],
	});

	setup.town = Object.freeze({
		DAYS,

		/**
		 * Stat modifiers, for `modifiers: [ … ]` on effects and clothes.
		 * They apply only while the effect is active (or the clothes are worn),
		 * and the Profile tab describes them in words.
		 *
		 *   mod.add("mood", -6)        Mood shows 6 lower ("Mood −6")
		 *   mod.times("mood", 1.5)     Mood shows half as much again ("Mood ×1.5")
		 *   mod.perHour("energy", -3)  Energy goes down 3 more each hour ("Energy −3 an hour")
		 *   mod.speed("food", 0.5)     Food changes half as fast ("Food changes 50% slower")
		 */
		mod: Object.freeze({
			add: (stat, value) => ({ stat, op: "add", value }),
			times: (stat, value) => ({ stat, op: "mul", value }),
			perHour: (stat, value) => ({ stat, op: "rateAdd", value }),
			speed: (stat, value) => ({ stat, op: "rateMul", value }),
		}),

		/** Opening hours, for a place's `hours: [ … ]` list. */
		hours: Object.freeze({
			/** Open every day between these times. */
			daily: (from, to) => ({ from, to }),
			/** Open on these days (a DAYS list) between these times. */
			on: (days, from, to) => ({ days, from, to }),
		}),
	});
})();
