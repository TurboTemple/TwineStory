/*
 * npcs — NPC character sheets, schedules and who is where.
 *
 * Every NPC definition is its character sheet. `age` is required; classmates
 * and students must be exactly 18 (§1).
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-people.js (every character sheet and schedule)
 *   src/content/mooresville/stories/story-*.js (the key story characters)
 *   src/story/mooresville/people.twee (what you see when you tap someone: Npc_<id>)
 * Every field, condition, effect and event is listed in src/modules/npcs/README.md.
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
				// ageKnown: false — the player doesn't know it (the sheet says "Unknown");
				// `age` is still required for the age rules.
				defaults: { pronouns: "they/them", role: "", tags: [], desc: "", home: null, schedule: [], body: {}, passage: null, ageKnown: true, online: false },
				refs: { home: "location", "schedule[].at": "location" },
				passages: ["passage"],
				check(def) {
					const errs = [];
					if (!Number.isInteger(def.age)) errs.push("age must be a whole number");
					const student = STUDENT_MARKERS.includes(def.role) || def.tags.some((t) => STUDENT_MARKERS.includes(t));
					if (student && def.age !== ADULT) errs.push(`classmates and students must be exactly ${ADULT}`);
					// Appearance values must be valid for the PC's body parts, if those exist.
					for (const [part, v] of Object.entries(def.body ?? {})) {
						const bp = registry.tryGet("bodyPart", part);
						if (!bp) continue;
						const ok = bp.kind === "choice" ? bp.options.includes(v) : bp.bands ? bp.bands.some((b) => b.label === v) : typeof v === "number";
						if (!ok) errs.push(`body.${part}: "${v}" isn't one of ${bp.label}'s options`);
					}
					for (const s of def.schedule) {
						if (!s.at || !s.from || !s.to) errs.push("each schedule entry needs at, from and to");
					}
					return errs;
				},
			});

			const N = () => setup.vars().npcs;
			/** Extra parts of the character sheet (relationship, Talk…). */
			const sheetSections = [];
			const meetSections = [];
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

				/** Where the sheet's Back button goes (not saved). */
				sheetBack: null,

				/** The NPC you're with in the world (tapped in "People here"; not saved). */
				with: null,

				/**
				 * Add a section to the screen you get when you tap someone in the
				 * world (e.g. relationships adds "Talk"). Lower order first.
				 * @param {string} name @param {number} order @param {(box: HTMLElement, id: string) => void} fn
				 */
				addMeetSection(name, order, fn) {
					meetSections.push({ name, order, fn });
					meetSections.sort((a, b) => a.order - b.order);
				},

				/**
				 * Go up to someone who's here: their picture, flavour text (passage
				 * "Npc_<id>", or the npc's `passage`) and what you can do with them.
				 * No character sheet (that's on the phone).
				 */
				approach(id) {
					npcs.with = id;
					flow.go("Npcs_Meet");
				},

				/**
				 * Add a section to NPC character sheets. Lower order first; the
				 * sheet's own details are order 0.
				 * @param {string} name @param {number} order @param {(box: HTMLElement, id: string) => void} fn
				 */
				addSheetSection(name, order, fn) {
					sheetSections.push({ name, order, fn });
					sheetSections.sort((a, b) => a.order - b.order);
				},

				/**
				 * Open an NPC's character sheet (from the phone's People app).
				 * @param {string} id @param {{back?: string}} [opts] back: the passage Back returns to
				 */
				openSheet(id, opts = {}) {
					npcs.viewing = id;
					npcs.sheetBack = opts.back ?? null;
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

			// { meet: "id" } — count as having met someone (e.g. an online friend).
			setup.effects.register("meet", {
				apply: (spec) => npcs.meet(spec),
				describe: (spec) => `You meet ${registry.tryGet("npc", spec)?.name ?? spec}`,
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
					list.append(ui.el("li", {}, ui.button(`${def.name}${def.role ? ` (${def.role})` : ""}`, () => npcs.approach(id))));
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
					const r = ui.result(flow.lastResult());
					if (r) box.append(r);
					const def = registry.get("npc", id);
					const where = npcs.whereIs(id);
					const rows = [
						["Age", def.ageKnown ? String(def.age) : "Unknown"],
						["Pronouns", def.pronouns],
						["Role", def.role || "—"],
						["Right now", def.online ? "Online" : where ? registry.tryGet("location", where)?.name ?? where : "Unknown"],
						["Met you", npcs.hasMet(id) ? "Yes" : "Not yet"],
					];
					// Profile picture: assets/media/npc/<id>.*
					const pic = setup.media.render("npc", id, { class: "portrait-large", alt: def.name });
					box.append(ui.el("div", { class: "profile-head" },
						pic ?? ui.el("span", { class: "portrait-large thumb-empty", text: def.name.charAt(0), attrs: { "aria-hidden": "true" } }),
						ui.el("h1", { text: def.name })));
					box.append(ui.el("dl", { class: "sheet" }, ...rows.flatMap(([k, v]) => [ui.el("dt", { text: k }), ui.el("dd", { text: v })])));
					if (def.desc) box.append(ui.el("p", { text: def.desc }));
					// Their body, part by part, each with its picture: assets/media/npc/<id>/<part>.*
					const parts = Object.entries(def.body);
					if (parts.length) {
						box.append(ui.el("h2", { text: "Appearance" }));
						const ul = ui.el("ul", { class: "parts" });
						for (const [part, value] of parts) {
							const label = registry.tryGet("bodyPart", part)?.label ?? part;
							ul.append(ui.el("li", { class: "inv-row" },
								setup.media.thumb("npc", id, label, { sub: part }),
								ui.el("span", { class: "inv-slot", text: `${label}: ` }),
								ui.el("span", { text: String(value) })));
						}
						box.append(ul);
					}
					for (const sec of sheetSections) {
						const part = ui.el("section", { class: `sheet-${sec.name}` });
						try {
							sec.fn(part, id);
						}
						catch (err) {
							setup.reportError(err, `npc sheet ${sec.name}`);
						}
						if (part.childNodes.length) box.append(part);
					}
				}
				box.append(ui.button("Back", () => flow.go(npcs.sheetBack ?? flow.home)));
			});

			// Tapping someone in the world: their picture, your flavour text and
			// what you can do with them (Talk…), then Leave.
			ui.view("npc-meet", (box) => {
				box.classList.add("m-npcs", "npc-meet");
				const id = npcs.with;
				const def = id ? registry.tryGet("npc", id) : null;
				if (!def || npcs.whereIs(id) !== setup.world.loc()) {
					box.append(ui.el("p", { class: "note", text: def ? `${def.name} isn't here any more.` : "No one's here." }));
					box.append(ui.button("Back", () => flow.go(flow.home), { class: "btn-primary" }));
					return;
				}
				box.append(ui.el("h1", { text: def.name }));
				if (def.role) box.append(ui.el("p", { class: "crumbs", text: def.role }));
				// The picture: assets/media/npc/<id>/here.* (a picture of them out and about), else their portrait.
				const pic = setup.media.render("npc", id, { sub: "here", class: "media-wide", alt: def.name }) ?? setup.media.render("npc", id, { class: "media-wide", alt: def.name });
				if (pic) box.append(pic);
				else box.append(setup.media.slot(`npc/${id}/here`));
				const text = ui.el("div", { class: "scene-text" });
				const passage = def.passage ?? `Npc_${id}`;
				if (setup.sc.hasPassage(passage)) ui.wiki(text, passage);
				else text.append(ui.el("p", { text: `[${def.name} edit here]` }));
				box.append(text);
				for (const sec of meetSections) {
					const part = ui.el("section", { class: `meet-${sec.name}` });
					try {
						sec.fn(part, id);
					}
					catch (err) {
						setup.reportError(err, `npc meet ${sec.name}`);
					}
					if (part.childNodes.length) box.append(part);
				}
				box.append(ui.button("Leave", () => flow.go(flow.home)));
			});
		},
	});
})();
