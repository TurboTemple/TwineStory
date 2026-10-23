/*
 * shell.js — the UI shell (§8): sidebar and mobile top bar.
 *
 * StoryInterface (shell.twee) replaces SugarCube's default UI with:
 *   #topbar   (data-passage Sys_Topbar)  — phones: menu button, time, money
 *   #sidebar  (data-passage Sys_Sidebar) — portrait, time, money, stats,
 *                                         active effects, menu buttons
 *   #passages                             — the game
 * SugarCube re-renders data-passage regions after every passage and on
 * UI.update(), so the sidebar is always current.
 *
 * On wide screens the sidebar is a fixed column; on phones it's a drawer
 * opened from the top bar. Sections are registered, so modules can add more.
 */
(function () {
	"use strict";

	const OPEN_CLASS = "sidebar-open";

	(setup.__modules ??= []).push({
		id: "shell",
		version: 1,
		deps: [],

		install({ ui, fmt, time, flow, registry, config }) {
			/** @type {{name: string, order: number, fn: Function}[]} */
			const sections = [];
			const has = (id) => setup.modules.has(id);
			const close = () => document.documentElement.classList.remove(OPEN_CLASS);

			const shell = {
				/**
				 * Add a sidebar section. Lower order renders first.
				 * @param {string} name @param {number} order
				 * @param {(box: HTMLElement) => void} fn
				 */
				addSection(name, order, fn) {
					sections.push({ name, order, fn });
					sections.sort((a, b) => a.order - b.order);
				},
				/** Open/close the phone drawer. */
				toggle(force) {
					document.documentElement.classList.toggle(OPEN_CLASS, force);
				},
				close,
			};
			setup.shell = shell;

			const where = () => {
				const loc = has("world") ? setup.world.loc() : null;
				if (!loc) return "";
				return setup.world.chain(loc).reverse().map((id) => registry.get("location", id).name).join(" › ");
			};

			/* ---- Sections --------------------------------------------------- */

			shell.addSection("who", 0, (box) => {
				if (!has("character")) return;
				const c = setup.character;
				box.append(
					c.portrait(),
					ui.el("div", { class: "who-text" },
						ui.el("p", { class: "who-name", text: c.name() }),
						ui.el("p", { class: "who-meta", text: `${c.age()} · ${c.pronouns()}` })),
				);
			});

			shell.addSection("clock", 10, (box) => {
				const vars = setup.vars();
				if (!vars.time) return;
				const t = time.now();
				box.append(
					ui.el("p", { class: "clock-time", text: fmt.time(t) }),
					ui.el("p", { class: "clock-date", text: fmt.date(t) }),
				);
				const w = where();
				if (w) box.append(ui.el("p", { class: "clock-where", text: w }));
			});

			shell.addSection("money", 20, (box) => {
				if (!has("money") || !setup.money.enabled()) return;
				box.append(ui.el("h2", { text: "Money" }));
				const dl = ui.el("dl", { class: "money" });
				for (const a of registry.all("account").sort((x, y) => x.order - y.order)) {
					dl.append(ui.el("dt", { text: a.label }), ui.el("dd", { text: fmt.money(setup.money.balance(a.id)) }));
				}
				box.append(dl);
			});

			shell.addSection("stats", 30, (box) => {
				if (!has("stats")) return;
				const defs = setup.stats.defs().filter((d) => d.hud);
				if (!defs.length) return;
				box.append(ui.el("h2", { text: "Stats" }));
				const ul = ui.el("ul", { class: "stats" });
				for (const d of defs) {
					const v = setup.stats.get(d.id);
					const pct = Math.round(((v - d.min) / (d.max - d.min)) * 100);
					// How good is it? 0 = bad, 1 = good (flipped for stats where low is good).
					const goodness = d.good === "high" ? pct / 100 : 1 - pct / 100;
					const level = goodness < 0.25 ? "bad" : goodness < 0.5 ? "warn" : "ok";
					const bar = ui.el("div", { class: `bar bar-${level}`, attrs: { role: "meter", "aria-valuemin": d.min, "aria-valuemax": d.max, "aria-valuenow": Math.round(v), "aria-label": d.label } },
						ui.el("div", { class: "bar-fill", attrs: { style: `width:${pct}%` } }));
					ul.append(ui.el("li", { attrs: { title: d.desc || null } },
						ui.el("div", { class: "stat-row" }, ui.el("span", { text: d.label }), ui.el("span", { class: "stat-val", text: setup.stats.display(d.id) })),
						bar));
				}
				box.append(ul);
			});

			shell.addSection("effects", 40, (box) => {
				if (!has("status")) return;
				const list = setup.status.list().filter((s) => !s.def.hidden);
				box.append(ui.el("h2", { text: "Effects" }));
				if (!list.length) {
					box.append(ui.el("p", { class: "note", text: "Nothing right now." }));
					return;
				}
				const ul = ui.el("ul", { class: "chips" });
				for (const s of list) {
					const tone = s.def.good === true ? "good" : s.def.good === false ? "bad" : "neutral";
					const left = s.remaining != null ? ` · ${setup.status.shortDuration(s.remaining)}` : "";
					ul.append(ui.el("li", { class: `chip chip-${tone}`, text: `${s.label}${left}`, attrs: { title: s.def.desc || null } }));
				}
				box.append(ul);
			});

			shell.addSection("menu", 90, (box) => {
				const nav = ui.el("nav", { class: "menu", attrs: { "aria-label": "Game menu" } });
				const go = (label, passage) => ui.button(label, () => {
					close();
					flow.go(passage);
				});
				if (setup.sc.hasPassage("Character_Me") && setup.vars().pc) nav.append(go("Me", "Character_Me"));
				if (has("inventory") && setup.vars().inv) nav.append(go("Bag", "Inventory_Bag"));
				nav.append(
					ui.button("Saves", () => {
						close();
						setup.sc.openSaves();
					}),
					ui.button("Settings", () => {
						close();
						setup.sc.settings.open();
					}),
					ui.button("Restart", () => {
						close();
						setup.sc.restart();
					}),
				);
				if (config.debug && setup.sc.hasPassage("Test_Index")) {
					nav.append(ui.button("Debug", () => {
						close();
						flow.go("Test_Index");
					}));
				}
				box.append(nav);
			});

			/* ---- Views ------------------------------------------------------ */

			ui.view("sidebar", (box) => {
				box.classList.add("m-shell");
				box.append(ui.button("Close", close, { class: "sidebar-close" }));
				for (const s of sections) {
					const part = ui.el("section", { class: `side-${s.name}` });
					try {
						s.fn(part);
					}
					catch (err) {
						setup.reportError(err, `sidebar ${s.name}`);
					}
					if (part.childNodes.length) box.append(part);
				}
			});

			ui.view("topbar", (box) => {
				box.classList.add("m-shell");
				const parts = [];
				if (setup.vars().time) parts.push(fmt.time(time.now()));
				if (has("money") && setup.money.enabled()) parts.push(fmt.money(setup.money.balance()));
				box.append(
					ui.button("Menu", () => shell.toggle(true), { class: "menu-toggle", title: "Open the sidebar" }),
					ui.el("p", { class: "topbar-info", text: parts.join(" · ") }),
				);
			});
		},

		ready() {
			// The drawer closes when a passage changes or the backdrop is tapped.
			setup.sc.on(":passagestart", () => setup.shell.close());
			setup.sc.onClick("#sidebar-backdrop", () => setup.shell.close());
		},
	});
})();
