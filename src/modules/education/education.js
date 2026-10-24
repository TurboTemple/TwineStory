/*
 * education — school: terms, the timetable, lessons, homework, and what
 * happens when you skip.
 *
 * A school has terms (dates), school days, periods (lesson times), breaks
 * (lunch) and a timetable from a named hook (default "weekly": a grid in the
 * data). The school day: at the school's entrance, "Attend school" takes you
 * to the lesson room; each lesson is one tap, one after another; a break
 * takes you to its room (the canteen) until "Back to class"; after the last
 * lesson you're back at the entrance. A lesson you didn't attend counts as
 * skipped the next day. Subjects can set homework when you
 * have a lesson, due a few days later; homework actions complete it.
 * Skipped lessons and late homework add up as "trouble" until something
 * (e.g. your form tutor's word with you) clears it.
 *
 * Events: school:dayStart { school }, school:break { school, break },
 *         school:dayEnd { school, early },
 *         school:lesson { school, subject, period, late },
 *         school:missed { school, day, lessons }, school:homeworkLate { subject },
 *         school:homeworkSet { subject, due }
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-school.js (subjects, timetable, lunch, term dates)
 *   src/story/mooresville/actions.twee (each lesson's flavour text: Act_lesson_<subject>)
 * Every field, condition, effect and event is listed in src/modules/education/README.md.
 */
