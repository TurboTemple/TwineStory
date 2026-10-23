/*
 * world — districts, locations, opening hours and the `Here` main loop.
 * See README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "world",
		version: 1,
		deps: ["character"],
		state: "world",
		defaultState: () => ({ visited: {} }),

		install({ registry, cond, bus, time, ui, fmt, save }) {
			registry.defineType("district", { required: ["name"] });
			registry.defineType("location", {
				required: ["name"],
				defaults: { district: null, tags: [], desc: "", passage: null, hours: null, entry: null },
				refs: { district: "district" },
				passages: ["passage"],
				conditions: ["entry"],
				check(def) {
					const errs = [];
					for (const h of def.hours ?? []) {
						try {
							time.parseHM(h.from);
							time.parseHM(h.to);
						}
						catch (ex) {
							errs.push(`hours: ${ex.message}`);
						}
					}
					return errs;
				},
			});

			/** @type {{order: number, name: string, fn: Function}[]} */
			const sections = [];

			const world = {
				/** @returns {string|null} Current location id. */
				loc: () => setup.character.loc(),

				/** @returns {object|undefined} Current location definition. */
				here: () => registry.tryGet("location", setup.character.loc()),

				/**
				 * Is a location open at time t? `hours: null` means always open.
				 * hours: [{ days?: [0-6], from: "HH:MM", to: "HH:MM" }]
				 * @param {string} id @param {number} [t]
				 */
				isOpen(id, t = time.now()) {
					const def = registry.get("location", id);
					if (!def.hours) return true;
					return def.hours.some((h) => (!h.days || h.days.includes(time.weekday(t))) && time.isBetween(t, h.from, h.to));
				},

				/**
				 * Move the PC. Emits world:leave then world:enter.
				 * @param {string} id
				 */
				moveTo(id) {
					registry.get("location", id);
					const from = setup.character.loc();
					if (from) bus.emit("world:leave", { loc: from, to: id });
					setup.character.setLoc(id);
					const visited = setup.vars().world.visited;
					visited[id] = (visited[id] ?? 0) + 1;
					bus.emit("world:enter", { loc: id, from });
				},

				/**
				 * Add a section to the Here screen. Lower order renders first.
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

			// { at: "loc_id" } or { at: ["a", "b"] } — the PC is at one of these.
			cond.register("at", {
				test: (spec) => setup.util.toArray(spec).includes(world.loc()),
				describe: (spec) => `At ${setup.util.toArray(spec).map((id) => registry.tryGet("location", id)?.name ?? id).join(" or ")}`,
			});

			// { open: true } — current location is open; { open: "loc_id" } — that one is.
			cond.register("open", {
				test: (spec, ctx) => {
					const id = spec === true ? world.loc() : spec;
					return id != null && world.isOpen(id, ctx.t ?? time.now());
				},
				describe: (spec) => (spec === true ? "It's open" : `${registry.tryGet("location", spec)?.name ?? spec} is open`),
			});

			save.addMetadata(() => ({ where: world.here()?.name ?? "" }));

			/* ---- UI --------------------------------------------------------- */

			ui.view("here", (box) => {
				const here = world.here();
				box.classList.add("m-world");
				if (!here) {
					box.append(ui.el("p", { text: "Nothing is here yet. (No locations are loaded — try ?debug for the test content.)" }));
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

			world.addHereSection("status", 0, (box, here) => {
				const t = time.now();
				box.append(ui.el("p", { class: "status-line", text: `${fmt.date(t)} · ${fmt.time(t)} · ${here.name}` }));
			});

			world.addHereSection("result", 5, (box) => {
				const r = ui.result(setup.flow.lastResult());
				if (r) box.append(r);
			});

			world.addHereSection("description", 10, (box, here) => {
				box.append(ui.el("h1", { text: here.name }));
				if (here.passage) ui.wiki(box, here.passage);
				else if (here.desc) box.append(ui.el("p", { text: here.desc }));
				if (!world.isOpen(here.id)) box.append(ui.el("p", { class: "note", text: "It's closed right now." }));
			});
		},

		newGame() {
			// DESIGN: user to decide — how the start location is chosen. For now:
			// the first location tagged "start", if any.
			const start = setup.registry.byTag("location", "start")[0];
			if (start) setup.world.moveTo(start.id);
		},
	});
})();
