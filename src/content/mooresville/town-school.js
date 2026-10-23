/*
 * Mooresville Academy — the school year, timetable and subjects.
 * Term dates follow a typical English school year. Everything here is
 * open to change.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const subject = (id, label, teacher, homeworkDays) => R.define("subject", { id, label, teacher, homeworkDays });
		subject("english", "English", "Mrs Clarke", 3);
		subject("maths", "Maths", "Mr Lloyd", 2);
		subject("history", "History", "Mr Hale", 3);
		subject("biology", "Biology", "Dr Fry", 4);
		subject("art", "Art", "Ms Costa", null);
		subject("pe", "PE", "Mr Grant", null);

		R.define("school", {
			id: "academy",
			label: "Mooresville Academy",
			room: "academy_form_room",
			status: "in_lessons",
			periods: [
				{ from: "09:00", to: "10:00" },
				{ from: "10:00", to: "11:00" },
				{ from: "11:20", to: "12:20" },
				{ from: "13:10", to: "14:10" },
				{ from: "14:10", to: "15:10" },
			],
			// 1 = Monday … 5 = Friday; one subject per period.
			week: {
				1: ["english", "maths", "history", "biology", "art"],
				2: ["maths", "history", "english", "pe", "biology"],
				3: ["biology", "english", "maths", "history", "art"],
				4: ["history", "maths", "biology", "english", "pe"],
				5: ["english", "art", "maths", "history", "biology"],
			},
			terms: [
				{ from: "2026-09-03", to: "2026-10-23" },
				{ from: "2026-11-02", to: "2026-12-18" },
				{ from: "2027-01-05", to: "2027-02-12" },
				{ from: "2027-02-22", to: "2027-03-26" },
				{ from: "2027-04-12", to: "2027-05-28" },
				{ from: "2027-06-07", to: "2027-07-16" },
			],
			keyDates: [
				{ date: "2026-09-03", label: "First day of term" },
				{ date: "2026-10-26", label: "Half term" },
				{ date: "2026-12-21", label: "Christmas holidays" },
				{ date: "2027-02-15", label: "Half term" },
				{ date: "2027-03-29", label: "Easter holidays" },
				{ date: "2027-05-31", label: "Half term" },
			],
		});

		// Your form tutor has a word if you've skipped lessons or homework.
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
