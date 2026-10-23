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
 *        b. the job itself (where, shift length, pay, what can happen)
 *        c. how you get it (asking Jess at the counter), and a staff perk
 *        d. its events (the story moments, and the events during shifts)
 *
 * The event text is in src/story/mooresville/work.twee (one passage per
 * event, named "Ev_<event id>").
 *
 * ---------------------------------------------------------------------------
 *  THE BARISTA CAREER (decided with the user)
 * ---------------------------------------------------------------------------
 *   The loop (decided by the user): a story event, then a task you repeat
 *   (working shifts) while a counter goes up (Barista skill), then at a set
 *   point the next story event.
 *
 *   Ask Jess about the job ─► "hired": interview event, Jess texts you
 *        │  work 1 shift (the first-day event plays during it)
 *        ▼
 *   "trainee" (Barista skill 0–19): sometimes a trainee event during a shift
 *        │  reach Barista 20
 *        ▼
 *   "barista" (20–49): promotion event, then sometimes barista events
 *        │  reach Barista 50
 *        ▼
 *   "supervisor" (50+): supervisor event, then sometimes supervisor events
 *
 *   Handing in your notice (Me page) ─► "quit".
 *
 *   A shift is one tap: 2 hours, worked whenever the café is open, as many
 *   as you like (decided by the user). Every shift ends with a random
 *   outcome (part 3b) that can add to or take from your Barista skill, and
 *   how you are (tired, stressed, made up) changes the odds.
 *   When the next stage comes is a surprise: the game never shows the
 *   numbers. The phone's Diary shows each stage's `hint` instead.
 *   Reaching "barista" unlocks a staff perk (part 3c).
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD A SHIFT EVENT
 * ---------------------------------------------------------------------------
 *   1. Add an entry to the right stage's list in part 3d, e.g. in "trainee":
 *        burnt_toast: [{ stat: { stress: 3 } }],
 *   2. Add its id ("grind_trainee_burnt_toast") to that stage's `events` in 3a.
 *   3. Write the passage ":: Ev_grind_trainee_burnt_toast" in work.twee.
 *   Each event in the stage's list has a `chance` of playing halfway through
 *   a shift (EVENT_CHANCE below); if several come up, one is picked.
 *
 *  HOW TO ADD A STAGE: add it to `stages` in 3a, give the stage before it a
 *  gate ({ to: "new_stage", when: CONDITION }), and add it to `workStages`
 *  and `pay` in 3b if you work shifts in it.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { mod } = setup.town;

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
		 *   label, desc  shown in the phone's Diary app
		 *   hint         what to do next, in the Diary ("Keep working shifts…").
		 *                Don't give numbers away: the next stage is a surprise.
		 *   enter        an event shown once when you reach the stage
		 *   onEnter      effects when you reach it (a text from Jess…)
		 *   events       events that can only happen in this stage
		 *   gates        [{ to, when }]: move to stage `to` as soon as `when` is true.
		 *                Useful conditions here:
		 *                  { skill: { id: "barista", min: 20 } }
		 *                  { storylineCount: { key: "shifts", min: 1 } }  (shifts worked)
		 */

		R.define("storyline", {
			id: "barista_job",
			label: "The Daily Grind",
			order: 0,
			stages: [
				{
					id: "hired",
					label: "New starter",
					desc: "Jess has taken you on at The Daily Grind.",
					hint: "Go to the café while it's open and work your first shift.",
					enter: "grind_interview",
					onEnter: [
						{ contact: "jess_marlow" },
						{ message: { from: "jess_marlow", text: "Hi, it's Jess from the Grind! Come in for your first shift whenever we're open. Wear something comfy and closed-toe shoes 😊" } },
					],
					events: ["grind_first_day"],
					gates: [{ to: "trainee", when: { storylineCount: { key: "shifts", min: 1 } } }],
				},
				{
					id: "trainee",
					label: "Trainee barista",
					desc: "Still learning the machine, with Jess watching over your shoulder.",
					hint: "Keep working shifts at the café and get better at the job.",
					events: ["grind_trainee_rush", "grind_trainee_spill", "grind_trainee_regular", "grind_trainee_milk"],
					gates: [{ to: "barista", when: { skill: { id: "barista", min: 20 } } }],
				},
				{
					id: "barista",
					label: "Barista",
					desc: "A proper barista now, trusted to work on your own.",
					hint: "Keep working shifts. Jess might have more for you one day.",
					enter: "grind_promotion",
					events: ["grind_barista_art", "grind_barista_rude", "grind_barista_newbie", "grind_barista_quiet"],
					gates: [{ to: "supervisor", when: { skill: { id: "barista", min: 50 } } }],
				},
				{
					id: "supervisor",
					label: "Shift supervisor",
					desc: "You run the shift: the till, the rota and the keys.",
					hint: "Work shifts whenever you like.",
					enter: "grind_supervisor",
					events: ["grind_supervisor_keys", "grind_supervisor_rota", "grind_supervisor_complaint"],
				},
				// The end: no more shifts.
				{ id: "quit", label: "Left", desc: "You handed in your notice.", enter: "grind_quit" },
			],
		});

		/* ======================================================================
		 *  3b. The job
		 * ======================================================================
		 *
		 * At The Daily Grind a "Work a shift" button appears while it's open
		 * and there's time for a whole shift before closing. You're paid at
		 * the end of each shift.
		 *
		 *   shiftMins       how long one shift is
		 *   dressCode       { when: CONDITION, text } — what you must be wearing
		 *   skillPerShift   Barista skill for every shift (before "slowing")
		 *   effects         what else happens at the end of every shift. Here
		 *                   it's a random outcome: { random: [{ weight, then }] }
		 *                   picks one branch, `weight` = how likely it is.
		 *                   { note: "…" } adds a line to the shift summary.
		 *                   weightIf: [{ when: CONDITION, add: n }] makes a
		 *                   branch likelier (or, with a minus, less likely)
		 *                   while the condition is true.
		 */

		R.define("job", {
			id: "grind_barista",
			label: "Barista at The Daily Grind",
			at: "daily_grind",
			storyline: "barista_job",
			workStages: ["hired", "trainee", "barista", "supervisor"], // stages where you work shifts
			shiftMins: 120, // 2 hours (decided by the user)
			skill: "barista",
			skillPerShift: 2, // before the "slowing" rule: about 10 shifts to reach 20
			// Pay per hour at each stage, in whole pounds.
			pay: {
				hired: 10,
				trainee: 10,
				barista: 11,
				supervisor: 12,
			},
			payTo: "bank",
			// (Every full shift also counts towards Lenny's story: see `effects`.)
			// How the shift went. Most are ordinary; some help, some set you back.
			effects: [
				{ progression: "coffee_shop" }, // Lenny's story (stories/story-coffee-shop.js)
				{
					random: [
						// An ordinary shift.
						{ weight: 6, then: [] },
						// A good shift.
						{
							weight: 2,
							weightIf: [{ when: { stat: { id: "energy", max: 30 } }, add: -1 }], // less likely when tired
							then: [{ note: "A good shift: everything clicked." }, { skill: { barista: 1 } }, { stat: { mood: 3 } }],
						},
						// A rough shift.
						{
							weight: 1,
							weightIf: [
								{ when: { stat: { id: "energy", max: 30 } }, add: 2 }, // tired
								{ when: { stat: { id: "stress", min: 70 } }, add: 2 }, // stressed
							],
							then: [{ note: "A rough shift: you muddled orders all afternoon." }, { skill: { barista: -0.5 } }, { stat: { stress: 5 } }],
						},
						// A big tip.
						{
							weight: 1,
							weightIf: [{ when: { stat: { id: "beauty", min: 50 } }, add: 2 }], // looking good (makeup)
							then: [{ note: "Someone left a big tip in the jar for you." }, { money: { amount: 3, account: "cash", reason: "Tips" } }],
						},
					],
				},
			],
			status: "working",
			// What you must wear to work a shift (any condition), and what it says if not.
			dressCode: { when: { not: { wearing: "sliders" } }, text: "Closed-toe shoes for work: Jess won't let you on shift in sliders" },
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
			desc: "There's a card in the window: staff wanted.",
		});

		// A reward for getting on (an example of a stage unlocking something):
		// once you're a barista, you can make yourself a free coffee. Hidden
		// until then. Any action, shop or interaction can be unlocked this way.
		R.define("action", {
			id: "grind_staff_coffee",
			label: "Make yourself a coffee (staff perk)",
			at: "grind_counter",
			mins: 5,
			hidden: true,
			conditions: { storyline: { id: "barista_job", stage: ["barista", "supervisor"] } },
			effects: [{ stat: { drink: 15, bladder: 6 } }, { status: "caffeinated" }, { habit: "coffee" }],
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

		// ---- Shift events: each has a chance of playing halfway through a shift ----
		// Each stage has its own list. Write an entry as  name: [effects].
		// Its id becomes "grind_<stage>_<name>", its passage "Ev_grind_<stage>_<name>".

		/** Tips go in your pocket (whole pounds). */
		const tips = (amount) => ({ money: { amount, account: "cash", reason: "Tips" } });

		/** How likely each shift event is, per shift (0.15 = 15%). */
		const EVENT_CHANCE = 0.15;

		const shiftEvents = (stage, list) => {
			for (const [name, effects] of Object.entries(list)) {
				R.define("storylet", {
					id: `grind_${stage}_${name}`,
					kind: "pool", // only during this stage (see its `events` in 3a)
					chance: EVENT_CHANCE,
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
			rude: [{ stat: { stress: 2, mood: -3 } }], // the rest depends on your choice (work.twee)
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
