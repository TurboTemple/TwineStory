/*
 * ============================================================================
 *  STORY: The MMO Clan (storyline id "mmo_clan")
 * ============================================================================
 *
 * Central character: xXWolfHowlXx, 22, who leads a clan in the online game
 * Ashen Realms. Online people aren't anywhere in town: you reach them from
 * a computer (rooms tagged "computer": your bedroom, or the flat's).
 * Starts the first time you play online. Each evening playing with the
 * clan after that adds 1 to the progression.
 *
 * Text: src/story/mooresville/stories/story-mmo-clan.twee
 *
 *   1. The character
 *   2. The storyline (stages; add more as you write)
 *   3. The repeatable task (playing online)
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/* ---- 1. The character ---------------------------------------------- */

		R.define("npc", {
			id: "wolfhowl",
			name: "xXWolfHowlXx",
			age: 22,
			pronouns: "he/him",
			role: "clan leader (online)",
			tags: ["story", "online"],
			online: true, // their sheet says "Online" instead of a place
			desc: "Leads a clan in Ashen Realms. [Describe xXWolfHowlXx here]",
		});

		/* ---- 2. The storyline ------------------------------------------------ */

		R.define("storyline", {
			id: "mmo_clan",
			label: "The MMO Clan",
			stages: [
				{
					id: "start",
					label: "Joining the clan",
					enter: "mmo_clan_start",
					onEnter: [{ meet: "wolfhowl" }],
					hint: "Log in to Ashen Realms from your computer and play with the clan.",
				},
			],
		});

		R.define("storylet", { id: "mmo_clan_start", kind: "manual", passage: "Ev_mmo_clan_start" });

		/* ---- 3. The repeatable task ------------------------------------------ */

		// The first time starts the story; after that, each go counts.
		R.define("action", {
			id: "mmo_clan_play",
			label: "Play Ashen Realms online",
			atTag: "computer",
			mins: 120,
			effects: [
				{
					if: {
						cond: { storyline: { id: "mmo_clan", started: false } },
						then: [{ storyline: { id: "mmo_clan", to: "start" } }],
						else: [{ progression: "mmo_clan" }],
					},
				},
			],
		});
	});
})();
