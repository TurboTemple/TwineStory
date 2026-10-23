/*
 * ============================================================================
 *  ui.js — building screens from code (setup.ui)
 * ============================================================================
 *
 * Most of what you see (the Here screen, the wardrobe, the phone…) is built
 * by JavaScript rather than written out in passages, because it comes from
 * the game's data. The pattern:
 *
 *   1. A module registers a named "view":
 *        ui.view("wardrobe", (box) => { box.append(ui.el("h2", { text: "…" })); });
 *   2. A passage shows it with the macro:
 *        :: Clothing_Wardrobe
 *        <<view "wardrobe">>
 *
 * Helpers:
 *   ui.el(tag, { class, text, attrs, on }, …children)   make any element
 *   ui.button(label, fn)    a real <button>
 *   ui.action(label, fn)    a button whose work runs through flow.perform(),
 *                           so the right screen shows afterwards (use this
 *                           for anything that changes the game)
 *   ui.result(result)       the summary box for an effects Result
 *   ui.notify(text)         a notice for the next Here screen ("Barista skill is now 5")
 */
(function () {
	"use strict";

	function createUi() {
		/** @type {Map<string, Function>} */
		const views = new Map();
		/** Notices waiting to be shown (not saved): level-ups, messages, … */
		let notices = [];

		const ui = {
			/**
			 * Create an element.
			 * @param {string} tag
			 * @param {{class?: string, text?: string, attrs?: object, on?: object}} [props]
			 * @param {...(Node|string|null)} children
			 * @returns {HTMLElement}
			 */
			el(tag, props = {}, ...children) {
				const node = document.createElement(tag);
				if (props.class) node.className = props.class;
				if (props.text != null) node.textContent = props.text;
				for (const [k, v] of Object.entries(props.attrs ?? {})) if (v != null && v !== false) node.setAttribute(k, v === true ? "" : v);
				for (const [k, fn] of Object.entries(props.on ?? {})) node.addEventListener(k, fn);
				for (const c of children) if (c != null) node.append(c);
				return node;
			},

			/**
			 * A real <button>.
			 * @param {string} label
			 * @param {() => void} onClick
			 * @param {{disabled?: boolean, class?: string, title?: string}} [opts]
			 */
			button(label, onClick, opts = {}) {
				return ui.el("button", {
					class: `btn ${opts.class ?? ""}`.trim(),
					text: label,
					attrs: { type: "button", disabled: opts.disabled, title: opts.title },
					on: { click: onClick },
				});
			},

			/**
			 * A button that runs `fn` through the flow controller, then navigates.
			 * @param {string} label @param {() => unknown} fn @param {object} [opts]
			 */
			action(label, fn, opts) {
				return ui.button(label, () => setup.flow.perform(fn), opts);
			},

			/**
			 * Render a passage's markup into an element.
			 * @param {HTMLElement} target @param {string} passage
			 */
			wiki(target, passage) {
				setup.sc.wikiPassage(target, passage);
			},

			/**
			 * Render a Result (from effects/actions) as a summary box.
			 * @param {object|null} result
			 * @returns {HTMLElement|null}
			 */
			result(result) {
				if (!result || typeof result !== "object") return null;
				const lines = [...(result.changes ?? []).map((c) => c.text), ...(result.toasts ?? [])].filter(Boolean);
				if (!lines.length) return null;
				// The action's picture or clip, if it has one.
				const pic = result.action && result.ok !== false ? setup.media.render("action", result.action, { class: "media-wide" }) : null;
				return ui.el("div", { class: "result", attrs: { role: "status" } }, pic, ui.el("ul", {}, ...lines.map((l) => ui.el("li", { text: l }))));
			},

			/**
			 * Queue a short notice ("Barista skill is now 5", "New message from
			 * Jess"). Shown with the next result on the Here screen.
			 * @param {string} text
			 */
			notify(text) {
				if (text && !notices.includes(text)) notices.push(text);
			},

			/** @returns {string[]} Pending notices, emptying the queue. */
			takeNotices() {
				const out = notices;
				notices = [];
				return out;
			},

			/**
			 * Register a named view.
			 * @param {string} name
			 * @param {(container: HTMLElement, args: unknown[]) => void} fn
			 */
			view(name, fn) {
				if (views.has(name)) throw new setup.GameError(`View "${name}" already registered`);
				views.set(name, fn);
			},

			/** @returns {boolean} */
			hasView: (name) => views.has(name),

			/** Render a view into a container. */
			render(name, container, args = []) {
				const fn = views.get(name);
				if (!fn) throw new setup.GameError(`Unknown view "${name}"`);
				fn(container, args);
			},

			/** Register the <<view>> macro. Called by boot. */
			install() {
				setup.sc.addMacro("view", {
					handler() {
						const name = this.args[0];
						const box = ui.el("div", { class: `view view-${name}` });
						this.output.append(box);
						try {
							ui.render(name, box, this.args.slice(1));
						}
						catch (err) {
							setup.reportError(err, `view ${name}`);
						}
					},
				});
			},
		};
		return ui;
	}

	setup.createUi = createUi;
})();
