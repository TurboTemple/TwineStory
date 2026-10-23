/*
 * Mooresville — the PC's stats and the effects that can be active on them.
 *
 * Every stat runs 0–100. Rates are per in-game hour while awake; being
 * asleep slows most of them down. All numbers are first proposals to tune.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/* ---- Stats -------------------------------------------------------- */

		const stat = (id, label, desc, extra) => R.define("stat", { id, label, desc, ...extra });
		stat("health", "Health", "Your overall health. Going without food or drink wears it down.", { start: 100, change: "none", order: 0 });
		stat("energy", "Energy", "How awake you are. Sleep restores it.", { start: 80, perHour: -4, order: 1 });
		stat("food", "Food", "How well fed you are.", { start: 70, perHour: -4, order: 2 });
		stat("drink", "Drink", "How hydrated you are.", { start: 70, perHour: -5, order: 3 });
		stat("bladder", "Bladder", "How badly you need the toilet.", { start: 15, perHour: 5, good: "low", order: 4 });
		stat("hygiene", "Hygiene", "How clean and fresh you are.", { start: 85, perHour: -1.5, order: 5 });
		stat("mood", "Mood", "How you feel. Drifts back towards normal over time.", { start: 60, change: "toward", target: 55, perHour: 2, order: 6 });
		stat("stress", "Stress", "How wound up you are. Settles slowly by itself.", { start: 30, change: "toward", target: 25, perHour: 1, good: "low", order: 7 });

		/* ---- Effects that follow a stat ----------------------------------- */

		const need = (id, label, desc, when, modifiers, factors = {}) =>
			R.define("statusEffect", { id, label, desc, while: when, modifiers, factors, good: false });
		need("needs_toilet", "Needs the toilet", "You could really do with a wee.", { stat: "bladder", min: 70, max: 89.999 }, [{ stat: "mood", op: "add", value: -6 }]);
		need("bursting", "Bursting", "You need the toilet right now.", { stat: "bladder", min: 90 }, [{ stat: "mood", op: "add", value: -15 }, { stat: "stress", op: "add", value: 10 }]);
		need("hungry", "Hungry", "Your stomach is rumbling.", { stat: "food", min: 5.001, max: 25 }, [{ stat: "mood", op: "add", value: -5 }]);
		need("starving", "Starving", "You badly need to eat. It's hurting your health.", { stat: "food", max: 5 }, [{ stat: "mood", op: "add", value: -12 }, { stat: "health", op: "rateAdd", value: -2 }]);
		need("thirsty", "Thirsty", "Your mouth is dry.", { stat: "drink", min: 5.001, max: 25 }, [{ stat: "mood", op: "add", value: -5 }, { stat: "energy", op: "rateAdd", value: -1 }]);
		need("dehydrated", "Dehydrated", "You badly need a drink. It's hurting your health.", { stat: "drink", max: 5 }, [{ stat: "mood", op: "add", value: -12 }, { stat: "health", op: "rateAdd", value: -3 }]);
		need("tired", "Tired", "Your eyelids are heavy.", { stat: "energy", min: 8.001, max: 25 }, [{ stat: "mood", op: "add", value: -5 }]);
		need("exhausted", "Exhausted", "You can barely keep your eyes open. Everything takes longer.", { stat: "energy", max: 8 }, [{ stat: "mood", op: "add", value: -12 }, { stat: "stress", op: "add", value: 8 }],
			// Everything takes longer when you're this tired.
			{ actionTime: 1.25 });
		need("unwashed", "Unwashed", "You're starting to feel grubby, and people notice: they warm to you more slowly.", { stat: "hygiene", max: 25 }, [{ stat: "mood", op: "add", value: -4 }], { relGain: 0.5 });
		need("stressed", "Stressed out", "Everything feels like too much.", { stat: "stress", min: 70 }, [{ stat: "mood", op: "add", value: -8 }]);

		/* ---- Timed effects ------------------------------------------------ */

		const timed = (id, label, desc, mins, modifiers, extra = {}) =>
			R.define("statusEffect", { id, label, desc, mins, modifiers, good: true, ...extra });
		timed("caffeinated", "Caffeinated", "A caffeine buzz is keeping you sharp.", 180,
			[{ stat: "energy", op: "add", value: 10 }, { stat: "stress", op: "add", value: 3 }]);
		timed("well_fed", "Well fed", "A proper meal. You feel satisfied.", 180, [{ stat: "mood", op: "add", value: 4 }]);
		timed("refreshed", "Refreshed", "Clean and awake after a shower.", 120, [{ stat: "mood", op: "add", value: 4 }, { stat: "energy", op: "add", value: 3 }]);
		timed("post_workout", "Post-workout glow", "Tired legs, clear head.", 150, [{ stat: "mood", op: "add", value: 6 }, { stat: "stress", op: "add", value: -6 }]);
		timed("calm", "Calm", "Talking things through has left you calmer.", 240, [{ stat: "stress", op: "add", value: -8 }, { stat: "mood", op: "add", value: 3 }]);
		timed("entertained", "Entertained", "Still thinking about the film.", 120, [{ stat: "mood", op: "add", value: 5 }]);
		timed("gym_pass", "Gym day pass", "You can use the PulseFit gym floor today.", 720, [], { good: null });
		R.define("statusEffect", {
			id: "tipsy",
			label: "Tipsy",
			desc: "You've had a drink or two. Each drink wears off after a while.",
			mins: 90,
			stacking: "stack",
			maxStacks: 5,
			expire: "one",
			stackLabels: ["Tipsy", "Merry", "Drunk", "Very drunk", "Wasted"],
			modifiers: [
				{ stat: "mood", op: "add", value: 4 },
				{ stat: "stress", op: "add", value: -4 },
				{ stat: "energy", op: "rateAdd", value: -1 },
				{ stat: "drink", op: "rateAdd", value: -1 },
			],
			good: null,
		});

		/* ---- What you're doing (shown while an activity runs) ------------- */

		const doing = (id, label, modifiers) =>
			R.define("statusEffect", { id, label, modifiers, hidden: true });
		doing("asleep", "Asleep", [
			{ stat: "energy", op: "rateAdd", value: 16 },
			{ stat: "food", op: "rateMul", value: 0.5 },
			{ stat: "drink", op: "rateMul", value: 0.5 },
			{ stat: "bladder", op: "rateMul", value: 0.6 },
			{ stat: "hygiene", op: "rateMul", value: 0.5 },
			{ stat: "stress", op: "rateAdd", value: -2 },
		]);
		doing("relaxing", "Relaxing", [{ stat: "stress", op: "rateAdd", value: -6 }, { stat: "mood", op: "rateAdd", value: 3 }]);
		doing("watching_tv", "Watching TV", [{ stat: "stress", op: "rateAdd", value: -4 }, { stat: "mood", op: "rateAdd", value: 3 }]);
		doing("watching_film", "Watching a film", [{ stat: "stress", op: "rateAdd", value: -5 }, { stat: "mood", op: "rateAdd", value: 5 }]);
		doing("reading", "Reading", [{ stat: "stress", op: "rateAdd", value: -5 }, { stat: "mood", op: "rateAdd", value: 2 }]);
		doing("scrolling", "Scrolling", [{ stat: "mood", op: "rateAdd", value: 2 }, { stat: "energy", op: "rateAdd", value: -2 }]);
		doing("studying", "Studying", [{ stat: "stress", op: "rateAdd", value: 4 }, { stat: "energy", op: "rateAdd", value: -3 }, { stat: "mood", op: "rateAdd", value: -1 }]);
		doing("in_lessons", "In lessons", [{ stat: "stress", op: "rateAdd", value: 3 }, { stat: "energy", op: "rateAdd", value: -2 }]);
		doing("walking", "Walking", [{ stat: "stress", op: "rateAdd", value: -6 }, { stat: "mood", op: "rateAdd", value: 4 }, { stat: "energy", op: "rateAdd", value: -3 }, { stat: "drink", op: "rateAdd", value: -2 }]);
		doing("jogging", "Jogging", [{ stat: "stress", op: "rateAdd", value: -12 }, { stat: "mood", op: "rateAdd", value: 6 }, { stat: "energy", op: "rateAdd", value: -18 }, { stat: "drink", op: "rateAdd", value: -10 }, { stat: "hygiene", op: "rateAdd", value: -20 }]);
		doing("exercising", "Exercising", [{ stat: "stress", op: "rateAdd", value: -14 }, { stat: "mood", op: "rateAdd", value: 5 }, { stat: "energy", op: "rateAdd", value: -22 }, { stat: "drink", op: "rateAdd", value: -12 }, { stat: "food", op: "rateAdd", value: -6 }, { stat: "hygiene", op: "rateAdd", value: -24 }]);
		doing("browsing", "Browsing", [{ stat: "mood", op: "rateAdd", value: 5 }, { stat: "energy", op: "rateAdd", value: -2 }]);
		doing("in_therapy", "In therapy", [{ stat: "stress", op: "rateAdd", value: -8 }]);
	});
})();
