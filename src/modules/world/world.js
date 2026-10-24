/*
 * world — districts, locations (with sub-locations), opening hours and the
 * `Here` main loop.
 *
 * A location with a `parent` is a sub-location (a bar's toilets, a shop's
 * fitting rooms). The top-level ancestor is the "site": travel goes between
 * sites, and moving around inside a site takes `innerMins`.
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-map.js (districts, places, rooms, atmosphere)
 *   src/story/mooresville/locations.twee (each place's text)
 * Every field, condition, effect and event is listed in src/modules/world/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "world",
		version: 1,
		deps: ["character"],
		state: "world",
		defaultState: () => ({ visited: {} }),

		install({ registry, cond, effects, bus, time, ui, flow, fmt, text, save, config }) {
			registry.defineType("district", { required: ["name"], defaults: { desc: "" } });
			registry.defineType("location", {
				required: ["name"],
				defaults: { district: null, parent: null, innerMins: 1, tags: [], desc: "", passage: null, hours: null, entry: null, dressCode: null, crowd: [], links: null, roomsLabel: null, outdoor: false, ambient: [] },
				refs: { district: "district", parent: "location", links: "location" },
				passages: ["passage"],
				conditions: ["entry", "dressCode.when", "crowd[].when", "ambient[].when"],
				check(def) {
					const errs = [];
					if (!def.ambient.every((a) => typeof a === "string" || typeof a?.text === "string")) errs.push('ambient lines must be text or { text, when }');
					for (const h of def.hours ?? []) {
						try {
							time.parseHM(h.from);
							time.parseHM(h.to);
						}
						catch (ex) {
							errs.push(`hours: ${ex.message}`);
						}
					}
					if (!Number.isInteger(def.innerMins) || def.innerMins < 0) errs.push("innerMins must be whole minutes ≥ 0");
					// Parent chains must end (no loops).
					const seen = new Set([def.id]);
					for (let p = def.parent; p; p = registry.tryGet("location", p)?.parent) {
						if (seen.has(p)) {
							errs.push("parent chain loops");
							break;
						}
						seen.add(p);
					}
					// `links` are doors inside one building: each must be in the same
					// place (going to another place is travel, not a door).
					const siteOf = (id) => {
						let cur = id;
						for (let i = 0; i < 20 && registry.tryGet("location", cur)?.parent; i++) cur = registry.tryGet("location", cur).parent;
						return cur;
					};
					for (const l of def.links ?? []) {
						if (registry.has("location", l) && siteOf(l) !== siteOf(def.id)) errs.push(`links: "${l}" is in another place (${siteOf(l)}); links only join rooms of the same place`);
						if (l === def.id) errs.push("links: a room can't link to itself");
					}
					return errs;
				},
			});

			/** @type {{order: number, name: string, fn: Function}[]} */
			const sections = [];
			const L = (id) => registry.get("location", id);

			const world = {
				/** @returns {string|null} Current location id. */
				loc() {
					// A saved location that has since been merged into another
					// (R.alias) moves to the new one.
					const id = setup.character.loc();
					const real = id ? registry.tryGet("location", id)?.id : null;
					if (real && real !== id) setup.character.setLoc(real);
					return real ?? id;
				},

				/** @returns {object|undefined} Current location definition. */
				here: () => registry.tryGet("location", world.loc()),

				/** @returns {object|null} The parent location, if any. */
				parent: (id) => (L(id).parent ? L(L(id).parent) : null),

				/** @returns {object[]} Sub-locations directly inside a location. */
				children: (id) => registry.query("location", (d) => d.parent === id),

				/** @returns {string[]} [id, parent, grandparent, …] up to the site. */
				chain(id) {
					const out = [];
					for (let p = id; p; p = L(p).parent) out.push(p);
					return out;
				},

				/** @returns {string} The top-level location (site) containing `id`. */
				site: (id) => world.chain(id).at(-1),

				/**
				 * A line of atmosphere for a place: one of its `ambient` lines whose
				 * `when` condition passes (weather, time, how you feel…). The same
				 * line stays for the hour, so it doesn't change on every tap.
				 * @returns {string|null}
				 */
				ambientLine(id, t = time.now()) {
					const ctx = { t, loc: id };
					const lines = L(id).ambient.map((a) => (typeof a === "string" ? { text: a } : a)).filter((a) => cond.test(a.when ?? null, ctx));
					if (!lines.length) return null;
					// Lines with a condition are about right now, so they come first.
					const specific = lines.filter((a) => a.when);
					const pool = specific.length ? specific : lines;
					return setup.rng.seeded(`ambient:${id}:${time.day(t)}:${time.hour(t)}`).pick(pool).text;
				},

				/** @returns {boolean} Whether `inner` is `outer` or inside it. */
				within: (inner, outer) => world.chain(inner).includes(outer),

				/** @returns {number} Minutes to walk from `id` out to its site. */
				exitMins: (id) => world.chain(id).slice(0, -1).reduce((sum, p) => sum + L(p).innerMins, 0),

				/**
				 * Is a location open at time t? A location without its own `hours`
				 * follows its parent; `hours: null` all the way up means always open.
				 * hours: [{ days?: [0-6], from: "HH:MM", to: "HH:MM" }]
				 * @param {string} id @param {number} [t]
				 */
				isOpen(id, t = time.now()) {
					for (const p of world.chain(id)) {
						const hours = L(p).hours;
						if (hours) return hours.some((h) => (!h.days || h.days.includes(time.weekday(t))) && time.isBetween(t, h.from, h.to));
					}
					return true;
				},

				/**
				 * Opening hours for display, from the location or its parent.
				 * @returns {object[]|null}
				 */
				hoursOf(id) {
					for (const p of world.chain(id)) if (L(p).hours) return L(p).hours;
					return null;
				},

				/**
				 * Move the PC instantly. Emits world:leave then world:enter.
				 * @param {string} id
				 */
				moveTo(id) {
					L(id);
					const from = setup.character.loc();
					if (from) bus.emit("world:leave", { loc: from, to: id });
					setup.character.setLoc(id);
					const visited = setup.vars().world.visited;
					visited[id] = (visited[id] ?? 0) + 1;
					bus.emit("world:enter", { loc: id, from });
				},

				/**
				 * How busy a place is now: the first of its `crowd` entries whose
				 * condition is true, e.g. { when: { time: … }, level: "busy", text: "It's packed." }.
				 * Rooms without their own `crowd` use their parent's.
				 * @returns {{level: string, text?: string}|null}
				 */
				crowd(id = world.loc(), t = time.now()) {
					for (const p of world.chain(id)) {
						const list = L(p).crowd;
						if (list.length) return list.find((c) => cond.test(c.when ?? true, { loc: id, t })) ?? null;
					}
					return null;
				},

				/**
				 * A place's dress code: `dressCode: { when: CONDITION, text }`.
				 * @returns {string[]} Its `text` if what you're wearing doesn't pass, else [].
				 */
				dressCodeBlocks(id) {
					const dc = L(id).dressCode;
					if (!dc || cond.test(dc.when, { loc: id, t: time.now() })) return [];
					return [dc.text ?? cond.explain(dc.when, {}).filter((e) => !e.ok).map((e) => e.text).join("; ")];
				},

				/**
				 * The rooms (and entrance) you can walk to straight from a location.
				 * A location with `links` connects to exactly those (and to any
				 * location whose `links` name it: links work both ways). Without
				 * `links`, it connects to its parent and the rooms inside it.
				 * @returns {string[]}
				 */
				neighbours(id) {
					const def = L(id);
					const out = def.links ? [...def.links] : [...(def.parent ? [def.parent] : []), ...world.children(id).map((c) => c.id)];
					for (const other of registry.all("location")) if (other.links?.includes(id)) out.push(other.id);
					return [...new Set(out)].filter((x) => x !== id);
				},

				/**
				 * Places you can walk to inside this site from here (see
				 * neighbours()), each with why it's locked (if it is).
				 * @returns {{def: object, kind: "out"|"in"|"side", mins: number, ok: boolean, reasons: string[]}[]}
				 */
				nearby() {
					const here = world.here();
					if (!here) return [];
					const out = [];
					const add = (def, kind) => {
						const reasons = [];
						if (kind !== "out") {
							if (!world.isOpen(def.id)) reasons.push("It's closed");
							const ctx = { loc: def.id, t: time.now() };
							if (!cond.test(def.entry, ctx)) reasons.push(...cond.explain(def.entry, ctx).filter((e) => !e.ok).map((e) => e.text));
							reasons.push(...world.dressCodeBlocks(def.id));
						}
						const mins = kind === "out" ? here.innerMins : def.innerMins;
						out.push({ def, kind, mins, ok: !reasons.length, reasons });
					};
					for (const id of world.neighbours(here.id)) {
						add(L(id), id === here.parent ? "out" : L(id).parent === here.id ? "in" : "side");
					}
					return out;
				},

				/**
				 * Walk to another area of the same site (see nearby()).
				 * @param {string} id
				 * @returns {object} Result
				 */
				walkTo(id) {
					const target = world.nearby().find((n) => n.def.id === id);
					if (!target) throw new setup.GameError(`Can't walk to ${id} from ${world.loc()}`);
					const result = effects.newResult();
					if (!target.ok) {
						result.changes.push({ kind: "blocked", text: `${target.def.name}: ${target.reasons.join("; ")}` });
						return result;
					}
					if (target.mins) time.advance(target.mins, { reason: "walk" });
					world.moveTo(id);
					return result;
				},

				/**
				 * Add a section to the Here screen. Lower order renders first.
				 *
				 * The Here screen (the main screen for wherever you are) is built
				 * from sections that different modules add, top to bottom:
				 *     5  result       what just happened, and notices    (world)
				 *    10  description  picture, name, text, atmosphere     (world)
				 *    12  cityevents   "On now: the Saturday market"       (cityevents)
				 *    15  school       "Attend school", the day's lessons  (education)
				 *    20  people       who's here                          (npcs)
				 *    25  areas        rooms you can walk to               (world)
				 *    28  work         "Work a shift"                      (jobs)
				 *    28  shops        "Browse …"                          (shops)
				 *    29  lettings     flats to rent                       (housing)
				 *    30  actions      "Things to do"                      (actions)
				 *    32  wardrobe     "Get changed"                       (clothing)
				 *    40  travel       "Go to" buttons                     (travel)
				 * @param {string} name
				 * @param {number} order
				 * @param {(box: HTMLElement, here: object) => void} fn
				 */
				addHereSection(name, order, fn) {
					sections.push({ name, order, fn });
					sections.sort((a, b) => a.order - b.order);
				},
			};
			setup.world = world;

			// Closing time: whenever the clock moves, if you're in a room of a place
			// that has just closed, you're shown out to the street-level place,
			// and "world:closed" lets an event explain what happened.
			bus.on("time:advanced", () => {
				const loc = world.loc();
				if (!loc || !L(loc).parent || world.isOpen(loc)) return;
				const site = world.site(loc);
				world.moveTo(site);
				bus.emit("world:closed", { loc, site });
			});

			// { at: "loc_id" } or { at: ["a", "b"] } — the PC is at (or inside) one of these.
			cond.register("at", {
				test: (spec) => world.loc() != null && setup.util.toArray(spec).some((id) => world.within(world.loc(), id)),
				describe: (spec) => `At ${setup.util.toArray(spec).map((id) => registry.tryGet("location", id)?.name ?? id).join(" or ")}`,
			});

			// { crowd: "busy" } — how busy where you are is (its `crowd` level).
			cond.register("crowd", {
				test: (spec) => setup.util.toArray(spec).includes(world.crowd()?.level),
				describe: (spec) => `It's ${setup.util.toArray(spec).join(" or ")} here`,
			});

			// { open: true } — current location is open; { open: "loc_id" } — that one is.
			cond.register("open", {
				test: (spec, ctx) => {
					const id = spec === true ? world.loc() : spec;
					return id != null && world.isOpen(id, ctx.t ?? time.now());
				},
				describe: (spec) => (spec === true ? "It's open" : `${registry.tryGet("location", spec)?.name ?? spec} is open`),
			});

			// { moveTo: "loc_id" } — put the PC somewhere (e.g. after an interrupted journey).
			effects.register("moveTo", {
				apply(spec, ctx, result) {
					world.moveTo(spec);
					result.changes.push({ kind: "move", text: `You're now at ${L(spec).name}.` });
				},
				describe: (spec) => `Go to ${registry.tryGet("location", spec)?.name ?? spec}`,
			});

			save.addMetadata(() => ({ where: world.here()?.name ?? "" }));

			/* ---- UI --------------------------------------------------------- */

			ui.view("here", (box) => {
				const here = world.here();
				box.classList.add("m-world");
				if (!here) {
					box.append(ui.el("p", { text: "There's nowhere to be yet." }));
					return;
				}
				for (const s of sections) {
					const part = ui.el("section", { class: `here-${s.name}` });
					try {
						s.fn(part, here);
					}
					catch (err) {
						setup.reportError(err, `here section ${s.name}`);
					}
					if (part.childNodes.length) box.append(part);
				}
			});

			world.addHereSection("result", 5, (box) => {
				const r = ui.result(flow.lastResult());
				if (r) box.append(r);
				const notes = ui.takeNotices();
				if (notes.length) box.append(ui.el("div", { class: "result notices", attrs: { role: "status" } }, ui.el("ul", {}, ...notes.map((n) => ui.el("li", { text: n })))));
			});

			world.addHereSection("description", 10, (box, here) => {
				const crumbs = world.chain(here.id).slice(1).reverse().map((id) => L(id).name);
				if (crumbs.length) box.append(ui.el("p", { class: "crumbs", text: crumbs.join(" › ") }));
				const pic = setup.media.render("location", here.id, { class: "media-wide", alt: here.name });
				if (pic) box.append(pic);
				box.append(ui.el("h1", { text: here.name }));
				if (here.passage) ui.wiki(box, here.passage);
				else if (here.desc) box.append(ui.el("p", { text: here.desc }));
				const line = world.ambientLine(here.id);
				if (line) box.append(ui.el("p", { class: "ambient", text: line }));
				const crowd = world.crowd(here.id);
				if (crowd?.text) box.append(ui.el("p", { class: "ambient crowd", text: crowd.text }));
				if (!world.isOpen(here.id)) {
					const hours = world.hoursOf(here.id);
					const today = hours?.filter((h) => !h.days || h.days.includes(time.weekday(time.now())));
					const when = today?.length ? ` Today: ${today.map((h) => `${h.from}–${h.to}`).join(", ")}.` : " Not open today.";
					box.append(ui.el("p", { class: "note", text: `It's closed right now.${when}` }));
				}
			});

			// Map app (for the phone): every place by district, open or closed now.
			ui.view("app-map", (box) => {
				const now = time.now();
				const mySite = world.loc() ? world.site(world.loc()) : null;
				for (const d of registry.all("district")) {
					const sites = registry.query("location", (l) => !l.parent && l.district === d.id);
					if (!sites.length) continue;
					box.append(ui.el("h2", { text: d.name }));
					box.append(ui.el("ul", { class: "map-list" }, ...sites.map((l) => {
						const hours = world.hoursOf(l.id);
						const today = hours?.filter((h) => !h.days || h.days.includes(time.weekday(now))) ?? null;
						const when = !hours ? "Always open" : today.length ? today.map((h) => `${h.from}–${h.to}`).join(", ") : "Closed today";
						const open = world.isOpen(l.id, now);
						return ui.el("li", { class: l.id === mySite ? "map-here" : null },
							ui.el("strong", { text: l.name }), l.id === mySite ? " (you're here)" : "",
							ui.el("p", { class: "note", text: `${hours ? (open ? "Open now" : "Closed now") + " · " : ""}${when}` }));
					})));
				}
			});

			world.addHereSection("areas", 25, (box) => {
				const list = world.nearby();
				if (!list.length) return;
				box.append(ui.el("h2", { text: world.here()?.roomsLabel ?? "Around here" }));
				const ul = ui.el("ul", { class: "areas chips" });
				// Already said at the top of the page when the whole place is shut.
				const closed = !world.isOpen(world.loc());
				// Why rooms are locked, said once under the buttons: "Library, Sports Hall: Between 15:00 and 17:00".
				const locked = new Map();
				for (const n of list) {
					const label = n.kind === "out" ? `Back to ${n.def.name}` : n.def.name;
					ul.append(ui.el("li", {}, ui.action(label, () => world.walkTo(n.def.id), { disabled: !n.ok })));
					const why = (closed ? n.reasons.filter((r) => r !== "It's closed") : n.reasons).join("; ");
					if (!n.ok && why) locked.set(why, [...(locked.get(why) ?? []), n.def.name]);
				}
				box.append(ul);
				for (const [why, names] of locked) box.append(ui.el("p", { class: "locked", text: `${text.list(names)}: ${why}` }));
			});
		},

		newGame() {
			// The configured start location, else the first location tagged "start".
			const R = setup.registry;
			const start = R.tryGet("location", setup.config.startLocation) ?? R.byTag("location", "start")[0];
			if (start) setup.world.moveTo(start.id);
		},
	});
})();
