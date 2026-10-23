/*
 * ============================================================================
 *  STORY: The Cosplay Club (storyline id "cosplay_club")
 * ============================================================================
 *
 * Central characters: John (21), Arvel (22) and Micheal (23), who run a
 * cosplay club in the Main Hall at Northfield Community Centre (near the
 * Academy): Tuesday and Thursday evenings, and Saturday afternoons.
 * Starts the first time you meet any of them. Each club meeting you join
 * adds 1 to the progression.
 *
 * Text: src/story/mooresville/stories/story-cosplay-club.twee
 *
 *   1. The characters
 *   2. The storyline (stages; add more as you write)
 *   3. The repeatable task (a club meeting)
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/** When the club meets: Tuesday and Thursday evenings, Saturday afternoons. */
		const clubTimes = [
			{ at: "community_hall", from: "18:30", to: "21:00", days: [2, 4] }, // Tue, Thu
			{ at: "community_hall", from: "12:00", to: "17:00", days: [6] },    // Sat
		];

		/* ---- 1. The characters --------------------------------------------- */

		const member = (def) => R.define("npc", { pronouns: "he/him", role: "cosplay club", tags: ["story", "cosplay_club"], schedule: clubTimes, ...def });

		member({ id: "john", name: "John", age: 21, desc: "One of the cosplay club. [Describe John here]" });
		member({ id: "arvel", name: "Arvel", age: 22, desc: "One of the cosplay club. [Describe Arvel here]" });
		member({ id: "micheal", name: "Micheal", age: 23, desc: "One of the cosplay club. [Describe Micheal here]" });

		/* ---- 2. The storyline ------------------------------------------------ */

		R.define("storyline", {
			id: "cosplay_club",
			label: "The Cosplay Club",
			begin: { on: ["npc:met"], when: { withNpc: ["john", "arvel", "micheal"] } }, // meet any of them
			stages: [
				{
					id: "start",
					label: "Meeting the club",
					enter: "cosplay_club_start",
					hint: "The cosplay club meets at the community centre on Tuesday and Thursday evenings, and Saturday afternoons.",
				},
			],
		});

		R.define("storylet", { id: "cosplay_club_start", kind: "manual", passage: "Ev_cosplay_club_start" });

		/* ---- 3. The repeatable task ------------------------------------------ */

		R.define("action", {
			id: "cosplay_club_meeting",
			label: "Join in with the cosplay club",
			at: "community_hall",
			mins: 120,
			showIf: { storyline: { id: "cosplay_club" } },
			conditions: { any: [{ npcHere: "john" }, { npcHere: "arvel" }, { npcHere: "micheal" }] },
			effects: [{ progression: "cosplay_club" }],
		});
	});
})();
