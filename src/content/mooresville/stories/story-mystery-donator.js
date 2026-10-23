/*
 * ============================================================================
 *  STORY: The Mystery Donator (storyline id "mystery_donator")
 * ============================================================================
 *
 * Central character: someone who donates to your stream. You don't know who
 * he is: the name shows as "???" and the age as unknown. (`age` is still
 * set for the game's age rules: change it when you decide who he is.)
 *
 * How it starts (decided by the user): each time you stream there's a
 * random chance (part 3) of an email from him, which starts the story.
 * Every stream after that adds 1 to the progression.
 *
 * Text: src/story/mooresville/stories/story-mystery-donator.twee
 * (The email itself is in part 3 below; it arrives in the phone's Email app.)
 *
 *   1. The character
 *   2. The storyline (stages; add more as you write)
 *   3. The repeatable task (streaming), with the chance of the email
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
			pronouns: "he/him",
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
					label: "An email",
					enter: "mystery_donator_start",
					onEnter: [{ meet: "mystery_donator" }],
					hint: "Go live on your stream from your computer.",
				},
			],
		});

		R.define("storylet", { id: "mystery_donator_start", kind: "manual", passage: "Ev_mystery_donator_start" });

		/* ---- 3. The repeatable task: streaming ------------------------------- */

		R.define("action", {
			id: "go_live",
			label: "Go live on your stream",
			atTag: "computer",
			mins: 120,
			effects: [
				{
					if: {
						cond: { storyline: { id: "mystery_donator", started: false } },
						// Before the story: a chance of the email (weights 1 : 4 = 20%).
						then: [{
							random: [
								{
									weight: 1, // DESIGN: how likely
									then: [
										{ message: { from: "mystery_donator", via: "email", subject: "[Email subject edit here]", text: "[The Mystery Donator email edit here]" } },
										{ storyline: { id: "mystery_donator", to: "start" } },
									],
								},
								{ weight: 4, then: [] },
							],
						}],
						// After it: every stream counts.
						else: [{ progression: "mystery_donator" }],
					},
				},
			],
		});
	});
})();
