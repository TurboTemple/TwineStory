/*
 * ============================================================================
 *  STORY: The Coffee Shop Owner (storyline id "coffee_shop")
 * ============================================================================
 *
 * Central character: Lenny, 63, who owns The Daily Grind (decided by the
 * user: it's the only coffee shop). Jess runs the morning shift for him.
 * Starts when you get the job at the café (the barista job reaches its
 * first stage, "hired": town-work.js). Each shift you work adds 1 to the
 * progression (the job's `effects` in town-work.js).
 *
 * Text: src/story/mooresville/stories/story-coffee-shop.twee
 *
 *   1. The character
 *   2. The storyline (stages; add more as you write)
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { DAYS } = setup.town;

		/* ---- 1. The character ---------------------------------------------- */

		R.define("npc", {
			id: "lenny",
			name: "Lenny",
			age: 63,
			pronouns: "he/him",
			role: "owner of The Daily Grind",
			tags: ["story"],
			desc: "Owns The Daily Grind. [Describe Lenny here]",
			schedule: [{ at: "grind_seating", from: "08:00", to: "14:00", days: DAYS.MON_SAT }],
		});

		/* ---- 2. The storyline ------------------------------------------------ */

		R.define("storyline", {
			id: "coffee_shop",
			label: "The Coffee Shop Owner",
			// Starts when you get the job (the barista storyline starts).
			begin: { on: ["storyline:stage"], when: { storyline: { id: "barista_job" } } },
			stages: [
				{
					id: "start",
					label: "Working for Lenny",
					enter: "coffee_shop_start",
					hint: "Work shifts at The Daily Grind.",
				},
			],
		});

		R.define("storylet", { id: "coffee_shop_start", kind: "manual", passage: "Ev_coffee_shop_start" });
	});
})();
