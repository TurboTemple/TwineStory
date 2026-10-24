/*
 * ============================================================================
 *  Mooresville Academy — subjects, timetable and the school year
 * ============================================================================
 *
 * How school works in the game:
 *   - At the school entrance, tap "Attend school". You go to Form Room 12B.
 *   - Five lessons, one after another: tap each one to have it. If you
 *     arrive late you can still join a lesson until 15 minutes before it
 *     ends; more than 5 minutes late is noted (lastEntryMins and lateMins
 *     in part 2).
 *   - Lunch is in the middle (`breaks` in part 2): the bell takes you to
 *     the canteen. Talk to the students and teachers there, go to the boys'
 *     or girls' toilets, and random events can happen (events that use the
 *     trigger "school:break"). "Back to class" starts the next lesson.
 *   - After the last lesson you're back at the entrance. "Leave school"
 *     goes early: the lessons left count as skipped.
 *   - A lesson in a subject that sets homework gives you homework, due at
 *     08:40 (homeworkDue) that many days later (only one piece per subject at a time).
 *     "Do homework" (your bedroom) or "Study" (the library) finishes it.
 *   - The next day, every lesson you missed counts as skipped, and homework
 *     past its due time counts as late. Mr Hale has a word about it at the
 *     start of your next school day (part 4).
 *   - The phone's Timetable app shows the week.
 *
 * Term dates follow a typical English school year. Everything here is
 * open to change.
 *
 * ---------------------------------------------------------------------------
 *  HOW TO EDIT
 * ---------------------------------------------------------------------------
 *   Add a subject:      subject({ id: "chemistry", label: "Chemistry", teacher: "Mr Shah", homeworkDays: 3 });
 *                       then put "chemistry" into the timetable (part 2).
 *   No homework:        homeworkDays: null
 *   Change the times:   edit `periods` (one entry per lesson slot) and `breaks`.
 *   Add a break:        { id: "morning_break", label: "Break", from: "10:00", to: "10:15", at: "academy_canteen" }
 *                       (`at` is where you spend it; move the lessons round it).
 *   Change the week:    edit `week`: for each day, one subject per period, in order.
 *                       Use null for a free period.
 *   Dates:              "YYYY-MM-DD".
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/* ======================================================================
		 *  1. Subjects
		 * ======================================================================
		 *
		 * `teacher` is just a name for now (shown next to the lesson).
		 * `homeworkDays`: homework is due this many days after the lesson.
		 */

		const subject = (def) => R.define("subject", def);

		subject({ id: "maths", label: "Maths", teacher: "Mr Lloyd", homeworkDays: 2 });
		subject({ id: "english", label: "English", teacher: "Mrs Clarke", homeworkDays: 3 });
		subject({ id: "science", label: "Science", teacher: "Dr Fry", homeworkDays: 3 });
		subject({ id: "ict", label: "ICT", teacher: "Mr Hale", homeworkDays: 4 });         // also your form tutor
		subject({ id: "pe", label: "PE", teacher: "Mr Grant", homeworkDays: null }); // Mark Grant: stories/story-gym-teacher.js

		/* ======================================================================
		 *  2 & 3. The school: lesson times, the weekly timetable, term dates
		 * ====================================================================== */

		R.define("school", {
			id: "academy",
			label: "Mooresville Academy",
			room: "academy_form_room", // where lessons happen
			status: "in_lessons",      // the hidden effect while in a lesson (town-needs.js)

			earlyMins: 5,        // you can go into a lesson this many minutes before it starts
			lateMins: 5,         // more than this many minutes after the start counts as late
			lastEntryMins: 15,   // you can't go in during the last this-many minutes of a lesson
			homeworkDue: "08:40", // homework is due at this time on its due day

			// Lesson slots, in order: five lessons, one after another.
			periods: [
				{ from: "09:00", to: "10:00" },
				{ from: "10:00", to: "11:00" },
				{ from: "11:00", to: "12:00" },
				// (lunch, below)
				{ from: "13:00", to: "14:00" },
				{ from: "14:00", to: "15:00" },
			],

			// Breaks between lessons. `at` is where you spend them.
			breaks: [
				{ id: "lunch", label: "Lunch", from: "12:00", to: "13:00", at: "academy_canteen" },
			],

			// The timetable: 1 = Monday … 5 = Friday, one subject per lesson slot above.
			week: {
				1: ["maths", "english", "science", "ict", "pe"],
				2: ["english", "science", "maths", "pe", "ict"],
				3: ["science", "maths", "ict", "english", "pe"],
				4: ["ict", "english", "science", "maths", "pe"],
				5: ["maths", "ict", "english", "science", "pe"],
			},

			// Term time. Outside these dates there are no lessons.
			terms: [
				{ from: "2026-09-03", to: "2026-10-23" }, // autumn, first half
				{ from: "2026-11-02", to: "2026-12-18" }, // autumn, second half
				{ from: "2027-01-05", to: "2027-02-12" }, // spring, first half
				{ from: "2027-02-22", to: "2027-03-26" }, // spring, second half
				{ from: "2027-04-12", to: "2027-05-28" }, // summer, first half
				{ from: "2027-06-07", to: "2027-07-16" }, // summer, second half
			],

			// Shown in the phone's calendar.
			keyDates: [
				{ date: "2026-09-03", label: "First day of term" },
				{ date: "2026-10-26", label: "Half term" },
				{ date: "2026-12-21", label: "Christmas holidays" },
				{ date: "2027-02-15", label: "Half term" },
				{ date: "2027-03-29", label: "Easter holidays" },
				{ date: "2027-05-31", label: "Half term" },
			],
		});

		/* ======================================================================
		 *  4. Skipping: your form tutor has a word
		 * ======================================================================
		 *
		 * Plays at the start of a school day (registration in the form room), if
		 * you've skipped lessons or handed homework in late since the last
		 * time. Afterwards the count starts again. Its text (which says how
		 * many) is the passage "Ev_tutor_word" in events.twee.
		 */

		R.define("storylet", {
			id: "tutor_word",
			kind: "story",
			passage: "Ev_tutor_word",
			triggers: ["school:dayStart"],
			conditions: { schoolTrouble: { min: 1 } },
			effects: [{ stat: { stress: 5 } }, { schoolClearTrouble: true }],
		});
	});
})();
