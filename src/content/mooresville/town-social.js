/*
 * Mooresville — relationships and things to say. Numbers are first proposals.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const adults = { ageAtLeast: 18 };

		R.define("relTrack", {
			id: "friendship", label: "Friendship", order: 0,
			tiers: [{ at: 0, label: "Stranger" }, { at: 10, label: "Acquaintance" }, { at: 30, label: "Friend" }, { at: 60, label: "Close friend" }, { at: 85, label: "Best friend" }],
		});
		R.define("relTrack", {
			id: "romance", label: "Romance", order: 1, tags: ["romance"], conditions: adults,
			tiers: [{ at: 0, label: "No spark" }, { at: 15, label: "A spark" }, { at: 40, label: "A crush" }, { at: 70, label: "Smitten" }],
		});

		const talk = (def) => R.define("interaction", def);
		talk({ id: "chat", label: "Have a chat", mins: 10, cooldown: 240, order: 0, effects: [{ rel: { friendship: 3 } }, { stat: { mood: 2 } }] });
		talk({
			id: "ask_day", label: "Ask about their day", mins: 15, cooldown: 1440, order: 1,
			conditions: { rel: { track: "friendship", min: 10 } },
			effects: [{ rel: { friendship: 5 } }, { stat: { mood: 2, stress: -2 } }],
		});
		talk({ id: "compliment", label: "Pay them a compliment", mins: 2, cooldown: 720, order: 2, effects: [{ rel: { friendship: 2, romance: 1 } }] });
		talk({
			id: "swap_numbers", label: "Swap numbers", mins: 2, once: true, order: 3,
			conditions: { rel: { track: "friendship", min: 30 } },
			effects: [{ contact: true }],
			desc: "Then you can message each other.",
		});
		talk({
			id: "flirt", label: "Flirt a little", mins: 5, cooldown: 720, order: 4, tags: ["romance"],
			conditions: { all: [adults, { rel: { track: "friendship", min: 10 } }] },
			effects: [{ rel: { romance: 4, friendship: 1 } }],
		});
	});
})();
