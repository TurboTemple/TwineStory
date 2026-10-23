/*
 * ============================================================================
 *  STORY: The Mystery Donator (storyline id "mystery_donator")
 * ============================================================================
 *
 * Central character: someone who donates to your stream. You don't know who
 * they are: the name shows as "???" and the age as unknown. (`age` is still
 * set for the game's age rules: change it when you decide who they are.)
 * Starts the first time you go live from your computer. Each stream after
 * that adds 1 to the progression.
 *
 * Text: src/story/mooresville/stories/story-mystery-donator.twee
 *
 *   1. The character
 *   2. The storyline (stages; add more as you write)
 *   3. The repeatable task (streaming)
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/* ---- 1. The character ---------------------------------------------- */

		R.define("npc", {
			id: "mystery_donator",
			name: "???",
			age: 30,         // DESIGN: user to decide (hidden from the player)
			ageKnown: false, // the sheet says "Unknown"
			pronouns: "they/them",
			role: "donates to your stream",
			tags: ["story", "online"],
			online: true,
			desc: "Someone keeps donating to your stream. [Describe the mystery donator here]",
		});

		/* ---- 2. The storyline ------------------------------------------------ */

		R.define("storyline", {
			id: "mystery_donator",
			label: "The Mystery Donator",
			stages: [
				{
					id: "start",
					label: "A donation",
					enter: "mystery_donator_start",
					onEnter: [{ meet: "mystery_donator" }],
					hint: "Go live on your stream from your computer.",
				},
			],
		});

		R.define("storylet", { id: "mystery_donator_start", kind: "manual", passage: "Ev_mystery_donator_start" });

		/* ---- 3. The repeatable task ------------------------------------------ */

		R.define("action", {
			id: "mystery_donator_stream",
			label: "Go live on your stream",
			atTag: "computer",
			mins: 120,
			effects: [
				{
					if: {
						cond: { storyline: { id: "mystery_donator", started: false } },
						then: [{ storyline: { id: "mystery_donator", to: "start" } }],
						else: [{ progression: "mystery_donator" }],
					},
				},
			],
		});
	});
})();
