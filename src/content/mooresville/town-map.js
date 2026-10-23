/*
 * ============================================================================
 *  Mooresville — the map
 * ============================================================================
 *
 * What's in this file:
 *   1. Districts (areas of town)
 *   2. Atmosphere lines (one is shown under a place's description)
 *   3. Places, and the rooms inside them
 *   4. Walking routes between places
 *   5. The Route 7 bus
 *   6. Ways to travel (walk, bus, taxi)
 *   7. Your money accounts (cash and bank card) and how much you start with
 *
 * The text you read at each place lives in src/story/mooresville/locations.twee
 * (a passage called "Loc_<id>" for each place and room).
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD A PLACE
 * ---------------------------------------------------------------------------
 *   place({
 *       id: "chip_shop",                 // lowercase_with_underscores; never rename once shipped
 *       name: "Codfather's Chippy",      // what the player sees
 *       district: "town_centre",         // one of the districts below
 *       tags: ["shop"],                  // see TAGS below
 *       hours: [hours.daily("11:00", "22:00")],  // leave out = always open
 *   });
 *   walk({ from: "high_street", to: "chip_shop", mins: 2 });  // so you can get there
 *
 *   Then add a passage ":: Loc_chip_shop" in locations.twee with its description.
 *
 *  HOW TO ADD A ROOM inside a place
 *   room({ id: "chip_shop_toilet", name: "Toilet", parent: "chip_shop", tags: ["toilet", "sink"] });
 *   Rooms follow their place's opening hours unless they have their own `hours`.
 *   `innerMins` is how long it takes to walk into the room (default 1).
 *
 * ---------------------------------------------------------------------------
 *  TAGS — what they switch on
 * ---------------------------------------------------------------------------
 *   toilet, sink, shower   → "Go for a wee", "Wash your hands", "Have a shower"
 *   seating                → "Sit and relax"
 *   bed, sofa, tv, kitchen → sleeping, napping, TV, cooking (see town-actions.js)
 *   changing               → you can get changed here (bedroom, fitting rooms…)
 *   hub                    → taxis can drop you here
 *   bus_stop               → (for your own reference; the bus uses its routes)
 *   start                  → where a new game begins (if config doesn't say)
 *   anything else          → just a label you can use in conditions later
 *
 *  Other fields:
 *   outdoor: true   → you're outside here (weather, cold and rain apply)
 *   ambient: [...]  → atmosphere lines; filled in from AMBIENT below
 *   crowd: [{ when: CONDITION, level: "busy", text: "…" }, …]
 *                   → how busy it is: the first entry that's true shows its
 *                     text, and { crowd: "busy" } tests its level. Rooms use
 *                     their place's unless they have their own.
 *   dressCode: { when: CONDITION, text: "…" }
 *                   → you can only go in dressed like this; `text` says why
 *                     not (see the gym floor). Works for any condition.
 *
 *  Walking times are rough real-world distances: next door is a minute or
 *  two, across town is 20–25 minutes.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { DAYS, hours } = setup.town;

		/* ======================================================================
		 *  1. Districts
		 * ==================================================================== */

		const district = (def) => R.define("district", def);

		district({ id: "elm_park", name: "Elm Park", desc: "A quiet residential suburb of terraced houses and tidy front gardens." });
		district({ id: "northfield", name: "Northfield", desc: "The north side of town, home to Mooresville Academy." });
		district({ id: "town_centre", name: "Town Centre", desc: "Shops, cafés and pubs around the old high street." });
		district({ id: "westgate", name: "Westgate", desc: "The newer side of town, built around the shopping centre." });
		district({ id: "riverside", name: "Riverside", desc: "Green space along the River Moore." });

		/* ======================================================================
		 *  2. Atmosphere
		 * ======================================================================
		 *
		 * One line is shown under a place's description, and it stays the same
		 * for the whole in-game hour.
		 *
		 *   "Plain text"                       → can show any time
		 *   { text: "…", when: CONDITION }     → only while the condition is true
		 *
		 * Lines with a `when` describe "right now" (rain, night, being tipsy),
		 * so while one applies, the plain lines are skipped.
		 */

		// Conditions used by the lines below. Add your own the same way.
		const wet = { weather: { wet: true } };              // drizzle, rain or snow
		const sunny = { weather: { kind: "sunny" } };
		const cold = { weather: { tempMax: 6 } };            // 6°C or colder
		const evening = { time: { from: "19:00", to: "05:00" } };
		const morning = { time: { from: "06:00", to: "09:30" } };

		/** Place or room id → its atmosphere lines. */
		const AMBIENT = {
			home_bedroom: [
				"Your phone charger is, as usual, just out of reach.",
				"Posters you put up years ago are curling at the corners.",
				{ text: "Rain taps against the window.", when: wet },
				{ text: "Sunlight slants across the unmade bed.", when: { all: [sunny, morning] } },
				{ text: "The street light outside throws an orange glow on the ceiling.", when: evening },
			],
			home_kitchen: [
				"The fridge hums to itself.",
				{ text: "The kettle is still warm from someone's morning tea.", when: morning },
			],
			elm_road: [
				"A cat watches you from a garden wall.",
				"Someone two doors down is mowing their lawn.",
				{ text: "Rain drums on the roofs of the parked cars.", when: wet },
				{ text: "Your breath clouds in the cold air.", when: cold },
				{ text: "Curtains glow in the windows along the street.", when: evening },
			],
			high_street: [
				"A busker plays something you almost recognise.",
				"Pigeons squabble over a dropped sandwich.",
				{ text: "Shoppers hurry between doorways under umbrellas.", when: wet },
				{ text: "Café tables have spilled out onto the pavement in the sunshine.", when: sunny },
				{ text: "The shops are dark; the pub windows are the brightest thing on the street.", when: evening },
			],
			grind_seating: [
				"The coffee machine hisses and someone laughs at a corner table.",
				"A student is asleep on their laptop by the window.",
				{ text: "The windows are fogged up and every seat is taken by people sheltering from the rain.", when: wet },
			],
			lion_bar: [
				"Someone is losing badly at the quiz machine.",
				{ text: "The bar is three deep, and the noise is cheerful.", when: { all: [evening, { weekday: [5, 6] }] } },
				{ text: "The room has a slight sway to it. Or maybe that's you.", when: { status: "tipsy" } },
			],
			elm_park_green: [
				"A dog chases a ball it has no intention of bringing back.",
				{ text: "The grass is soaked and squelches underfoot.", when: wet },
				{ text: "People are sprawled on the grass in the sun.", when: sunny },
			],
			riverside_path: [
				"Ducks drift past on the slow brown river.",
				"A rowing team glides by, the cox shouting time.",
				{ text: "Mist hangs low over the water.", when: { weather: { kind: "fog" } } },
				{ text: "The river is high and fast after the rain.", when: wet },
			],
			arcade_concourse: [
				"Piped music and the squeak of trainers on polished floors.",
				"A child is having a meltdown outside the toy shop.",
				{ text: "The concourse is packed with people escaping the rain.", when: wet },
			],
			academy_form_room: [
				"Someone has drawn a surprisingly good cartoon of Mr Hale on the whiteboard.",
				"The radiator clanks.",
				{ text: "Everyone is half asleep. It's far too early for this.", when: morning },
			],
		};

		/* ======================================================================
		 *  3. Places and rooms
		 * ====================================================================== */

		/**
		 * A place on the map (a "site"): you travel between places.
		 * Its description passage is "Loc_<id>".
		 */
		const place = ({ id, name, district, ...rest }) =>
			R.define("location", { id, name, district, passage: `Loc_${id}`, ambient: AMBIENT[id] ?? [], ...rest });

		/**
		 * A room inside a place (or inside another room). You walk between
		 * rooms; it takes `innerMins` (default 1) to step into one.
		 */
		const room = ({ id, name, parent, ...rest }) =>
			R.define("location", { id, name, parent, district: null, passage: `Loc_${id}`, ambient: AMBIENT[id] ?? [], ...rest });

		/* ---- Elm Park (home) -------------------------------------------------- */

		place({ id: "home", name: "Your House", district: "elm_park", tags: ["home"] });
		room({ id: "home_bedroom", name: "Your Bedroom", parent: "home", tags: ["home", "bed", "start", "changing"] });
		room({ id: "home_bathroom", name: "Bathroom", parent: "home", tags: ["home", "toilet", "sink", "shower", "changing"] });
		room({ id: "home_kitchen", name: "Kitchen", parent: "home", tags: ["home", "kitchen"] });
		room({ id: "home_living_room", name: "Living Room", parent: "home", tags: ["home", "sofa", "tv"] });

		place({ id: "elm_road", name: "Elm Road", district: "elm_park", outdoor: true, tags: ["street", "hub", "bus_stop"] });

		place({ id: "corner_shop", name: "Patel's Corner Shop", district: "elm_park", hours: [hours.daily("07:00", "22:00")] });

		place({ id: "elm_park_green", name: "Elm Park Green", district: "elm_park", outdoor: true, tags: ["park"] });
		room({ id: "elm_green_pond", name: "The Duck Pond", parent: "elm_park_green", outdoor: true, tags: ["seating"], innerMins: 2 });

		/* ---- Northfield (school) ---------------------------------------------- */

		place({
			id: "academy",
			name: "Mooresville Academy",
			district: "northfield",
			tags: ["school", "bus_stop"],
			hours: [hours.on(DAYS.WEEKDAYS, "07:45", "17:00")],
		});
		room({ id: "academy_form_room", name: "Form Room 12B", parent: "academy", tags: ["school", "classroom"], innerMins: 2 });
		room({ id: "academy_canteen", name: "Canteen", parent: "academy", tags: ["school", "seating"], innerMins: 2 });
		room({ id: "academy_library", name: "Library", parent: "academy", tags: ["school", "quiet"], innerMins: 2 });
		room({ id: "academy_sports_hall", name: "Sports Hall", parent: "academy", tags: ["school"], innerMins: 3 });
		room({ id: "academy_field", name: "Playing Field", parent: "academy", tags: ["school"], outdoor: true, innerMins: 3 });
		room({ id: "academy_toilets", name: "Toilets", parent: "academy", tags: ["toilet", "sink"] });

		/* ---- Town Centre ------------------------------------------------------- */

		place({
			id: "high_street",
			name: "Mooresville High Street",
			district: "town_centre",
			outdoor: true,
			tags: ["street", "hub", "bus_stop"],
			// How busy it is: the first line that's true is shown (and { crowd: "busy" } can test it).
			crowd: [
				{ when: { happening: "saturday_market" }, level: "busy", text: "The street is packed with market shoppers." },
				{ when: { time: { from: "08:00", to: "18:00" } }, level: "busy", text: "Shoppers and buses crowd the pavements." },
				{ when: { time: { from: "23:00", to: "06:00" } }, level: "quiet", text: "The street is empty apart from the odd taxi." },
			],
		});

		// The Daily Grind (café, and the barista job: see town-work.js)
		place({
			id: "daily_grind",
			name: "The Daily Grind",
			district: "town_centre",
			tags: ["cafe"],
			hours: [hours.on(DAYS.MON_SAT, "07:30", "18:00"), hours.on(DAYS.SUN, "09:00", "16:00")],
			crowd: [
				{ when: { weekday: DAYS.WEEKDAYS, time: { from: "07:30", to: "09:30" } }, level: "busy", text: "The morning rush: the queue is nearly out of the door." },
				{ when: { time: { from: "14:00", to: "16:00" } }, level: "quiet", text: "It's the quiet part of the afternoon." },
			],
		});
		room({ id: "grind_counter", name: "Counter", parent: "daily_grind", tags: ["cafe"] });
		room({ id: "grind_seating", name: "Seating Area", parent: "daily_grind", tags: ["cafe", "seating"] });
		room({ id: "grind_toilet", name: "Toilet", parent: "daily_grind", tags: ["toilet", "sink"] });

		// The Red Lion (pub). Open till midnight on Friday and Saturday.
		place({
			id: "red_lion",
			name: "The Red Lion",
			district: "town_centre",
			tags: ["pub"],
			hours: [
				hours.on([1, 2, 3, 4], "11:00", "23:00"), // Monday–Thursday
				hours.on([5, 6], "11:00", "24:00"),       // Friday–Saturday
				hours.on(DAYS.SUN, "12:00", "22:30"),
			],
		});
		room({ id: "lion_bar", name: "The Bar", parent: "red_lion", tags: ["pub"] });
		room({ id: "lion_lounge", name: "Lounge", parent: "red_lion", tags: ["pub", "seating"] });
		room({ id: "lion_beer_garden", name: "Beer Garden", parent: "red_lion", tags: ["pub", "seating"], outdoor: true });
		room({ id: "lion_toilets", name: "Toilets", parent: "red_lion", tags: ["toilet", "sink"] });

		// Wellbeing Centre (Dr Okafor, the therapist)
		place({
			id: "wellbeing",
			name: "Mooresville Wellbeing Centre",
			district: "town_centre",
			tags: ["health"],
			hours: [hours.on(DAYS.WEEKDAYS, "09:00", "17:00")],
		});
		room({ id: "wellbeing_reception", name: "Reception", parent: "wellbeing" });
		room({ id: "wellbeing_waiting", name: "Waiting Room", parent: "wellbeing", tags: ["seating"] });
		room({ id: "wellbeing_therapy", name: "Therapy Room", parent: "wellbeing", innerMins: 1 });
		room({ id: "wellbeing_toilets", name: "Toilets", parent: "wellbeing", tags: ["toilet", "sink"] });

		place({
			id: "snips",
			name: "Snips Hair Salon",
			district: "town_centre",
			tags: ["shop", "salon"],
			hours: [hours.on(DAYS.MON_SAT, "09:00", "18:00")],
		});

		// Threadline (clothes boutique)
		place({
			id: "threadline",
			name: "Threadline",
			district: "town_centre",
			tags: ["shop", "clothes"],
			hours: [hours.on(DAYS.MON_SAT, "09:00", "17:30"), hours.on(DAYS.SUN, "10:30", "16:30")],
		});
		room({ id: "threadline_floor", name: "Shop Floor", parent: "threadline", tags: ["clothes"] });
		room({ id: "threadline_fitting", name: "Fitting Rooms", parent: "threadline", tags: ["clothes", "fitting_room", "changing"] });

		// PulseFit Gym
		place({ id: "pulsefit", name: "PulseFit Gym", district: "town_centre", tags: ["gym"], hours: [hours.daily("06:00", "22:00")] });
		room({ id: "pulsefit_reception", name: "Reception", parent: "pulsefit", tags: ["gym"] });
		room({
			id: "pulsefit_floor",
			name: "Gym Floor",
			parent: "pulsefit",
			tags: ["gym"],
			// Gym kit only: change in the changing rooms first.
			dressCode: { when: { wearing: { attribute: "sportswear", min: 2 } }, text: "Gym kit only: trainers and a sporty top or bottoms (change in the changing rooms)" },
		});
		room({ id: "pulsefit_changing", name: "Changing Rooms", parent: "pulsefit", tags: ["gym", "toilet", "sink", "shower", "changing"] });

		/* ---- Westgate (shopping centre) --------------------------------------- */

		place({
			id: "arcade",
			name: "The Arcade Shopping Centre",
			district: "westgate",
			tags: ["hub", "bus_stop", "shopping"],
			hours: [hours.on(DAYS.MON_SAT, "09:00", "20:00"), hours.on(DAYS.SUN, "10:30", "16:30")],
		});
		room({ id: "arcade_concourse", name: "Main Concourse", parent: "arcade", tags: ["shopping", "seating"] });
		room({ id: "arcade_food_court", name: "Food Court", parent: "arcade", tags: ["shopping", "seating"], innerMins: 2 });
		room({ id: "arcade_freshway", name: "FreshWay Supermarket", parent: "arcade", tags: ["shopping", "supermarket"], innerMins: 2 });
		room({ id: "arcade_urban_thread", name: "Urban Thread", parent: "arcade", tags: ["shopping", "clothes"], innerMins: 2 });
		room({ id: "urban_thread_fitting", name: "Fitting Rooms", parent: "arcade_urban_thread", tags: ["clothes", "fitting_room", "changing"] });
		// The cinema has its own entrance and stays open after the centre shuts.
		room({ id: "arcade_cinema", name: "Arcade Cinema", parent: "arcade", tags: ["cinema"], innerMins: 3, hours: [hours.daily("11:00", "23:00")] });
		room({ id: "arcade_toilets", name: "Toilets", parent: "arcade", tags: ["toilet", "sink"] });

		/* ---- Riverside --------------------------------------------------------- */

		place({ id: "riverside_park", name: "Riverside Park", district: "riverside", outdoor: true, tags: ["park"] });
		room({ id: "riverside_path", name: "River Path", parent: "riverside_park", outdoor: true, tags: ["seating"], innerMins: 3 });
		room({ id: "riverside_kiosk", name: "Boathouse Kiosk", parent: "riverside_park", outdoor: true, innerMins: 4, hours: [hours.daily("10:00", "17:00")] });

		// A block of flats. The flat itself is only open to you while you rent
		// it (town-home.js); the hallway is shared.
		const flatOnly = { livesAt: "riverside_flat" };
		place({ id: "riverside_court", name: "Riverside Court", district: "riverside", tags: ["flats"] });
		room({ id: "flat_living", name: "Flat 4: Living Room", parent: "riverside_court", tags: ["home", "sofa"], entry: flatOnly, innerMins: 2 });
		room({ id: "flat_bedroom", name: "Flat 4: Bedroom", parent: "flat_living", tags: ["home", "bed", "changing"] });
		room({ id: "flat_bathroom", name: "Flat 4: Bathroom", parent: "flat_living", tags: ["home", "toilet", "sink", "shower", "changing"] });
		room({ id: "flat_kitchen", name: "Flat 4: Kitchen", parent: "flat_living", tags: ["home", "kitchen"] });

		/* ---- Letting agent (High Street) -------------------------------------- */

		place({
			id: "keys_lettings",
			name: "Keys & Co Lettings",
			district: "town_centre",
			tags: ["letting_agent"], // lists places to rent (town-home.js)
			hours: [hours.on(DAYS.MON_SAT, "09:00", "17:30")],
		});

		/* ======================================================================
		 *  4. Walking routes
		 * ======================================================================
		 *
		 * Each route works both ways. Walking goes one route at a time (decided
		 * by the user), so a place is only reachable on foot through routes.
		 * `mins` is the walking time in minutes.
		 */

		const walk = ({ from, to, mins }) => R.define("route", { id: `walk_${from}_${to}`, from, to, mins });

		walk({ from: "home", to: "elm_road", mins: 1 });
		walk({ from: "elm_road", to: "corner_shop", mins: 3 });
		walk({ from: "elm_road", to: "elm_park_green", mins: 6 });
		walk({ from: "elm_road", to: "academy", mins: 18 });
		walk({ from: "elm_road", to: "high_street", mins: 25 });
		walk({ from: "academy", to: "high_street", mins: 15 });
		walk({ from: "high_street", to: "daily_grind", mins: 1 });
		walk({ from: "high_street", to: "red_lion", mins: 2 });
		walk({ from: "high_street", to: "threadline", mins: 2 });
		walk({ from: "high_street", to: "snips", mins: 3 });
		walk({ from: "high_street", to: "wellbeing", mins: 4 });
		walk({ from: "high_street", to: "pulsefit", mins: 6 });
		walk({ from: "high_street", to: "arcade", mins: 10 });
		walk({ from: "high_street", to: "riverside_park", mins: 12 });
		walk({ from: "arcade", to: "riverside_park", mins: 15 });
		walk({ from: "riverside_park", to: "riverside_court", mins: 4 });
		walk({ from: "high_street", to: "keys_lettings", mins: 2 });

		/* ======================================================================
		 *  5. The Route 7 bus
		 * ======================================================================
		 *
		 * Stops in order along the route, with minutes between each pair.
		 * You can ride several stops in one go (the fare is the same).
		 */

		const bus7 = ({ from, to, mins }) => R.define("route", { id: `bus7_${from}_${to}`, network: "bus7", from, to, mins });

		bus7({ from: "elm_road", to: "academy", mins: 6 });
		bus7({ from: "academy", to: "high_street", mins: 7 });
		bus7({ from: "high_street", to: "arcade", mins: 4 });

		/* ======================================================================
		 *  6. Ways to travel
		 * ======================================================================
		 *
		 * Fields:
		 *   conditions   who can use it (here: you must be dressed to go out)
		 *   network      which routes it follows ("bus7" above; none = walking routes)
		 *   multiHop     can go several stops in one trip
		 *   destTag      only goes to places with this tag (taxis: "hub")
		 *   minDistance  only offered when walking would take longer than this
		 *   timeFactor   × the walking time (taxi: 0.3 = much faster)
		 *   cost + fare  in whole pounds:
		 *                "flat": one price (fare.flat)
		 *                "meter": fare.base + fare.perMin for each minute of the
		 *                         ride, rounded to the nearest pound
		 */

		// Decided by the user: you need to be dressed to go out (see setup.config.clothing).
		const dressed = { dressed: true };

		R.define("travelMode", { id: "walk", label: "Walk", order: 0, conditions: dressed });

		R.define("travelMode", {
			id: "bus7",
			label: "Bus (Route 7)",
			order: 1,
			conditions: dressed,
			network: "bus7",
			multiHop: true,
			cost: "flat",
			fare: { flat: 2 }, // £2 for any trip
		});

		R.define("travelMode", {
			id: "taxi",
			label: "Taxi",
			order: 2,
			conditions: dressed,
			multiHop: true,
			destTag: "hub",
			stopsOnWay: false,
			minDistance: 10,   // only for trips longer than a 10-minute walk
			timeFactor: 0.3,
			cost: "meter",
			fare: { base: 3, perMin: 0.5 }, // £3 + 50p a minute, rounded to whole pounds
		});

		/* ======================================================================
		 *  7. Money accounts
		 * ======================================================================
		 *
		 * `start`  how much is in each account on a new game, in whole pounds.
		 * `order`  paying tries accounts lowest order first (cash, then card),
		 *          using the first one that can cover the whole amount. Money
		 *          you earn goes to the first account unless something says
		 *          otherwise (wages go to the bank: see town-work.js).
		 */

		R.define("account", { id: "cash", label: "Cash", kind: "cash", start: 35, order: 0 });
		R.define("account", { id: "bank", label: "Bank card", kind: "bank", start: 180, order: 1 });
	});
})();
