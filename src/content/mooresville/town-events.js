/*
 * ============================================================================
 *  Mooresville — events around town
 * ============================================================================
 *
 * An event shows a passage of story ("Ev_<id>", in
 * src/story/mooresville/events.twee) when something happens in the game.
 * Job events are in town-work.js, and your tutor's word about skipping
 * school is in town-school.js.
 *
 * Part 2 (at the end) has things happening around town on set days:
 * the Saturday market and fireworks night.
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD AN EVENT
 * ---------------------------------------------------------------------------
 *   R.define("storylet", {
 *       id: "lost_cat",
 *       passage: "Ev_lost_cat",
 *       triggers: ["world:enter"],                 // when to consider it
 *       conditions: { at: "elm_road" },            // only if this is true
 *       chance: 0.1,                               // 10% each time
 *       cooldown: 1440,                            // not again for a day (minutes)
 *       effects: [{ stat: { mood: 2 } }],
 *   });
 *   Then write ":: Ev_lost_cat" in events.twee. Start it with
 *   <<view "event-media">> (its picture) and end it with <<view "event-end">>
 *   (the Continue button).
 *
 * ---------------------------------------------------------------------------
 *  FIELDS
 * ---------------------------------------------------------------------------
 *   triggers   when the game checks it. Useful ones:
 *                "world:enter"        you arrive somewhere
 *                "time:hour"          every in-game hour
 *                "action:checkpoint"  part-way through an action (see `checkpoints`
 *                                     on the action)
 *                "action:end"         an action finishes
 *                "travel:checkpoint"  part-way through a journey
 *                "job:shift"          halfway through a work shift
 *                "world:closed"       a place closes while you're in it
 *   kind       "random" (default): rolls its `chance`, within the town-wide
 *                limits (at most 4 random events a day, 60 minutes apart;
 *                src/01-engine/config.js → events)
 *              "story": always happens when its conditions are true
 *   chance     0–1 (0.5 = 50%) for random events
 *   cooldown   minutes before it can happen again
 *   once       true = only ever happens once
 *   maxPerDay  at most this many times a day
 *   effects    what it does. { interrupt: "reason" } stops whatever you were
 *              doing (an action, a journey, sleep).
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
			conditions: {
				action: "therapy_session",
				actionElapsed: { min: 60 },                          // an hour in
				npcAt: { npc: "tom_reeves", at: "wellbeing" },       // Tom is at work
			},
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

		// Random: the bus gets stuck in traffic between stops (adds 10 minutes).
		R.define("storylet", {
			id: "bus_traffic",
			passage: "Ev_bus_traffic",
			triggers: ["travel:checkpoint"],
			conditions: { travel: { mode: "bus7" } },
			chance: 0.15,
			cooldown: 240,
			effects: [{ note: "The bus was stuck in traffic for ten minutes." }, { time: 10 }],
		});

		// Story: shown when a place closes while you're in one of its rooms.
		R.define("storylet", {
			id: "closing_time",
			kind: "story",
			passage: "Ev_closing_time",
			triggers: ["world:closed"],
			effects: [{ interrupt: "closing" }],
		});

		// Random: out on the street late at night, footsteps behind you.
		// Mostly nothing; how you react is a choice (events.twee).
		R.define("storylet", {
			id: "night_footsteps",
			passage: "Ev_night_footsteps",
			triggers: ["world:enter"],
			conditions: { outdoors: true, time: { from: "23:00", to: "04:00" } },
			chance: 0.15,
			cooldown: 1440,
			effects: [{ stat: { stress: 4 } }],
		});

		/* ======================================================================
		 *  2. Around town: things on set days
		 * ======================================================================
		 *
		 * A city event says where and when. While it's on, the place shows
		 * "On now: …" and the phone's calendar lists it. What you can do there
		 * is ordinary actions with { happening: "id" } and hidden: true.
		 *
		 *   days: [6]                           every Saturday (0 = Sunday)
		 *   dates: ["2026-11-05"]               particular days
		 *   from: "2026-12-01", to: "2026-12-24" every day between two dates
		 *   hours: { from: "09:00", to: "14:00" }
		 */

		R.define("cityEvent", {
			id: "saturday_market",
			label: "Saturday market",
			at: "high_street",
			desc: "Stalls line the street: bread, flowers, second-hand records.",
			days: [6],
			hours: { from: "09:00", to: "14:00" },
		});
		R.define("action", {
			id: "market_browse",
			label: "Browse the market stalls",
			at: "high_street",
			mins: 30,
			hidden: true,
			conditions: { happening: "saturday_market" },
			effects: [{ stat: { mood: 3 } }],
		});
		R.define("action", {
			id: "market_bread",
			label: "Buy a loaf from the bakery stall",
			at: "high_street",
			mins: 5,
			hidden: true,
			conditions: { happening: "saturday_market" },
			costs: [{ money: { amount: -3, reason: "Market bread" } }],
			effects: [{ item: { id: "groceries", qty: 1 } }],
		});

		R.define("cityEvent", {
			id: "fireworks_night",
			label: "Fireworks night",
			at: "riverside_park",
			desc: "Crowds on the riverbank, sparklers and the smell of hot dogs.",
			dates: ["2026-11-05"],
			hours: { from: "18:30", to: "21:00" },
		});
		R.define("action", {
			id: "watch_fireworks",
			label: "Watch the fireworks",
			at: "riverside_park",
			mins: 45,
			hidden: true,
			conditions: { happening: "fireworks_night" },
			effects: [{ stat: { mood: 8, stress: -4 } }],
		});
	});
})();