(function () {
	"use strict";

	const KEEP_DAYS = 10;
	const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

	(setup.__modules ??= []).push({
		id: "education",
		version: 2,
		deps: ["world", "character"],
		state: "school",
		defaultState: () => ({ attended: {}, homework: [], trouble: { lessons: 0, homework: 0 }, totals: { attended: 0, skipped: 0, homeworkDone: 0, homeworkLate: 0 }, nextHw: 1, today: null }),
		migrations: {
			// The school day (`today`); homework in subjects that no longer exist is dropped.
			2: (slice) => ({ ...slice, today: null, homework: slice.homework.filter((h) => setup.registry.has("subject", h.subject)) }),
		},

		install({ registry, cond, effects, time, bus, ui, fmt }) {
			registry.defineType("subject", {
				required: ["label"],
				defaults: { teacher: "", homeworkDays: null, desc: "", passage: null },
				passages: ["passage"],
				check: (def) => (def.homeworkDays == null || (Number.isInteger(def.homeworkDays) && def.homeworkDays > 0) ? [] : ["homeworkDays must be whole days > 0 (or null)"]),
			});
			registry.defineType("school", {
				required: ["label", "room", "periods"],
				defaults: { days: [1, 2, 3, 4, 5], terms: [], keyDates: [], timetable: "weekly", week: {}, breaks: [], status: null, lateMins: 5, lastEntryMins: 15, earlyMins: 5, homeworkDue: "08:40" },
				refs: { room: "location", status: "statusEffect", "breaks[].at": "location" },
				check(def) {
					const errs = [];
					for (const p of [...def.periods, ...def.breaks]) if (!p.from || !p.to || time.parseHM(p.to) <= time.parseHM(p.from)) errs.push(`${p.label ?? "period"} ${p.from}–${p.to} must end after it starts`);
					for (const b of def.breaks) if (!b.id || !b.label || !b.at) errs.push("each break needs an id, a label and a room (at)");
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
					try {
						time.parseHM(def.homeworkDue);
					}
					catch (ex) {
						errs.push(`homeworkDue: ${ex.message}`);
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

				/** @returns {object|null} The next lesson today you can still go to (not attended, not too late). */
				nextJoinable(id, t = time.now()) {
					const s = registry.get("school", id);
					return edu.lessonsOn(id, time.day(t)).find((l) => t <= l.to - s.lastEntryMins && !edu.attended(id, time.day(t), l.period)) ?? null;
				},

				/** @returns {boolean} Whether a lesson is in progress (being attended). */
				inLesson: () => running !== null,

				/* ---- The school day ------------------------------------------- */

				/** @returns {{school: string, day: number, breaks: string[]}|null} Today's school day, if you're in one. */
				today() {
					const d = S().today;
					return d && d.day === time.day(time.now()) ? d : null;
				},

				/** @returns {string} The place you go in and out by (the lesson room's site). */
				entrance: (id) => setup.world.site(registry.get("school", id).room),

				/** @returns {string[]} The rooms of a school day: the lesson room, each break's room and the rooms off it. */
				insideRooms(id) {
					const s = registry.get("school", id);
					const out = new Set([s.room]);
					for (const b of s.breaks) {
						out.add(b.at);
						for (const n of setup.world.neighbours(b.at)) out.add(n);
					}
					return [...out];
				},

				/** @returns {object[]} Today's breaks with their times: { id, label, at, from, to }. */
				breaksOn(id, day) {
					if (!edu.schoolDay(id, day)) return [];
					return registry.get("school", id).breaks.map((b) => ({ ...b, from: time.at(day, b.from), to: time.at(day, b.to) }));
				},

				/**
				 * What comes next in today's school day.
				 * @returns {{kind: "lesson", lesson: object}|{kind: "break", brk: object}|{kind: "end"}}
				 */
				nextStep(id, t = time.now()) {
					const l = edu.nextJoinable(id, t);
					const taken = edu.today()?.breaks ?? [];
					const brk = edu.breaksOn(id, time.day(t)).find((b) => !taken.includes(b.id) && t < b.to && (!l || b.to <= l.from));
					if (brk) return { kind: "break", brk };
					return l ? { kind: "lesson", lesson: l } : { kind: "end" };
				},

				/** @returns {string[]} Why the school day can't start now (empty = it can). */
				startBlockers(id) {
					const day = time.day(time.now());
					if (!edu.schoolDay(id, day)) return [edu.inTerm(id, day) ? "No school today" : "It's the holidays"];
					if (!setup.world.isOpen(edu.entrance(id))) return ["The school is shut"];
					if (!edu.nextJoinable(id)) return ["School's finished for today"];
					return [];
				},

				/**
				 * "Attend school": go to the lesson room for the day's lessons.
				 * @returns {object} Result
				 */
				startDay(id) {
					const why = edu.startBlockers(id);
					if (why.length) throw new setup.GameError(`Can't start the school day: ${why.join("; ")}`);
					S().today = { school: id, day: time.day(time.now()), breaks: [] };
					setup.world.moveTo(registry.get("school", id).room);
					const result = effects.newResult();
					bus.emit("school:dayStart", { school: id, ctx: { school: id }, result });
					return result;
				},

				/**
				 * Go on a break (e.g. lunch): wait for it to start if it's early, then
				 * go to its room. Emits school:break, for events at lunch.
				 * @returns {object} Result
				 */
				takeBreak(id, breakId) {
					const b = edu.breaksOn(id, time.day(time.now())).find((x) => x.id === breakId);
					if (!b) throw new setup.GameError(`No break "${breakId}" at ${id} today`);
					const result = effects.newResult();
					edu.today()?.breaks.push(b.id);
					if (time.now() < b.from) time.advance(b.from - time.now(), { reason: "school:wait" });
					setup.world.moveTo(b.at);
					result.changes.push({ kind: "school", text: `${b.label} until ${fmt.time(b.to)}.` });
					bus.emit("school:break", { school: id, break: b.id, ctx: { school: id }, result });
					return result;
				},

				/**
				 * After a break: back to the lesson room and straight into the next lesson.
				 * @returns {object} Result
				 */
				backToClass(id) {
					setup.world.moveTo(registry.get("school", id).room);
					return edu.nextJoinable(id) ? edu.attend(id) : edu.endDay(id);
				},

				/**
				 * End the school day and go back out to the entrance. Leaving
				 * early just means the lessons left are skipped.
				 * @returns {object} Result
				 */
				endDay(id) {
					const early = edu.nextJoinable(id) !== null;
					S().today = null;
					setup.world.moveTo(edu.entrance(id));
					const result = effects.newResult();
					result.changes.push({ kind: "school", text: early ? "You leave school early." : "School's out." });
					bus.emit("school:dayEnd", { school: id, early, ctx: { school: id }, result });
					return result;
				},

				/**
				 * Attend the current lesson to its end (in a school day: the next
				 * lesson you can still go to, waiting for it to start).
				 * @returns {object} Result
				 */
				attend(id) {
					const s = registry.get("school", id);
					const inDay = edu.today()?.school === id;
					const l = inDay ? edu.nextJoinable(id) : edu.lessonNow(id);
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
					edu.setHomework(l.subject, result, id);
					bus.emit("school:lesson", { school: id, subject: l.subject, period: l.period, late, ctx: { school: id, subject: l.subject }, result });
					setup.actions?.illustrate({ title: subjectText(l.subject), media: { type: "subject", id: l.subject }, passage: subj.passage ?? `Act_lesson_${l.subject}` });
					// The bell: straight on to the break, or out at the end of the day.
					if (inDay) {
						const next = edu.nextStep(id);
						const more = next.kind === "break" ? edu.takeBreak(id, next.brk.id) : next.kind === "end" ? edu.endDay(id) : null;
						if (more) result.changes.push(...more.changes);
					}
					return result;
				},

				/**
				 * Set homework for a subject (if it sets homework and none is open),
				 * due at the school's `homeworkDue` time.
				 * @param {string} subject @param {object} [result] @param {string} [school]
				 */
				setHomework(subject, result, school) {
					const subj = registry.get("subject", subject);
					if (subj.homeworkDays == null || S().homework.some((h) => h.subject === subject)) return;
					const dueAt = (school ? registry.get("school", school) : registry.all("school")[0])?.homeworkDue ?? "08:40";
					const due = time.at(time.day(time.now()) + subj.homeworkDays, dueAt);
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

				/** @returns {string|null} The subject in a period on a day, from the timetable (term or not). */
				timetableAt: (s, day, i) => timetables.get(s.timetable)(s, day, i),

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
			effects.register("schoolClearTrouble", { apply: () => edu.clearTrouble(), describe: () => "Clears the skipped lessons and late homework counted so far" });

			/* ---- UI --------------------------------------------------------- */

			const lessonText = (l) => {
				const subj = registry.get("subject", l.subject);
				return `${fmt.time(l.from)}–${fmt.time(l.to)} ${subj.label}${subj.teacher ? ` (${subj.teacher})` : ""}`;
			};

			const subjectText = (subject) => {
				const subj = registry.get("subject", subject);
				return `${subj.label}${subj.teacher ? ` with ${subj.teacher}` : ""}`;
			};

			// Today's lessons and breaks in time order, ticked off as you go.
			const dayList = (s, day) => {
				const ul = ui.el("ul", { class: "school-day" });
				const rows = [
					...edu.lessonsOn(s.id, day).map((l) => ({ t: l.from, text: subjectText(l.subject), done: edu.attended(s.id, day, l.period), gone: l.to <= time.now() })),
					...edu.breaksOn(s.id, day).map((b) => ({ t: b.from, text: b.label, done: (edu.today()?.breaks ?? []).includes(b.id), gone: b.to <= time.now(), isBreak: true })),
				].sort((a, b) => a.t - b.t);
				for (const r of rows) {
					const mark = r.done ? "✓" : r.gone && !r.isBreak ? "✗" : "·";
					ul.append(ui.el("li", { class: r.done ? "done" : r.gone ? "gone" : "" }, ui.el("span", { class: "cal-time", text: `${fmt.time(r.t)} ` }), `${r.text} ${mark}`));
				}
				return ul;
			};

			setup.world.addHereSection("school", 15, (box, here) => {
				for (const s of edu.schools()) {
					const day = time.day(time.now());
					// At the entrance: "Attend school".
					if (here.id === edu.entrance(s.id)) {
						box.append(ui.el("h2", { text: "School" }));
						const why = edu.startBlockers(s.id);
						if (why.length) box.append(ui.el("p", { class: "note", text: why.join("; ") + "." }));
						else {
							const lessons = edu.lessonsOn(s.id, day);
							box.append(ui.action("Attend school", () => edu.startDay(s.id), { class: "btn-primary" }));
							box.append(ui.el("p", { class: "note", text: `Today: ${lessons.map((l) => registry.get("subject", l.subject).label).join(", ")} (${fmt.time(lessons[0].from)}–${fmt.time(lessons.at(-1).to)}).` }));
						}
						continue;
					}
					if (!edu.insideRooms(s.id).includes(here.id)) continue;
					const today = edu.today();
					// Inside, but not in a school day (e.g. after loading an old save).
					if (today?.school !== s.id) {
						box.append(ui.action("Leave school", () => edu.endDay(s.id)));
						continue;
					}
					const next = edu.nextStep(s.id);
					if (here.id === s.room) {
						box.append(ui.el("h2", { text: "Today's lessons" }), dayList(s, day));
						if (next.kind === "lesson") box.append(ui.action(`${registry.get("subject", next.lesson.subject).label} · ${fmt.time(next.lesson.from)}–${fmt.time(next.lesson.to)}`, () => edu.attend(s.id), { class: "btn-primary" }));
						else if (next.kind === "break") box.append(ui.action(`${next.brk.label} · until ${fmt.time(next.brk.to)}`, () => edu.takeBreak(s.id, next.brk.id), { class: "btn-primary" }));
						else box.append(ui.action("School's out", () => edu.endDay(s.id), { class: "btn-primary" }));
					}
					else {
						// On a break (the canteen, the toilets off it).
						const brk = edu.breaksOn(s.id, day).find((b) => today.breaks.includes(b.id) && time.now() < b.to);
						box.append(ui.el("h2", { text: brk?.label ?? "Break" }));
						if (brk) box.append(ui.el("p", { class: "note", text: `Until ${fmt.time(brk.to)}.` }));
						const l = edu.nextJoinable(s.id);
						box.append(ui.action(l ? `Back to class · ${registry.get("subject", l.subject).label} at ${fmt.time(l.from)}` : "Back to class", () => edu.backToClass(s.id), { class: "btn-primary" }));
					}
					if (next.kind !== "end") box.append(ui.action("Leave school", () => edu.endDay(s.id)));
				}
			});

			// The phone's Timetable app: the week, one line per day.
			ui.view("app-timetable", (box) => {
				const today = time.day(time.now());
				for (const s of edu.schools()) {
					box.append(ui.el("h2", { text: s.label }));
					if (!edu.inTerm(s.id, today)) box.append(ui.el("p", { class: "note", text: "It's the holidays." }));
					// The days of the week this (or the next school) week falls on.
					const monday = today - ((time.weekday(time.at(today, "12:00")) + 6) % 7);
					const ul = ui.el("ul", { class: "timetable" });
					for (let d = monday; d < monday + 7; d++) {
						const wd = time.weekday(time.at(d, "12:00"));
						if (!s.days.includes(wd)) continue;
						const rows = [
							...s.periods.map((p, i) => ({ at: p.from, text: registry.tryGet("subject", edu.timetableAt(s, d, i))?.label })),
							...s.breaks.map((b) => ({ at: b.from, text: b.label })),
						].filter((r) => r.text).sort((a, b) => time.parseHM(a.at) - time.parseHM(b.at));
						ul.append(ui.el("li", { class: d === today ? "today" : "" },
							ui.el("strong", { text: `${DAY_NAMES[wd]}${d === today ? " (today)" : ""}` }),
							ui.el("p", { text: rows.map((r) => `${r.at} ${r.text}`).join(" · ") })));
					}
					box.append(ul);
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
