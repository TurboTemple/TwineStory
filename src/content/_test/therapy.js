/*
 * TEST CONTENT — therapy storyline (debug mode only).
 *
 * Three test locations joined by walking routes, a clinic with a therapist
 * and a secretary, a 2-hour therapy session, and a random event where the
 * secretary interrupts after 1 hour and ends the session early.
 * All names and numbers here are placeholders for testing the systems.
 */
(function () {
	"use strict";

	(setup.__testContent ??= []).push((R) => {
		R.define("district", { id: "test_district", name: "Test District" });

		R.define("location", { id: "test_home", name: "Test Home", district: "test_district", tags: ["start", "home"], passage: "Loc_test_home" });
		R.define("location", { id: "test_high_street", name: "Test High Street", district: "test_district", passage: "Loc_test_high_street" });
		R.define("location", {
			id: "test_clinic",
			name: "Test Clinic",
			district: "test_district",
			passage: "Loc_test_clinic",
			// Placeholder opening hours: Monday–Friday, 09:00–17:00.
			hours: [{ days: [1, 2, 3, 4, 5], from: "09:00", to: "17:00" }],
		});

		R.define("travelMode", { id: "test_walk", label: "Walk" });
		// Placeholder walking times, in minutes.
		R.define("route", { id: "test_home_high_street", from: "test_home", to: "test_high_street", mins: 10 });
		R.define("route", { id: "test_high_street_clinic", from: "test_high_street", to: "test_clinic", mins: 5 });
		R.define("route", { id: "test_home_clinic", from: "test_home", to: "test_clinic", mins: 15 });

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
			at: ["test_home", "test_high_street", "test_clinic"],
			durations: [30, 60, 120],
		});

		R.define("storylet", {
			id: "test_secretary_interrupts",
			passage: "Ev_test_secretary_interrupts",
			triggers: ["action:checkpoint"],
			conditions: { action: "test_therapy_session", actionElapsed: { min: 60 }, npcHere: "test_secretary" },
			// Placeholder: a 50% chance per session.
			chance: 0.5,
			effects: [
				{ note: "The secretary interrupted the session." },
				{ interrupt: "secretary" },
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
