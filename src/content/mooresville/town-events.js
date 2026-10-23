/*
 * Mooresville — events.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		// Random (50%, decided by the user): the receptionist interrupts a
		// therapy session halfway, and it ends early.
		R.define("storylet", {
			id: "therapy_interrupted",
			passage: "Ev_therapy_interrupted",
			triggers: ["action:checkpoint"],
			conditions: { action: "therapy_session", actionElapsed: { min: 60 }, npcAt: { npc: "tom_reeves", at: "wellbeing" } },
			chance: 0.5,
			effects: [
				{ stat: { stress: -6, mood: 2 } },
				{ note: "Tom interrupted the session; you only got an hour." },
				{ interrupt: "receptionist" },
			],
		});

		// Story: if you're bursting while asleep, you wake up.
		R.define("storylet", {
			id: "woken_by_bladder",
			kind: "story",
			passage: "Ev_woken_by_bladder",
			triggers: ["time:hour"],
			conditions: { status: "asleep", stat: { id: "bladder", min: 90 } },
			cooldown: 120,
			effects: [{ note: "You woke up needing the toilet." }, { interrupt: "bladder" }],
		});

		// Random: the bus gets stuck in traffic between stops.
		R.define("storylet", {
			id: "bus_traffic",
			passage: "Ev_bus_traffic",
			triggers: ["travel:checkpoint"],
			conditions: { travel: { mode: "bus7" } },
			chance: 0.15,
			cooldown: 240,
			effects: [{ note: "The bus was stuck in traffic for ten minutes." }, { time: 10 }],
		});

		// Story: shown out of a room when the place closes.
		R.define("storylet", {
			id: "closing_time",
			kind: "story",
			passage: "Ev_closing_time",
			triggers: ["world:closed"],
			effects: [{ interrupt: "closing" }],
		});
	});
})();
