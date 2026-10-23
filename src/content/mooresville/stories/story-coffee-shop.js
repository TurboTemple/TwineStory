/*
 * ============================================================================
 *  STORY: The Coffee Shop Owner (storyline id "coffee_shop")
 * ============================================================================
 *
 * Central character: Lenny, 63, who owns Lenny's Café on the corner of Elm
 * Park Green (Monday to Saturday, 07:00–15:00). Starts the first time you
 * meet Lenny. Each coffee and chat with him adds 1 to the progression.
 *
 * Text: src/story/mooresville/stories/story-coffee-shop.twee
 *
 *   1. The character
 *   2. The storyline (stages; add more as you write)
 *   3. The repeatable task (a coffee and a chat)
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
			role: "café owner",
			tags: ["story"],
			desc: "Owns Lenny's Café. [Describe Lenny here]",
			schedule: [{ at: "lennys_counter", from: "07:00", to: "15:00", days: DAYS.MON_SAT }],
		});

		/* ---- 2. The storyline ------------------------------------------------ */

		R.define("storyline", {
			id: "coffee_shop",
			label: "The Coffee Shop Owner",
			begin: { on: ["npc:met"], when: { withNpc: "lenny" } },
			stages: [
				{
					id: "start",
					label: "Meeting Lenny",
					enter: "coffee_shop_start",
					hint: "Stop by Lenny's Café for a coffee.",
				},
			],
		});

		R.define("storylet", { id: "coffee_shop_start", kind: "manual", passage: "Ev_coffee_shop_start" });

		/* ---- 3. The repeatable task ------------------------------------------ */

		R.define("action", {
			id: "coffee_shop_chat",
			label: "Have a coffee and a chat with Lenny",
			at: "lennys_counter",
			mins: 30,
			showIf: { storyline: { id: "coffee_shop" } },
			conditions: { npcHere: "lenny" },
			costs: [{ money: { amount: -3, reason: "Coffee at Lenny's" } }], // £3, like the other cafés
			effects: [{ status: "caffeinated" }, { habit: "coffee" }, { progression: "coffee_shop" }],
		});
	});
})();
