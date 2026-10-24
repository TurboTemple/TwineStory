/*
 * jobs — paid work, one shift at a time.
 *
 * A job is built on a storyline. The storyline's stages are the job's
 * career (hired → trainee → barista → …); the job says which stages you
 * work in (`workStages`) and the pay for each stage.
 *
 * Working a shift (decided by the user): be at the job's place while it's
 * open and tap "Work a shift". One tap works one whole shift (`shiftMins`,
 * e.g. 2 hours). There's no rota: work as many shifts as you like, as long
 * as the shift ends before the place closes. Halfway through, `job:shift`
 * fires so the stage's events (kind "pool") can happen. At the end you're
 * paid, the job's skill improves, the job's `effects` run (e.g. a random
 * outcome that adds to or takes from the skill) and the storyline's
 * "shifts" counter goes up.
 *
 * Events:
 *   job:shift     { job, storyline, stage, ctx, result, interrupt }  halfway through
 *   job:shiftEnd  { job, mins, pay }
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-work.js (the barista job)
 * Every field, condition, effect and event is listed in src/modules/jobs/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "jobs",
		version: 2,
		deps: ["storylines", "world", "money", "skills"],
		state: "job",
		defaultState: () => ({}),
		migrations: {
			// v2: shifts on demand, no rota, so nothing to remember per day.
			2: (slice) => {
				delete slice.worked;
			},
		},

		install({ registry, cond, effects, time, bus, ui, fmt }) {
			registry.defineType("job", {
				required: ["label", "at", "storyline", "workStages"],
				defaults: {
					desc: "", skill: null, skillPerShift: 0, pay: {}, payTo: null, shiftMins: 120,
					effects: [], status: null, perHour: [], quitStage: null, dressCode: null, order: 0, passage: null,
				},
				passages: ["passage"],
				refs: { at: "location", storyline: "storyline", skill: "skill", status: "statusEffect" },
				effects: ["effects", "perHour"],
				conditions: ["dressCode.when"],
				check(def) {
					const errs = [];
					for (const [s, p] of Object.entries(def.pay)) if (!Number.isInteger(p) || p < 0) errs.push(`pay.${s} must be whole pounds per hour`);
					if (!Number.isInteger(def.shiftMins) || def.shiftMins <= 0) errs.push("shiftMins must be a whole number of minutes");
					return errs;
				},
			});

			/** The shift being worked right now (not saved). */
			let running = null;

			const jobs = {
				/** @returns {object[]} Job definitions in order. */
				defs: () => registry.all("job").sort((a, b) => a.order - b.order),

				/** @returns {boolean} Whether the PC has this job (its storyline is in a work stage). */
				employed: (id) => registry.get("job", id).workStages.includes(setup.storylines.stage(registry.get("job", id).storyline)),

				/** @returns {object[]} Jobs the PC has. */
				current: () => jobs.defs().filter((j) => jobs.employed(j.id)),

				/** @returns {number} Whole pounds per hour at the current stage (0 if not set). */
				rate(id) {
					const j = registry.get("job", id);
					return j.pay[setup.storylines.stage(j.storyline)] ?? 0;
				},

				/** @returns {number} Whole pounds for one full shift at the current stage. */
				shiftPay: (id) => Math.round((jobs.rate(id) * registry.get("job", id).shiftMins) / 60),

				/**
				 * Can a shift be started now? The PC must have the job, be at its
				 * place, and the place must stay open for the whole shift.
				 * @returns {{ok: boolean, reason?: string}}
				 */
				canWork(id, t = time.now()) {
					const j = registry.get("job", id);
					if (!jobs.employed(id)) return { ok: false, reason: "You don't work here." };
					if (!setup.world.within(setup.world.loc(), j.at)) return { ok: false, reason: "You need to be at work." };
					if (!setup.world.isOpen(j.at, t)) return { ok: false, reason: "It's closed." };
					if (!setup.world.isOpen(j.at, t + j.shiftMins - 1)) return { ok: false, reason: `Not enough time for a shift (${fmt.duration(j.shiftMins)}) before closing.` };
					if (j.dressCode && !cond.test(j.dressCode.when, { job: id, t })) return { ok: false, reason: j.dressCode.text ?? "You're not dressed for work." };
					return { ok: true };
				},

				/** @returns {boolean} Whether a shift is being worked. */
				isWorking: () => running !== null,

				/**
				 * Work one shift.
				 * @param {string} id
				 * @returns {object} Result
				 */
				work(id) {
					const j = registry.get("job", id);
					const can = jobs.canWork(id);
					if (!can.ok) throw new setup.GameError(`Can't work "${id}" now: ${can.reason}`);
					const result = Object.assign(effects.newResult(), { ok: false });
					const line = j.storyline;
					const stage = setup.storylines.stage(line);

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
						const half = Math.floor(j.shiftMins / 2);
						const adv = time.advance(half, { reason: ctx.reason });
						elapsed += adv.elapsed;
						if (adv.interrupted) interrupted ??= adv.interrupted.reason;
						if (!interrupted) {
							ctx.t = time.now();
							bus.emit("job:shift", { job: id, storyline: line, stage, ctx: { ...ctx, elapsed }, result, interrupt: ctx.interrupt });
						}
						if (!interrupted) {
							const rest = time.advance(j.shiftMins - elapsed, { reason: ctx.reason });
							elapsed += rest.elapsed;
							if (rest.interrupted) interrupted ??= rest.interrupted.reason;
						}
					}
					finally {
						running = null;
						if (j.status) setup.status.remove(j.status);
					}

					// Paid for the time worked; a shift cut short doesn't count as a shift.
					const pay = Math.round((jobs.rate(id) * elapsed) / 60);
					result.changes.unshift({
						kind: "job",
						text: interrupted ? `You left your shift early, after ${fmt.duration(elapsed)}.` : `You worked a shift: ${fmt.duration(elapsed)}.`,
					});
					if (pay > 0) {
						setup.money.earn(pay, { to: j.payTo ?? undefined, reason: j.label });
						result.changes.push({ kind: "money", text: `Paid ${fmt.money(pay)}.` });
					}
					if (!interrupted) {
						const ectx = { ...ctx, t: time.now() };
						if (j.skill && j.skillPerShift) effects.run([{ skill: { [j.skill]: j.skillPerShift } }], ectx, result);
						if (j.effects.length) effects.run(j.effects, ectx, result);
						setup.storylines.addCount(line, "shifts");
					}
					result.ok = true;
					result.interrupted = interrupted || false;
					bus.emit("job:shiftEnd", { job: id, mins: elapsed, pay });
					setup.actions?.illustrate({ title: `Shift: ${j.label}`, media: { type: "job", id }, passage: j.passage ?? `Act_shift_${id}` });
					return result;
				},

				/** Leave a job: moves its storyline to `quitStage`. */
				quit(id) {
					const j = registry.get("job", id);
					if (!j.quitStage) throw new setup.GameError(`"${id}" has no quitStage`);
					return setup.storylines.moveTo(j.storyline, j.quitStage);
				},
			};
			setup.jobs = jobs;

			// Per-hour effects while working.
			bus.on("time:hour", () => {
				if (running && running.def.perHour.length) effects.run(running.def.perHour, running.ctx, running.result);
			});

			// { employed: "id" } — the PC has this job.
			// { employed: "id" } — that job; { employed: true } — any job.
			cond.register("employed", {
				test: (spec) => (spec === true ? jobs.current().length > 0 : jobs.employed(spec)),
				describe: (spec) => (spec === true ? "A job" : `You work as: ${registry.tryGet("job", spec)?.label ?? spec}`),
			});

			// { shiftOf: "id" } — during a shift of this job (ctx.job).
			cond.register("shiftOf", {
				test: (spec, ctx) => setup.util.toArray(spec).includes(ctx.job),
				describe: (spec) => `At work (${spec})`,
			});

			/* ---- UI --------------------------------------------------------- */

			setup.world.addHereSection("work", 28, (box, here) => {
				const mine = jobs.current().filter((j) => setup.world.within(here.id, j.at));
				for (const j of mine) {
					box.append(ui.el("h2", { text: "Work" }));
					const can = jobs.canWork(j.id);
					const pay = jobs.shiftPay(j.id);
					box.append(ui.action(`Work a shift (${fmt.duration(j.shiftMins)}${pay ? `, ${fmt.money(pay)}` : ""})`, () => jobs.work(j.id), { class: "btn-primary", disabled: !can.ok }));
					if (!can.ok) box.append(ui.el("p", { class: "note", text: can.reason }));
				}
			});

			setup.character.addMeSection("jobs", 37, (box) => {
				const list = jobs.current();
				if (!list.length) return;
				box.append(ui.el("h2", { text: "Work" }));
				for (const j of list) {
					const st = setup.storylines.stageDef(j.storyline);
					const rate = jobs.rate(j.id);
					const rows = [
						["Job", `${j.label}${st ? ` (${st.label})` : ""}`],
						["Pay", rate ? `${fmt.money(rate)} an hour` : "—"],
						["Shift", fmt.duration(j.shiftMins)],
						["Shifts worked", String(setup.storylines.count(j.storyline, "shifts"))],
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

		validate() {
			const errs = [];
			for (const j of setup.registry.all("job")) {
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
