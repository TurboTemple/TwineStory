/*
 * Mooresville — the people. Each definition is that NPC's character sheet,
 * including their appearance (`body`): each part can have its own picture
 * at assets/media/npc/<id>/<part>.*
 * Every classmate and student is 18 (§1).
 *
 * Schedules: the first matching entry wins, so specific slots (lunch, after
 * school) come before broad ones (the school day).
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const WEEKDAYS = [1, 2, 3, 4, 5];
		const at = (where, from, to, days) => ({ at: where, from, to, ...(days ? { days } : {}) });
		const npc = (def) => R.define("npc", def);

		// School day for every student in form 12B.
		const schoolDay = [
			at("academy_canteen", "12:20", "13:10", WEEKDAYS),
			at("academy_form_room", "08:40", "15:20", WEEKDAYS),
		];

		/* ---- Classmates (all 18) ------------------------------------------ */

		npc({
			id: "priya_shah", name: "Priya Shah", age: 18, pronouns: "she/her", role: "classmate", tags: ["student", "form_12b"],
			desc: "Top of the class and quietly competitive about it. Always has a highlighter behind one ear and a plan for everything.",
			body: { height: "short", weight: "slim", hair_colour: "black", hair_length: "long", eye_colour: "brown", skin_tone: "light brown" },
			schedule: [
				...schoolDay,
				at("grind_seating", "15:45", "17:30", [1, 3]),
				at("academy_library", "15:30", "17:00", [2, 4]),
			],
		});
		npc({
			id: "liam_brooks", name: "Liam Brooks", age: 18, pronouns: "he/him", role: "classmate", tags: ["student", "form_12b"],
			desc: "Captain of the football team, loud in the corridor, surprisingly gentle one-to-one.",
			body: { height: "tall", weight: "average", hair_colour: "light brown", hair_length: "short", eye_colour: "blue", skin_tone: "fair" },
			schedule: [
				...schoolDay,
				at("pulsefit_floor", "16:00", "18:00", [2, 4]),
				at("riverside_path", "10:00", "11:30", [6]),
			],
		});
		npc({
			id: "chloe_turner", name: "Chloe Turner", age: 18, pronouns: "she/her", role: "classmate", tags: ["student", "form_12b"],
			desc: "Knows every shop in town and what's in the window this week. Wants to study fashion design.",
			body: { height: "average", weight: "slim", hair_colour: "blonde", hair_length: "shoulder-length", eye_colour: "green", skin_tone: "fair" },
			schedule: [
				...schoolDay,
				at("threadline_floor", "16:00", "17:30", [5]),
				at("arcade_concourse", "11:00", "16:00", [6]),
			],
		});
		npc({
			id: "ethan_cole", name: "Ethan Cole", age: 18, pronouns: "he/him", role: "classmate", tags: ["student", "form_12b"],
			desc: "The class joker. Works weekend shifts collecting glasses and seems to know everyone in town.",
			body: { height: "average", weight: "chubby", hair_colour: "ginger", hair_length: "short", eye_colour: "hazel", skin_tone: "very fair" },
			schedule: [
				...schoolDay,
				at("lion_lounge", "19:00", "22:30", [5]),
				at("elm_park_green", "14:00", "17:00", [0]),
			],
		});
		npc({
			id: "jordan_reid", name: "Jordan Reid", age: 18, pronouns: "they/them", role: "classmate", tags: ["student", "form_12b"],
			desc: "Sketchbook always open, headphones always in. Says little in class but notices everything.",
			body: { height: "tall", weight: "skinny", hair_colour: "blue", hair_length: "chin-length", eye_colour: "grey", skin_tone: "olive" },
			schedule: [
				...schoolDay,
				at("riverside_path", "16:00", "18:00", [3]),
				at("arcade_cinema", "18:00", "21:00", [6]),
			],
		});

		/* ---- School staff ------------------------------------------------- */

		npc({
			id: "mr_hale", name: "Mr David Hale", age: 41, pronouns: "he/him", role: "form tutor",
			desc: "Your form tutor and history teacher. Tired tweed jacket, endless patience, terrible puns.",
			body: { height: "tall", weight: "average", hair_colour: "dark brown", hair_length: "short", eye_colour: "brown", skin_tone: "light" },
			schedule: [at("academy_form_room", "08:30", "15:30", WEEKDAYS)],
		});
		npc({
			id: "ms_rowe", name: "Ms Ruth Rowe", age: 52, pronouns: "she/her", role: "librarian",
			desc: "Runs the school library like a ship. Will find you any book, and will notice if you eat near one.",
			body: { height: "short", weight: "average", hair_colour: "platinum", hair_length: "chin-length", eye_colour: "blue", skin_tone: "fair" },
			schedule: [at("academy_library", "08:00", "16:30", WEEKDAYS)],
		});

		/* ---- Around town -------------------------------------------------- */

		npc({
			id: "margaret_holt", name: "Margaret Holt", age: 71, pronouns: "she/her", role: "neighbour",
			desc: "Lives at number 12. Gardens every morning and keeps a friendly eye on the whole street.",
			body: { height: "short", weight: "slim", hair_colour: "platinum", hair_length: "short", eye_colour: "grey", skin_tone: "very fair" },
			schedule: [at("elm_road", "09:30", "11:00")],
		});
		npc({
			id: "raj_patel", name: "Raj Patel", age: 58, pronouns: "he/him", role: "shopkeeper",
			desc: "Has run the corner shop for twenty years. Remembers everyone's usual.",
			body: { height: "average", weight: "chubby", hair_colour: "black", hair_length: "short", eye_colour: "brown", skin_tone: "brown" },
			schedule: [at("corner_shop", "07:00", "22:00")],
		});
		npc({
			id: "jess_marlow", name: "Jess Marlow", age: 24, pronouns: "she/her", role: "barista",
			desc: "Runs the morning shift at The Daily Grind. Draws a different leaf in every flat white.",
			body: { height: "average", weight: "slim", hair_colour: "auburn", hair_length: "long", eye_colour: "green", skin_tone: "light" },
			schedule: [at("grind_counter", "07:30", "14:00", [1, 2, 3, 4, 5, 6])],
		});
		npc({
			id: "sam_ito", name: "Sam Ito", age: 21, pronouns: "they/them", role: "barista",
			desc: "Afternoon barista and part-time music student. The café playlist is theirs.",
			body: { height: "short", weight: "slim", hair_colour: "pink", hair_length: "chin-length", eye_colour: "brown", skin_tone: "light" },
			schedule: [at("grind_counter", "14:00", "18:00", [1, 2, 3, 4, 5, 6]), at("grind_counter", "09:00", "16:00", [0])],
		});
		npc({
			id: "gary_price", name: "Gary Price", age: 54, pronouns: "he/him", role: "landlord",
			desc: "Landlord of The Red Lion. Gruff, fair, and very firm about closing time.",
			body: { height: "tall", weight: "fat", hair_colour: "dark brown", hair_length: "buzzed", eye_colour: "brown", skin_tone: "fair" },
			schedule: [at("lion_bar", "11:00", "23:00")],
		});
		npc({
			id: "sophie_lane", name: "Sophie Lane", age: 26, pronouns: "she/her", role: "bartender",
			desc: "Works the busy evenings at The Red Lion. Pulls a perfect pint while holding three conversations.",
			body: { height: "average", weight: "average", hair_colour: "dark brown", hair_length: "long", eye_colour: "hazel", skin_tone: "olive" },
			schedule: [at("lion_bar", "17:00", "24:00", [4, 5, 6])],
		});
		npc({
			id: "dr_okafor", name: "Dr Maya Okafor", age: 46, pronouns: "she/her", role: "therapist",
			desc: "A counsellor at the Wellbeing Centre. Calm, direct, and good at the question you were avoiding.",
			body: { height: "tall", weight: "average", hair_colour: "black", hair_length: "short", eye_colour: "brown", skin_tone: "dark brown" },
			schedule: [at("wellbeing_therapy", "09:00", "17:00", WEEKDAYS)],
		});
		npc({
			id: "tom_reeves", name: "Tom Reeves", age: 29, pronouns: "he/him", role: "receptionist",
			desc: "Keeps the Wellbeing Centre running: phones, bookings and the occasional emergency.",
			body: { height: "average", weight: "slim", hair_colour: "light brown", hair_length: "short", eye_colour: "blue", skin_tone: "light" },
			schedule: [at("wellbeing_reception", "09:00", "17:00", WEEKDAYS)],
		});
		npc({
			id: "aisha_bello", name: "Aisha Bello", age: 22, pronouns: "she/her", role: "shop assistant",
			desc: "Works at Threadline. Brutally honest about what suits you, in the nicest way.",
			body: { height: "tall", weight: "slim", hair_colour: "black", hair_length: "long", eye_colour: "brown", skin_tone: "dark brown" },
			schedule: [at("threadline_floor", "09:00", "17:30", [2, 3, 4, 5, 6])],
		});
		npc({
			id: "kyle_dunn", name: "Kyle Dunn", age: 27, pronouns: "he/him", role: "gym receptionist",
			desc: "Front desk at PulseFit and a personal trainer on the side. Very enthusiastic about leg day.",
			body: { height: "tall", weight: "average", hair_colour: "blonde", hair_length: "buzzed", eye_colour: "blue", skin_tone: "fair" },
			schedule: [at("pulsefit_reception", "15:00", "22:00", WEEKDAYS), at("pulsefit_reception", "08:00", "16:00", [0, 6])],
		});
	});
})();
