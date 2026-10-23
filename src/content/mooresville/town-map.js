/*
 * Mooresville — the map: districts, places and the rooms inside them,
 * walking routes, the bus, taxis, and the player's money accounts.
 *
 * Walking times are rough real-world distances: next door is a minute or
 * two, across town is 20–25 minutes. Moving between rooms of a place takes
 * each room's `innerMins` (default 1).
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const WEEKDAYS = [1, 2, 3, 4, 5];
		const MON_SAT = [1, 2, 3, 4, 5, 6];
		const SUN = [0];
		const daily = (from, to) => ({ from, to });
		const on = (days, from, to) => ({ days, from, to });

		/* ---- Districts --------------------------------------------------- */

		R.define("district", { id: "elm_park", name: "Elm Park", desc: "A quiet residential suburb of terraced houses and tidy front gardens." });
		R.define("district", { id: "northfield", name: "Northfield", desc: "The north side of town, home to Mooresville Academy." });
		R.define("district", { id: "town_centre", name: "Town Centre", desc: "Shops, cafés and pubs around the old high street." });
		R.define("district", { id: "westgate", name: "Westgate", desc: "The newer side of town, built around the shopping centre." });
		R.define("district", { id: "riverside", name: "Riverside", desc: "Green space along the River Moore." });

		/** A place (site) and, optionally, the rooms inside it. */
		const place = (id, name, district, extra = {}) =>
			R.define("location", { id, name, district, passage: `Loc_${id}`, ...extra });
		const room = (id, name, parent, extra = {}) =>
			R.define("location", { id, name, parent, district: null, passage: `Loc_${id}`, ...extra });

		/* ---- Elm Park ---------------------------------------------------- */

		place("home", "Your House", "elm_park", { tags: ["home"] });
		room("home_bedroom", "Your Bedroom", "home", { tags: ["home", "bed", "start", "changing"] });
		room("home_bathroom", "Bathroom", "home", { tags: ["home", "toilet", "sink", "shower", "changing"] });
		room("home_kitchen", "Kitchen", "home", { tags: ["home", "kitchen"] });
		room("home_living_room", "Living Room", "home", { tags: ["home", "sofa", "tv"] });

		place("elm_road", "Elm Road", "elm_park", { outdoor: true, tags: ["street", "hub", "bus_stop"] });
		place("corner_shop", "Patel's Corner Shop", "elm_park", { hours: [daily("07:00", "22:00")] });
		place("elm_park_green", "Elm Park Green", "elm_park", { outdoor: true, tags: ["park"] });
		room("elm_green_pond", "The Duck Pond", "elm_park_green", { outdoor: true, tags: ["seating"], innerMins: 2 });

		/* ---- Northfield -------------------------------------------------- */

		place("academy", "Mooresville Academy", "northfield", { tags: ["school", "bus_stop"], hours: [on(WEEKDAYS, "07:45", "17:00")] });
		room("academy_form_room", "Form Room 12B", "academy", { tags: ["school", "classroom"], innerMins: 2 });
		room("academy_canteen", "Canteen", "academy", { tags: ["school", "seating"], innerMins: 2 });
		room("academy_library", "Library", "academy", { tags: ["school", "quiet"], innerMins: 2 });
		room("academy_sports_hall", "Sports Hall", "academy", { tags: ["school"], innerMins: 3 });
		room("academy_field", "Playing Field", "academy", { tags: ["school"], outdoor: true, innerMins: 3 });
		room("academy_toilets", "Toilets", "academy", { tags: ["toilet", "sink"] });

		/* ---- Town Centre ------------------------------------------------- */

		place("high_street", "Mooresville High Street", "town_centre", { outdoor: true, tags: ["street", "hub", "bus_stop"] });

		const cafeHours = [on(MON_SAT, "07:30", "18:00"), on(SUN, "09:00", "16:00")];
		place("daily_grind", "The Daily Grind", "town_centre", { tags: ["cafe"], hours: cafeHours });
		room("grind_counter", "Counter", "daily_grind", { tags: ["cafe"] });
		room("grind_seating", "Seating Area", "daily_grind", { tags: ["cafe", "seating"] });
		room("grind_toilet", "Toilet", "daily_grind", { tags: ["toilet", "sink"] });

		const pubHours = [on([1, 2, 3, 4], "11:00", "23:00"), on([5, 6], "11:00", "24:00"), on(SUN, "12:00", "22:30")];
		place("red_lion", "The Red Lion", "town_centre", { tags: ["pub"], hours: pubHours });
		room("lion_bar", "The Bar", "red_lion", { tags: ["pub"] });
		room("lion_lounge", "Lounge", "red_lion", { tags: ["pub", "seating"] });
		room("lion_beer_garden", "Beer Garden", "red_lion", { tags: ["pub", "seating"], outdoor: true });
		room("lion_toilets", "Toilets", "red_lion", { tags: ["toilet", "sink"] });

		place("wellbeing", "Mooresville Wellbeing Centre", "town_centre", { tags: ["health"], hours: [on(WEEKDAYS, "09:00", "17:00")] });
		room("wellbeing_reception", "Reception", "wellbeing");
		room("wellbeing_waiting", "Waiting Room", "wellbeing", { tags: ["seating"] });
		room("wellbeing_therapy", "Therapy Room", "wellbeing", { innerMins: 1 });
		room("wellbeing_toilets", "Toilets", "wellbeing", { tags: ["toilet", "sink"] });

		place("snips", "Snips Hair Salon", "town_centre", { tags: ["shop", "salon"], hours: [on(MON_SAT, "09:00", "18:00")] });

		const shopHours = [on(MON_SAT, "09:00", "17:30"), on(SUN, "10:30", "16:30")];
		place("threadline", "Threadline", "town_centre", { tags: ["shop", "clothes"], hours: shopHours });
		room("threadline_floor", "Shop Floor", "threadline", { tags: ["clothes"] });
		room("threadline_fitting", "Fitting Rooms", "threadline", { tags: ["clothes", "fitting_room", "changing"] });

		place("pulsefit", "PulseFit Gym", "town_centre", { tags: ["gym"], hours: [daily("06:00", "22:00")] });
		room("pulsefit_reception", "Reception", "pulsefit", { tags: ["gym"] });
		room("pulsefit_floor", "Gym Floor", "pulsefit", { tags: ["gym"] });
		room("pulsefit_changing", "Changing Rooms", "pulsefit", { tags: ["gym", "toilet", "sink", "shower", "changing"] });

		/* ---- Westgate ---------------------------------------------------- */

		const arcadeHours = [on(MON_SAT, "09:00", "20:00"), on(SUN, "10:30", "16:30")];
		place("arcade", "The Arcade Shopping Centre", "westgate", { tags: ["hub", "bus_stop", "shopping"], hours: arcadeHours });
		room("arcade_concourse", "Main Concourse", "arcade", { tags: ["shopping", "seating"] });
		room("arcade_food_court", "Food Court", "arcade", { tags: ["shopping", "seating"], innerMins: 2 });
		room("arcade_freshway", "FreshWay Supermarket", "arcade", { tags: ["shopping", "supermarket"], innerMins: 2 });
		room("arcade_urban_thread", "Urban Thread", "arcade", { tags: ["shopping", "clothes"], innerMins: 2 });
		room("urban_thread_fitting", "Fitting Rooms", "arcade_urban_thread", { tags: ["clothes", "fitting_room", "changing"] });
		// The cinema has its own entrance and stays open after the centre shuts.
		room("arcade_cinema", "Arcade Cinema", "arcade", { tags: ["cinema"], innerMins: 3, hours: [daily("11:00", "23:00")] });
		room("arcade_toilets", "Toilets", "arcade", { tags: ["toilet", "sink"] });

		/* ---- Riverside --------------------------------------------------- */

		place("riverside_park", "Riverside Park", "riverside", { outdoor: true, tags: ["park"] });
		room("riverside_path", "River Path", "riverside_park", { outdoor: true, tags: ["seating"], innerMins: 3 });
		room("riverside_kiosk", "Boathouse Kiosk", "riverside_park", { outdoor: true, innerMins: 4, hours: [daily("10:00", "17:00")] });

		/* ---- Walking routes (between places) ----------------------------- */

		const walk = (a, b, mins) => R.define("route", { id: `walk_${a}_${b}`, from: a, to: b, mins });
		walk("home", "elm_road", 1);
		walk("elm_road", "corner_shop", 3);
		walk("elm_road", "elm_park_green", 6);
		walk("elm_road", "academy", 18);
		walk("elm_road", "high_street", 25);
		walk("academy", "high_street", 15);
		walk("high_street", "daily_grind", 1);
		walk("high_street", "red_lion", 2);
		walk("high_street", "threadline", 2);
		walk("high_street", "snips", 3);
		walk("high_street", "wellbeing", 4);
		walk("high_street", "pulsefit", 6);
		walk("high_street", "arcade", 10);
		walk("high_street", "riverside_park", 12);
		walk("arcade", "riverside_park", 15);

		/* ---- Bus: Route 7 ------------------------------------------------- */

		const bus = (a, b, mins) => R.define("route", { id: `bus7_${a}_${b}`, network: "bus7", from: a, to: b, mins });
		bus("elm_road", "academy", 6);
		bus("academy", "high_street", 7);
		bus("high_street", "arcade", 4);

		/* ---- Travel modes ------------------------------------------------ */

		// You need to be dressed to go out (see setup.config.clothing).
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
			fare: { flat: 180 },
		});
		R.define("travelMode", {
			id: "taxi",
			label: "Taxi",
			order: 2,
			conditions: dressed,
			multiHop: true,
			destTag: "hub",
			stopsOnWay: false,
			// Only offered for trips longer than a 10-minute walk.
			minDistance: 10,
			timeFactor: 0.3,
			cost: "meter",
			fare: { base: 320, perMin: 35 },
		});

		/* ---- Money -------------------------------------------------------- */

		R.define("account", { id: "cash", label: "Cash", kind: "cash", start: 3500, order: 0 });
		R.define("account", { id: "bank", label: "Bank card", kind: "bank", start: 18000, order: 1 });
	});
})();
