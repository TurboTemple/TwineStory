/*
 * ============================================================================
 *  STORY: The Cosplay Club (storyline id "cosplay_club")
 * ============================================================================
 *
 * Central characters: John (21), Arvel (22) and Micheal (23), who run a
 * cosplay club in the Main Hall at Northfield Community Centre (near the
 * Academy): Tuesday and Thursday evenings, and Saturday afternoons.
 *
 * How it starts (decided by the user):
 *   1. A random event at school: one of them comes up to you and asks you
 *      to come along (part 3; one event per member, so each can ask in
 *      his own words). After that the club's "Go to the club" is unlocked.
 *   2. The story starts the first time you go. Every meeting you go to,
 *      the first included, adds 1 to the progression.
 *
 * Text: src/story/mooresville/stories/story-cosplay-club.twee
 *
 *   1. The characters
 *   2. The storyline (stages; add more as you write)
 *   3. The invitation (random events at school)
 *   4. The repeatable task (a club meeting)
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
			stages: [
				{
					id: "start",
					label: "Your first meeting",
					enter: "cosplay_club_start",
					hint: "The cosplay club meets at the community centre on Tuesday and Thursday evenings, and Saturday afternoons.",
				},
			],
		});

		R.define("storylet", { id: "cosplay_club_start", kind: "manual", passage: "Ev_cosplay_club_start" });

		/* ---- 3. The invitation: a random event at school --------------------- */

		// One event per member; whichever comes up, the others won't (the
		// "cosplay_invited" flag). chance is per lunchtime at school
		// (the trigger "school:break").
		const invite = (who) => R.define("storylet", {
			id: `cosplay_invite_${who}`,
			passage: `Ev_cosplay_invite_${who}`,
			triggers: ["school:break"],
			conditions: { not: { flag: "cosplay_invited" } },
			chance: 0.1,     // DESIGN: how likely (10% each lunchtime, per member)
			group: "cosplay_invite",
			cooldown: 1440,  // at most one a day
			effects: [{ meet: who }, { flag: "cosplay_invited" }],
		});
		invite("john");
		invite("arvel");
		invite("micheal");

		/* ---- 4. The repeatable task ------------------------------------------ */

		R.define("action", {
			id: "cosplay_club_meeting",
			label: "Join in with the cosplay club",
			at: "community_hall",
			mins: 120,
			showIf: { flag: "cosplay_invited" }, // only once you've been asked
			conditions: { any: [{ npcHere: "john" }, { npcHere: "arvel" }, { npcHere: "micheal" }] },
			effects: [
				{ if: { cond: { storyline: { id: "cosplay_club", started: false } }, then: [{ storyline: { id: "cosplay_club", to: "start" } }] } },
				{ progression: "cosplay_club" },
			],
		});
	});
})();
