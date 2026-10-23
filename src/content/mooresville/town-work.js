/*
 * Mooresville — jobs, the skills they use, and their storylines.
 *
 * The Daily Grind (barista):
 *   Ask Jess about work → interview (hired) → first shift → trainee
 *   (Barista 0–19, trainee shift events) → promotion at Barista 20 →
 *   barista (20–49, barista shift events) → Barista 50: supervisor
 *   (supervisor shift events). Miss 3 shifts and you're let go.
 *
 * Pay is a placeholder: the user sets money by hand.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/* ---- Skills -------------------------------------------------------- */

		R.define("skill", { id: "barista", label: "Barista", desc: "Making coffee properly, and keeping up with a queue.", gain: "slowing", order: 0 });

		/* ---- While working ------------------------------------------------- */

		R.define("statusEffect", {
			id: "working",
			label: "Working",
			hidden: true,
			modifiers: [
				{ stat: "energy", op: "rateAdd", value: -3 },
				{ stat: "stress", op: "rateAdd", value: 1 },
				{ stat: "hygiene", op: "rateAdd", value: -1 },
			],
		});

		/* ---- The Daily Grind ----------------------------------------------- */

		/** One repeatable shift event per entry: { id: effects }. */
		const shiftEvents = (stage, list) => Object.entries(list).map(([id, effects]) => R.define("storylet", {
			id: `grind_${stage}_${id}`,
			kind: "pool",
			passage: `Ev_grind_${stage}_${id}`,
			triggers: ["job:shift"],
			conditions: { shiftOf: "grind_barista" },
			effects,
		}));
		/** Tips go in your pocket (placeholder amounts). */
		const tips = (pence) => ({ money: { amount: pence, account: "cash", reason: "Tips" } });

		const missedThree = { to: "fired", when: { storylineCount: { key: "missed", min: 3 } } };

		R.define("storyline", {
			id: "barista_job",
			label: "The Daily Grind",
			order: 0,
			stages: [
				{
					id: "hired", label: "New starter", desc: "Jess has put you on the weekend rota. Your first shift is coming up.",
					enter: "grind_interview",
					onEnter: [
						{ contact: "jess_marlow" },
						{ message: { from: "jess_marlow", text: "Hi, it's Jess from the Grind! Saturday 8am, don't be late. Wear something comfy and closed-toe shoes 😊" } },
					],
					events: ["grind_first_day"],
					gates: [{ to: "trainee", when: { storylineCount: { key: "shifts", min: 1 } } }, missedThree],
				},
				{
					id: "trainee", label: "Trainee barista", desc: "Still learning the machine. Barista skill 20 and Jess will let you loose on your own.",
					events: ["grind_trainee_rush", "grind_trainee_spill", "grind_trainee_regular", "grind_trainee_milk"],
					gates: [{ to: "barista", when: { skill: { id: "barista", min: 20 } } }, missedThree],
				},
				{
					id: "barista", label: "Barista", desc: "A proper barista now. Barista skill 50 and there might be more on offer.",
					enter: "grind_promotion",
					events: ["grind_barista_art", "grind_barista_rude", "grind_barista_newbie", "grind_barista_quiet"],
					gates: [{ to: "supervisor", when: { skill: { id: "barista", min: 50 } } }, missedThree],
				},
				{
					id: "supervisor", label: "Shift supervisor", desc: "You run the shift: the till, the rota and the keys.",
					enter: "grind_supervisor",
					events: ["grind_supervisor_keys", "grind_supervisor_rota", "grind_supervisor_complaint"],
					gates: [missedThree],
				},
				{ id: "fired", label: "Let go", desc: "You missed too many shifts, and Jess had to let you go.", enter: "grind_fired" },
				{ id: "quit", label: "Left", desc: "You handed in your notice.", enter: "grind_quit" },
			],
		});

		R.define("job", {
			id: "grind_barista",
			label: "Barista at The Daily Grind",
			at: "daily_grind",
			storyline: "barista_job",
			workStages: ["hired", "trainee", "barista", "supervisor"],
			skill: "barista",
			xpPerHour: 1,
			// Placeholder pay in pence an hour: the user will set this.
			pay: { hired: 1000, trainee: 1000, barista: 1100, supervisor: 1250 },
			payTo: "bank",
			shifts: [{ days: [6], from: "08:00", to: "14:00" }, { days: [0], from: "10:00", to: "16:00" }],
			status: "working",
			quitStage: "quit",
		});

		// The way in: ask Jess at the counter.
		R.define("action", {
			id: "ask_about_work",
			label: "Ask Jess about the job in the window",
			at: "grind_counter",
			mins: 15,
			hidden: true,
			conditions: { npcHere: "jess_marlow", storyline: { id: "barista_job", started: false } },
			effects: [{ storyline: { id: "barista_job", to: "hired" } }],
			desc: "There's a card in the window: weekend staff wanted.",
		});

		// Entry events and the first day.
		const manual = (id) => R.define("storylet", { id, kind: "manual", passage: `Ev_${id}` });
		manual("grind_interview");
		manual("grind_promotion");
		manual("grind_supervisor");
		manual("grind_fired");
		manual("grind_quit");
		R.define("storylet", {
			id: "grind_first_day",
			kind: "story",
			passage: "Ev_grind_first_day",
			triggers: ["job:shift"],
			conditions: { shiftOf: "grind_barista" },
			effects: [{ skill: { barista: 1 } }],
		});

		// Repeatable shift events, one per shift, for the stage you're in.
		shiftEvents("trainee", {
			rush: [{ stat: { stress: 6 } }, { skill: { barista: 0.5 } }, tips(150)],
			spill: [{ stat: { mood: -3, hygiene: -10 } }],
			regular: [{ stat: { mood: 4 } }, tips(100)],
			milk: [{ skill: { barista: 1 } }, { stat: { stress: 2 } }],
		});
		shiftEvents("barista", {
			art: [{ stat: { mood: 5 } }, tips(300)],
			rude: [{ stat: { stress: 8, mood: -5 } }],
			newbie: [{ skill: { barista: 0.5 } }, { stat: { mood: 2 } }],
			quiet: [{ stat: { stress: -4 } }, tips(150)],
		});
		shiftEvents("supervisor", {
			keys: [{ stat: { stress: 4 } }],
			rota: [{ stat: { stress: 3, mood: 2 } }],
			complaint: [{ stat: { stress: 6 } }, { skill: { barista: 0.5 } }],
		});
	});
})();
