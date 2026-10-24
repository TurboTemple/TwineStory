/*
 * ============================================================================
 *  Mooresville — things to do
 * ============================================================================
 *
 * Every button under "Things to do" comes from an act({ … }) below.
 * Grouped by place. Stat changes are first proposals to tune.
 *
 * PRICES are whole pounds, and things that do the same cost the same
 * (decided by the user):
 *   £1   snacks, soft drinks, a game of pool
 *   £2   an ice cream
 *   £3   a hot drink or bubble tea; a light meal (food about +25)
 *   £5   a pint or a glass of wine; a gym day pass
 *   £8   a proper meal (food about +50 and "Well fed")
 *   £10  a film; a trim or a buzz cut     £20  a proper haircut     £50  hair dye
 *
 * Other things you can do live elsewhere:
 *   - shopping                    → town-shops.js
 *   - eating or drinking from your bag → town-items.js
 *   - work shifts                 → town-work.js
 *   - lessons                     → town-school.js
 *   - talking to people           → town-social.js
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD AN ACTION
 * ---------------------------------------------------------------------------
 *   act({
 *       id: "skim_stones",               // lowercase_with_underscores; never rename
 *       label: "Skim stones",            // the button text
 *       at: "riverside_path",            // where (one id or a list)
 *       mins: 10,                        // how long it takes
 *       effects: [{ stat: { mood: 3 } }],
 *   });
 *
 * ---------------------------------------------------------------------------
 *  FIELDS
 * ---------------------------------------------------------------------------
 *   at          place/room id, or a list of them
 *   atTag       OR: every room with this tag (e.g. "toilet": every toilet in town)
 *   mins        how long it takes, in minutes
 *   durations   OR: let the player choose: [60, 120, "07:00"] ("07:00" = until then)
 *   price       pay this up front, in whole pounds (shown on the button)
 *   whileDoing  a hidden effect that is on only while it runs (town-needs.js,
 *               part 4: "relaxing", "asleep", "studying"…). This is how
 *               activities change your stats hour by hour.
 *   conditions  when it's allowed. If they fail, the button is greyed out
 *               with what's needed underneath (decided by the user).
 *   hidden      true = don't show it at all when it's not allowed
 *   effects     what happens at the end (see below)
 *   costs       things taken at the start (items, money…)
 *   desc        a short line under the button
 *   whenClosed  true = can be done even when the place is closed
 *   tags        labels, e.g. "sleep" (waking from it shows the daily summary)
 *
 *  Everyday tasks get one sensible length (decided by the user); only things
 *  where the length matters (sleep, waiting) offer a choice.
 *
 * ---------------------------------------------------------------------------
 *  EFFECTS YOU CAN USE
 * ---------------------------------------------------------------------------
 *   { stat: { mood: 3, stress: -2 } }       change stats
 *   { statSet: { bladder: 0 } }             set stats
 *   { status: "caffeinated" }               switch an effect on
 *   { statusRemove: "caffeinated" }         switch it off
 *   { body: { weight: -0.2 } }              change a body part
 *   { bodySet: { hair_colour: "pink" } }    set a body part
 *   { money: { amount: 5 } }                earn £5 (negative = pay)
 *   { item: { id: "apple", qty: 1 } }       get an item (negative = use up)
 *   { skill: { barista: 0.5 } }             improve a skill
 *   { homework: true }                      finish the homework due soonest
 *   { habit: "coffee" }                     count today towards a habit (traits: town-traits.js)
 *   { note: "Text" }                        a line in the summary afterwards
 *
 *  CONDITIONS YOU CAN USE
 *   { time: { from: "12:00", to: "21:00" } }    { weekday: [1, 2, 3] }
 *   { stat: { id: "energy", min: 20 } }         { status: "gym_pass" }
 *   { has: "groceries" }                        { npcHere: "dr_okafor" }
 *   { open: true }                              { ageAtLeast: 18 }
 *   { body: { id: "hair_length", min: 4 } }     { not: { … } }  { any: [ … ] }
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/**
		 * Define an action. Two shortcuts on top of the normal fields:
		 *   price       → paid first, before anything else in `costs`
		 *   whileDoing  → that effect goes on at the start and comes off at the
		 *                 end, even if the action is cut short
		 */
		const act = ({ price, whileDoing, ...def }) => {
			let costs = def.costs ?? [];
			let always = def.always ?? [];
			if (price != null) costs = [{ money: { amount: -price, reason: def.label } }, ...costs];
			if (whileDoing) {
				costs = [...costs, { status: whileDoing }];
				always = [...always, { statusRemove: whileDoing }];
			}
			return R.define("action", { ...def, costs, always });
		};

		/** Cooking uses this many lots of groceries (from the cupboards or your bag). */
		const groceries = (n) => ({
			costs: [{ item: { id: "groceries", qty: -n } }],
			conditions: { has: { item: "groceries", qty: n } },
		});

		/* ======================================================================
		 *  Anywhere with the right fittings (by room tag: see town-map.js)
		 * ====================================================================== */

		act({ id: "use_toilet", label: "Go for a wee", atTag: "toilet", mins: 3, effects: [{ statSet: { bladder: 0 } }] });
		act({ id: "wash_hands", label: "Wash your hands", atTag: "sink", mins: 1, effects: [{ stat: { hygiene: 2 } }] });
		act({
			id: "shower",
			label: "Have a shower",
			atTag: "shower",
			mins: 12,
			effects: [{ statSet: { hygiene: 100 } }, { status: "refreshed" }, { statusRemove: "made_up" }],
		});
		act({
			id: "do_makeup",
			label: "Do your makeup",
			atTag: "sink", // any bathroom
			mins: 15,
			conditions: { has: "makeup_kit" },
			effects: [{ status: "made_up" }, { useUp: "makeup_kit" }], // one of the kit's 10 goes
			desc: "Needs a makeup kit (FreshWay sells them).",
		});
		act({ id: "sit_relax", label: "Sit and relax", atTag: "seating", mins: 30, whileDoing: "relaxing" });

		/* ======================================================================
		 *  Home
		 * ====================================================================== */

		act({
			id: "sleep",
			label: "Sleep",
			atTag: "bed",
			durations: [60, 120, 240, 480, "07:00"],
			whileDoing: "asleep",
			tags: ["sleep"],
			desc: "Get into bed. You'll wake early if you really need the toilet.",
		});
		act({ id: "read_book", label: "Read a book", at: "home_bedroom", mins: 60, whileDoing: "reading" });
		act({
			id: "homework",
			label: "Do homework",
			at: "home_bedroom",
			mins: 60,
			whileDoing: "studying",
			conditions: { stat: { id: "stress", max: 85 } },
			effects: [{ homework: true }],
			desc: "Finishes the homework due soonest. Too stressed (85+) and you can't focus.",
		});
		act({
			id: "scroll_phone",
			label: "Scroll on your phone",
			at: ["home_bedroom", "home_living_room"],
			mins: 30,
			whileDoing: "scrolling",
		});
		act({ id: "brush_teeth", label: "Brush your teeth", at: "home_bathroom", mins: 3, effects: [{ stat: { hygiene: 4 } }] });

		// ---- Kitchen (cooking uses groceries) ----

		act({
			id: "make_breakfast",
			label: "Make breakfast",
			atTag: "kitchen",
			mins: 15,
			effects: [{ stat: { food: 30, drink: 5 } }],
			...groceries(1),
			// Mornings only (this replaces the groceries condition, so it checks for them too).
			conditions: { has: "groceries", time: { from: "05:00", to: "11:30" } },
		});
		act({
			id: "make_sandwich",
			label: "Make a sandwich",
			atTag: "kitchen",
			mins: 10,
			effects: [{ stat: { food: 25 } }],
			...groceries(1),
		});
		act({
			id: "cook_meal",
			label: "Cook a proper meal",
			atTag: "kitchen",
			mins: 45,
			effects: [{ stat: { food: 55, mood: 4 } }, { status: "well_fed" }, { body: { weight: 0.1 } }],
			...groceries(2),
		});
		act({ id: "glass_of_water", label: "Have a glass of water", atTag: "kitchen", mins: 1, effects: [{ stat: { drink: 20, bladder: 4 } }] });
		act({ id: "make_tea", label: "Make a cup of tea", atTag: "kitchen", mins: 6, effects: [{ stat: { drink: 15, bladder: 6, mood: 2 } }] });
		act({
			id: "make_coffee",
			label: "Make a coffee",
			atTag: "kitchen",
			mins: 5,
			effects: [{ stat: { drink: 10, bladder: 6 } }, { status: "caffeinated" }, { habit: "coffee" }],
		});

		// ---- Living room ----

		act({ id: "watch_tv", label: "Watch TV", atTag: "tv", mins: 60, whileDoing: "watching_tv" });
		act({ id: "nap_sofa", label: "Nap on the sofa", atTag: "sofa", mins: 30, whileDoing: "asleep", tags: ["sleep"] });

		/* ======================================================================
		 *  Elm Road and the green
		 * ====================================================================== */

		act({
			id: "go_jogging",
			label: "Go for a jog",
			at: ["elm_road", "riverside_path"],
			mins: 30,
			whileDoing: "jogging",
			conditions: { stat: { id: "energy", min: 20 } },
			effects: [{ body: { weight: -0.2 } }, { habit: "exercise" }],
		});
		act({ id: "walk_green", label: "Walk round the green", at: "elm_park_green", mins: 20, whileDoing: "walking" });
		act({ id: "feed_ducks", label: "Feed the ducks", at: "elm_green_pond", mins: 15, effects: [{ stat: { mood: 4, stress: -3 } }] });

		/* ======================================================================
		 *  Patel's Corner Shop (snacks and groceries are sold in town-shops.js)
		 * ====================================================================== */

		act({ id: "shop_magazines", label: "Flick through the magazines", at: "corner_shop", mins: 10, effects: [{ stat: { mood: 2 } }] });

		/* ======================================================================
		 *  Mooresville Academy (lessons are on the timetable: town-school.js)
		 * ====================================================================== */

		act({
			id: "study_library",
			label: "Study",
			at: "academy_library",
			mins: 60,
			whileDoing: "studying",
			effects: [{ homework: true }],
			desc: "Finishes the homework due soonest, if you have any.",
		});
		act({ id: "read_library", label: "Read quietly", at: "academy_library", mins: 30, whileDoing: "reading" });
		act({
			id: "canteen_lunch",
			label: "Buy school lunch",
			at: "academy_canteen",
			mins: 20,
			price: 3,
			conditions: { time: { from: "11:45", to: "13:45" } },
			effects: [{ stat: { food: 25, drink: 10 } }],
		});
		act({
			id: "shoot_hoops",
			label: "Shoot some hoops",
			at: "academy_sports_hall",
			mins: 30,
			whileDoing: "exercising",
			effects: [{ body: { weight: -0.2 } }, { habit: "exercise" }],
		});
		act({ id: "walk_field", label: "Walk laps of the field", at: "academy_field", mins: 20, whileDoing: "walking" });

		/* ======================================================================
		 *  The Daily Grind
		 * ====================================================================== */

		act({
			id: "cafe_flat_white",
			label: "Order a flat white",
			at: "grind_counter",
			mins: 5,
			price: 3,
			effects: [{ stat: { drink: 12, bladder: 10 } }, { status: "caffeinated" }, { habit: "coffee" }],
		});
		act({
			id: "cafe_tea",
			label: "Order a pot of tea",
			at: "grind_counter",
			mins: 5,
			price: 3,
			effects: [{ stat: { drink: 18, bladder: 10, mood: 2 } }],
		});
		act({
			id: "cafe_hot_chocolate",
			label: "Order a hot chocolate",
			at: "grind_counter",
			mins: 5,
			price: 3,
			effects: [{ stat: { drink: 12, food: 5, mood: 4, bladder: 8 } }],
		});
		act({
			id: "cafe_croissant",
			label: "Order a croissant",
			at: "grind_counter",
			mins: 5,
			price: 3,
			effects: [{ stat: { food: 20, mood: 2 } }],
		});
		act({
			id: "cafe_toastie",
			label: "Order a cheese toastie",
			at: "grind_counter",
			mins: 12,
			price: 3,
			effects: [{ stat: { food: 25, mood: 2 } }],
		});
		act({
			id: "cafe_people_watch",
			label: "People-watch out of the window",
			at: "grind_seating",
			mins: 20,
			whileDoing: "relaxing",
		});

		/* ======================================================================
		 *  The Red Lion (alcohol is 18+)
		 * ====================================================================== */

		const adults = { ageAtLeast: 18 };

		act({
			id: "pub_pint",
			label: "Order a pint",
			at: "lion_bar",
			mins: 10,
			price: 5,
			conditions: adults,
			effects: [{ stat: { drink: 12, bladder: 22, mood: 3 } }, { status: "tipsy" }],
		});
		act({
			id: "pub_wine",
			label: "Order a glass of wine",
			at: "lion_bar",
			mins: 10,
			price: 5,
			conditions: adults,
			effects: [{ stat: { drink: 8, bladder: 12, mood: 3 } }, { status: "tipsy" }],
		});
		act({
			id: "pub_soft_drink",
			label: "Order a soft drink",
			at: "lion_bar",
			mins: 5,
			price: 1,
			effects: [{ stat: { drink: 20, bladder: 12 } }],
		});
		act({
			id: "pub_crisps",
			label: "Buy a packet of crisps",
			at: "lion_bar",
			mins: 2,
			price: 1,
			effects: [{ stat: { food: 8 } }],
		});
		act({
			id: "pub_meal",
			label: "Order a pub meal",
			at: "lion_lounge",
			mins: 35,
			price: 8,
			conditions: { time: { from: "12:00", to: "21:00" } },
			effects: [{ stat: { food: 50, mood: 4 } }, { status: "well_fed" }, { body: { weight: 0.3 } }],
			desc: "The kitchen serves 12:00–21:00.",
		});
		act({
			id: "pub_pool",
			label: "Play a game of pool",
			at: "lion_lounge",
			mins: 20,
			price: 1,
			effects: [{ stat: { mood: 5, stress: -3 } }],
		});
		act({
			id: "pub_fresh_air",
			label: "Get some fresh air",
			at: "lion_beer_garden",
			mins: 10,
			effects: [{ stat: { stress: -2, energy: 2 } }],
		});

		/* ======================================================================
		 *  Wellbeing Centre
		 * ====================================================================== */

		act({
			id: "ask_reception",
			label: "Ask about appointments",
			at: "wellbeing",
			mins: 3,
			effects: [{ note: "Tom says Dr Okafor sees people in the therapy room, weekdays 09:00–17:00." }],
		});
		act({ id: "read_leaflets", label: "Read the leaflets", at: "wellbeing", mins: 5, effects: [{ stat: { stress: -1 } }] });
		act({
			id: "therapy_session",
			label: "Therapy session",
			at: "wellbeing_therapy",
			mins: 120,
			whileDoing: "in_therapy",
			// A checkpoint after an hour lets the receptionist interrupt (town-events.js).
			checkpoints: [60],
			conditions: { open: true, npcHere: "dr_okafor" },
			effects: [{ stat: { stress: -15, mood: 6 } }, { status: "calm" }, { note: "You talked a lot of things through." }],
			desc: "A two-hour session with Dr Okafor. Free on the NHS.",
		});

		/* ======================================================================
		 *  Threadline
		 * ====================================================================== */

		act({ id: "threadline_browse", label: "Browse the rails", at: "threadline_floor", mins: 20, whileDoing: "browsing" });
		act({ id: "threadline_try_on", label: "Try a few things on", at: "threadline_fitting", mins: 20, effects: [{ stat: { mood: 3 } }] });

		/* ======================================================================
		 *  PulseFit Gym (buy a day pass at reception, then work out)
		 * ====================================================================== */

		act({
			id: "gym_day_pass",
			label: "Buy a day pass",
			at: "pulsefit_reception",
			mins: 3,
			price: 5,
			conditions: { not: { status: "gym_pass" } },
			effects: [{ status: "gym_pass" }],
		});
		act({
			id: "gym_workout",
			label: "Work out",
			at: "pulsefit_floor",
			mins: 60,
			whileDoing: "exercising",
			conditions: { status: "gym_pass", stat: { id: "energy", min: 20 } },
			effects: [
				{ status: "post_workout" },
				{ body: { weight: -0.4 } },
				{ habit: "exercise" },
				// Counts towards the "Getting fit" storyline (town-fitness.js).
				{ storylineCount: { id: "fitness", key: "workouts" } },
				// How it went. Tired workouts go wrong more often.
				{
					random: [
						{ weight: 6, then: [] },
						{
							weight: 2,
							then: [{ note: "A great session: you pushed harder than last time." }, { storylineCount: { id: "fitness", key: "workouts" } }],
						},
						{
							weight: 1,
							weightIf: [{ when: { stat: { id: "energy", max: 30 } }, add: 2 }],
							then: [{ note: "You pulled something and had to stop early. That one barely counted." }, { storylineCount: { id: "fitness", key: "workouts", add: -1 } }, { stat: { mood: -3 } }],
						},
					],
				},
			],
		});

		/* ======================================================================
		 *  The Arcade Shopping Centre
		 * ====================================================================== */

		act({ id: "window_shop", label: "Window-shop", at: "arcade", mins: 30, whileDoing: "browsing" });
		act({
			id: "food_court_burger",
			label: "Buy a burger meal",
			at: "arcade_food_court",
			mins: 20,
			price: 8,
			effects: [{ stat: { food: 50, drink: 15, bladder: 8, mood: 3 } }, { status: "well_fed" }, { body: { weight: 0.3 } }],
		});
		act({
			id: "food_court_noodles",
			label: "Buy a noodle box",
			at: "arcade_food_court",
			mins: 15,
			price: 8,
			effects: [{ stat: { food: 50, mood: 2 } }, { status: "well_fed" }],
		});
		act({
			id: "food_court_bubble_tea",
			label: "Buy a bubble tea",
			at: "arcade_food_court",
			mins: 5,
			price: 3,
			effects: [{ stat: { drink: 20, bladder: 10, mood: 4 } }],
		});
		act({ id: "urban_thread_browse", label: "Browse the clothes", at: "arcade_urban_thread", mins: 20, whileDoing: "browsing" });
		act({ id: "urban_thread_try_on", label: "Try a few things on", at: "urban_thread_fitting", mins: 20, effects: [{ stat: { mood: 3 } }] });
		act({
			id: "cinema_film",
			label: "Watch a film",
			at: "arcade_cinema",
			mins: 120,
			price: 10,
			whileDoing: "watching_film",
			effects: [{ status: "entertained" }],
		});
		act({
			id: "cinema_popcorn",
			label: "Buy popcorn",
			at: "arcade_cinema",
			mins: 3,
			price: 3,
			effects: [{ stat: { food: 15, drink: -5 } }],
		});

		/* ======================================================================
		 *  Snips Hair Salon
		 * ======================================================================
		 *
		 * Hair length is in centimetres underneath (town-body.js).
		 */

		/** Your hair must be at least this long (cm). */
		const hairAtLeast = (cm) => ({ body: { id: "hair_length", min: cm } });

		act({
			id: "haircut_trim",
			label: "Get a trim",
			at: "snips",
			mins: 30,
			price: 10,
			conditions: hairAtLeast(4),
			effects: [{ body: { hair_length: -2 } }, { stat: { mood: 2 } }, { status: "fresh_haircut" }],
		});
		act({
			id: "haircut_short",
			label: "Get it cut short",
			at: "snips",
			mins: 40,
			price: 20,
			conditions: hairAtLeast(8),
			effects: [{ bodySet: { hair_length: 6 } }, { stat: { mood: 2 } }, { status: "fresh_haircut" }],
		});
		act({
			id: "haircut_crop",
			label: "Get a buzz cut",
			at: "snips",
			mins: 20,
			price: 10,
			conditions: hairAtLeast(2),
			effects: [{ bodySet: { hair_length: 1 } }, { status: "fresh_haircut" }],
		});

		// Hair dye: one action per colour. Not offered for the colour you already have.
		const dye = ({ colour, price }) =>
			act({
				id: `dye_${colour}`,
				label: `Dye your hair ${colour}`,
				at: "snips",
				mins: 90,
				price,
				conditions: { body: { id: "hair_length", min: 2 }, not: { body: { id: "hair_colour", is: colour } } },
				effects: [{ bodySet: { hair_colour: colour } }, { stat: { mood: 3 } }],
			});
		dye({ colour: "blonde", price: 50 });
		dye({ colour: "black", price: 50 });
		dye({ colour: "pink", price: 50 });
		dye({ colour: "blue", price: 50 });

		/* ======================================================================
		 *  Riverside Park
		 * ====================================================================== */

		act({ id: "walk_river", label: "Walk along the river", at: "riverside_path", mins: 30, whileDoing: "walking" });
		act({
			id: "kiosk_ice_cream",
			label: "Buy an ice cream",
			at: "riverside_kiosk",
			mins: 5,
			price: 2,
			effects: [{ stat: { food: 8, mood: 5 } }],
		});
		act({
			id: "kiosk_tea",
			label: "Buy a takeaway tea",
			at: "riverside_kiosk",
			mins: 3,
			price: 3,
			effects: [{ stat: { drink: 15, bladder: 8 } }],
		});

		/* ======================================================================
		 *  Out and about
		 * ====================================================================== */

		// Waiting works anywhere you can stand outside, open or not.
		act({
			id: "wait_around",
			label: "Wait",
			durations: [15, 60],
			whenClosed: true,
			at: [
				"elm_road", "high_street", "elm_park_green", "riverside_park", "corner_shop", "academy",
				"daily_grind", "red_lion", "wellbeing", "threadline", "pulsefit", "arcade", "snips",
			],
		});
	});
})();
