/*
 * ============================================================================
 *  sc-adapter.js — the one door to SugarCube (§2, §6.13)
 * ============================================================================
 *
 * SugarCube is the story format that runs the game in the browser: it shows
 * passages, keeps the story variables, saves and loads. Everything the game
 * needs from it goes through this file (and config.js), as setup.sc.*:
 *   setup.sc.vars()        the saved story variables
 *   setup.sc.play(name)    show a passage (only flow.js calls this)
 *   setup.sc.uiUpdate()    redraw the sidebar and top bar
 *   …and saves, dialogs, settings, macros, page events.
 *
 * Two reasons: if SugarCube changes an API name, it's a one-file fix here;
 * and the unit tests (which run in Node, without a browser) replace this
 * object with a stand-in, so the whole game can be tested without SugarCube.
 *
 * API names below were checked against the SugarCube 2.37.3 release source.
 * Anything not yet exercised in a real build is marked `// VERIFY:`.
 */
(function () {
	"use strict";

	const sc = {
		/* ---- State ------------------------------------------------------ */

		/** @returns {object} State.variables (story variables, saved). */
		vars() {
			return State.variables;
		},

		/** @returns {object} State.temporary (per-passage scratch, not saved). */
		temp() {
			return State.temporary;
		},

		/** @returns {string} Name of the passage currently being shown. */
		passage() {
			return State.passage;
		},

		/** @returns {boolean} Whether the seeded PRNG is active. */
		prngEnabled() {
			return State.prng.isEnabled();
		},

		/** @returns {number} A seeded random float in [0, 1). */
		random() {
			return State.random();
		},

		/* ---- Story ------------------------------------------------------ */

		/** @param {string} name @returns {boolean} */
		hasPassage(name) {
			return Story.has(name);
		},

		/** @param {string} name @returns {object} The Passage object. */
		getPassage(name) {
			return Story.get(name);
		},

		/**
		 * Navigate to a passage. Only the flow controller (§6.12) may call this.
		 * @param {string} name
		 */
		play(name) {
			Engine.play(name);
		},

		/* ---- UI --------------------------------------------------------- */

		/** Refresh `data-passage` regions in StoryInterface (2.37+). */
		uiUpdate() {
			UI.update();
		},

		/**
		 * Render a passage's markup into an element.
		 * @param {Element|jQuery} target
		 * @param {string} name
		 */
		wikiPassage(target, name) {
			jQuery(target).wikiPassage(name);
		},

		/**
		 * Open a dialog. `build` receives the dialog body element.
		 * @param {string} title
		 * @param {(body: HTMLElement) => void} build
		 * @param {string} [classNames]
		 */
		dialog(title, build, classNames) {
			Dialog.create(title, classNames);
			build(Dialog.body());
			Dialog.open();
		},

		/** Close the dialog if open. */
		dialogClose() {
			Dialog.close();
		},

		/**
		 * Show a dismissable banner at the top of the page. Used for debug
		 * validation errors (§13). Plain DOM, safe to call before the UI shell.
		 * @param {string} text
		 * @param {"error"|"info"} [kind]
		 */
		banner(text, kind = "info") {
			let host = document.getElementById("sys-banners");
			if (!host) {
				host = document.createElement("div");
				host.id = "sys-banners";
				document.body.prepend(host);
			}
			const el = document.createElement("div");
			el.className = `sys-banner sys-banner-${kind}`;
			el.setAttribute("role", kind === "error" ? "alert" : "status");
			const msg = document.createElement("span");
			msg.textContent = text;
			const close = document.createElement("button");
			close.type = "button";
			close.textContent = "Dismiss";
			close.setAttribute("aria-label", "Dismiss message");
			close.addEventListener("click", () => el.remove());
			el.append(msg, close);
			host.append(el);
		},

		/* ---- Saves ------------------------------------------------------ */

		/**
		 * Register a save-load handler. Receives the save object; its
		 * `state.history[i].variables` are the story variables of each moment.
		 * @param {(save: object) => void} fn
		 */
		onSaveLoad(fn) {
			// Checked in the 2.37.3 source: history is delta-decoded before handlers run.
			Save.onLoad.add(fn);
		},

		/**
		 * Register a save-write handler. Receives `(save, details)` where
		 * `details.type` is "autosave" | "slot" | "disk" | "serialize".
		 * @param {(save: object, details: {type: string}) => void} fn
		 */
		onSaveWrite(fn) {
			Save.onSave.add(fn);
		},

		/**
		 * Set the predicate that decides when autosaves are allowed (§6.10 hook).
		 * @param {null | ((type: number) => boolean)} fn
		 */
		setSaveAllowed(fn) {
			Config.saves.isAllowed = fn;
		},

		/**
		 * Set the function that returns readable metadata stored with each save.
		 * @param {() => object} fn
		 */
		setSaveMetadata(fn) {
			Config.saves.metadata = fn;
		},

		/** Open SugarCube's restart confirmation dialog. */
		restart() {
			UI.restart();
		},

		/** Open SugarCube's built-in saves dialog. */
		openSaves() {
			UI.saves();
		},

		/**
		 * Build a reviver for a class instance stored in state (§4.3). Avoid
		 * classes in state; this exists only for the rare unavoidable case.
		 * @param {string} code
		 * @param {unknown} [data]
		 */
		createReviver(code, data) {
			return Serial.createReviver(code, data);
		},

		/* ---- Settings --------------------------------------------------- */

		/** Register settings controls. See SugarCube's Setting API. */
		settings: {
			addHeader: (name, desc) => Setting.addHeader(name, desc),
			addToggle: (name, def) => Setting.addToggle(name, def),
			addList: (name, def) => Setting.addList(name, def),
			addRange: (name, def) => Setting.addRange(name, def),
			addValue: (name, def) => Setting.addValue(name, def), // VERIFY: options object shape
			/** @param {string} name */
			get: (name) => settings[name],
			/** @param {string} name @param {unknown} value */
			set(name, value) {
				settings[name] = value;
				Setting.save();
			},
			open: () => UI.settings(),
		},

		/* ---- Macros ----------------------------------------------------- */

		/**
		 * Define a macro. Check the name doesn't clash with a built-in first.
		 * @param {string} name
		 * @param {object} def  SugarCube macro definition ({ handler, tags?, skipArgs? }).
		 */
		addMacro(name, def) {
			Macro.add(name, def);
		},

		/**
		 * Define a macro in place of a built-in one of the same name (the
		 * deprecated <<choice>> is replaced by the story macro).
		 * @param {string} name @param {object} def
		 */
		replaceMacro(name, def) {
			if (Macro.has(name)) Macro.delete(name);
			Macro.add(name, def);
		},

		/**
		 * Render passage markup into an element (the contents of a <<when>>).
		 * @param {Element} target @param {string} source
		 */
		wiki(target, source) {
			jQuery(target).wiki(source);
		},

		/* ---- Events ----------------------------------------------------- */

		/**
		 * Listen to a SugarCube event (e.g. ":passagestart"). Handlers are
		 * namespaced with ".game" so they can be removed together.
		 * @param {string} event
		 * @param {(ev: object) => void} fn
		 */
		on(event, fn) {
			jQuery(document).on(`${event}.game`, fn);
		},

		/**
		 * Delegated click handler (namespaced ".game"), for elements that are
		 * re-rendered, like the StoryInterface regions.
		 * @param {string} selector
		 * @param {(ev: object) => void} fn
		 */
		onClick(selector, fn) {
			jQuery(document).on("click.game", selector, fn);
		},

		/**
		 * Load an external script (debug tools only).
		 * @param {string} url
		 * @returns {Promise<void>}
		 */
		loadScript(url) {
			return new Promise((resolve, reject) => {
				const el = document.createElement("script");
				el.src = url;
				el.async = true;
				el.onload = () => resolve();
				el.onerror = () => reject(new Error(`Failed to load ${url}`));
				document.head.append(el);
			});
		},
	};

	setup.sc = sc;

	/** Story variables accessor (§5.3). Node tests replace this with a stub. */
	setup.vars = () => sc.vars();
})();
