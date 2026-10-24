/*
 * writing — tools for writing story passages without code.
 *
 * These macros use the same conditions and effects as the content files
 * (EDITING.md lists them all), written straight into a passage:
 *
 *   <<when { stat: { id: "mood", min: 60 } }>>You feel great.
 *   <<orwhen { status: "tipsy" }>>The room is spinning a little.
 *   <<otherwise>>You feel fine.
 *   <</when>>
 *       Shows the first part whose condition is true (<<orwhen>> and
 *       <<otherwise>> are optional).
 *
 *   <<choice "Help her" "Ev_lost_cat_help" { effects: [{ stat: { mood: 5 } }] }>>
 *       A button. Tapping it runs the effects, then shows the passage. Leave
 *       the passage out to carry on (back to where you were). Options:
 *         effects     what choosing it does
 *         conditions  when it can be chosen; otherwise the button is locked
 *                     and says what's needed
 *         hidden      true = don't show it at all while it's locked
 *         npc         the person the effects are about (for { rel: … });
 *                     defaults to whoever the event or conversation was with
 *
 *   <<oneof>>The water's lovely and hot.
 *   <<or>>The hot water runs out halfway through.
 *   <<or>>You sing in the shower. Badly.
 *   <</oneof>>
 *       Shows one of the parts, picked at random each time (it stays the
 *       same if the same screen is shown again at the same moment).
 *
 *   <<name "jess_marlow">>         a person's name ("Jess Marlow")
 *   <<first "jess_marlow">>        their first name ("Jess")
 *   <<name>>                       the player's name
 *   <<they "jess_marlow">>  <<them>>  <<their>>  <<theirs>>  <<themself>>
 *       pronouns for a person, or for the player with no name given. A
 *       capital letter (<<They "jess_marlow">>) starts it with a capital.
 *
 * The checker reads these too: a misspelt condition, effect, person or
 * passage fails the build, just like in the content files.
 *
 * State: $scene = { npc } — who the current event or conversation is with.
 * A choice's summary ("Mood +5") appears at the top of the next event
 * passage (through <<view "event-media">>) and in the summary back at Here.
 */
