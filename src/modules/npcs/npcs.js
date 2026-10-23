/*
 * npcs — NPC character sheets, schedules and who is where. See README.md.
 *
 * Every NPC definition is its character sheet. `age` is required; classmates
 * and students must be exactly 18 (§1).
 */
(function () {
	"use strict";

	const STUDENT_MARKERS = ["student", "classmate"];
	const ADULT = 18;

	(setup.__modules ??= []).push({
		id: "npcs",
		version: 1,
		deps: ["world"],
		state: "npcs",
		defaultState: () => ({}),

		install({ registry, cond, time, ui, flow }) {
			registry.defineType("npc", {
				required: ["name", "age"],
				defaults: { pronouns: "they/them", role: "", tags: [], desc: "", home: null, schedule: [], portrait: null, passage: null },
				refs: { home: "location", "schedule[].at": "location" },
				passages: ["passage"],
				check(def) {
					const errs = [];
					if (!Number.isInteger(def.age)) errs.push("age must be a whole number");
					const student = STUDENT_MARKERS.includes(def.role) || def.tags.some((t) => STUDENT_MARKERS.includes(t));
					if (student && def.age !== ADULT) errs.push(`classmates and students must be exactly ${ADULT}`);
					for (const s of def.schedule) {
						if (!s.at || !s.from || !s.to) errs.push("each schedule entry needs at, from and to");
					}
					return errs;
				},
			});

			const N = () => setup.vars().npcs;
			let cache = { t: null, map: null };

			const npcs = {
				/** @returns {object} The NPC definition (character sheet). */
				get: (id) => registry.get("npc", id),

				/**
				 * Where an NPC is at time t: an active override, else the first
				 * matching schedule entry, else their home (or null).
				 * Schedule entry: { days?: [0-6], from: "HH:MM", to: "HH:MM", at }
				 * @param {string} id @param {number} [t]
				 * @returns {string|null} Location id.
				 */
				whereIs(id, t = time.now()) {
					const o = N()[id]?.override;
					if (o && (o.until == null || t < o.until)) return o.at;
					const def = registry.get("npc", id);
					const slot = def.schedule.find((s) => (!s.days || s.days.includes(time.weekday(t))) && time.isBetween(t, s.from, s.to));
					return slot ? slot.at : def.home;
				},

				/**
				 * NPC ids at a location at time t (cached per time).
				 * @param {string} loc @param {number} [t]
				 * @returns {string[]}
				 */
				peopleAt(loc, t = time.now()) {
					if (cache.t !== t) {
						const map = new Map();
						for (const def of registry.all("npc")) {
							const at = npcs.whereIs(def.id, t);
							if (at) map.set(at, [...(map.get(at) ?? []), def.id]);
						}
						cache = { t, map };
					}
					return cache.map.get(loc) ?? [];
				},

				/**
				 * Put an NPC somewhere until a time (null = until cleared).
				 * @param {string} id @param {string|null} at @param {number|null} [until]
				 */
				setOverride(id, at, until = null) {
					npcs.state(id).override = at === null ? null : { at, until };
					cache.t = null;
				},

				/** @returns {object} This NPC's saved state, created on first use. */
				state(id) {
					registry.get("npc", id);
					return (N()[id] ??= { met: false });
				},

				/** @returns {boolean} */
				hasMet: (id) => Boolean(N()[id]?.met),

				/** Mark an NPC as met. */
				meet(id) {
					const s = npcs.state(id);
					if (!s.met) {
						s.met = true;
						s.metAt = time.now();
						setup.bus.emit("npc:met", { npc: id });
					}
				},

				/** The NPC whose sheet is open (not saved). */
				viewing: null,

				/** Open an NPC's character sheet. */
				openSheet(id) {
					npcs.viewing = id;
					flow.go("Npcs_Sheet");
				},
			};
			setup.npcs = npcs;

			// Decided by the user: the first encounter counts as meeting. An NPC is
			// met when the PC arrives where they are, or they are there as time passes.
			const meetEveryoneHere = (t) => {
				// Mid-journey you're not really at the place you left.
				if (setup.modules.has("travel") && setup.travel.isTravelling()) return;
				const loc = setup.world.loc();
				if (loc) for (const id of npcs.peopleAt(loc, t)) npcs.meet(id);
			};
			setup.bus.on("world:enter", () => meetEveryoneHere(time.now()));
			setup.bus.on("time:advanced", (p) => meetEveryoneHere(p.to));

			// { npcHere: "id" } — that NPC is at the PC's location right now.
			cond.register("npcHere", {
				test: (spec, ctx) => npcs.whereIs(spec, ctx.t ?? time.now()) === setup.world.loc(),
				describe: (spec) => `${registry.tryGet("npc", spec)?.name ?? spec} is here`,
			});

			// { npcAt: { npc, at } } — that NPC is at a location (or inside it) right now.
			cond.register("npcAt", {
				test(spec, ctx) {
					const where = npcs.whereIs(spec.npc, ctx.t ?? time.now());
					return where != null && setup.util.toArray(spec.at).some((a) => setup.world.within(where, a));
				},
				describe: (spec) => `${registry.tryGet("npc", spec.npc)?.name ?? spec.npc} is at ${setup.util.toArray(spec.at).map((a) => registry.tryGet("location", a)?.name ?? a).join(" or ")}`,
			});

			// { withNpc: "id" } — the NPC in context (e.g. the one just met, ctx.npc).
			cond.register("withNpc", {
				test: (spec, ctx) => setup.util.toArray(spec).includes(ctx.npc),
				describe: (spec) => `With ${registry.tryGet("npc", spec)?.name ?? spec}`,
			});

			// { npcMet: "id" } — the PC has met that NPC.
			cond.register("npcMet", {
				test: (spec) => npcs.hasMet(spec),
				describe: (spec) => `You have met ${registry.tryGet("npc", spec)?.name ?? spec}`,
			});

			// { ageAtLeast: 18 } — the PC and every NPC in the context (ctx.npc /
			// ctx.npcs) are at least this age. Required on romance content (§1).
			cond.register("ageAtLeast", {
				test(spec, ctx) {
					const min = typeof spec === "number" ? spec : spec.age;
					const ids = [...setup.util.toArray(ctx.npc), ...setup.util.toArray(ctx.npcs)];
					return setup.character.age() >= min && ids.every((id) => registry.get("npc", id).age >= min);
				},
				describe: (spec) => `Everyone involved is ${typeof spec === "number" ? spec : spec.age}+`,
			});

			/* ---- UI --------------------------------------------------------- */

			setup.world.addHereSection("people", 20, (box, here) => {
				const ids = npcs.peopleAt(here.id);
				if (!ids.length) return;
				box.append(ui.el("h2", { text: "People here" }));
				const list = ui.el("ul", { class: "m-npcs people" });
				for (const id of ids) {
					const def = registry.get("npc", id);
					list.append(ui.el("li", {}, ui.button(`${def.name}${def.role ? ` (${def.role})` : ""}`, () => npcs.openSheet(id))));
				}
				box.append(list);
			});

			ui.view("npc-sheet", (box) => {
				box.classList.add("m-npcs");
				const id = npcs.viewing;
				if (!id || !registry.has("npc", id)) {
					box.append(ui.el("p", { text: "No one selected." }));
				}
				else {
					const def = registry.get("npc", id);
					const where = npcs.whereIs(id);
					const rows = [
						["Age", String(def.age)],
						["Pronouns", def.pronouns],
						["Role", def.role || "—"],
						["Right now", where ? registry.tryGet("location", where)?.name ?? where : "Unknown"],
						["Met you", npcs.hasMet(id) ? "Yes" : "Not yet"],
					];
					box.append(
						ui.el("h1", { text: def.name }),
						ui.el("dl", { class: "sheet" }, ...rows.flatMap(([k, v]) => [ui.el("dt", { text: k }), ui.el("dd", { text: v })])),
					);
					if (def.desc) box.append(ui.el("p", { text: def.desc }));
					if (def.passage) ui.wiki(box, def.passage);
				}
				box.append(ui.button("Back", () => flow.go(flow.home)));
			});
		},
	});
})();
