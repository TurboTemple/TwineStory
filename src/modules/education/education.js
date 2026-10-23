/*
 * education — school: terms, the timetable, lessons, homework, and what
 * happens when you skip. See README.md.
 *
 * A school has terms (dates), school days, periods (lesson times) and a
 * timetable from a named hook (default "weekly": a grid in the data). In a
 * lesson's time you can attend it from the lesson room; a lesson you didn't
 * attend counts as skipped the next day. Subjects can set homework when you
 * have a lesson, due a few days later; homework actions complete it.
 * Skipped lessons and late homework add up as "trouble" until something
 * (e.g. your form tutor's word with you) clears it.
 *
 * Events: school:lesson { school, subject, period, late },
 *         school:missed { school, day, lessons }, school:homeworkLate { subject },
 *         school:homeworkSet { subject, due }
 */
(function () {
	"use strict";

	const KEEP_DAYS = 10;

	(setup.__modules ??= []).push({
		id: "education",
		version: 1,
		deps: ["world", "character"],
		state: "school",
		defaultState: () => ({ attended: {}, homework: [], trouble: { lessons: 0, homework: 0 }, totals: { attended: 0, skipped: 0, homeworkDone: 0, homeworkLate: 0 }, nextHw: 1 }),

		install({ registry, cond, effects, time, bus, ui, fmt }) {
			registry.defineType("subject", {
				required: ["label"],
				defaults: { teacher: "", homeworkDays: null, desc: "" },
				check: (def) => (def.homeworkDays == null || (Number.isInteger(def.homeworkDays) && def.homeworkDays > 0) ? [] : ["homeworkDays must be whole days > 0 (or null)"]),
			});
			registry.defineType("school", {
				required: ["label", "room", "periods"],
				defaults: { days: [1, 2, 3, 4, 5], terms: [], keyDates: [], timetable: "weekly", week: {}, status: null, lateMins: 5, lastEntryMins: 15, earlyMins: 5 },
				refs: { room: "location", status: "statusEffect" },
				check(def) {
					const errs = [];
					for (const p of def.periods) if (!p.from || !p.to || time.parseHM(p.to) <= time.parseHM(p.from)) errs.push(`period ${p.from}–${p.to} must end after it starts`);
					for (const tm of def.terms) {
						try {
							if (time.dayOf(tm.to) < time.dayOf(tm.from)) errs.push(`term ${tm.from}–${tm.to} ends before it starts`);
						}
						catch (ex) {
							errs.push(ex.message);
						}
					}
					for (const [wd, row] of Object.entries(def.week)) {
						for (const s of row) if (s != null && !registry.has("subject", s)) errs.push(`week ${wd}: unknown subject "${s}"`);
					}
					return errs;
				},
			});

			const S = () => setup.vars().school;
			const timetables = new Map();
			let running = null;

			const edu = {
				/** @returns {object[]} Schools. */
				schools: () => registry.all("school"),

				/** @returns {boolean} Whether a day is in term. No terms listed = always in term. */
				inTerm(id, day) {
					const s = registry.get("school", id);
					return !s.terms.length || s.terms.some((tm) => day >= time.dayOf(tm.from) && day <= time.dayOf(tm.to));
				},

				/** @returns {boolean} A school day: in term and on one of its days. */
				schoolDay(id, day) {
					const s = registry.get("school", id);
					return edu.inTerm(id, day) && s.days.includes(time.weekday(time.at(day, "12:00")));
				},

				/**
				 * The lessons on a day.
				 * @returns {{school: string, period: number, subject: string, from: number, to: number}[]}
				 */
				lessonsOn(id, day) {
					if (!edu.schoolDay(id, day)) return [];
					const s = registry.get("school", id);
					const hook = timetables.get(s.timetable);
					return s.periods.map((p, i) => ({ school: id, period: i, subject: hook(s, day, i), from: time.at(day, p.from), to: time.at(day, p.to) })).filter((l) => l.subject);
				},

				/** @returns {boolean} */
				attended: (id, day, period) => (S().attended[`${id}:${day}`] ?? []).includes(period),

				/** The lesson that can be joined now (between `earlyMins` before and `lastEntryMins` before its end). */
				lessonNow(id, t = time.now()) {
					const s = registry.get("school", id);
					return edu.lessonsOn(id, time.day(t)).find((l) => t >= l.from - s.earlyMins && t <= l.to - s.lastEntryMins && !edu.attended(id, time.day(t), l.period)) ?? null;
				},

				/** @returns {object|null} The next lesson today that hasn't ended. */
				nextLesson(id, t = time.now()) {
					return edu.lessonsOn(id, time.day(t)).find((l) => l.to > t && !edu.attended(id, time.day(t), l.period)) ?? null;
				},

				/** @returns {boolean} Whether a lesson is in progress (being attended). */
				inLesson: () => running !== null,

				/**
				 * Attend the current lesson to its end.
				 * @returns {object} Result
				 */
				attend(id) {
					const s = registry.get("school", id);
					const l = edu.lessonNow(id);
					if (!l) throw new setup.GameError(`No lesson to go to at ${id} right now`);
					const subj = registry.get("subject", l.subject);
					const result = effects.newResult();
					if (time.now() < l.from) time.advance(l.from - time.now(), { reason: "school:early" });
					const late = time.now() - l.from > s.lateMins;
					const key = `${id}:${time.day(l.from)}`;
					(S().attended[key] ??= []).push(l.period);
					running = { school: id, lesson: l };
					if (s.status) setup.status.add(s.status);
					let elapsed = 0;
					try {
						elapsed = time.advance(l.to - time.now(), { reason: `school:${l.subject}` }).elapsed;
					}
					finally {
						running = null;
						if (s.status) setup.status.remove(s.status);
					}
					S().totals.attended += 1;
					result.changes.push({ kind: "school", text: `${subj.label}${subj.teacher ? ` with ${subj.teacher}` : ""}: ${fmt.duration(elapsed)}${late ? " (you were late)" : ""}.` });
					edu.setHomework(l.subject, result);
					bus.emit("school:lesson", { school: id, subject: l.subject, period: l.period, late, ctx: { school: id, subject: l.subject }, result });
					return result;
				},

				/** Set homework for a subject (if it sets homework and none is open). */
				setHomework(subject, result) {
					const subj = registry.get("subject", subject);
					if (subj.homeworkDays == null || S().homework.some((h) => h.subject === subject)) return;
					const due = time.at(time.day(time.now()) + subj.homeworkDays, "08:40");
					S().homework.push({ id: S().nextHw++, subject, set: time.now(), due });
					result?.changes.push({ kind: "school", text: `${subj.label} homework, due ${fmt.date(due)}.` });
					bus.emit("school:homeworkSet", { subject, due });
				},

				/** @returns {{id: number, subject: string, set: number, due: number}[]} Open homework, soonest due first. */
				homework: () => [...S().homework].sort((a, b) => a.due - b.due),

				/**
				 * Finish the homework due soonest.
				 * @returns {string|null} The subject done, or null if there was none.
				 */
				doHomework() {
					const hw = edu.homework()[0];
					if (!hw) return null;
					S().homework = S().homework.filter((h) => h.id !== hw.id);
					S().totals.homeworkDone += 1;
					return hw.subject;
				},

				/** @returns {{lessons: number, homework: number}} Unexplained skipped lessons and late homework. */
				trouble: () => S().trouble,

				/** Clear the trouble count (once someone has had a word). */
				clearTrouble() {
					edu.lastTrouble = { ...S().trouble };
					S().trouble = { lessons: 0, homework: 0 };
				},

				/** @returns {object} Running totals. */
				totals: () => S().totals,

				/** Register a timetable hook: (school, day, periodIndex) => subject id | null. */
				registerTimetable: (name, fn) => timetables.set(name, fn),

				/** @returns {boolean} */
				hasTimetable: (name) => timetables.has(name),
			};
			setup.education = edu;
			/** The trouble count just before it was last cleared (for event text; not saved). */
			edu.lastTrouble = { lessons: 0, homework: 0 };

			// "weekly": the school's `week` grid, { 1: [subject per period], … } (1 = Monday).
			edu.registerTimetable("weekly", (s, day, i) => s.week[time.weekday(time.at(day, "12:00"))]?.[i] ?? null);

			// A new day: yesterday's lessons you didn't go to are skipped; homework
			// now past its due time is late.
			bus.on("time:day", ({ day }) => {
				const st = S();
				for (const s of edu.schools()) {
					const skipped = edu.lessonsOn(s.id, day - 1).filter((l) => !edu.attended(s.id, day - 1, l.period)).length;
					if (skipped) {
						st.trouble.lessons += skipped;
						st.totals.skipped += skipped;
						bus.emit("school:missed", { school: s.id, day: day - 1, lessons: skipped });
					}
				}
				const now = time.at(day, "00:00");
				for (const k of Object.keys(st.attended)) if (Number(k.split(":")[1]) < day - KEEP_DAYS) delete st.attended[k];
				// Homework is late once school starts on its due day: check through the
				// end of yesterday, so due-today work can still be done this morning.
				const late = st.homework.filter((h) => h.due < now);
				for (const h of late) {
					st.trouble.homework += 1;
					st.totals.homeworkLate += 1;
					ui.notify(`Your ${registry.get("subject", h.subject).label} homework is late.`);
					bus.emit("school:homeworkLate", { subject: h.subject });
				}
				if (late.length) st.homework = st.homework.filter((h) => !late.includes(h));
			});

			// { schoolTrouble: { min? } } — unexplained skipped lessons + late homework.
			cond.register("schoolTrouble", {
				test: (spec) => edu.trouble().lessons + edu.trouble().homework >= (spec?.min ?? 1),
				describe: () => "You've skipped lessons or homework",
			});

			// { schoolDay: true } — today is a school day (for any school).
			cond.register("schoolDay", {
				test: (spec, ctx) => edu.schools().some((s) => edu.schoolDay(s.id, time.day(ctx.t ?? time.now()))) === (spec !== false),
				describe: (spec) => (spec === false ? "Not a school day" : "A school day"),
			});

			// { homeworkDue: true } — there's homework to do.
			cond.register("homeworkDue", {
				test: (spec) => (edu.homework().length > 0) === (spec !== false),
				describe: (spec) => (spec === false ? "No homework to do" : "You have homework to do"),
			});

			// { homework: true } — finish the homework due soonest.
			effects.register("homework", {
				apply(spec, ctx, result) {
					const subj = edu.doHomework();
					if (subj && !ctx.quiet) result.changes.push({ kind: "school", text: `Finished your ${registry.get("subject", subj).label} homework.` });
				},
				describe: () => "Finishes homework",
			});

			// { schoolClearTrouble: true }
			effects.register("schoolClearTrouble", { apply: () => edu.clearTrouble() });

			/* ---- UI --------------------------------------------------------- */

			const lessonText = (l) => {
				const subj = registry.get("subject", l.subject);
				return `${fmt.time(l.from)}–${fmt.time(l.to)} ${subj.label}${subj.teacher ? ` (${subj.teacher})` : ""}`;
			};

			setup.world.addHereSection("lessons", 27, (box, here) => {
				for (const s of edu.schools()) {
					if (!setup.world.within(here.id, s.room) && setup.world.site(here.id) !== setup.world.site(s.room)) continue;
					const today = edu.lessonsOn(s.id, time.day(time.now()));
					if (!today.length) continue;
					box.append(ui.el("h2", { text: "Lessons" }));
					const now = edu.lessonNow(s.id);
					if (now && here.id === s.room) {
						const subj = registry.get("subject", now.subject);
						box.append(ui.action(`Go to ${subj.label} (until ${fmt.time(now.to)})`, () => edu.attend(s.id), { class: "btn-primary" }));
					}
					else if (now) box.append(ui.el("p", { class: "note", text: `${registry.get("subject", now.subject).label} is on now in ${registry.get("location", s.room).name}.` }));
					else {
						const next = edu.nextLesson(s.id);
						box.append(ui.el("p", { class: "note", text: next ? `Next: ${lessonText(next)}.` : "No more lessons today." }));
					}
				}
			});

			setup.character.addMeSection("school", 36, (box) => {
				if (!edu.schools().length) return;
				const t = edu.totals();
				const hw = edu.homework();
				box.append(ui.el("h2", { text: "School" }));
				const rows = [
					["Lessons attended", String(t.attended)],
					["Lessons skipped", String(t.skipped)],
					["Homework", hw.length ? hw.map((h) => `${registry.get("subject", h.subject).label} (due ${fmt.date(h.due)})`).join(", ") : "All done"],
					["Homework handed in late", String(t.homeworkLate)],
				];
				box.append(ui.el("dl", { class: "sheet" }, ...rows.flatMap(([k, v]) => [ui.el("dt", { text: k }), ui.el("dd", { text: v })])));
			});

			edu.lessonText = lessonText;
		},

		ready() {
			if (!setup.modules.has("phone")) return;
			const { time, registry } = setup;
			setup.phone.addCalendarSource((from, to) => {
				const out = [];
				for (const s of setup.education.schools()) {
					for (let d = time.day(from); d <= time.day(to - 1); d++) {
						for (const l of setup.education.lessonsOn(s.id, d)) {
							const subj = registry.get("subject", l.subject);
							out.push({ t: l.from, end: l.to, text: `${subj.label}${setup.education.attended(s.id, d, l.period) ? " (went)" : ""}` });
						}
						for (const k of s.keyDates) if (time.dayOf(k.date) === d) out.push({ t: time.at(d, "00:00"), text: k.label });
					}
				}
				for (const h of setup.education.homework()) out.push({ t: h.due, text: `${registry.get("subject", h.subject).label} homework due` });
				return out;
			});
		},

		validate() {
			return setup.registry.all("school")
				.filter((s) => !setup.education.hasTimetable(s.timetable))
				.map((s) => `school "${s.id}": unknown timetable hook "${s.timetable}"`);
		},
	});
})();
