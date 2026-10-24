/*
 * character — the player character's identity and position ($pc).
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/01-engine/config.js → pc (starting age, default name, pronoun choices)
 * Every field, condition, effect and event is listed in src/modules/character/README.md.
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
					// assets/media/pc/portrait.*, else a path saved on the character.
					const m = setup.media.byKey("pc/portrait") ?? setup.media.normalise(pc().portrait);
					if (m) return setup.media.element(m, { class: "portrait", alt: `Portrait of ${character.name()}` });
					const initial = character.name().charAt(0).toUpperCase() || "?";
					const box = ui.el("div", { class: "portrait portrait-placeholder", attrs: { role: "img", "aria-label": `Portrait of ${character.name()}` } });
					box.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="38" r="20"/><path d="M14 96c4-22 18-32 36-32s32 10 36 32z"/></svg><span>${initial.replace(/[<>&"]/g, "")}</span>`;
					return box;
				},
			};
			setup.character = character;

			/* ---- The profile (sidebar Profile tab) ---------------------------- */

			/** @type {{name: string, order: number, fn: Function}[]} */
			const meSections = [];

			/**
			 * Add a section to the profile (sidebar Profile tab: body, clothes, …). Lower order first.
			 * @param {string} name @param {number} order @param {(box: HTMLElement) => void} fn
			 */
			character.addMeSection = (name, order, fn) => {
				meSections.push({ name, order, fn });
				meSections.sort((a, b) => a.order - b.order);
			};

			/**
			 * Draw the full profile (portrait, then every Me section) into a box.
			 * Shown in the sidebar's Profile tab.
			 */
			character.renderMe = (box) => {
				box.classList.add("m-character", "profile");
				box.append(ui.el("div", { class: "profile-head" },
					character.portrait(),
					ui.el("div", {},
						ui.el("p", { class: "who-name", text: character.name() }),
						ui.el("p", { class: "note", text: `${character.age()} · ${character.pronouns()}` }))));
				for (const s of meSections) {
					const part = ui.el("section", { class: `me-${s.name}` });
					try {
						s.fn(part);
					}
					catch (err) {
						setup.reportError(err, `me ${s.name}`);
					}
					if (part.childNodes.length) box.append(part);
				}
			};

			/* ---- New game screen -------------------------------------------- */

			ui.view("new-game", (box) => {
				box.classList.add("m-character");
				const nameInput = ui.el("input", { attrs: { id: "pc-name", type: "text", maxlength: NAME_MAX, autocomplete: "off", value: character.name() } });
				const pronounSelect = ui.el("select", { attrs: { id: "pc-pronouns" } },
					...config.pc.pronounOptions.map((p) => ui.el("option", { text: p, attrs: { value: p, selected: p === pc().pronouns } })));
				// Appearance fields come from the body module, if it's installed.
				const looks = setup.modules.has("body") ? setup.body.creationFields() : { elements: [], save() {} };
				box.append(
					ui.el("label", { attrs: { for: "pc-name" }, text: "Your name" }), nameInput,
					ui.el("label", { attrs: { for: "pc-pronouns" }, text: "Pronouns" }), pronounSelect,
				);
				if (looks.elements.length) box.append(ui.el("h2", { text: "Appearance" }), ...looks.elements);
				box.append(
					ui.el("p", { class: "note", text: `You're ${character.age()}, in your final year at school in ${config.city}.` }),
					ui.button("Begin", () => {
						character.setIdentity({ name: nameInput.value || config.pc.defaultName, pronouns: pronounSelect.value });
						looks.save();
						flow.go(flow.home);
					}, { class: "btn-primary" }),
				);
			});
		},
	});
})();
