/*
 * ============================================================================
 *  Mooresville — stats and effects
 * ============================================================================
 *
 * What's in this file:
 *   1. Stats: Health, Energy, Food, Drink, Bladder, Hygiene, Mood, Stress, Beauty
 *   2. Effects that switch on by themselves when a stat is high or low
 *      (Hungry, Bursting, Exhausted…)
 *   3. Effects that last a set time (Caffeinated, Well fed, Tipsy…)
 *   4. Hidden effects that are on while you do something (Asleep, Jogging…)
 *
 * All numbers are first proposals and can be tuned freely.
 * Weather effects (Cold, Getting wet) are in town-weather.js; clothing
 * effects (Cosy, Smartly dressed…) are in town-clothing.js.
 *
 * ---------------------------------------------------------------------------
 *  STAT FIELDS
 * ---------------------------------------------------------------------------
 *   id, label, desc   name and the explanation shown in the Profile tab
 *   start             value on a new game (every stat runs 0–100)
 *   perHour           how much it changes by itself each in-game hour
 *   change            "drift"  (default) changes by perHour every hour
 *                     "toward" moves back towards `target` by perHour an hour
 *                     "none"   never changes by itself
 *   good: "low"       for stats where low is good (Bladder, Stress); colours the bar
 *   derive            work the stat out from other things instead of saving it
 *                     (see Beauty): a list of
 *                       { add: 10 }                       a fixed amount
 *                       { stat: "hygiene", times: 0.2 }   another stat × a number
 *                       { when: CONDITION, add: 10 }      while the condition is true
 *                     each with an optional `label` for the Profile. A derived
 *                     stat can't be changed by effects; change what it's made of.
 *   order             position in the sidebar
 *
 * ---------------------------------------------------------------------------
 *  EFFECT FIELDS (statusEffect)
 * ---------------------------------------------------------------------------
 *   id, label, desc   name and the explanation ("What it does" is added automatically)
 *   modifiers         stat changes while active: see `mod` in town-kit.js
 *   while             { stat, min, max }: on whenever that stat is in the range
 *   whileCond         any condition: on whenever it's true (see town-clothing.js)
 *   mins              lasts this many minutes, then wears off
 *   good              true (green), false (red) or null (grey) in the sidebar
 *   hidden            not shown in the sidebar
 *   factors           multipliers other systems read:
 *                       actionTime: 1.25 → fixed-length actions take 25% longer
 *                       relGain: 0.5     → friendships grow half as fast
 *   stacking          what happens if you get it again while it's on:
 *                       "refresh" (default) restart the timer
 *                       "stack"   add a level, up to maxStacks (see Tipsy)
 *                       "extend"  add the time on, "ignore" do nothing
 *
 *  Effects are switched on and off by actions and events with
 *  { status: "caffeinated" } and { statusRemove: "caffeinated" }.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { mod } = setup.town;

		/* ======================================================================
		 *  1. Stats
		 * ====================================================================== */

		const stat = (def) => R.define("stat", def);

		stat({
			id: "health",
			label: "Health",
			desc: "Your overall health. Going without food or drink wears it down.",
			start: 100,
			change: "none",
			order: 0,
		});
		stat({
			id: "energy",
			label: "Energy",
			desc: "How awake you are. Sleep restores it.",
			start: 80,
			perHour: -4,
			order: 1,
		});
		stat({
			id: "food",
			label: "Food",
			desc: "How well fed you are.",
			start: 70,
			perHour: -4,
			order: 2,
		});
		stat({
			id: "drink",
			label: "Drink",
			desc: "How hydrated you are.",
			start: 70,
			perHour: -5,
			order: 3,
		});
		stat({
			id: "bladder",
			label: "Bladder",
			desc: "How badly you need the toilet.",
			start: 15,
			perHour: 5,
			good: "low",
			order: 4,
		});
		stat({
			id: "hygiene",
			label: "Hygiene",
			desc: "How clean and fresh you are.",
			start: 85,
			perHour: -1.5,
			order: 5,
		});
		stat({
			id: "mood",
			label: "Mood",
			desc: "How you feel. Drifts back towards normal over time.",
			start: 60,
			change: "toward",
			target: 55,
			perHour: 2,
			order: 6,
		});
		stat({
			id: "stress",
			label: "Stress",
			desc: "How wound up you are. Settles slowly by itself.",
			start: 30,
			change: "toward",
			target: 25,
			perHour: 1,
			good: "low",
			order: 7,
		});
		stat({
			id: "beauty",
			label: "Beauty",
			desc: "How put-together you look: being clean, what you wear, your hair and your fitness. Makeup adds to it for a while.",
			order: 8,
			// Worked out from these every time (not saved). The Profile tab
			// lists what's counting right now. Makeup ("Made up", part 3) adds
			// +20 on top.
			derive: [
				{ add: 10, label: "Base" },
				{ stat: "hygiene", times: 0.2, label: "Clean" },                                  // up to +20
				{ when: { status: "smartly_dressed" }, add: 10, label: "Smartly dressed" },     // town-clothing.js
				{ when: { status: "fresh_haircut" }, add: 5, label: "Fresh haircut" },          // part 3
				{ when: { storyline: { id: "fitness", stage: "fit" } }, add: 5, label: "In good shape" }, // town-fitness.js
			],
		});

		/* ======================================================================
		 *  2. Effects that follow a stat
		 * ======================================================================
		 *
		 * Each switches on by itself while its stat is in the `while` range.
		 * Ranges that sit next to each other (Hungry, then Starving) use
		 * 5.001 / 5 so the two never overlap.
		 */

		const need = (def) => R.define("statusEffect", { factors: {}, good: false, ...def });

		need({
			id: "needs_toilet",
			label: "Needs the toilet",
			desc: "You could really do with a wee.",
			while: { stat: "bladder", min: 70, max: 89.999 },
			modifiers: [mod.add("mood", -6)],
		});
		need({
			id: "bursting",
			label: "Bursting",
			desc: "You need the toilet right now.",
			while: { stat: "bladder", min: 90 },
			modifiers: [mod.add("mood", -15), mod.add("stress", 10)],
		});
		need({
			id: "hungry",
			label: "Hungry",
			desc: "Your stomach is rumbling.",
			while: { stat: "food", min: 5.001, max: 25 },
			modifiers: [mod.add("mood", -5)],
		});
		need({
			id: "starving",
			label: "Starving",
			desc: "You badly need to eat. It's hurting your health.",
			while: { stat: "food", max: 5 },
			modifiers: [mod.add("mood", -12), mod.perHour("health", -2)],
		});
		need({
			id: "thirsty",
			label: "Thirsty",
			desc: "Your mouth is dry.",
			while: { stat: "drink", min: 5.001, max: 25 },
			modifiers: [mod.add("mood", -5), mod.perHour("energy", -1)],
		});
		need({
			id: "dehydrated",
			label: "Dehydrated",
			desc: "You badly need a drink. It's hurting your health.",
			while: { stat: "drink", max: 5 },
			modifiers: [mod.add("mood", -12), mod.perHour("health", -3)],
		});
		need({
			id: "tired",
			label: "Tired",
			desc: "Your eyelids are heavy.",
			while: { stat: "energy", min: 8.001, max: 25 },
			modifiers: [mod.add("mood", -5)],
		});
		need({
			id: "exhausted",
			label: "Exhausted",
			desc: "You can barely keep your eyes open. Everything takes longer.",
			while: { stat: "energy", max: 8 },
			modifiers: [mod.add("mood", -12), mod.add("stress", 8)],
			factors: { actionTime: 1.25 }, // everyday actions take 25% longer
		});
		need({
			id: "unwashed",
			label: "Unwashed",
			desc: "You're starting to feel grubby, and people notice: they warm to you more slowly.",
			while: { stat: "hygiene", max: 25 },
			modifiers: [mod.add("mood", -4)],
			factors: { relGain: 0.5 }, // friendships grow half as fast
		});
		need({
			id: "stressed",
			label: "Stressed out",
			desc: "Everything feels like too much.",
			while: { stat: "stress", min: 70 },
			modifiers: [mod.add("mood", -8)],
		});

		/* ======================================================================
		 *  3. Timed effects
		 * ======================================================================
		 *
		 * Switched on by actions, items and events, and wear off after `mins`.
		 */

		const timed = (def) => R.define("statusEffect", { good: true, ...def });

		timed({
			id: "caffeinated",
			label: "Caffeinated",
			desc: "A caffeine buzz is keeping you sharp.",
			mins: 180,
			modifiers: [mod.add("energy", 10), mod.add("stress", 3)],
		});
		timed({
			id: "well_fed",
			label: "Well fed",
			desc: "A proper meal. You feel satisfied.",
			mins: 180,
			modifiers: [mod.add("mood", 4)],
		});
		timed({
			id: "made_up",
			label: "Made up",
			desc: "Your makeup's done. It lasts until it wears off or you shower.",
			mins: 480, // 8 hours
			modifiers: [mod.add("beauty", 20)],
		});
		timed({
			id: "fresh_haircut",
			label: "Fresh haircut",
			desc: "Your hair looks its best for a few days after a cut.",
			mins: 4320, // 3 days
		});
		timed({
			id: "refreshed",
			label: "Refreshed",
			desc: "Clean and awake after a shower.",
			mins: 120,
			modifiers: [mod.add("mood", 4), mod.add("energy", 3)],
		});
		timed({
			id: "post_workout",
			label: "Post-workout glow",
			desc: "Tired legs, clear head.",
			mins: 150,
			modifiers: [mod.add("mood", 6), mod.add("stress", -6)],
		});
		timed({
			id: "calm",
			label: "Calm",
			desc: "Talking things through has left you calmer.",
			mins: 240,
			modifiers: [mod.add("stress", -8), mod.add("mood", 3)],
		});
		timed({
			id: "entertained",
			label: "Entertained",
			desc: "Still thinking about the film.",
			mins: 120,
			modifiers: [mod.add("mood", 5)],
		});
		timed({
			id: "gym_pass",
			label: "Gym day pass",
			desc: "You can use the PulseFit gym floor today.",
			mins: 720,
			modifiers: [],
			good: null,
		});

		timed({
			id: "blow_dried",
			label: "Salon-fresh hair",
			desc: "A wash and blow-dry at Snips. A shower, bath or swim undoes it.",
			mins: 720, // 12 hours
			modifiers: [mod.add("beauty", 10), mod.add("mood", 2)],
		});
		timed({
			id: "on_training_plan",
			label: "On Kyle's training plan",
			desc: "A week of Kyle's plan: every workout counts for more (town-actions.js, TRAINER_BOOST).",
			mins: 10080, // 7 days
			modifiers: [],
		});
		timed({
			id: "neon_stamp",
			label: "Club Neon stamp",
			desc: "A smudged neon star on the back of your hand: you've paid to get into Club Neon tonight.",
			mins: 360,
			modifiers: [],
			good: null,
		});
		timed({
			id: "sun_cream",
			label: "Sun cream on",
			desc: "Protected from the sun for a few hours.",
			mins: 180,
			modifiers: [],
			good: null,
		});
		timed({
			id: "sun_kissed",
			label: "Sun-kissed",
			desc: "A warm glow from an afternoon in the sun.",
			mins: 480,
			modifiers: [mod.add("mood", 4), mod.add("beauty", 3)],
		});
		timed({
			id: "sea_fresh",
			label: "Salty and refreshed",
			desc: "Tingling all over from the cold sea.",
			mins: 120,
			modifiers: [mod.add("mood", 5), mod.add("stress", -5), mod.add("energy", 4)],
		});
		R.define("statusEffect", {
			id: "sunburnt",
			label: "Sunburnt",
			desc: "Pink, hot and sore. Sun cream next time.",
			mins: 1440, // a day
			modifiers: [mod.add("mood", -5), mod.add("beauty", -5)],
			good: false,
		});

		// Tipsy stacks: each drink adds a level (Tipsy → Merry → Drunk → …),
		// and each level wears off on its own after 90 minutes.
		R.define("statusEffect", {
			id: "tipsy",
			label: "Tipsy",
			desc: "You've had a drink or two. Each drink wears off after a while.",
			mins: 90,
			stacking: "stack",
			maxStacks: 5,
			expire: "one", // lose one level at a time, not all at once
			stackLabels: ["Tipsy", "Merry", "Drunk", "Very drunk", "Wasted"],
			// Multiplied by the number of levels.
			modifiers: [
				mod.add("mood", 4),
				mod.add("stress", -4),
				mod.perHour("energy", -1),
				mod.perHour("drink", -1),
			],
			good: null,
		});

		/* ======================================================================
		 *  4. What you're doing
		 * ======================================================================
		 *
		 * Hidden effects that are on only while an action runs (actions add and
		 * remove them: see `during(...)` in town-actions.js). They change how
		 * your stats move each hour of the activity.
		 */

		const doing = (def) => R.define("statusEffect", { ...def, hidden: true });

		doing({
			id: "asleep",
			label: "Asleep",
			modifiers: [
				mod.perHour("energy", 16),
				mod.speed("food", 0.5),
				mod.speed("drink", 0.5),
				mod.speed("bladder", 0.6),
				mod.speed("hygiene", 0.5),
				mod.perHour("stress", -2),
			],
		});
		// While you walk somewhere (the walking travel mode's `during`, town-map.js).
		doing({ id: "on_foot", label: "Walking", modifiers: [mod.perHour("energy", -3), mod.perHour("drink", -2), mod.perHour("hygiene", -1)] });
		doing({ id: "sunbathing", label: "Sunbathing", modifiers: [mod.perHour("stress", -6), mod.perHour("mood", 3), mod.perHour("drink", -4)] });
		doing({
			id: "dancing",
			label: "Dancing",
			modifiers: [mod.perHour("mood", 6), mod.perHour("stress", -8), mod.perHour("energy", -12), mod.perHour("drink", -8), mod.perHour("hygiene", -10)],
		});
		doing({
			id: "swimming",
			label: "Swimming",
			modifiers: [mod.perHour("stress", -10), mod.perHour("mood", 4), mod.perHour("energy", -20), mod.perHour("food", -8)],
		});
		doing({ id: "relaxing", label: "Relaxing", modifiers: [mod.perHour("stress", -6), mod.perHour("mood", 3)] });
		doing({ id: "watching_tv", label: "Watching TV", modifiers: [mod.perHour("stress", -4), mod.perHour("mood", 3)] });
		doing({ id: "watching_film", label: "Watching a film", modifiers: [mod.perHour("stress", -5), mod.perHour("mood", 5)] });
		doing({ id: "reading", label: "Reading", modifiers: [mod.perHour("stress", -5), mod.perHour("mood", 2)] });
		doing({ id: "scrolling", label: "Scrolling", modifiers: [mod.perHour("mood", 2), mod.perHour("energy", -2)] });
		doing({
			id: "studying",
			label: "Studying",
			modifiers: [mod.perHour("stress", 4), mod.perHour("energy", -3), mod.perHour("mood", -1)],
		});
		doing({ id: "in_lessons", label: "In lessons", modifiers: [mod.perHour("stress", 3), mod.perHour("energy", -2)] });
		doing({
			id: "walking",
			label: "Walking",
			modifiers: [mod.perHour("stress", -6), mod.perHour("mood", 4), mod.perHour("energy", -3), mod.perHour("drink", -2)],
		});
		doing({
			id: "jogging",
			label: "Jogging",
			modifiers: [
				mod.perHour("stress", -12),
				mod.perHour("mood", 6),
				mod.perHour("energy", -18),
				mod.perHour("drink", -10),
				mod.perHour("hygiene", -20),
			],
		});
		doing({
			id: "exercising",
			label: "Exercising",
			modifiers: [
				mod.perHour("stress", -14),
				mod.perHour("mood", 5),
				mod.perHour("energy", -22),
				mod.perHour("drink", -12),
				mod.perHour("food", -6),
				mod.perHour("hygiene", -24),
			],
		});
		doing({ id: "browsing", label: "Browsing", modifiers: [mod.perHour("mood", 5), mod.perHour("energy", -2)] });
		doing({ id: "in_therapy", label: "In therapy", modifiers: [mod.perHour("stress", -8)] });
	});
})();
