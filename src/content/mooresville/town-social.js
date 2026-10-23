/*
 * ============================================================================
 *  Mooresville — relationships and the Talk menu
 * ============================================================================
 *
 * What's in this file:
 *   1. Relationship tracks: Friendship and Romance, and their named levels
 *   2. Things you can say: the buttons under "Talk" on someone's sheet
 *
 * Tap a person under "People here" to open their sheet. "Talk" only
 * appears when they're in the same place as you. Numbers are first proposals.
 *
 * AGE RULE: anything tagged "romance" must include the condition
 * { ageAtLeast: 18 }. The game won't build without it.
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD SOMETHING TO SAY
 * ---------------------------------------------------------------------------
 *   talk({
 *       id: "share_music",
 *       label: "Share a song you like",
 *       mins: 5,                         // how long it takes
 *       cooldown: 720,                   // minutes before you can do it again with the same person
 *       conditions: { rel: { track: "friendship", min: 10 } },   // needs "Acquaintance" or better
 *       effects: [{ rel: { friendship: 2 } }],
 *       order: 5,                        // position in the list
 *   });
 *
 * ---------------------------------------------------------------------------
 *  FIELDS
 * ---------------------------------------------------------------------------
 *   conditions  when it's allowed; if not, the button shows what's needed
 *   showIf      when it's listed at all; if false, it's hidden completely
 *   once        true = only ever once per person
 *   npcs        only with these people: ["jess_marlow"]
 *   npcTags     only with people who have this tag or role: ["classmate"]
 *   effects     { rel: { friendship: 3, romance: 1 } } changes how they feel
 *               (the person you're talking to); also { contact: true } adds
 *               their number to your phone
 *   tags        ["romance"] for anything romantic (needs the age condition)
 *
 *  Friendship gains are halved while you're Unwashed (town-needs.js).
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const adults = { ageAtLeast: 18 };

		/* ======================================================================
		 *  1. Relationship tracks
		 * ======================================================================
		 *
		 * Each runs 0–100 per person. `tiers` name the levels: you reach a
		 * level at its `at` value, and get a notice when you do.
		 */

		R.define("relTrack", {
			id: "friendship",
			label: "Friendship",
			order: 0,
			tiers: [
				{ at: 0, label: "Stranger" },
				{ at: 10, label: "Acquaintance" },
				{ at: 30, label: "Friend" },
				{ at: 60, label: "Close friend" },
				{ at: 85, label: "Best friend" },
			],
		});

		// Only exists with people who are 18 or over.
		R.define("relTrack", {
			id: "romance",
			label: "Romance",
			order: 1,
			tags: ["romance"],
			conditions: adults,
			tiers: [
				{ at: 0, label: "No spark" },
				{ at: 15, label: "A spark" },
				{ at: 40, label: "A crush" },
				{ at: 70, label: "Smitten" },
			],
		});

		/* ======================================================================
		 *  2. Things to say (works with anyone, unless limited)
		 * ====================================================================== */

		const talk = (def) => R.define("interaction", def);

		talk({
			id: "chat",
			label: "Have a chat",
			mins: 10,
			cooldown: 240, // 4 hours
			order: 0,
			effects: [{ rel: { friendship: 3 } }, { stat: { mood: 2 } }],
		});

		talk({
			id: "ask_day",
			label: "Ask about their day",
			mins: 15,
			cooldown: 1440, // once a day
			order: 1,
			conditions: { rel: { track: "friendship", min: 10 } }, // Acquaintance or better
			effects: [{ rel: { friendship: 5 } }, { stat: { mood: 2, stress: -2 } }],
		});

		talk({
			id: "compliment",
			label: "Pay them a compliment",
			mins: 2,
			cooldown: 720, // 12 hours
			order: 2,
			effects: [{ rel: { friendship: 2, romance: 1 } }],
		});

		talk({
			id: "swap_numbers",
			label: "Swap numbers",
			mins: 2,
			once: true,
			order: 3,
			conditions: { rel: { track: "friendship", min: 30 } }, // Friend or better
			showIf: { not: { hasContact: true } },                 // not if you already have it
			effects: [{ contact: true }],
			desc: "Then you can message each other.",
		});

		talk({
			id: "flirt",
			label: "Flirt a little",
			mins: 5,
			cooldown: 720,
			order: 4,
			tags: ["romance"],
			conditions: { all: [adults, { rel: { track: "friendship", min: 10 } }] },
			effects: [{ rel: { romance: 4, friendship: 1 } }],
		});
	});
})();
