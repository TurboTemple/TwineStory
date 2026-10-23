/*
 * ============================================================================
 *  TEMPLATE — a storyline from start to finish (copy this file)
 * ============================================================================
 *
 * This file is NOT part of the game: it lives outside src/, so it's never
 * loaded. To start a new storyline:
 *   1. Copy this file to src/content/mooresville/town-<your story>.js
 *   2. Copy templates/storyline.twee to src/story/mooresville/<your story>.twee
 *   3. Replace every "my_story" with your own id (lowercase_with_underscores),
 *      and the place "high_street" with wherever your story happens.
 *   4. Write your text in the .twee file.
 * The checker tells you about anything misspelt. Test it with ?debug: the
 * Debug tools can jump a storyline to any stage.
 *
 * What this example does (the game's core loop):
 *   - Walking onto the High Street, you meet someone who needs help: an
 *     event with two choices (Ev_my_story_meet).
 *   - Agreeing starts the storyline at "helping". The phone's Diary shows
 *     the stage's hint.
 *   - A repeatable task ("Help out") counts towards the story. Each go has
 *     a random outcome; being tired makes a bad one likelier.
 *   - After 3 goes, the next stage starts with its own event, and a reward
 *     (an action only shown from then on) unlocks.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/* ======================================================================
		 *  1. The storyline: its stages
		 * ====================================================================== */

		R.define("storyline", {
			id: "my_story",
			label: "My story",                 // shown in the Diary
			stages: [
				{
					id: "helping",
					label: "Lending a hand",
					desc: "You said you'd help out on the High Street.",
					hint: "Go to the High Street and help out.", // the Diary's "Next:" line
					gates: [
						// Move on after 3 goes. The number is never shown in the game.
						{ to: "done", when: { storylineCount: { key: "visits", min: 3 } } },
					],
				},
				{
					id: "done",
					label: "All done",
					desc: "You helped out, and it was noticed.",
					enter: "my_story_done",            // the event shown on reaching this stage
					onEnter: [{ stat: { mood: 5 } }],  // what reaching it does
				},
			],
		});

		/* ======================================================================
		 *  2. How it starts: an event with a choice
		 * ======================================================================
		 *
		 * kind "story": it happens every time its conditions are true (here:
		 * on the High Street, the story hasn't started, and not more than once
		 * a day). The choices are in the passage (storyline.twee).
		 */

		R.define("storylet", {
			id: "my_story_meet",
			kind: "story",
			passage: "Ev_my_story_meet",
			triggers: ["world:enter"],
			conditions: { at: "high_street", storyline: { id: "my_story", started: false } },
			cooldown: 1440, // if you say "not now", ask again tomorrow
		});

		/* ======================================================================
		 *  3. The repeatable task
		 * ====================================================================== */

		R.define("action", {
			id: "my_story_help",
			label: "Help out",
			at: "high_street",
			mins: 60,
			hidden: true, // only shown while the story is at "helping"
			conditions: { storyline: { id: "my_story", stage: "helping" } },
			effects: [
				{ storylineCount: { id: "my_story", key: "visits" } }, // one more go
				{
					random: [
						{ weight: 3, then: [{ note: "It went fine." }] },
						{ weight: 1, then: [{ note: "It went really well." }, { stat: { mood: 3 } }] },
						{
							weight: 1,
							weightIf: [{ when: { stat: { id: "energy", max: 30 } }, add: 2 }], // likelier when tired
							then: [{ note: "You were too tired to be much use. That one didn't count." }, { storylineCount: { id: "my_story", key: "visits", add: -1 } }],
						},
					],
				},
			],
		});

		/* ======================================================================
		 *  4. The reward: only from the "done" stage on
		 * ====================================================================== */

		R.define("action", {
			id: "my_story_reward",
			label: "Say hello to your new friends",
			at: "high_street",
			mins: 10,
			hidden: true,
			conditions: { storyline: { id: "my_story", stage: "done" } },
			effects: [{ stat: { mood: 2 } }],
		});

		/* ======================================================================
		 *  5. The stage events
		 * ====================================================================== */

		// kind "manual": nothing triggers it; reaching the stage shows it.
		R.define("storylet", { id: "my_story_done", kind: "manual", passage: "Ev_my_story_done" });
	});
})();
