/*
 * ============================================================================
 *  Mooresville Academy — subjects, timetable and the school year
 * ============================================================================
 *
 * How school works in the game:
 *   - On a school day, go to Form Room 12B. During a lesson's time a
 *     "Go to <subject>" button appears. You can join from 5 minutes before
 *     until 15 minutes before the end; more than 5 minutes late is noted.
 *   - A lesson in a subject that sets homework gives you homework, due at
 *     08:40 that many days later (only one piece per subject at a time).
 *     "Do homework" (your bedroom) or "Study" (the library) finishes it.
 *   - The next day, every lesson you missed counts as skipped, and homework
 *     past its due time counts as late. Mr Hale has a word about it when
 *     you next walk into the form room (part 4).
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
 *   Change the times:   edit `periods` (one entry per lesson slot).
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

		subject({ id: "english", label: "English", teacher: "Mrs Clarke", homeworkDays: 3 });
		subject({ id: "maths", label: "Maths", teacher: "Mr Lloyd", homeworkDays: 2 });
		subject({ id: "history", label: "History", teacher: "Mr Hale", homeworkDays: 3 });
		subject({ id: "biology", label: "Biology", teacher: "Dr Fry", homeworkDays: 4 });
		subject({ id: "art", label: "Art", teacher: "Ms Costa", homeworkDays: null });
		subject({ id: "pe", label: "PE", teacher: "Mr Grant", homeworkDays: null });

		/* ======================================================================
		 *  2 & 3. The school: lesson times, the weekly timetable, term dates
		 * ====================================================================== */

		R.define("school", {
			id: "academy",
			label: "Mooresville Academy",
			room: "academy_form_room", // where lessons happen
			status: "in_lessons",      // the hidden effect while in a lesson (town-needs.js)

			// Lesson slots, in order. Break is 11:00–11:20, lunch 12:20–13:10.
			periods: [
				{ from: "09:00", to: "10:00" },
				{ from: "10:00", to: "11:00" },
				{ from: "11:20", to: "12:20" },
				{ from: "13:10", to: "14:10" },
				{ from: "14:10", to: "15:10" },
			],

			// The timetable: 1 = Monday … 5 = Friday, one subject per slot above.
			week: {
				1: ["english", "maths", "history", "biology", "art"],
				2: ["maths", "history", "english", "pe", "biology"],
				3: ["biology", "english", "maths", "history", "art"],
				4: ["history", "maths", "biology", "english", "pe"],
				5: ["english", "art", "maths", "history", "biology"],
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
		 * Plays when you walk into the form room while Mr Hale is there, if
		 * you've skipped lessons or handed homework in late since the last
		 * time. Afterwards the count starts again. Its text (which says how
		 * many) is the passage "Ev_tutor_word" in events.twee.
		 */

		R.define("storylet", {
			id: "tutor_word",
			kind: "story",
			passage: "Ev_tutor_word",
			triggers: ["world:enter"],
			conditions: { at: "academy_form_room", npcHere: "mr_hale", schoolTrouble: { min: 1 } },
			effects: [{ stat: { stress: 5 } }, { schoolClearTrouble: true }],
		});
	});
})();
