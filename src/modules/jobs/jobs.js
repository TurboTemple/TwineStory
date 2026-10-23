/*
 * jobs — paid work: shifts, pay and missed shifts.
 *
 * A job is built on a storyline. The storyline's stages are the job's
 * career (hired → trainee → barista → …); the job says which stages you
 * work in (`workStages`), the pay for each stage and when the shifts are.
 *
 * Working a shift: be at the job's place during a shift and tap "Start your
 * shift". Time runs to the end of the shift; halfway through, `job:shift`
 * fires so the stage's events (kind "pool") can happen. At the end you're
 * paid, the job's skill improves, and the storyline's "shifts" counter goes
 * up. A shift you didn't turn up to adds to the "missed" counter.
 *
 * Events:
 *   job:shift     { job, storyline, stage, ctx, result, interrupt }  halfway through
 *   job:shiftEnd  { job, mins, pay }
 *   job:missed    { job, day }
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-work.js (the barista job)
 * Every field, condition, effect and event is listed in src/modules/jobs/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "jobs",
		version: 1,
		deps: ["storylines", "world", "money", "skills"],
		state: "job",
		defaultState: () => ({ worked: {} }),

		install({ registry, cond, effects, time, bus, ui, flow, fmt }) {
			registry.defineType("job", {
				required: ["label", "at", "storyline", "workStages"],
				defaults: {
					desc: "", skill: null, xpPerHour: 0, pay: {}, payTo: null, shifts: [], shiftHook: "fixed",
					earlyMins: 30, lateMins: 10, status: null, perHour: [], quitStage: null, order: 0,
				},
				refs: { at: "location", storyline: "storyline", skill: "skill", status: "statusEffect" },
				effects: ["perHour"],
				check(def) {
					const errs = [];
					for (const [s, p] of Object.entries(def.pay)) if (!Number.isInteger(p) || p < 0) errs.push(`pay.${s} must be whole pence per hour`);
					for (const sh of def.shifts) {
						if (!sh.from || !sh.to) errs.push("each shift needs from and to");
						else if (time.parseHM(sh.to) <= time.parseHM(sh.from)) errs.push(`shift ${sh.from}–${sh.to} must end later the same day`);
					}
					return errs;
				},
			});

			const J = () => setup.vars().job;
			const shiftHooks = new Map();
			/** The shift being worked right now (not saved). */
			let running = null;

			const jobs = {
				/** @returns {object[]} Job definitions in order. */
				defs: () => registry.all("job").sort((a, b) => a.order - b.order),

				/** @returns {boolean} Whether the PC has this job (its storyline is in a work stage). */
				employed: (id) => registry.get("job", id).workStages.includes(setup.storylines.stage(registry.get("job", id).storyline)),

				/** @returns {object[]} Jobs the PC has. */
				current: () => jobs.defs().filter((j) => jobs.employed(j.id)),

				/** @returns {number} Pence per hour at the current stage (0 if not set). */
				rate(id) {
					const j = registry.get("job", id);
					return j.pay[setup.storylines.stage(j.storyline)] ?? 0;
				},

				/**
				 * Shifts on a day, from the job's shift hook.
				 * @param {string} id @param {number} day
				 * @returns {{from: number, to: number, day: number}[]} absolute times
				 */
				shiftsOn(id, day) {
					const j = registry.get("job", id);
					return (shiftHooks.get(j.shiftHook)(j, day) ?? []).map((s) => ({ day, from: time.at(day, s.from), to: time.at(day, s.to) }));
				},

				/** @returns {boolean} Whether a shift on that day was worked. */
				worked: (id, day) => (J().worked[id] ?? []).includes(day),

				/**
				 * The shift that can be started now: today, between `earlyMins`
				 * before it starts and its end, and not already worked.
				 * @returns {{from: number, to: number, day: number}|null}
				 */
				shiftNow(id, t = time.now()) {
					const j = registry.get("job", id);
					const day = time.day(t);
					if (!jobs.employed(id) || jobs.worked(id, day)) return null;
					return jobs.shiftsOn(id, day).find((s) => t >= s.from - j.earlyMins && t < s.to) ?? null;
				},

				/**
				 * Upcoming shifts (not yet over and not worked), soonest first.
				 * @param {string} id @param {number} [days] How far ahead to look.
				 */
				upcoming(id, days = 14) {
					if (!jobs.employed(id)) return [];
					const now = time.now();
					const today = time.day(now);
					const out = [];
					for (let d = today; d < today + days; d++) {
						for (const s of jobs.shiftsOn(id, d)) if (s.to > now && !jobs.worked(id, d)) out.push(s);
					}
					return out;
				},

				/** @returns {boolean} Whether a shift is being worked. */
				isWorking: () => running !== null,

				/**
				 * Work the current shift through to its end.
				 * @param {string} id
				 * @returns {object} Result
				 */
				work(id) {
					const j = registry.get("job", id);
					const result = Object.assign(effects.newResult(), { ok: false });
					const shift = jobs.shiftNow(id);
					if (!shift) throw new setup.GameError(`No shift to start for "${id}" right now`);
					if (!setup.world.within(setup.world.loc(), j.at)) throw new setup.GameError(`You need to be at ${j.at} to work`);
					const line = j.storyline;
					const stage = setup.storylines.stage(line);

					// Early: wait for the start (unpaid).
					if (time.now() < shift.from) {
						const waited = time.advance(shift.from - time.now(), { reason: `job:${id}:early` }).elapsed;
						if (waited) result.changes.push({ kind: "job", text: `You got there early and waited ${fmt.duration(waited)} for your shift to start.` });
					}
					const lateBy = time.now() - shift.from;
					if (lateBy > j.lateMins) {
						setup.storylines.addCount(line, "late");
						result.changes.push({ kind: "job", text: `You were ${fmt.duration(lateBy)} late.` });
					}
					(J().worked[id] ??= []).push(shift.day);
					if (J().worked[id].length > 14) J().worked[id].shift();

					let interrupted = null;
					const ctx = { job: id, storyline: line, stage, loc: setup.world.loc(), t: time.now(), reason: `job:${id}` };
					ctx.interrupt = (reason) => {
						interrupted ??= reason || "interrupted";
						time.interrupt(interrupted);
					};
					running = { def: j, ctx, result };
					if (j.status) setup.status.add(j.status);
					let elapsed = 0;
					try {
						const total = shift.to - time.now();
						const half = Math.floor(total / 2);
						const adv = time.advance(half, { reason: ctx.reason });
						elapsed += adv.elapsed;
						if (adv.interrupted) interrupted ??= adv.interrupted.reason;
						if (!interrupted) {
							ctx.t = time.now();
							bus.emit("job:shift", { job: id, storyline: line, stage, ctx: { ...ctx, elapsed }, result, interrupt: ctx.interrupt });
						}
						if (!interrupted) {
							const rest = time.advance(shift.to - time.now(), { reason: ctx.reason });
							elapsed += rest.elapsed;
							if (rest.interrupted) interrupted ??= rest.interrupted.reason;
						}
					}
					finally {
						running = null;
						if (j.status) setup.status.remove(j.status);
					}

					const pay = Math.round((jobs.rate(id) * elapsed) / 60);
					result.changes.unshift({
						kind: "job",
						text: interrupted ? `You left your shift early, after ${fmt.duration(elapsed)}.` : `You worked your shift: ${fmt.duration(elapsed)}.`,
					});
					if (pay > 0) {
						setup.money.earn(pay, { to: j.payTo ?? undefined, reason: j.label });
						result.changes.push({ kind: "money", text: `Paid ${fmt.money(pay)}.` });
					}
					if (j.skill && j.xpPerHour) effects.run([{ skill: { [j.skill]: (j.xpPerHour * elapsed) / 60 } }], ctx, result);
					result.ok = true;
					result.interrupted = interrupted || false;
					setup.storylines.addCount(line, "shifts");
					bus.emit("job:shiftEnd", { job: id, mins: elapsed, pay });
					return result;
				},

				/** Leave a job: moves its storyline to `quitStage`. */
				quit(id) {
					const j = registry.get("job", id);
					if (!j.quitStage) throw new setup.GameError(`"${id}" has no quitStage`);
					return setup.storylines.moveTo(j.storyline, j.quitStage);
				},

				/**
				 * Register a shift pattern: (job, day) => [{ from: "HH:MM", to: "HH:MM" }].
				 * @param {string} name @param {Function} fn
				 */
				registerShiftHook: (name, fn) => shiftHooks.set(name, fn),

				/** @returns {boolean} */
				hasShiftHook: (name) => shiftHooks.has(name),
			};
			setup.jobs = jobs;

			// "fixed": the job's `shifts` list, each on its `days` (0 = Sunday).
			jobs.registerShiftHook("fixed", (j, day) => j.shifts.filter((s) => !s.days || s.days.includes(time.weekday(time.at(day, "00:00")))));

			// Per-hour effects while working.
			bus.on("time:hour", () => {
				if (running && running.def.perHour.length) effects.run(running.def.perHour, running.ctx, running.result);
			});

			// A new day: any shift yesterday that wasn't worked is a missed shift
			// (only shifts after you got the job count).
			bus.on("time:day", ({ day }) => {
				for (const j of jobs.current()) {
					const since = setup.vars().arcs[j.storyline]?.since ?? 0;
					const missed = jobs.shiftsOn(j.id, day - 1).filter((s) => s.from >= since);
					if (!missed.length || jobs.worked(j.id, day - 1)) continue;
					setup.storylines.addCount(j.storyline, "missed");
					ui.notify(`You missed your shift: ${j.label}.`);
					bus.emit("job:missed", { job: j.id, day: day - 1 });
				}
			});

			// { employed: "id" } — the PC has this job.
			cond.register("employed", {
				test: (spec) => jobs.employed(spec),
				describe: (spec) => `You work as: ${registry.tryGet("job", spec)?.label ?? spec}`,
			});

			// { shiftOf: "id" } — during a shift of this job (ctx.job).
			cond.register("shiftOf", {
				test: (spec, ctx) => setup.util.toArray(spec).includes(ctx.job),
				describe: (spec) => `At work (${spec})`,
			});

			/** "Sat 08:00–14:00" */
			const shiftText = (s) => `${time.WEEKDAYS[time.weekday(s.from)].slice(0, 3)} ${fmt.time(s.from)}–${fmt.time(s.to)}`;
			jobs.shiftText = shiftText;

			/* ---- UI --------------------------------------------------------- */

			setup.world.addHereSection("work", 28, (box, here) => {
				const mine = jobs.current().filter((j) => setup.world.within(here.id, j.at));
				for (const j of mine) {
					box.append(ui.el("h2", { text: "Work" }));
					const now = jobs.shiftNow(j.id);
					if (now) {
						const early = time.now() < now.from;
						box.append(ui.action(`Start your shift (until ${fmt.time(now.to)})`, () => jobs.work(j.id), { class: "btn-primary" }));
						box.append(ui.el("p", { class: "note", text: early ? `Your shift starts at ${fmt.time(now.from)}.` : `Your shift started at ${fmt.time(now.from)}.` }));
					}
					else {
						const next = jobs.upcoming(j.id)[0];
						box.append(ui.el("p", { class: "note", text: next ? `Your next shift: ${shiftText(next)}.` : "You've no shifts coming up." }));
					}
				}
			});

			setup.character.addMeSection("jobs", 37, (box) => {
				const list = jobs.current();
				if (!list.length) return;
				box.append(ui.el("h2", { text: "Work" }));
				for (const j of list) {
					const st = setup.storylines.stageDef(j.storyline);
					const next = jobs.upcoming(j.id)[0];
					const rate = jobs.rate(j.id);
					const rows = [
						["Job", `${j.label}${st ? ` (${st.label})` : ""}`],
						["Pay", rate ? `${fmt.money(rate)} an hour` : "—"],
						["Next shift", next ? shiftText(next) : "None"],
						["Shifts worked", String(setup.storylines.count(j.storyline, "shifts"))],
						["Shifts missed", String(setup.storylines.count(j.storyline, "missed"))],
					];
					box.append(ui.el("dl", { class: "sheet" }, ...rows.flatMap(([k, v]) => [ui.el("dt", { text: k }), ui.el("dd", { text: v })])));
					if (j.quitStage) {
						const confirm = ui.el("div", { class: "confirm", attrs: { hidden: true } },
							ui.el("p", { text: "Are you sure? You'd have to find another job." }),
							ui.action("Yes, quit", () => jobs.quit(j.id), { class: "btn-danger" }));
						box.append(ui.button("Hand in your notice", () => confirm.removeAttribute("hidden")), confirm);
					}
				}
			});
		},

		ready() {
			// Shifts in the phone's calendar.
			if (!setup.modules.has("phone")) return;
			setup.phone.addCalendarSource((from, to) => setup.jobs.current().flatMap((j) => {
				const out = [];
				for (let d = setup.time.day(from); d <= setup.time.day(to - 1); d++) {
					for (const s of setup.jobs.shiftsOn(j.id, d)) out.push({ t: s.from, end: s.to, text: `Shift: ${j.label}${setup.jobs.worked(j.id, d) ? " (done)" : ""}` });
				}
				return out;
			}));
		},

		validate() {
			const errs = [];
			for (const j of setup.registry.all("job")) {
				if (!setup.jobs.hasShiftHook(j.shiftHook)) errs.push(`job "${j.id}": unknown shift hook "${j.shiftHook}"`);
				const line = setup.registry.tryGet("storyline", j.storyline);
				const stages = new Set(line?.stages.map((s) => s.id) ?? []);
				for (const s of [...j.workStages, ...Object.keys(j.pay), ...(j.quitStage ? [j.quitStage] : [])]) {
					if (line && !stages.has(s)) errs.push(`job "${j.id}": storyline "${j.storyline}" has no stage "${s}"`);
				}
			}
			return errs;
		},
	});
})();
