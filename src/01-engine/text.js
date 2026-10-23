/*
 * ============================================================================
 *  text.js — turning numbers into words (setup.fmt, setup.text, §6.11)
 * ============================================================================
 *
 * setup.fmt formats what the game stores for people to read:
 *   fmt.money(320)       → "£3.20"        (money is stored in pence)
 *   fmt.time(t)          → "14:05"        (or "2:05 pm" with the 12-hour setting)
 *   fmt.date(t)          → "Tue, 1 Sept"
 *   fmt.duration(95)     → "1 hour 35 minutes"
 * Currency, language and clock style come from setup.config.locale.
 *
 * setup.text has helpers for writing: pronouns for the player or an NPC
 * ("she"/"her"…), plurals, "a, b and c" lists, and vary(), which picks one of
 * several wordings and keeps the same choice every time the page redraws.
 */
(function () {
	"use strict";

	const PRONOUNS = {
		"they/them": { they: "they", them: "them", their: "their", theirs: "theirs", themself: "themself", plural: true },
		"she/her": { they: "she", them: "her", their: "her", theirs: "hers", themself: "herself", plural: false },
		"he/him": { they: "he", them: "him", their: "his", theirs: "his", themself: "himself", plural: false },
	};

	function createFmt() {
		const L = () => setup.config.locale;
		const at = (t) => new Date(Date.parse(setup.config.epoch) + t * 60000);
		/** The player's clock setting wins over the locale default. */
		const clock12 = () => {
			const pref = setup.sc.settings.get("clock");
			return typeof pref === "string" ? pref === "12-hour" : L().clock === "12h";
		};

		return {
			/**
			 * @param {number} minor  Integer minor units (pence).
			 * @returns {string} e.g. "£12.50"
			 */
			money(minor) {
				const l = L();
				return new Intl.NumberFormat(l.lang, { style: "currency", currency: l.currency }).format(minor / l.minorPerMajor);
			},

			/** @returns {string} Clock time, e.g. "07:05" or "7:05 am". */
			time(t) {
				const m = setup.time.minuteOfDay(t);
				const h = Math.floor(m / 60);
				const mm = String(m % 60).padStart(2, "0");
				if (clock12()) return `${h % 12 || 12}:${mm} ${h < 12 ? "am" : "pm"}`;
				return `${String(h).padStart(2, "0")}:${mm}`;
			},

			/** @returns {string} Calendar date, e.g. "Tue 1 Sept". */
			date(t) {
				return new Intl.DateTimeFormat(L().lang, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(at(t));
			},

			/** @returns {string} e.g. "2 hours", "1 hour 30 minutes", "1 day 2 hours". */
			duration(mins) {
				const plural = setup.text.plural;
				const d = Math.floor(mins / 1440);
				const h = Math.floor((mins % 1440) / 60);
				const m = mins % 60;
				const parts = [];
				if (d) parts.push(`${d} ${plural(d, "day")}`);
				if (h) parts.push(`${h} ${plural(h, "hour")}`);
				if (m || !parts.length) parts.push(`${m} ${plural(m, "minute")}`);
				return parts.join(" ");
			},
		};
	}

	function createText() {
		return {
			/** @returns {string} `one` when n is 1, otherwise `many` (default one + "s"). */
			plural: (n, one, many = `${one}s`) => (n === 1 ? one : many),

			/** @returns {string} "a", "a and b", "a, b and c". */
			list(items) {
				if (items.length <= 1) return items.join("");
				return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
			},

			/**
			 * Pronoun set for "she/her", "he/him", "they/them" or a custom "x/y".
			 * @param {string} [spec]
			 * @returns {{they: string, them: string, their: string, theirs: string, themself: string, plural: boolean}}
			 */
			pronouns(spec = "they/them") {
				if (PRONOUNS[spec]) return PRONOUNS[spec];
				const [a, b = a] = String(spec).split("/");
				return { they: a, them: b, their: b, theirs: b, themself: `${b}self`, plural: false };
			},

			/**
			 * Part of the day, for descriptions: "morning" (05–12), "afternoon"
			 * (12–17), "evening" (17–21) or "night".
			 * @param {number} [t]
			 */
			period(t = setup.time.now()) {
				const h = setup.time.hour(t);
				if (h >= 5 && h < 12) return "morning";
				if (h >= 12 && h < 17) return "afternoon";
				if (h >= 17 && h < 21) return "evening";
				return "night";
			},

			/** Capitalise the first letter. */
			cap: (s) => (s ? s[0].toUpperCase() + s.slice(1) : s),

			/**
			 * Pick a text variant that stays the same for the same key, so it
			 * doesn't change when a passage re-renders.
			 * @param {string} key @param {string[]} variants
			 */
			vary: (key, variants) => setup.rng.seeded(`vary:${key}`).pick(variants),
		};
	}

	setup.createFmt = createFmt;
	setup.createText = createText;
})();
