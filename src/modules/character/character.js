/*
 * character — the player character's identity and position ($pc).
 * See README.md.
 */
(function () {
	"use strict";

	/** Characters allowed in a name. */
	const NAME_MAX = 24;

	(setup.__modules ??= []).push({
		id: "character",
		version: 2,
		deps: [],
		state: "pc",
		defaultState: () => ({ name: "", pronouns: "they/them", portrait: null, loc: null }),
		migrations: {
			2: (slice) => ({ pronouns: "they/them", portrait: null, ...slice }),
		},

		install({ ui, flow, config }) {
			const pc = () => setup.vars().pc;

			const character = {
				/** @returns {string|null} Current location id. */
				loc: () => pc().loc,

				/**
				 * Set the current location. Use setup.world.moveTo() instead, which
				 * also fires the enter/leave events.
				 * @param {string|null} id
				 */
				setLoc(id) {
					pc().loc = id;
				},

				/** @returns {string} */
				name: () => pc().name || config.pc.defaultName,

				/** @returns {string} e.g. "she/her" */
				pronouns: () => pc().pronouns,

				/**
				 * Set name and pronouns (character creation).
				 * @param {{name?: string, pronouns?: string}} who
				 */
				setIdentity(who) {
					if (who.name != null) pc().name = String(who.name).trim().slice(0, NAME_MAX);
					if (who.pronouns != null) pc().pronouns = who.pronouns;
				},

				/**
				 * The PC's age. The PC is 18 at game start (§1). Ageing over time
				 * arrives with the date of birth.
				 * @returns {number}
				 */
				age: () => config.pc.startAge,

				/**
				 * Portrait for the sidebar: an image path in assets/ if one is set,
				 * otherwise a neutral placeholder with the PC's initial.
				 * @returns {HTMLElement}
				 */
				portrait() {
					const src = pc().portrait;
					if (src) return ui.el("img", { class: "portrait", attrs: { src, alt: `Portrait of ${character.name()}`, loading: "lazy" } });
					const initial = character.name().charAt(0).toUpperCase() || "?";
					const box = ui.el("div", { class: "portrait portrait-placeholder", attrs: { role: "img", "aria-label": `Portrait of ${character.name()}` } });
					box.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="38" r="20"/><path d="M14 96c4-22 18-32 36-32s32 10 36 32z"/></svg><span>${initial.replace(/[<>&"]/g, "")}</span>`;
					return box;
				},
			};
			setup.character = character;

			/* ---- New game screen -------------------------------------------- */

			ui.view("new-game", (box) => {
				box.classList.add("m-character");
				const nameInput = ui.el("input", { attrs: { id: "pc-name", type: "text", maxlength: NAME_MAX, autocomplete: "off", value: character.name() } });
				const pronounSelect = ui.el("select", { attrs: { id: "pc-pronouns" } },
					...config.pc.pronounOptions.map((p) => ui.el("option", { text: p, attrs: { value: p, selected: p === pc().pronouns } })));
				box.append(
					ui.el("label", { attrs: { for: "pc-name" }, text: "Your name" }), nameInput,
					ui.el("label", { attrs: { for: "pc-pronouns" }, text: "Pronouns" }), pronounSelect,
					ui.el("p", { class: "note", text: `You're ${character.age()}, in your final year at school in ${config.city}.` }),
					ui.button("Begin", () => {
						character.setIdentity({ name: nameInput.value || config.pc.defaultName, pronouns: pronounSelect.value });
						flow.go(flow.home);
					}, { class: "btn-primary" }),
				);
			});
		},
	});
})();
