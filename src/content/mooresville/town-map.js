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
 * Bus hubs: Elm Road, the Academy, the High Street and the Arcade (Route 7);
 * the High Street, Riverside Park, the Business District, South Town and
 * the beach (Route 3).
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
 *   computer               → your computer: playing online, streaming (stories/)
 *   hub                    → taxis can drop you here
 *   bus_stop               → (for your own reference; the bus uses its routes)
 *   start                  → where a new game begins (if config doesn't say)
 *   anything else          → just a label you can use in conditions later
 *
 *  Other fields:
 *   outdoor: true   → you're outside here (weather, cold and rain apply)
 *   ambient: [...]  → atmosphere lines; filled in from AMBIENT below
 *   links: ["room_a", "room_b"]
 *                   → the rooms you can walk to straight from here (doors).
 *                     Links work both ways. Without `links`, a room opens
 *                     onto its place's entrance and any rooms inside it.
 *                     You can only travel to other places from a place's
 *                     entrance (the place itself, e.g. your hallway).
 *                     links: [] means no doors at all (the school form room:
 *                     you come and go through the school day).
 *   roomsLabel: "Shops"
 *                   → the heading over the rooms list (default "Around here").
 *   entry: CONDITION
 *                   → you can only go in while this is true (the school's
 *                     library and sports hall: after school).
 *
 *  Merging a room into another (so old saves still work):
 *   R.alias("location", "old_room_id", "new_room_id");
 *   A saved game that was in the old room moves to the new one.
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
		district({ id: "business", name: "Business District", desc: "Glass office blocks, the bank and the film studio, busy on weekdays and empty at night." });
		district({ id: "south_town", name: "South Town", desc: "The old docks: late-night bars, the nightclub and shops you wouldn't take your gran to." });
		district({ id: "seafront", name: "The Seafront", desc: "Sand, a pier and a promenade at the south edge of town." });

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
			arcade: [
				"Piped music and the squeak of trainers on polished floors.",
				"A child is having a meltdown outside the toy shop.",
				{ text: "The concourse is packed with people escaping the rain.", when: wet },
			],
			riverside_park: [
				"A jogger thuds past, earphones in.",
				"Someone is trying, and failing, to fly a kite.",
				{ text: "The lawns are dotted with picnic blankets.", when: { all: [sunny, { time: { from: "11:00", to: "18:00" } }] } },
				{ text: "The paths are puddled and nearly empty.", when: wet },
				{ text: "The lamps along the paths make small islands of light.", when: evening },
			],
			business_district: [
				"Office workers stride past, lanyards swinging.",
				"The fountain in the square splashes away to nobody in particular.",
				{ text: "A tide of people in suits flows out of the station.", when: { all: [morning, { weekday: DAYS.WEEKDAYS }] } },
				{ text: "The towers are dark except for a cleaner's trolley on the fourth floor.", when: evening },
				{ text: "Umbrellas jostle across the square.", when: wet },
			],
			south_town: [
				"Gulls argue on the roof of an old warehouse.",
				"Bass thuds faintly from somewhere down the street.",
				{ text: "Neon signs buzz pink and blue in the wet street.", when: { all: [evening, wet] } },
				{ text: "A queue snakes along the pavement outside Club Neon.", when: { all: [evening, { weekday: [4, 5, 6] }] } },
				{ text: "The street is half asleep; most shutters are still down.", when: morning },
			],
			neon_dance_floor: [
				"The bass is so loud you feel it in your ribs.",
				"Lights sweep the crowd in slow purple arcs.",
				{ text: "The room has a definite sway to it. Or maybe that's you.", when: { status: "tipsy" } },
			],
			beach: [
				"Gulls wheel over the promenade, eyeing everyone's chips.",
				"The smell of salt and suncream drifts up from the sand.",
				{ text: "The beach is packed: windbreaks, buckets and shrieking children.", when: { all: [sunny, { weather: { tempMin: 18 } }] } },
				{ text: "Grey waves slap the sea wall, and the promenade is almost empty.", when: wet },
				{ text: "The wind off the sea cuts straight through you.", when: cold },
				{ text: "The pier lights glitter on the dark water.", when: evening },
			],
			beach_sand: [
				"A dog races in and out of the waves, barking at each one.",
				{ text: "The sand is almost too hot to walk on.", when: { all: [sunny, { weather: { tempMin: 20 } }] } },
				{ text: "The damp sand is firm and cold underfoot.", when: wet },
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

		// Your house. `links` says which rooms open onto which (both ways): you
		// walk bedroom → living room → hallway to get out of the front door.
		place({ id: "home", name: "Your House", district: "elm_park", tags: ["home"], links: ["home_living_room", "home_kitchen"] });
		room({ id: "home_bedroom", name: "Your Bedroom", parent: "home", tags: ["home", "bed", "start", "changing", "computer"], links: ["home_bathroom", "home_living_room"] });
		room({ id: "home_bathroom", name: "Bathroom", parent: "home", tags: ["home", "toilet", "sink", "shower", "changing"], links: ["home_bedroom"] });
		room({ id: "home_kitchen", name: "Kitchen", parent: "home", tags: ["home", "kitchen"], links: ["home_living_room"] });
		room({ id: "home_living_room", name: "Living Room", parent: "home", tags: ["home", "sofa", "tv"], links: ["home_bedroom", "home_kitchen"] });

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
			links: ["academy_library", "academy_sports_hall", "academy_field"], // after school
		});
		// The school day (town-school.js): "Attend school" at the entrance takes
		// you to the form room for lessons, and lunch is in the canteen with the
		// toilets off it. None of these rooms open onto the entrance (links: []):
		// you come and go through the school day.
		room({ id: "academy_form_room", name: "Form Room 12B", parent: "academy", tags: ["school", "classroom"], links: [] });
		room({ id: "academy_canteen", name: "Canteen", parent: "academy", tags: ["school", "seating"], links: ["academy_boys_toilets", "academy_girls_toilets"] });
		room({ id: "academy_boys_toilets", name: "Boys' Toilets", parent: "academy", tags: ["toilet", "sink"], links: ["academy_canteen"] });
		room({ id: "academy_girls_toilets", name: "Girls' Toilets", parent: "academy", tags: ["toilet", "sink"], links: ["academy_canteen"] });
		R.alias("location", "academy_toilets", "academy_canteen"); // the old single toilets
		// After school (from the end of lessons until the school shuts), these open off the entrance.
		const afterSchool = { time: { from: "15:00", to: "17:00" }, text: "After school (15:00–17:00)" };
		room({ id: "academy_library", name: "Library", parent: "academy", tags: ["school", "quiet"], innerMins: 2, entry: afterSchool });
		room({ id: "academy_sports_hall", name: "Sports Hall", parent: "academy", tags: ["school"], innerMins: 3, entry: afterSchool });
		room({ id: "academy_field", name: "Playing Field", parent: "academy", tags: ["school"], outdoor: true, innerMins: 3, entry: afterSchool });

		// The community centre: halls for clubs (the cosplay club: story-cosplay-club.js).
		place({ id: "community_centre", name: "Northfield Community Centre", district: "northfield", hours: [hours.daily("09:00", "22:00")] });
		room({ id: "community_hall", name: "Main Hall", parent: "community_centre", tags: ["seating", "changing"], innerMins: 2 });
		room({ id: "community_toilets", name: "Toilets", parent: "community_centre", tags: ["toilet", "sink"] });

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
			links: ["grind_counter", "grind_seating"], // the toilet is through the seating area
			hours: [hours.on(DAYS.MON_SAT, "07:30", "18:00"), hours.on(DAYS.SUN, "09:00", "16:00")],
			crowd: [
				{ when: { weekday: DAYS.WEEKDAYS, time: { from: "07:30", to: "09:30" } }, level: "busy", text: "The morning rush: the queue is nearly out of the door." },
				{ when: { time: { from: "14:00", to: "16:00" } }, level: "quiet", text: "It's the quiet part of the afternoon." },
			],
		});
		room({ id: "grind_counter", name: "Counter", parent: "daily_grind", tags: ["cafe"], links: ["daily_grind", "grind_seating"] });
		room({ id: "grind_seating", name: "Seating Area", parent: "daily_grind", tags: ["cafe", "seating"], links: ["daily_grind", "grind_toilet"] });
		room({ id: "grind_toilet", name: "Toilet", parent: "daily_grind", tags: ["toilet", "sink"], links: ["grind_seating"] });

		// The Red Lion (pub). Open till midnight on Friday and Saturday.
		place({
			id: "red_lion",
			name: "The Red Lion",
			district: "town_centre",
			tags: ["pub"],
			links: ["lion_bar"],
			hours: [
				hours.on([1, 2, 3, 4], "11:00", "23:00"), // Monday–Thursday
				hours.on([5, 6], "11:00", "24:00"),       // Friday–Saturday
				hours.on(DAYS.SUN, "12:00", "22:30"),
			],
		});
		// The door opens into the bar; the lounge leads out to the beer garden.
		room({ id: "lion_bar", name: "The Bar", parent: "red_lion", tags: ["pub"], links: ["red_lion", "lion_lounge", "lion_toilets"] });
		room({ id: "lion_lounge", name: "Lounge", parent: "red_lion", tags: ["pub", "seating"], links: ["lion_bar", "lion_beer_garden", "lion_toilets"] });
		room({ id: "lion_beer_garden", name: "Beer Garden", parent: "red_lion", tags: ["pub", "seating"], outdoor: true, links: ["lion_lounge"] });
		room({ id: "lion_toilets", name: "Toilets", parent: "red_lion", tags: ["toilet", "sink"], links: ["lion_bar", "lion_lounge"] });

		// Wellbeing Centre (Dr Okafor, the therapist)
		place({
			id: "wellbeing",
			name: "Mooresville Wellbeing Centre",
			district: "town_centre",
			tags: ["health", "seating"],
			hours: [hours.on(DAYS.WEEKDAYS, "09:00", "17:00")],
		});
		// You walk in to the waiting room (with the reception desk); the
		// session is through the door, in the therapy room.
		R.alias("location", "wellbeing_reception", "wellbeing"); // old rooms, now part of the waiting room
		R.alias("location", "wellbeing_waiting", "wellbeing");
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
		place({ id: "pulsefit", name: "PulseFit Gym", district: "town_centre", tags: ["gym"], links: ["pulsefit_reception"], hours: [hours.daily("06:00", "22:00")] });
		// Reception leads to the changing rooms and the gym floor.
		room({ id: "pulsefit_reception", name: "Reception", parent: "pulsefit", tags: ["gym"], links: ["pulsefit", "pulsefit_changing", "pulsefit_floor"] });
		room({
			id: "pulsefit_floor",
			name: "Gym Floor",
			parent: "pulsefit",
			tags: ["gym"],
			links: ["pulsefit_reception", "pulsefit_changing"],
			// Gym kit only: change in the changing rooms first.
			dressCode: { when: { wearing: { attribute: "sportswear", min: 2 } }, text: "Gym kit only: trainers and a sporty top or bottoms (change in the changing rooms)" },
		});
		room({ id: "pulsefit_changing", name: "Changing Rooms", parent: "pulsefit", tags: ["gym", "toilet", "sink", "shower", "changing"], links: ["pulsefit_reception", "pulsefit_floor"] });

		/* ---- Westgate (shopping centre) --------------------------------------- */

		place({
			id: "arcade",
			name: "The Arcade Shopping Centre",
			district: "westgate",
			tags: ["hub", "bus_stop", "shopping", "seating"],
			hours: [hours.on(DAYS.MON_SAT, "09:00", "20:00"), hours.on(DAYS.SUN, "10:30", "16:30")],
			// One hub: the concourse, with every shop listed under this heading.
			roomsLabel: "Shops",
		});
		R.alias("location", "arcade_concourse", "arcade"); // old room, now the concourse itself
		room({ id: "arcade_food_court", name: "Food Court", parent: "arcade", tags: ["shopping", "seating"], innerMins: 2 });
		room({ id: "arcade_freshway", name: "FreshWay Supermarket", parent: "arcade", tags: ["shopping", "supermarket"], innerMins: 2 });
		room({ id: "arcade_urban_thread", name: "Urban Thread", parent: "arcade", tags: ["shopping", "clothes"], innerMins: 2 });
		room({ id: "urban_thread_fitting", name: "Fitting Rooms", parent: "arcade_urban_thread", tags: ["clothes", "fitting_room", "changing"] });
		// The cinema has its own entrance and stays open after the centre shuts.
		room({ id: "arcade_cinema", name: "Arcade Cinema", parent: "arcade", tags: ["cinema"], innerMins: 3, hours: [hours.daily("11:00", "23:00")] });
		room({ id: "arcade_toilets", name: "Toilets", parent: "arcade", tags: ["toilet", "sink"] });

		/* ---- Riverside --------------------------------------------------------- */

		// The town's main park, and a Route 3 bus stop. Go for a walk, exercise
		// and people-watching are on the park itself (town-actions.js).
		place({
			id: "riverside_park",
			name: "Riverside Park",
			district: "riverside",
			outdoor: true,
			tags: ["park", "hub", "bus_stop", "seating"],
			crowd: [
				{ when: { all: [{ weekday: DAYS.WEEKEND }, { time: { from: "10:00", to: "18:00" } }] }, level: "busy", text: "Families, dog walkers and footballers everywhere." },
				{ when: { time: { from: "21:00", to: "06:00" } }, level: "quiet", text: "There's nobody about, and the dark between the lamps feels very dark." },
			],
		});
		room({ id: "riverside_path", name: "River Path", parent: "riverside_park", outdoor: true, tags: ["seating"], innerMins: 3 });
		room({ id: "riverside_kiosk", name: "Boathouse Kiosk", parent: "riverside_park", outdoor: true, innerMins: 4, hours: [hours.daily("10:00", "17:00")] });
		room({ id: "riverside_toilets", name: "Public Toilets", parent: "riverside_park", tags: ["toilet", "sink"], innerMins: 2, hours: [hours.daily("07:00", "20:00")] });

		// A block of flats. The flat itself is only open to you while you rent
		// it (town-home.js); the hallway is shared.
		const flatOnly = { livesAt: "riverside_flat" };
		place({ id: "riverside_court", name: "Riverside Court", district: "riverside", tags: ["flats"] });
		room({ id: "flat_living", name: "Flat 4: Living Room", parent: "riverside_court", tags: ["home", "sofa"], entry: flatOnly, innerMins: 2 });
		room({ id: "flat_bedroom", name: "Flat 4: Bedroom", parent: "flat_living", tags: ["home", "bed", "changing", "computer"] });
		room({ id: "flat_bathroom", name: "Flat 4: Bathroom", parent: "flat_living", tags: ["home", "toilet", "sink", "shower", "changing"] });
		room({ id: "flat_kitchen", name: "Flat 4: Kitchen", parent: "flat_living", tags: ["home", "kitchen"] });

		/* ---- Calm Waters Hypnotherapy (High Street; story-hypnotherapist.js) --- */

		place({
			id: "calm_waters",
			name: "Calm Waters Hypnotherapy",
			district: "town_centre",
			tags: ["seating"],
			hours: [hours.on(DAYS.WEEKDAYS, "10:00", "18:00")],
		});
		// The door opens into the waiting room; the session is in the therapy room.
		R.alias("location", "calm_waters_waiting", "calm_waters"); // old room, now the place itself
		room({ id: "calm_waters_room", name: "Therapy Room", parent: "calm_waters", tags: ["seating"] });

		/* ---- Business District ------------------------------------------------- */

		// The square at the centre, with the Route 3 stop and a cash machine.
		place({
			id: "business_district",
			name: "Business District",
			district: "business",
			outdoor: true,
			tags: ["street", "hub", "bus_stop", "seating", "cash_machine"],
			crowd: [
				{ when: { weekday: DAYS.WEEKDAYS, time: { from: "07:30", to: "09:30" } }, level: "busy", text: "The morning rush: everyone is late for something." },
				{ when: { weekday: DAYS.WEEKDAYS, time: { from: "12:00", to: "14:00" } }, level: "busy", text: "Office workers eat meal deals round the fountain." },
				{ when: { any: [{ weekday: DAYS.WEEKEND }, { time: { from: "19:00", to: "07:00" } }] }, level: "quiet", text: "The square is almost deserted." },
			],
		});

		// The estate agent (it used to be on the High Street; same id, so
		// saves and Dawn's rentals carry on). Lists places to rent (town-home.js).
		place({
			id: "keys_lettings",
			name: "Keys & Co Estate Agents",
			district: "business",
			tags: ["letting_agent"],
			hours: [hours.on(DAYS.MON_SAT, "09:00", "17:30")],
		});

		// Grumman Productions: a working film studio. Visitors get as far as
		// reception and the casting office; the sound stage and dressing rooms
		// are for cast and crew (the flag "grumman_pass", for your stories to set).
		const crewOnly = { flag: "grumman_pass", text: "Cast and crew only (you need a studio pass)" };
		place({
			id: "grumman_studios",
			name: "Grumman Productions Film Studio",
			district: "business",
			tags: ["studio", "seating"],
			links: ["grumman_casting", "grumman_stage"],
			hours: [hours.on(DAYS.WEEKDAYS, "08:00", "19:00"), hours.on(DAYS.SAT, "10:00", "16:00")],
		});
		room({ id: "grumman_casting", name: "Casting Office", parent: "grumman_studios", tags: ["studio", "seating"] });
		room({ id: "grumman_stage", name: "Sound Stage", parent: "grumman_studios", tags: ["studio"], entry: crewOnly, innerMins: 2, links: ["grumman_studios", "grumman_dressing"] });
		room({ id: "grumman_dressing", name: "Dressing Rooms", parent: "grumman_studios", tags: ["studio", "changing", "toilet", "sink", "shower"], entry: crewOnly, links: ["grumman_stage"] });

		place({
			id: "crown_bank",
			name: "Northern Crown Bank",
			district: "business",
			tags: ["bank", "seating"],
			hours: [hours.on(DAYS.WEEKDAYS, "09:00", "17:00"), hours.on(DAYS.SAT, "09:00", "13:00")],
		});

		/* ---- South Town --------------------------------------------------------- */

		place({
			id: "south_town",
			name: "South Town",
			district: "south_town",
			outdoor: true,
			tags: ["street", "hub", "bus_stop"],
			crowd: [
				{ when: { weekday: [5, 6], time: { from: "22:00", to: "24:00" } }, level: "busy", text: "The street is loud with people heading out." },
				{ when: { weekday: [6, 0], time: { from: "00:00", to: "03:30" } }, level: "busy", text: "Clubbers spill out onto the pavement, shouting for taxis." },
				{ when: { time: { from: "06:00", to: "11:00" } }, level: "quiet", text: "It's quiet: a street sweeper and a few bleary delivery drivers." },
			],
		});

		// Club Neon: Thursday to Saturday nights, 22:00 till 03:00. Pay at the
		// door (you get a hand stamp), then the dance floor and bar are yours.
		// Hours after midnight count on the next day, hence the two lines.
		const clubNights = [hours.on([4, 5, 6], "22:00", "24:00"), hours.on([5, 6, 0], "00:00", "03:00")];
		const stamped = { status: "neon_stamp", text: "Pay at the door first" };
		const noSportswear = { when: { not: { wearing: { attribute: "sportswear" } } }, text: "No sportswear: the bouncers turn trainers and trackies away" };
		place({
			id: "club_neon",
			name: "Club Neon",
			district: "south_town",
			tags: ["club"],
			hours: clubNights,
			links: ["neon_dance_floor", "neon_bar"],
		});
		room({ id: "neon_dance_floor", name: "Dance Floor", parent: "club_neon", tags: ["club"], entry: stamped, dressCode: noSportswear, links: ["club_neon", "neon_bar", "neon_vip", "neon_toilets"] });
		room({ id: "neon_bar", name: "The Bar", parent: "club_neon", tags: ["club"], entry: stamped, dressCode: noSportswear, links: ["club_neon", "neon_dance_floor", "neon_smoking", "neon_toilets"] });
		// The VIP booth: for your stories to open (the flag "neon_vip").
		room({ id: "neon_vip", name: "VIP Booth", parent: "club_neon", tags: ["club", "seating"], entry: { flag: "neon_vip", text: "Guest list only" }, links: ["neon_dance_floor"] });
		room({ id: "neon_smoking", name: "Smoking Area", parent: "club_neon", tags: ["club", "seating"], outdoor: true, links: ["neon_bar"] });
		room({ id: "neon_toilets", name: "Toilets", parent: "club_neon", tags: ["toilet", "sink"], links: ["neon_dance_floor", "neon_bar"] });

		// Scarlet's: the adult shop. Over-18s only (the PC is 18).
		place({
			id: "scarlets",
			name: "Scarlet's Adult Store",
			district: "south_town",
			tags: ["shop", "adult"],
			entry: { ageAtLeast: 18, text: "Over-18s only" },
			hours: [hours.on(DAYS.MON_SAT, "10:00", "22:00"), hours.on(DAYS.SUN, "12:00", "18:00")],
		});
		room({ id: "scarlets_fitting", name: "Changing Cubicle", parent: "scarlets", tags: ["fitting_room", "changing"] });

		place({
			id: "golden_grill",
			name: "Golden Grill Kebabs",
			district: "south_town",
			tags: ["takeaway", "seating"],
			hours: [hours.daily("17:00", "04:00")],
			crowd: [{ when: { time: { from: "02:00", to: "04:00" } }, level: "busy", text: "The after-club queue is out of the door." }],
		});

		/* ---- The Seafront --------------------------------------------------------- */

		// The promenade, with the Route 3 stop. Steps lead down to the sand,
		// and the sea is beyond it (swimwear only: change in the changing area).
		place({
			id: "beach",
			name: "Mooresville Beach",
			district: "seafront",
			outdoor: true,
			tags: ["street", "hub", "bus_stop", "seating"],
			links: ["beach_sand", "beach_changing", "beach_pier", "surf_shack"],
			crowd: [
				{ when: { all: [{ weather: { kind: "sunny", tempMin: 18 } }, { time: { from: "10:00", to: "18:00" } }] }, level: "busy", text: "It's heaving: you can barely see the sand for towels." },
				{ when: { any: [{ weather: { wet: true } }, { time: { from: "20:00", to: "07:00" } }] }, level: "quiet", text: "Hardly anyone about but the gulls." },
			],
		});
		room({ id: "beach_sand", name: "The Sand", parent: "beach", outdoor: true, tags: ["beach", "seating"], innerMins: 2, links: ["beach", "beach_sea", "beach_changing"] });
		room({
			id: "beach_sea",
			name: "The Sea",
			parent: "beach",
			outdoor: true,
			tags: ["beach"],
			innerMins: 2,
			links: ["beach_sand"],
			dressCode: { when: { wearing: { attribute: "swimwear" } }, text: "Swimwear only (change in the changing area)" },
		});
		room({ id: "beach_changing", name: "Changing Area", parent: "beach", tags: ["beach", "changing", "shower", "toilet", "sink"], links: ["beach", "beach_sand"], hours: [hours.daily("07:00", "21:00")] });
		room({ id: "beach_pier", name: "The Pier", parent: "beach", outdoor: true, tags: ["seating"], innerMins: 3, hours: [hours.daily("10:00", "22:00")] });
		room({ id: "surf_shack", name: "The Surf Shack", parent: "beach", tags: ["shop"], hours: [hours.daily("09:00", "18:00")] });

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
		walk({ from: "high_street", to: "business_district", mins: 10 });
		walk({ from: "riverside_park", to: "business_district", mins: 8 });
		walk({ from: "business_district", to: "keys_lettings", mins: 2 });
		walk({ from: "business_district", to: "grumman_studios", mins: 4 });
		walk({ from: "business_district", to: "crown_bank", mins: 1 });
		walk({ from: "business_district", to: "south_town", mins: 12 });
		walk({ from: "south_town", to: "club_neon", mins: 2 });
		walk({ from: "south_town", to: "scarlets", mins: 2 });
		walk({ from: "south_town", to: "golden_grill", mins: 1 });
		walk({ from: "south_town", to: "beach", mins: 10 });
		walk({ from: "high_street", to: "calm_waters", mins: 3 });
		walk({ from: "academy", to: "community_centre", mins: 5 });

		/* ======================================================================
		 *  5. The buses (Route 7 and Route 3)
		 * ======================================================================
		 *
		 * Stops in order along the route, with minutes between each pair.
		 * You can ride several stops in one go (the fare is the same).
		 */

		const bus7 = ({ from, to, mins }) => R.define("route", { id: `bus7_${from}_${to}`, network: "bus7", from, to, mins });

		bus7({ from: "elm_road", to: "academy", mins: 6 });
		bus7({ from: "academy", to: "high_street", mins: 7 });
		bus7({ from: "high_street", to: "arcade", mins: 4 });

		// Route 3, the coast line: High Street to the beach.
		const bus3 = ({ from, to, mins }) => R.define("route", { id: `bus3_${from}_${to}`, network: "bus3", from, to, mins });

		bus3({ from: "high_street", to: "riverside_park", mins: 4 });
		bus3({ from: "riverside_park", to: "business_district", mins: 4 });
		bus3({ from: "business_district", to: "south_town", mins: 6 });
		bus3({ from: "south_town", to: "beach", mins: 5 });

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
		 *   viaPhone     true = booked from the phone's Taxi app instead of the "Go to" buttons
		 *   screen       when a journey gets an action screen: "always" (default),
		 *                "otherDistrict" (only between districts) or "never".
		 *                Its text: passage Act_travel_<mode> (or Act_travel_<mode>_<place>
		 *                for one destination); picture: assets/media/travelMode/<mode>.
		 *   cost + fare  in whole pounds:
		 *                "flat": one price (fare.flat)
		 *                "meter": fare.base + fare.perMin for each minute of the
		 *                         ride, rounded to the nearest pound
		 */

		// Decided by the user: you need to be dressed to go out (see setup.config.clothing).
		const dressed = { dressed: true };

		R.define("travelMode", { id: "walk", label: "Walk", order: 0, conditions: dressed, screen: "otherDistrict" }); // an action screen only between districts

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
			id: "bus3",
			label: "Bus (Route 3)",
			order: 2,
			conditions: dressed,
			network: "bus3",
			multiHop: true,
			cost: "flat",
			fare: { flat: 2 }, // £2 for any trip, like Route 7
		});

		R.define("travelMode", {
			id: "taxi",
			label: "Taxi",
			order: 3,
			conditions: dressed,
			multiHop: true,
			destTag: "hub",
			stopsOnWay: false,
			minDistance: 10,   // only for trips longer than a 10-minute walk
			timeFactor: 0.3,
			cost: "meter",
			fare: { base: 3, perMin: 0.5 }, // £3 + 50p a minute, rounded to whole pounds
			viaPhone: true, // booked from the phone's Taxi app, not listed under "Go to" (decided by the user)
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