(function () {
	"use strict";

	const PRONOUN_FORMS = ["they", "them", "their", "theirs", "themself"];

	(setup.__modules ??= []).push({
		id: "writing",
		version: 1,
		deps: ["events", "npcs", "character"],
		state: "scene",
		defaultState: () => ({ npc: null }),

		install({ cond, effects, bus, ui, flow, text }) {
			const S = () => setup.vars().scene;

			const writing = {
				/**
				 * Read a macro's arguments as data (see setup.util.parseData).
				 * @param {string} raw @param {string} macro For error messages.
				 * @returns {unknown[]}
				 */
				args(raw, macro) {
					try {
						return setup.util.parseData(raw);
					}
					catch (err) {
						throw new setup.GameError(`<<${macro}>>: ${err.message}`);
					}
				},

				/** @returns {object} The context conditions and effects see in a passage. */
				ctx(npc) {
					return { t: setup.time.now(), loc: setup.world?.loc?.(), npc: npc ?? S().npc ?? undefined };
				},

				/**
				 * Which part of a <<when>> block to show.
				 * @param {(object|boolean|null)[]} conds One per part; null = <<otherwise>>.
				 * @returns {number} Index of the part, or -1 for none.
				 */
				pick(conds, ctx = writing.ctx()) {
					return conds.findIndex((c) => c === null || cond.test(c, ctx));
				},

				/**
				 * Whether a choice can be taken, and if not, why.
				 * @param {{conditions?: object, npc?: string}} opts
				 * @returns {{ok: boolean, reasons: string[]}}
				 */
				check(opts = {}) {
					const ctx = writing.ctx(opts.npc);
					if (opts.conditions == null || cond.test(opts.conditions, ctx)) return { ok: true, reasons: [] };
					return { ok: false, reasons: cond.explain(opts.conditions, ctx).filter((e) => !e.ok).map((e) => e.text) };
				},

				/**
				 * Take a choice: run its effects, then show `passage` (or carry on).
				 * The effects' summary is shown at the top of the next passage and
				 * added to the summary back at "Here".
				 * @param {string|null} passage
				 * @param {{effects?: object[], conditions?: object, npc?: string}} [opts]
				 */
				choose(passage, opts = {}) {
					const before = flow.lastResult();
					flow.perform(() => {
						if (!writing.check(opts).ok) return before;
						const r = effects.apply(opts.effects ?? [], { ...writing.ctx(opts.npc), reason: "choice" });
						writing.lastChoice = r;
						if (passage) flow.request(passage, flow.PRIORITY.event);
						if (before?.changes) return effects.merge(before, r);
						return r;
					}, { keepQueue: true });
				},

				/** The summary of the choice just taken (shown once at the top of the next event). */
				lastChoice: null,

				/**
				 * A person's name, or the player's with no id.
				 * @param {string} [id] @param {boolean} [firstOnly]
				 */
				name(id, firstOnly = false) {
					const full = id ? setup.npcs.get(id).name : setup.character.name();
					return firstOnly ? full.split(" ")[0] : full;
				},

				/**
				 * One pronoun for a person, or for the player with no id.
				 * @param {"they"|"them"|"their"|"theirs"|"themself"} form
				 * @param {string} [id]
				 */
				pronoun(form, id) {
					const spec = id ? setup.npcs.get(id).pronouns : setup.character.pronouns();
					return text.pronouns(spec)[form];
				},
			};
			setup.writing = writing;

			// Who the scene is with: the event's person, or who you're talking to.
			bus.on("event:fired", ({ ctx }) => {
				S().npc = ctx?.npc ?? null;
			});
			bus.on("rel:interact", ({ npc }) => {
				S().npc = npc;
			});

			// A choice's summary, shown at the top of the event passage it leads to.
			setup.events.addHeader((box) => {
				const r = ui.result(writing.lastChoice);
				writing.lastChoice = null;
				if (r) box.append(r);
			});

			/* ---- Macros ------------------------------------------------------ */

			const sc = setup.sc;
			/** Run a macro body, reporting errors on the page instead of breaking it. */
			const guard = (macro, self, fn) => {
				try {
					fn();
				}
				catch (err) {
					setup.reportError(err, `<<${macro}>> in ${sc.passage()}`);
					self.output.append(ui.el("span", { class: "m-writing macro-error", text: `[${err.message}]` }));
				}
			};

			sc.addMacro("when", {
				skipArgs: true,
				tags: ["orwhen", "otherwise"],
				handler() {
					guard("when", this, () => {
						const conds = this.payload.map((p) => (p.name === "otherwise" ? null : writing.args(p.args.raw, p.name)[0] ?? true));
						const i = writing.pick(conds);
						if (i >= 0) sc.wiki(this.output, this.payload[i].contents);
					});
				},
			});

			// <<oneof>> … <<or>> … <</oneof>>: one part at random. Seeded by the
			// passage, the text and the time, so re-showing the screen doesn't change it.
			sc.addMacro("oneof", {
				skipArgs: true,
				tags: ["or"],
				handler() {
					guard("oneof", this, () => {
						const parts = this.payload.map((p) => p.contents);
						const key = `oneof:${sc.passage()}:${setup.rng.hash(parts.join("|"))}:${setup.time.now()}`;
						sc.wiki(this.output, setup.rng.seeded(key).pick(parts));
					});
				},
			});

			// Replaces SugarCube's deprecated built-in <<choice>>.
			sc.replaceMacro("choice", {
				skipArgs: true,
				handler() {
					guard("choice", this, () => {
						const [label, ...rest] = writing.args(this.args.raw, "choice");
						if (typeof label !== "string") throw new setup.GameError("<<choice>> needs a label in quotes first");
						const passage = typeof rest[0] === "string" ? rest.shift() : null;
						const opts = rest[0] ?? {};
						const { ok, reasons } = writing.check(opts);
						if (!ok && opts.hidden) return;
						const box = ui.el("div", { class: "m-writing choice" }, ui.button(label, () => writing.choose(passage, opts), { class: ok ? "btn-choice" : "btn-choice btn-locked", disabled: !ok }));
						if (!ok) box.append(ui.el("p", { class: "locked", text: `Needs: ${reasons.join("; ")}` }));
						this.output.append(box);
					});
				},
			});

			const say = (macro, fn) => sc.addMacro(macro, {
				skipArgs: true,
				handler() {
					guard(macro, this, () => {
						const [id] = writing.args(this.args.raw, macro);
						this.output.append(document.createTextNode(fn(id)));
					});
				},
			});
			say("name", (id) => writing.name(id));
			say("first", (id) => writing.name(id, true));
			for (const form of PRONOUN_FORMS) {
				say(form, (id) => writing.pronoun(form, id));
				say(text.cap(form), (id) => text.cap(writing.pronoun(form, id)));
			}
		},
	});
})();
