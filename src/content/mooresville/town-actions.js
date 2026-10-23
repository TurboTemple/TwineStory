/*
 * Mooresville — things to do. Actions tied to a tag (toilet, sink, shower,
 * seating, bed, kitchen…) are offered in every room with that tag.
 *
 * Prices are in pence. Stat changes are first proposals to tune.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const WEEKDAYS = [1, 2, 3, 4, 5];
		const act = (def) => R.define("action", def);
		/** Pay up front. */
		const pay = (pence, reason) => ({ money: { amount: -pence, reason } });
		/** A status that's active only while the action runs. */
		const during = (status, def) => ({
			...def,
			costs: [...(def.costs ?? []), { status }],
			always: [...(def.always ?? []), { statusRemove: status }],
		});
		/** Buy something and have it there and then. */
		const buy = (id, label, at, price, mins, effects, extra = {}) =>
			act({ id, label, at, mins, ...extra, costs: [pay(price, label), ...(extra.costs ?? [])], effects });

		/* ---- Anywhere with the right fittings ----------------------------- */

		act({ id: "use_toilet", label: "Go for a wee", atTag: "toilet", mins: 3, effects: [{ statSet: { bladder: 0 } }] });
		act({ id: "wash_hands", label: "Wash your hands", atTag: "sink", mins: 1, effects: [{ stat: { hygiene: 2 } }] });
		act({ id: "shower", label: "Have a shower", atTag: "shower", mins: 12, effects: [{ statSet: { hygiene: 100 } }, { status: "refreshed" }] });
		act(during("relaxing", { id: "sit_relax", label: "Sit and relax", atTag: "seating", durations: [15, 30, 60] }));

		/* ---- Home ----------------------------------------------------------- */

		act(during("asleep", {
			id: "sleep", label: "Sleep", atTag: "bed", durations: [60, 120, 240, 480, "07:00"],
			desc: "Get into bed. You'll wake early if you really need the toilet.",
		}));
		act(during("reading", { id: "read_book", label: "Read a book", at: "home_bedroom", durations: [30, 60] }));
		act(during("studying", { id: "homework", label: "Do homework", at: "home_bedroom", durations: [30, 60, 120] }));
		act(during("scrolling", { id: "scroll_phone", label: "Scroll on your phone", at: ["home_bedroom", "home_living_room"], durations: [15, 30] }));
		act({ id: "brush_teeth", label: "Brush your teeth", at: "home_bathroom", mins: 3, effects: [{ stat: { hygiene: 4 } }] });

		act({ id: "make_breakfast", label: "Make breakfast", atTag: "kitchen", mins: 15, effects: [{ stat: { food: 30, drink: 5 } }], conditions: { time: { from: "05:00", to: "11:30" } } });
		act({ id: "make_sandwich", label: "Make a sandwich", atTag: "kitchen", mins: 10, effects: [{ stat: { food: 25 } }] });
		act({ id: "cook_meal", label: "Cook a proper meal", atTag: "kitchen", mins: 45, effects: [{ stat: { food: 55, mood: 4 } }, { status: "well_fed" }] });
		act({ id: "glass_of_water", label: "Have a glass of water", atTag: "kitchen", mins: 1, effects: [{ stat: { drink: 20, bladder: 4 } }] });
		act({ id: "make_tea", label: "Make a cup of tea", atTag: "kitchen", mins: 6, effects: [{ stat: { drink: 15, bladder: 6, mood: 2 } }] });
		act({ id: "make_coffee", label: "Make a coffee", atTag: "kitchen", mins: 5, effects: [{ stat: { drink: 10, bladder: 6 } }, { status: "caffeinated" }] });

		act(during("watching_tv", { id: "watch_tv", label: "Watch TV", atTag: "tv", durations: [30, 60, 120] }));
		act(during("asleep", { id: "nap_sofa", label: "Nap on the sofa", atTag: "sofa", durations: [20, 45] }));

		/* ---- Elm Road and the green ---------------------------------------- */

		act(during("jogging", { id: "go_jogging", label: "Go for a jog", at: ["elm_road", "riverside_path"], durations: [20, 40], conditions: { stat: { id: "energy", min: 20 } } }));
		act(during("walking", { id: "walk_green", label: "Walk round the green", at: "elm_park_green", durations: [15, 30] }));
		act({ id: "feed_ducks", label: "Feed the ducks", at: "elm_green_pond", mins: 15, effects: [{ stat: { mood: 4, stress: -3 } }] });

		/* ---- Patel's Corner Shop ------------------------------------------- */

		buy("shop_chocolate", "Buy a chocolate bar", "corner_shop", 95, 2, [{ stat: { food: 8, mood: 2 } }]);
		buy("shop_water", "Buy a bottle of water", "corner_shop", 85, 2, [{ stat: { drink: 25, bladder: 5 } }]);
		buy("shop_meal_deal", "Buy a meal deal", "corner_shop", 399, 10, [{ stat: { food: 35, drink: 20, bladder: 6 } }], { desc: "Sandwich, crisps and a drink." });
		buy("shop_energy_drink", "Buy an energy drink", "corner_shop", 175, 2, [{ stat: { drink: 15, bladder: 8 } }, { status: "caffeinated" }]);
		act({ id: "shop_magazines", label: "Flick through the magazines", at: "corner_shop", mins: 10, effects: [{ stat: { mood: 2 } }] });

		/* ---- Mooresville Academy ------------------------------------------- */

		act(during("in_lessons", {
			id: "attend_lesson", label: "Attend a lesson", at: "academy_form_room", mins: 60,
			conditions: { weekday: WEEKDAYS, time: { from: "08:40", to: "15:20" }, npcHere: "mr_hale" },
			effects: [{ counter: { name: "lessons_attended", add: 1 } }],
			desc: "Sit through a lesson with form 12B.",
		}));
		act(during("studying", { id: "study_library", label: "Study", at: "academy_library", durations: [30, 60, 120] }));
		act(during("reading", { id: "read_library", label: "Read quietly", at: "academy_library", durations: [30, 60] }));
		buy("canteen_lunch", "Buy school lunch", "academy_canteen", 260, 20, [{ stat: { food: 40, drink: 10 } }], { conditions: { time: { from: "11:45", to: "13:45" } } });
		buy("canteen_drink", "Buy a drink from the machine", "academy_canteen", 100, 1, [{ stat: { drink: 20, bladder: 5 } }]);
		act(during("exercising", { id: "shoot_hoops", label: "Shoot some hoops", at: "academy_sports_hall", durations: [20, 40] }));
		act(during("walking", { id: "walk_field", label: "Walk laps of the field", at: "academy_field", durations: [15, 30] }));

		/* ---- The Daily Grind ------------------------------------------------ */

		buy("cafe_flat_white", "Order a flat white", "grind_counter", 320, 5, [{ stat: { drink: 12, bladder: 10 } }, { status: "caffeinated" }]);
		buy("cafe_tea", "Order a pot of tea", "grind_counter", 240, 5, [{ stat: { drink: 18, bladder: 10, mood: 2 } }]);
		buy("cafe_hot_chocolate", "Order a hot chocolate", "grind_counter", 300, 5, [{ stat: { drink: 12, food: 5, mood: 4, bladder: 8 } }]);
		buy("cafe_croissant", "Order a croissant", "grind_counter", 260, 5, [{ stat: { food: 15, mood: 1 } }]);
		buy("cafe_toastie", "Order a cheese toastie", "grind_counter", 550, 12, [{ stat: { food: 35, mood: 2 } }]);
		act(during("relaxing", { id: "cafe_people_watch", label: "People-watch out of the window", at: "grind_seating", durations: [15, 30] }));

		/* ---- The Red Lion --------------------------------------------------- */

		const adults = { ageAtLeast: 18 };
		buy("pub_pint", "Order a pint", "lion_bar", 520, 10, [{ stat: { drink: 12, bladder: 22, mood: 3 } }, { status: "tipsy" }], { conditions: adults });
		buy("pub_wine", "Order a glass of wine", "lion_bar", 610, 10, [{ stat: { drink: 8, bladder: 12, mood: 3 } }, { status: "tipsy" }], { conditions: adults });
		buy("pub_soft_drink", "Order a soft drink", "lion_bar", 280, 5, [{ stat: { drink: 20, bladder: 12 } }]);
		buy("pub_crisps", "Buy a packet of crisps", "lion_bar", 140, 2, [{ stat: { food: 8 } }]);
		buy("pub_meal", "Order a pub meal", "lion_lounge", 1250, 35, [{ stat: { food: 55, mood: 4 } }, { status: "well_fed" }], {
			conditions: { time: { from: "12:00", to: "21:00" } }, desc: "The kitchen serves 12:00–21:00.",
		});
		buy("pub_pool", "Play a game of pool", "lion_lounge", 100, 20, [{ stat: { mood: 5, stress: -3 } }]);
		act({ id: "pub_fresh_air", label: "Get some fresh air", at: "lion_beer_garden", mins: 10, effects: [{ stat: { stress: -2, energy: 2 } }] });

		/* ---- Wellbeing Centre ---------------------------------------------- */

		act({ id: "ask_reception", label: "Ask about appointments", at: "wellbeing_reception", mins: 3, effects: [{ note: "Tom says Dr Okafor sees people in the therapy room, weekdays 09:00–17:00." }] });
		act({ id: "read_leaflets", label: "Read the leaflets", at: "wellbeing_waiting", mins: 5, effects: [{ stat: { stress: -1 } }] });
		act(during("in_therapy", {
			id: "therapy_session", label: "Therapy session", at: "wellbeing_therapy", mins: 120,
			// A checkpoint after an hour lets the receptionist interrupt.
			checkpoints: [60],
			conditions: { open: true, npcHere: "dr_okafor" },
			effects: [{ stat: { stress: -15, mood: 6 } }, { status: "calm" }, { note: "You talked a lot of things through." }],
			desc: "A two-hour session with Dr Okafor. Free on the NHS.",
		}));

		/* ---- Threadline ------------------------------------------------------ */

		act(during("browsing", { id: "threadline_browse", label: "Browse the rails", at: "threadline_floor", durations: [15, 30] }));
		act({ id: "threadline_try_on", label: "Try a few things on", at: "threadline_fitting", mins: 20, effects: [{ stat: { mood: 3 } }] });

		/* ---- PulseFit Gym --------------------------------------------------- */

		buy("gym_day_pass", "Buy a day pass", "pulsefit_reception", 650, 3, [{ status: "gym_pass" }], { conditions: { not: { status: "gym_pass" } } });
		act(during("exercising", {
			id: "gym_workout", label: "Work out", at: "pulsefit_floor", durations: [30, 60],
			conditions: { status: "gym_pass", stat: { id: "energy", min: 20 } },
			effects: [{ status: "post_workout" }],
		}));

		/* ---- The Arcade Shopping Centre ------------------------------------- */

		act(during("browsing", { id: "window_shop", label: "Window-shop", at: "arcade_concourse", durations: [15, 30, 60] }));
		buy("food_court_burger", "Buy a burger meal", "arcade_food_court", 749, 20, [{ stat: { food: 50, drink: 15, bladder: 8, mood: 3 } }]);
		buy("food_court_noodles", "Buy a noodle box", "arcade_food_court", 680, 15, [{ stat: { food: 45, mood: 2 } }]);
		buy("food_court_bubble_tea", "Buy a bubble tea", "arcade_food_court", 450, 5, [{ stat: { drink: 20, bladder: 10, mood: 4 } }]);
		buy("freshway_meal_deal", "Buy a meal deal", "arcade_freshway", 375, 10, [{ stat: { food: 35, drink: 20, bladder: 6 } }]);
		act(during("browsing", { id: "freshway_browse", label: "Wander the aisles", at: "arcade_freshway", durations: [15] }));
		act(during("browsing", { id: "urban_thread_browse", label: "Browse the clothes", at: "arcade_urban_thread", durations: [15, 30] }));
		act({ id: "urban_thread_try_on", label: "Try a few things on", at: "urban_thread_fitting", mins: 20, effects: [{ stat: { mood: 3 } }] });
		buy("cinema_film", "Watch a film", "arcade_cinema", 920, 120, [{ status: "entertained" }], { costs: [{ status: "watching_film" }], always: [{ statusRemove: "watching_film" }] });
		buy("cinema_popcorn", "Buy popcorn", "arcade_cinema", 550, 3, [{ stat: { food: 15, drink: -5 } }]);

		/* ---- Riverside Park ------------------------------------------------- */

		act(during("walking", { id: "walk_river", label: "Walk along the river", at: "riverside_path", durations: [20, 40, 60] }));
		buy("kiosk_ice_cream", "Buy an ice cream", "riverside_kiosk", 280, 5, [{ stat: { food: 8, mood: 5 } }]);
		buy("kiosk_tea", "Buy a takeaway tea", "riverside_kiosk", 200, 3, [{ stat: { drink: 15, bladder: 8 } }]);

		/* ---- Out and about --------------------------------------------------- */

		// Waiting works anywhere you can stand outside, open or not.
		act({
			id: "wait_around", label: "Wait", durations: [15, 30, 60], whenClosed: true,
			at: ["elm_road", "high_street", "elm_park_green", "riverside_park", "corner_shop", "academy", "daily_grind", "red_lion", "wellbeing", "threadline", "pulsefit", "arcade"],
		});
	});
})();
