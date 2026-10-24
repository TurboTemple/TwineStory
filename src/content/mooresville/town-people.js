/*
 * ============================================================================
 *  Mooresville — the people
 * ============================================================================
 *
 * Each npc({ … }) below is that person's character sheet: who they are,
 * what they look like, and where they are through the week.
 *
 * AGE RULES (checked automatically; the game won't build if they're broken):
 *   - every person needs an `age`
 *   - every classmate or student (role "classmate", or tag "student" or
 *     "classmate") must be exactly 18
 *   - anything romantic needs everyone involved to be 18 or over
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD A PERSON
 * ---------------------------------------------------------------------------
 *   npc({
 *       id: "dan_wright",            // lowercase_with_underscores; never rename
 *       name: "Dan Wright",
 *       age: 35,
 *       pronouns: "he/him",
 *       role: "postman",             // shown next to their name
 *       desc: "Whistles. Always.",
 *       body: { height: "tall", hair_colour: "black" },   // words from town-body.js
 *       schedule: [
 *           { at: "elm_road", from: "08:00", to: "10:00", days: DAYS.MON_SAT },
 *       ],
 *   });
 *
 * ---------------------------------------------------------------------------
 *  SCHEDULES
 * ---------------------------------------------------------------------------
 *   Each entry: { at: place or room id, from: "HH:MM", to: "HH:MM", days }
 *   `days` is optional (leave it out for every day); 0 = Sunday … 6 = Saturday,
 *   or use DAYS.WEEKDAYS, DAYS.SAT and so on (town-kit.js).
 *   The FIRST entry that matches wins, so put specific slots (lunch) before
 *   broad ones (the school day). Outside every entry, they're at `home`
 *   (or nowhere you can find them, if they have no home set).
 *
 *  You meet someone the first time you're in the same place.
 *  Pictures: assets/media/npc/<id>.webp, and one per body part at
 *  assets/media/npc/<id>/<part>.webp (e.g. npc/jess_marlow/hair_colour.webp).
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { DAYS } = setup.town;
		const npc = (def) => R.define("npc", def);

		// The school day for everyone in form 12B: lunch in the canteen,
		// otherwise in the form room. (Lunch comes first so it wins.)
		const schoolDay = [
			{ at: "academy_canteen", from: "12:00", to: "13:00", days: DAYS.WEEKDAYS },
			{ at: "academy_form_room", from: "08:40", to: "15:00", days: DAYS.WEEKDAYS },
		];

		/* ======================================================================
		 *  Classmates (all 18)
		 * ====================================================================== */

		npc({
			id: "priya_shah",
			name: "Priya Shah",
			age: 18,
			pronouns: "she/her",
			role: "classmate",
			tags: ["student", "form_12b"],
			desc: "Top of the class and quietly competitive about it. Always has a highlighter behind one ear and a plan for everything.",
			body: { height: "short", weight: "slim", hair_colour: "black", hair_length: "long", eye_colour: "brown", skin_tone: "light brown" },
			schedule: [
				...schoolDay,
				{ at: "grind_seating", from: "15:45", to: "17:30", days: [1, 3] },   // Mon, Wed
				{ at: "academy_library", from: "15:30", to: "17:00", days: [2, 4] }, // Tue, Thu
			],
		});

		npc({
			id: "liam_brooks",
			name: "Liam Brooks",
			age: 18,
			pronouns: "he/him",
			role: "classmate",
			tags: ["student", "form_12b"],
			desc: "Captain of the football team, loud in the corridor, surprisingly gentle one-to-one.",
			body: { height: "tall", weight: "average", hair_colour: "light brown", hair_length: "short", eye_colour: "blue", skin_tone: "fair" },
			schedule: [
				...schoolDay,
				{ at: "pulsefit_floor", from: "16:00", to: "18:00", days: [2, 4] },  // Tue, Thu
				{ at: "riverside_path", from: "10:00", to: "11:30", days: DAYS.SAT },
			],
		});

		npc({
			id: "chloe_turner",
			name: "Chloe Turner",
			age: 18,
			pronouns: "she/her",
			role: "classmate",
			tags: ["student", "form_12b"],
			desc: "Knows every shop in town and what's in the window this week. Wants to study fashion design.",
			body: { height: "average", weight: "slim", hair_colour: "blonde", hair_length: "shoulder-length", eye_colour: "green", skin_tone: "fair" },
			schedule: [
				...schoolDay,
				{ at: "threadline_floor", from: "16:00", to: "17:30", days: DAYS.FRI },
				{ at: "arcade", from: "11:00", to: "16:00", days: DAYS.SAT },
			],
		});

		npc({
			id: "ethan_cole",
			name: "Ethan Cole",
			age: 18,
			pronouns: "he/him",
			role: "classmate",
			tags: ["student", "form_12b"],
			desc: "The class joker. Works weekend shifts collecting glasses and seems to know everyone in town.",
			body: { height: "average", weight: "chubby", hair_colour: "ginger", hair_length: "short", eye_colour: "hazel", skin_tone: "very fair" },
			schedule: [
				...schoolDay,
				{ at: "lion_lounge", from: "19:00", to: "22:30", days: DAYS.FRI },
				{ at: "elm_park_green", from: "14:00", to: "17:00", days: DAYS.SUN },
			],
		});

		npc({
			id: "jordan_reid",
			name: "Jordan Reid",
			age: 18,
			pronouns: "they/them",
			role: "classmate",
			tags: ["student", "form_12b"],
			desc: "Sketchbook always open, headphones always in. Says little in class but notices everything.",
			body: { height: "tall", weight: "skinny", hair_colour: "blue", hair_length: "chin-length", eye_colour: "grey", skin_tone: "olive" },
			schedule: [
				...schoolDay,
				{ at: "riverside_path", from: "16:00", to: "18:00", days: DAYS.WED },
				{ at: "arcade_cinema", from: "18:00", to: "21:00", days: DAYS.SAT },
			],
		});

		/* ======================================================================
		 *  School staff
		 * ====================================================================== */

		npc({
			id: "mr_hale",
			name: "Mr David Hale",
			age: 41,
			pronouns: "he/him",
			role: "form tutor",
			desc: "Your form tutor and ICT teacher. Tired tweed jacket, endless patience, terrible puns.",
			body: { height: "tall", weight: "average", hair_colour: "dark brown", hair_length: "short", eye_colour: "brown", skin_tone: "light" },
			schedule: [
				{ at: "academy_canteen", from: "12:00", to: "13:00", days: DAYS.WEEKDAYS }, // on lunch duty
				{ at: "academy_form_room", from: "08:30", to: "15:30", days: DAYS.WEEKDAYS },
			],
		});

		npc({
			id: "ms_rowe",
			name: "Ms Ruth Rowe",
			age: 52,
			pronouns: "she/her",
			role: "librarian",
			desc: "Runs the school library like a ship. Will find you any book, and will notice if you eat near one.",
			body: { height: "short", weight: "average", hair_colour: "platinum", hair_length: "chin-length", eye_colour: "blue", skin_tone: "fair" },
			schedule: [{ at: "academy_library", from: "08:00", to: "16:30", days: DAYS.WEEKDAYS }],
		});

		/* ======================================================================
		 *  Around town
		 * ====================================================================== */

		npc({
			id: "margaret_holt",
			name: "Margaret Holt",
			age: 71,
			pronouns: "she/her",
			role: "neighbour",
			desc: "Lives at number 12. Gardens every morning and keeps a friendly eye on the whole street.",
			body: { height: "short", weight: "slim", hair_colour: "platinum", hair_length: "short", eye_colour: "grey", skin_tone: "very fair" },
			schedule: [{ at: "elm_road", from: "09:30", to: "11:00" }],
		});

		npc({
			id: "raj_patel",
			name: "Raj Patel",
			age: 58,
			pronouns: "he/him",
			role: "shopkeeper",
			desc: "Has run the corner shop for twenty years. Remembers everyone's usual.",
			body: { height: "average", weight: "chubby", hair_colour: "black", hair_length: "short", eye_colour: "brown", skin_tone: "brown" },
			schedule: [{ at: "corner_shop", from: "07:00", to: "22:00" }],
		});

		// Jess runs the café's morning shift and hires you (town-work.js).
		npc({
			id: "jess_marlow",
			name: "Jess Marlow",
			age: 24,
			pronouns: "she/her",
			role: "barista",
			desc: "Runs the morning shift at The Daily Grind. Draws a different leaf in every flat white.",
			body: { height: "average", weight: "slim", hair_colour: "auburn", hair_length: "long", eye_colour: "green", skin_tone: "light" },
			schedule: [{ at: "grind_counter", from: "07:30", to: "14:00", days: DAYS.MON_SAT }],
		});

		npc({
			id: "sam_ito",
			name: "Sam Ito",
			age: 21,
			pronouns: "they/them",
			role: "barista",
			desc: "Afternoon barista and part-time music student. The café playlist is theirs.",
			body: { height: "short", weight: "slim", hair_colour: "pink", hair_length: "chin-length", eye_colour: "brown", skin_tone: "light" },
			schedule: [
				{ at: "grind_counter", from: "14:00", to: "18:00", days: DAYS.MON_SAT },
				{ at: "grind_counter", from: "09:00", to: "16:00", days: DAYS.SUN },
			],
		});

		npc({
			id: "gary_price",
			name: "Gary Price",
			age: 54,
			pronouns: "he/him",
			role: "landlord",
			desc: "Landlord of The Red Lion. Gruff, fair, and very firm about closing time.",
			body: { height: "tall", weight: "fat", hair_colour: "dark brown", hair_length: "buzzed", eye_colour: "brown", skin_tone: "fair" },
			schedule: [{ at: "lion_bar", from: "11:00", to: "23:00" }],
		});

		npc({
			id: "sophie_lane",
			name: "Sophie Lane",
			age: 26,
			pronouns: "she/her",
			role: "bartender",
			desc: "Works the busy evenings at The Red Lion. Pulls a perfect pint while holding three conversations.",
			body: { height: "average", weight: "average", hair_colour: "dark brown", hair_length: "long", eye_colour: "hazel", skin_tone: "olive" },
			schedule: [{ at: "lion_bar", from: "17:00", to: "24:00", days: [4, 5, 6] }], // Thu–Sat
		});

		npc({
			id: "dr_okafor",
			name: "Dr Maya Okafor",
			age: 46,
			pronouns: "she/her",
			role: "therapist",
			desc: "A counsellor at the Wellbeing Centre. Calm, direct, and good at the question you were avoiding.",
			body: { height: "tall", weight: "average", hair_colour: "black", hair_length: "short", eye_colour: "brown", skin_tone: "dark brown" },
			schedule: [{ at: "wellbeing_therapy", from: "09:00", to: "17:00", days: DAYS.WEEKDAYS }],
		});

		npc({
			id: "tom_reeves",
			name: "Tom Reeves",
			age: 29,
			pronouns: "he/him",
			role: "receptionist",
			desc: "Keeps the Wellbeing Centre running: phones, bookings and the occasional emergency.",
			body: { height: "average", weight: "slim", hair_colour: "light brown", hair_length: "short", eye_colour: "blue", skin_tone: "light" },
			schedule: [{ at: "wellbeing", from: "09:00", to: "17:00", days: DAYS.WEEKDAYS }],
		});

		npc({
			id: "aisha_bello",
			name: "Aisha Bello",
			age: 22,
			pronouns: "she/her",
			role: "shop assistant",
			desc: "Works at Threadline. Brutally honest about what suits you, in the nicest way.",
			body: { height: "tall", weight: "slim", hair_colour: "black", hair_length: "long", eye_colour: "brown", skin_tone: "dark brown" },
			schedule: [{ at: "threadline_floor", from: "09:00", to: "17:30", days: [2, 3, 4, 5, 6] }], // Tue–Sat
		});

		npc({
			id: "kyle_dunn",
			name: "Kyle Dunn",
			age: 27,
			pronouns: "he/him",
			role: "gym receptionist",
			desc: "Front desk at PulseFit and a personal trainer on the side. Very enthusiastic about leg day.",
			body: { height: "tall", weight: "average", hair_colour: "blonde", hair_length: "buzzed", eye_colour: "blue", skin_tone: "fair" },
			schedule: [
				{ at: "pulsefit_reception", from: "15:00", to: "22:00", days: DAYS.WEEKDAYS },
				{ at: "pulsefit_reception", from: "08:00", to: "16:00", days: DAYS.WEEKEND },
			],
		});

		npc({
			id: "dawn_fletcher",
			name: "Dawn Fletcher",
			age: 41,
			pronouns: "she/her",
			role: "letting agent",
			desc: "Runs Keys & Co Estate Agents in the Business District. Brisk, organised, and keeps a very close eye on who's paid their rent.",
			body: { height: "average", weight: "average", hair_colour: "auburn", hair_length: "shoulder-length", eye_colour: "green", skin_tone: "fair" },
			schedule: [{ at: "keys_lettings", from: "09:00", to: "17:30", days: DAYS.MON_SAT }],
		});

		/* ======================================================================
		 *  Riverside Park
		 * ====================================================================== */

		npc({
			id: "gavin_marsh",
			name: "Gavin Marsh",
			age: 33,
			pronouns: "he/him",
			role: "jogger",
			desc: "Runs the same loop of the park every morning, rain or shine, and nods at everyone he passes.",
			body: { height: "tall", weight: "slim", hair_colour: "dark brown", hair_length: "short", eye_colour: "brown", skin_tone: "dark brown" },
			schedule: [
				{ at: "riverside_park", from: "07:00", to: "08:30", days: DAYS.WEEKDAYS },
				{ at: "riverside_path", from: "09:00", to: "10:30", days: DAYS.WEEKEND },
			],
		});

		npc({
			id: "edna_pike",
			name: "Edna Pike",
			age: 79,
			pronouns: "she/her",
			role: "park regular",
			desc: "Sits on the same bench every afternoon with a flask of tea and opinions about everyone who walks by.",
			body: { height: "short", weight: "average", hair_colour: "platinum", hair_length: "short", eye_colour: "blue", skin_tone: "very fair" },
			schedule: [{ at: "riverside_park", from: "13:00", to: "16:00" }],
		});

		/* ======================================================================
		 *  Business District
		 * ====================================================================== */

		npc({
			id: "martin_ellery",
			name: "Martin Ellery",
			age: 45,
			pronouns: "he/him",
			role: "bank cashier",
			desc: "Behind the counter at Northern Crown Bank. Neat tie, patient voice, has a leaflet for everything.",
			body: { height: "average", weight: "average", hair_colour: "light brown", hair_length: "short", eye_colour: "grey", skin_tone: "fair" },
			schedule: [
				{ at: "crown_bank", from: "09:00", to: "17:00", days: DAYS.WEEKDAYS },
				{ at: "crown_bank", from: "09:00", to: "13:00", days: DAYS.SAT },
			],
		});

		npc({
			id: "tessa_wade",
			name: "Tessa Wade",
			age: 29,
			pronouns: "she/her",
			role: "studio receptionist",
			desc: "Runs the front desk at Grumman Productions. Knows who's filming what, and isn't telling.",
			body: { height: "tall", weight: "slim", hair_colour: "black", hair_length: "long", eye_colour: "brown", skin_tone: "olive" },
			schedule: [
				{ at: "grumman_studios", from: "08:00", to: "19:00", days: DAYS.WEEKDAYS },
				{ at: "grumman_studios", from: "10:00", to: "16:00", days: DAYS.SAT },
			],
		});

		npc({
			id: "nina_cross",
			name: "Nina Cross",
			age: 36,
			pronouns: "she/her",
			role: "casting director",
			desc: "Casting director at Grumman Productions. Looks at you for exactly three seconds and knows what you'd be good for.",
			body: { height: "average", weight: "slim", hair_colour: "blonde", hair_length: "chin-length", eye_colour: "green", skin_tone: "fair" },
			schedule: [{ at: "grumman_casting", from: "09:30", to: "17:00", days: DAYS.WEEKDAYS }],
		});

		npc({
			id: "victor_grumman",
			name: "Victor Grumman",
			age: 58,
			pronouns: "he/him",
			role: "film producer",
			desc: "Owns Grumman Productions. Loud suits, louder laugh, and a habit of calling everyone 'kid'.",
			body: { height: "average", weight: "chubby", hair_colour: "platinum", hair_length: "short", eye_colour: "blue", skin_tone: "light" },
			schedule: [
				{ at: "grumman_casting", from: "11:00", to: "12:30", days: DAYS.WEEKDAYS },
				{ at: "grumman_stage", from: "13:00", to: "18:00", days: DAYS.WEEKDAYS },
			],
		});

		/* ======================================================================
		 *  South Town
		 * ======================================================================
		 *
		 * Club nights run past midnight, and times after midnight count on the
		 * next day: Thursday night is days [4] until 24:00, then [5] from 00:00.
		 */

		const clubNight = (at, from) => [
			{ at, from, to: "24:00", days: [4, 5, 6] }, // Thu, Fri, Sat evening
			{ at, from: "00:00", to: "03:00", days: [5, 6, 0] }, // …into the early hours
		];

		npc({
			id: "marcus_doyle",
			name: "Marcus Doyle",
			age: 38,
			pronouns: "he/him",
			role: "bouncer",
			desc: "Works the door at Club Neon. Built like a wardrobe, says very little, misses nothing.",
			body: { height: "tall", weight: "fat", hair_colour: "black", hair_length: "buzzed", eye_colour: "brown", skin_tone: "dark brown" },
			schedule: clubNight("club_neon", "22:00"),
		});

		npc({
			id: "kira_novak",
			name: "Kira Novak",
			age: 27,
			pronouns: "she/her",
			role: "DJ",
			desc: "Resident DJ at Club Neon. Headphones round her neck, glitter on her cheekbones, total control of the room.",
			body: { height: "short", weight: "slim", hair_colour: "blue", hair_length: "shoulder-length", eye_colour: "hazel", skin_tone: "light" },
			schedule: clubNight("neon_dance_floor", "23:00"),
		});

		npc({
			id: "leon_hart",
			name: "Leon Hart",
			age: 25,
			pronouns: "he/him",
			role: "bartender",
			desc: "Works the bar at Club Neon. Pours drinks with a showman's flick and remembers faces, if not names.",
			body: { height: "tall", weight: "average", hair_colour: "light brown", hair_length: "chin-length", eye_colour: "green", skin_tone: "fair" },
			schedule: clubNight("neon_bar", "22:00"),
		});

		npc({
			id: "roxy_vale",
			name: "Roxy Vale",
			age: 34,
			pronouns: "she/her",
			role: "shop assistant",
			desc: "Runs the counter at Scarlet's. Unshockable, funny, and very good at making nervous customers feel at ease.",
			body: { height: "average", weight: "chubby", hair_colour: "auburn", hair_length: "long", eye_colour: "brown", skin_tone: "fair" },
			schedule: [{ at: "scarlets", from: "12:00", to: "22:00", days: [2, 3, 4, 5, 6] }], // Tue–Sat
		});

		npc({
			id: "mehmet_arslan",
			name: "Mehmet Arslan",
			age: 49,
			pronouns: "he/him",
			role: "takeaway owner",
			desc: "Owns the Golden Grill. Has fed half of South Town at three in the morning and never lost his temper once.",
			body: { height: "average", weight: "chubby", hair_colour: "black", hair_length: "short", eye_colour: "brown", skin_tone: "olive" },
			schedule: [{ at: "golden_grill", from: "17:00", to: "04:00" }],
		});

		/* ======================================================================
		 *  The Seafront
		 * ====================================================================== */

		npc({
			id: "kai_mendes",
			name: "Kai Mendes",
			age: 24,
			pronouns: "he/him",
			role: "lifeguard",
			desc: "Lifeguard on the beach: red shorts, a whistle and a permanent squint at the horizon.",
			body: { height: "tall", weight: "slim", hair_colour: "dark brown", hair_length: "shoulder-length", eye_colour: "brown", skin_tone: "light brown" },
			schedule: [{ at: "beach_sand", from: "10:00", to: "18:00" }],
		});

		npc({
			id: "bev_tolley",
			name: "Bev Tolley",
			age: 61,
			pronouns: "she/her",
			role: "runs the Surf Shack",
			desc: "Has run the Surf Shack for thirty summers. Calls everyone 'pet' and knows the tide times by heart.",
			body: { height: "short", weight: "chubby", hair_colour: "platinum", hair_length: "shoulder-length", eye_colour: "blue", skin_tone: "fair" },
			schedule: [{ at: "surf_shack", from: "09:00", to: "18:00" }],
		});

		/* ======================================================================
		 *  Your family (you live with them at the start: town-home.js)
		 * ====================================================================== */

		npc({
			id: "mum",
			name: "Mum",
			age: 47,
			pronouns: "she/her",
			role: "your mum",
			tags: ["family"],
			desc: "Works long shifts at the hospital and worries about you more than she lets on.",
			body: { height: "average", weight: "average", hair_colour: "light brown", hair_length: "shoulder-length", eye_colour: "brown", skin_tone: "fair" },
			schedule: [
				{ at: "home_kitchen", from: "07:00", to: "08:00" },
				{ at: "home_living_room", from: "18:30", to: "22:30" },
			],
		});

		npc({
			id: "dad",
			name: "Dad",
			age: 49,
			pronouns: "he/him",
			role: "your dad",
			tags: ["family"],
			desc: "An electrician with terrible jokes and a strong opinion about leaving lights on.",
			body: { height: "tall", weight: "average", hair_colour: "dark brown", hair_length: "short", eye_colour: "blue", skin_tone: "fair" },
			schedule: [
				{ at: "home_kitchen", from: "06:30", to: "07:15" },
				{ at: "home_living_room", from: "18:00", to: "23:00" },
			],
		});
	});
})();
