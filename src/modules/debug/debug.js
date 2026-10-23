/*
 * debug — debug-mode tools for testing the real game on a phone (§13).
 * Shown on the Debug_Tools passage, reached from Tests in the sidebar.
 *
 * Teleport anywhere, skip time, add money, set stats, and force or block
 * events. These change the game directly, so they're only offered with
 * ?debug in the URL.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "debug",
		version: 1,
		deps: ["world"],

		install({ ui, flow, time, registry, fmt, config }) {
			const has = (id) => setup.modules.has(id);

			const debug = {
				/** Jump to a location instantly (no travel time). */
				teleport(id) {
					flow.perform(() => setup.world.moveTo(id));
				},

				/** Advance the clock to the next given clock time. */
				skipTo(hm) {
					flow.perform(() => time.advance(time.nextAt(time.now() + 1, hm) - time.now(), { reason: "debug" }));
				},

				/** Advance the clock by minutes. */
				skip(mins) {
					flow.perform(() => time.advance(mins, { reason: "debug" }));
				},
			};
			setup.debugTools = debug;

			/** A labelled <select> plus a button that acts on its value. */
			const picker = (label, options, button, fn) => {
				const sel = ui.el("select", { attrs: { "aria-label": label } }, ...options.map(([v, t]) => ui.el("option", { text: t, attrs: { value: v } })));
				return ui.el("div", { class: "debug-row" }, ui.el("label", { text: label }), sel, ui.button(button, () => fn(sel.value)));
			};

			ui.view("debug-tools", (box) => {
				box.classList.add("m-debug");
				if (!config.debug) {
					box.append(ui.el("p", { text: "Debug tools need ?debug in the address." }));
					return;
				}
				box.append(ui.el("p", { class: "note", text: `Now: ${fmt.date(time.now())} ${fmt.time(time.now())}` }));

				box.append(ui.el("h2", { text: "Go anywhere" }));
				const locs = registry.all("location").map((l) => [l.id, setup.world.chain(l.id).reverse().map((id) => registry.get("location", id).name).join(" › ")]);
				box.append(picker("Place", locs.sort((a, b) => a[1].localeCompare(b[1])), "Go", (id) => debug.teleport(id)));

				box.append(ui.el("h2", { text: "Time" }));
				box.append(ui.el("div", {},
					...[["+15 min", 15], ["+1 hour", 60], ["+4 hours", 240], ["+1 day", 1440]].map(([t, m]) => ui.button(t, () => debug.skip(m))),
					...["07:00", "10:00", "13:00", "19:00"].map((hm) => ui.button(`Next ${hm}`, () => debug.skipTo(hm)))));

				if (has("money") && setup.money.enabled()) {
					box.append(ui.el("h2", { text: "Money" }));
					box.append(ui.el("div", {}, ...[500, 2000, 10000].map((p) => ui.button(`+${fmt.money(p)}`, () => flow.perform(() => setup.money.earn(p, { reason: "debug" }))))));
				}

				if (has("stats")) {
					box.append(ui.el("h2", { text: "Stats" }));
					const stats = setup.stats.defs().map((d) => [d.id, d.label]);
					for (const [label, value] of [["Set to 0", 0], ["Set to 50", 50], ["Set to 100", 100]]) {
						box.append(picker(label, stats, "Set", (id) => flow.perform(() => setup.stats.set(id, value))));
					}
				}

				if (has("events")) {
					box.append(ui.el("h2", { text: "Events" }));
					box.append(ui.el("p", { class: "note", text: "Force: fires whenever its conditions are met, ignoring chance and limits. Block: never fires." }));
					const evs = registry.all("storylet").map((s) => [s.id, `${s.id}${s.chance != null ? ` (${Math.round(s.chance * 100)}%)` : ""}`]);
					box.append(picker("Event", evs, "Force", (id) => flow.perform(() => setup.events.force(id, true))));
					box.append(picker("Event", evs, "Block", (id) => flow.perform(() => setup.events.force(id, false))));
					box.append(picker("Event", evs, "Back to normal", (id) => flow.perform(() => setup.events.force(id, null))));
				}

				box.append(ui.el("h2", { text: "Game data" }));
				box.append(ui.el("p", { class: "note", text: Object.entries(registry.counts()).map(([k, v]) => `${k}: ${v}`).join(" · ") }));
				box.append(ui.el("p", { class: "note", text: `Save size: about ${Math.round(JSON.stringify(setup.vars()).length / 1024)} KB` }));
				box.append(ui.button("Back to the game", () => flow.go(flow.home)));
			});
		},
	});
})();
