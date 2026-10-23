/*
 * TEST CONTENT — a small test map and the therapy storyline (debug mode only).
 *
 * Map (walking times are placeholders, by rough distance):
 *
 *   Test Neighbour's House —5— Test Home —10— Test High Street —5— Test Clinic
 *                                              |  (bus stop, hub)
 *                                              40 walk / 15 bus
 *                                              |
 *                                        Test City Centre (bus stop, hub)
 *                                              |
 *                                              30 walk / 10 bus
 *                                              |
 *                                          Test Park (bus stop)
 *
 * Walking goes one place at a time. The bus runs High Street – City Centre –
 * Park. A taxi can be taken from anywhere to a hub.
 *
 * The clinic has a therapist and a secretary. A therapy session lasts 2 hours;
 * there's a 50% chance the secretary interrupts after 1 hour and the session
 * ends early. All names and numbers here are placeholders for testing.
 */
(function () {
	"use strict";

	(setup.__testContent ??= []).push((R) => {
		R.define("district", { id: "test_district", name: "Test District" });

		const loc = (id, name, extra = {}) => R.define("location", { id, name, district: "test_district", passage: `Loc_${id}`, ...extra });
		loc("test_home", "Test Home", { tags: ["start", "home"] });
		loc("test_neighbour", "Test Neighbour's House");
		loc("test_high_street", "Test High Street", { tags: ["hub", "bus_stop"] });
		loc("test_clinic", "Test Clinic", {
			// Placeholder opening hours: Monday–Friday, 09:00–17:00.
			hours: [{ days: [1, 2, 3, 4, 5], from: "09:00", to: "17:00" }],
		});
		loc("test_city_centre", "Test City Centre", { tags: ["hub", "bus_stop"] });
		loc("test_park", "Test Park", { tags: ["bus_stop"] });

		// Walking links (minutes).
		const walk = (from, to, mins) => R.define("route", { id: `test_walk_${from.slice(5)}_${to.slice(5)}`, from, to, mins });
		walk("test_home", "test_neighbour", 5);
		walk("test_home", "test_high_street", 10);
		walk("test_high_street", "test_clinic", 5);
		walk("test_high_street", "test_city_centre", 40);
		walk("test_city_centre", "test_park", 30);

		// Bus line (minutes between stops).
		R.define("route", { id: "test_bus_high_street_city_centre", network: "test_bus", from: "test_high_street", to: "test_city_centre", mins: 15 });
		R.define("route", { id: "test_bus_city_centre_park", network: "test_bus", from: "test_city_centre", to: "test_park", mins: 10 });

		R.define("travelMode", { id: "test_walk", label: "Walk", order: 0 });
		R.define("travelMode", {
			id: "test_bus",
			label: "Bus",
			order: 1,
			network: "test_bus",
			multiHop: true,
			cost: "flat",
			fare: { flat: 200 },
		});
		R.define("travelMode", {
			id: "test_taxi",
			label: "Taxi",
			order: 2,
			multiHop: true,
			destTag: "hub",
			stopsOnWay: false,
			// A taxi takes a quarter of the walking time.
			timeFactor: 0.25,
			cost: "meter",
			fare: { base: 300, perMin: 30 },
		});

		R.define("account", { id: "test_cash", label: "Cash", kind: "cash", start: 2000, order: 0 });
		R.define("account", { id: "test_bank", label: "Bank card", kind: "bank", start: 10000, order: 1 });

		const clinicHours = [{ days: [1, 2, 3, 4, 5], from: "09:00", to: "17:00", at: "test_clinic" }];
		R.define("npc", {
			id: "test_therapist",
			name: "Test Therapist",
			age: 45,
			pronouns: "she/her",
			role: "therapist",
			desc: "TEST CONTENT. A placeholder therapist.",
			schedule: clinicHours,
		});
		R.define("npc", {
			id: "test_secretary",
			name: "Test Secretary",
			age: 30,
			pronouns: "he/him",
			role: "secretary",
			desc: "TEST CONTENT. A placeholder clinic secretary.",
			schedule: clinicHours,
		});

		R.define("action", {
			id: "test_therapy_session",
			label: "Therapy session",
			desc: "See the therapist.",
			at: "test_clinic",
			mins: 120,
			// A checkpoint after 1 hour gives events a chance to interrupt.
			checkpoints: [60],
			conditions: { open: true, npcHere: "test_therapist" },
			effects: [{ note: "The session ran its full length." }],
		});
		R.define("action", {
			id: "test_wait",
			label: "Wait",
			at: ["test_home", "test_neighbour", "test_high_street", "test_clinic", "test_city_centre", "test_park"],
			durations: [30, 60, 120],
		});

		// Random: the secretary interrupts the session (50% chance, decided by the user).
		R.define("storylet", {
			id: "test_secretary_interrupts",
			passage: "Ev_test_secretary_interrupts",
			triggers: ["action:checkpoint"],
			conditions: { action: "test_therapy_session", actionElapsed: { min: 60 }, npcHere: "test_secretary" },
			chance: 0.5,
			effects: [
				{ note: "The secretary interrupted the session." },
				{ interrupt: "secretary" },
			],
		});

		// Story: the first time you meet the therapist.
		R.define("storylet", {
			id: "test_meet_therapist",
			kind: "story",
			once: true,
			passage: "Ev_test_meet_therapist",
			triggers: ["npc:met"],
			conditions: { withNpc: "test_therapist" },
		});

		// Random, but chance 0: only happens when forced from the test page.
		// Shows a journey being interrupted part-way.
		R.define("storylet", {
			id: "test_bus_breakdown",
			passage: "Ev_test_bus_breakdown",
			triggers: ["travel:checkpoint"],
			conditions: { travel: { mode: "test_bus", at: "test_city_centre" } },
			chance: 0,
			effects: [
				{ note: "The bus broke down." },
				{ interrupt: "breakdown" },
			],
		});
	});

	/* Debug shortcuts used by the Test_Therapy passage. */
	setup.testTools = {
		/** Jump to the test clinic at the next given clock time (test only). */
		toClinicAt(hm) {
			setup.flow.perform(() => {
				setup.time.advance(setup.time.nextAt(setup.time.now(), hm) - setup.time.now(), { reason: "debug" });
				setup.world.moveTo("test_clinic");
			});
		},
	};
})();
