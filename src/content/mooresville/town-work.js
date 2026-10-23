/*
 * ============================================================================
 *  Mooresville — jobs
 * ============================================================================
 *
 * What's in this file:
 *   1. Skills used at work (Barista)
 *   2. The hidden "Working" effect (how a shift wears you out)
 *   3. The barista job at The Daily Grind:
 *        a. its career, as a storyline (stages and what moves you on)
 *        b. the job itself (where, when, pay)
 *        c. how you get it (asking Jess at the counter)
 *        d. its events (the story moments, and the events during shifts)
 *
 * The event text is in src/story/mooresville/work.twee (one passage per
 * event, named "Ev_<event id>").
 *
 * ---------------------------------------------------------------------------
 *  THE BARISTA CAREER (decided with the user)
 * ---------------------------------------------------------------------------
 *   Ask Jess about the job ─► "hired": interview event, Jess texts you
 *        │  work 1 shift (the first-day event plays during it)
 *        ▼
 *   "trainee" (Barista skill 0–19): one trainee event each shift
 *        │  reach Barista 20
 *        ▼
 *   "barista" (20–49): promotion event, then barista events each shift
 *        │  reach Barista 50
 *        ▼
 *   "supervisor" (50+): supervisor event, then supervisor events each shift
 *
 *   At any working stage, missing 3 shifts in total ─► "fired".
 *   Handing in your notice (Me page) ─► "quit".
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD A SHIFT EVENT
 * ---------------------------------------------------------------------------
 *   1. Add an entry to the right stage's list in part 3d, e.g. in "trainee":
 *        burnt_toast: [{ stat: { stress: 3 } }],
 *   2. Add its id ("grind_trainee_burnt_toast") to that stage's `events` in 3a.
 *   3. Write the passage ":: Ev_grind_trainee_burnt_toast" in work.twee.
 *   One event from the stage's list plays halfway through every shift.
 *
 *  HOW TO ADD A STAGE: add it to `stages` in 3a, give the stage before it a
 *  gate ({ to: "new_stage", when: CONDITION }), and add it to `workStages`
 *  and `pay` in 3b if you work shifts in it.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { DAYS, mod } = setup.town;

		/* ======================================================================
		 *  1. Skills
		 * ======================================================================
		 *
		 * A skill runs 0–100. `gain: "slowing"` means it's harder to improve
		 * the better you get (half speed at 100); "flat" would keep it even.
		 */

		R.define("skill", {
			id: "barista",
			label: "Barista",
			desc: "Making coffee properly, and keeping up with a queue.",
			gain: "slowing",
			order: 0,
		});

		/* ======================================================================
		 *  2. While working
		 * ======================================================================
		 *
		 * On for the length of every shift (the job's `status` below).
		 */

		R.define("statusEffect", {
			id: "working",
			label: "Working",
			hidden: true,
			modifiers: [mod.perHour("energy", -3), mod.perHour("stress", 1), mod.perHour("hygiene", -1)],
		});

		/* ======================================================================
		 *  3a. The barista career (a storyline)
		 * ======================================================================
		 *
		 * Stage fields:
		 *   label, desc  shown on the Me page ("Going on in your life")
		 *   enter        an event shown once when you reach the stage
		 *   onEnter      effects when you reach it (a text from Jess…)
		 *   events       events that can only happen in this stage
		 *   gates        [{ to, when }]: move to stage `to` as soon as `when` is true.
		 *                Useful conditions here:
		 *                  { skill: { id: "barista", min: 20 } }
		 *                  { storylineCount: { key: "shifts", min: 1 } }  (shifts worked)
		 *                  { storylineCount: { key: "missed", min: 3 } }  (shifts missed)
		 *                  { storylineCount: { key: "late", min: 5 } }    (shifts started late)
		 */

		// Every working stage has this gate: miss 3 shifts and you're let go.
		const missedThree = { to: "fired", when: { storylineCount: { key: "missed", min: 3 } } };

		R.define("storyline", {
			id: "barista_job",
			label: "The Daily Grind",
			order: 0,
			stages: [
				{
					id: "hired",
					label: "New starter",
					desc: "Jess has put you on the weekend rota. Your first shift is coming up.",
					enter: "grind_interview",
					onEnter: [
						{ contact: "jess_marlow" },
						{ message: { from: "jess_marlow", text: "Hi, it's Jess from the Grind! Saturday 8am, don't be late. Wear something comfy and closed-toe shoes 😊" } },
					],
					events: ["grind_first_day"],
					gates: [{ to: "trainee", when: { storylineCount: { key: "shifts", min: 1 } } }, missedThree],
				},
				{
					id: "trainee",
					label: "Trainee barista",
					desc: "Still learning the machine. Barista skill 20 and Jess will let you loose on your own.",
					events: ["grind_trainee_rush", "grind_trainee_spill", "grind_trainee_regular", "grind_trainee_milk"],
					gates: [{ to: "barista", when: { skill: { id: "barista", min: 20 } } }, missedThree],
				},
				{
					id: "barista",
					label: "Barista",
					desc: "A proper barista now. Barista skill 50 and there might be more on offer.",
					enter: "grind_promotion",
					events: ["grind_barista_art", "grind_barista_rude", "grind_barista_newbie", "grind_barista_quiet"],
					gates: [{ to: "supervisor", when: { skill: { id: "barista", min: 50 } } }, missedThree],
				},
				{
					id: "supervisor",
					label: "Shift supervisor",
					desc: "You run the shift: the till, the rota and the keys.",
					enter: "grind_supervisor",
					events: ["grind_supervisor_keys", "grind_supervisor_rota", "grind_supervisor_complaint"],
					gates: [missedThree],
				},
				// The end: no more shifts in these two stages.
				{ id: "fired", label: "Let go", desc: "You missed too many shifts, and Jess had to let you go.", enter: "grind_fired" },
				{ id: "quit", label: "Left", desc: "You handed in your notice.", enter: "grind_quit" },
			],
		});

		/* ======================================================================
		 *  3b. The job
		 * ======================================================================
		 *
		 * You can start a shift from 30 minutes before it begins until it ends,
		 * at The Daily Grind (a "Start your shift" button appears). More than
		 * 10 minutes late counts as late. A shift you never start counts as
		 * missed the next day. You're paid at the end of each shift.
		 */

		R.define("job", {
			id: "grind_barista",
			label: "Barista at The Daily Grind",
			at: "daily_grind",
			storyline: "barista_job",
			workStages: ["hired", "trainee", "barista", "supervisor"], // stages where you work shifts
			skill: "barista",
			xpPerHour: 1, // Barista skill gained per hour worked (before the "slowing" rule)
			// Pay per hour at each stage, in whole pounds.
			pay: {
				hired: 10,
				trainee: 10,
				barista: 11,
				supervisor: 12,
			},
			payTo: "bank",
			shifts: [
				{ days: DAYS.SAT, from: "08:00", to: "14:00" },
				{ days: DAYS.SUN, from: "10:00", to: "16:00" },
			],
			status: "working",
			quitStage: "quit",
		});

		/* ======================================================================
		 *  3c. The way in: ask Jess at the counter
		 * ======================================================================
		 *
		 * Hidden unless Jess is at the counter (Mon–Sat, 07:30–14:00) and you
		 * haven't had the job before.
		 */

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

		/* ======================================================================
		 *  3d. Events
		 * ====================================================================== */

		// ---- Story moments (each plays once, when you reach its stage) ----
		// kind "manual": nothing triggers them except reaching the stage.
		const moment = (id) => R.define("storylet", { id, kind: "manual", passage: `Ev_${id}` });
		moment("grind_interview");
		moment("grind_promotion");
		moment("grind_supervisor");
		moment("grind_fired");
		moment("grind_quit");

		// ---- The first day (plays during your first shift) ----
		R.define("storylet", {
			id: "grind_first_day",
			kind: "story",
			passage: "Ev_grind_first_day",
			triggers: ["job:shift"],
			conditions: { shiftOf: "grind_barista" },
			effects: [{ skill: { barista: 1 } }],
		});

		// ---- Shift events: one plays halfway through each shift ----
		// Each stage has its own list. Write an entry as  name: [effects].
		// Its id becomes "grind_<stage>_<name>", its passage "Ev_grind_<stage>_<name>".

		/** Tips go in your pocket (whole pounds). */
		const tips = (amount) => ({ money: { amount, account: "cash", reason: "Tips" } });

		const shiftEvents = (stage, list) => {
			for (const [name, effects] of Object.entries(list)) {
				R.define("storylet", {
					id: `grind_${stage}_${name}`,
					kind: "pool", // one is picked from the stage's events every shift
					passage: `Ev_grind_${stage}_${name}`,
					triggers: ["job:shift"],
					conditions: { shiftOf: "grind_barista" },
					effects,
				});
			}
		};

		shiftEvents("trainee", {
			rush: [{ stat: { stress: 6 } }, { skill: { barista: 0.5 } }, tips(1)],
			spill: [{ stat: { mood: -3, hygiene: -10 } }],
			regular: [{ stat: { mood: 4 } }, tips(1)],
			milk: [{ skill: { barista: 1 } }, { stat: { stress: 2 } }],
		});

		shiftEvents("barista", {
			art: [{ stat: { mood: 5 } }, tips(3)],
			rude: [{ stat: { stress: 8, mood: -5 } }],
			newbie: [{ skill: { barista: 0.5 } }, { stat: { mood: 2 } }],
			quiet: [{ stat: { stress: -4 } }, tips(1)],
		});

		shiftEvents("supervisor", {
			keys: [{ stat: { stress: 4 } }],
			rota: [{ stat: { stress: 3, mood: 2 } }],
			complaint: [{ stat: { stress: 6 } }, { skill: { barista: 0.5 } }],
		});
	});
})();
