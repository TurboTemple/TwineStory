/*
 * ============================================================================
 *  flow.js — deciding which screen comes next (setup.flow, §6.12)
 * ============================================================================
 *
 * Tapping a button often sets off a chain of things: an action runs, time
 * passes, an event fires, a skill levels up, a promotion happens. Several of
 * them may want to show a passage. If each one changed the screen itself,
 * the player would see a flicker and land in the wrong place.
 *
 * So nothing changes the screen directly. Instead:
 *   1. A button runs its work inside flow.perform(fn).
 *   2. Anything that wants a passage calls flow.request(passage, priority).
 *   3. When the work is done, perform() shows the most important request,
 *      or "Here" (the main screen for where you are) if there was none.
 *
 * Priorities: normal 0 < result 10 < event 50 < urgent 100. If two events
 * ask at once (a shift event, then a promotion), the second waits in a
 * queue and appears when the player taps Continue.
 *
 * Action screens: doing something (an action, a lesson, a shift, a chat)
 * calls flow.illustrate({ … }) to show its picture and flavour text. It
 * shows only if nothing at "result" priority or above asks for the screen
 * (an event, a story moment, the daily summary); Continue then goes where
 * the game would have gone anyway (Here, or e.g. the person you were
 * talking to).
 *
 * $meta.returnTo remembers where to go back to after an event, so
 * "Continue" returns to the right place.
 */
(function () {
	"use strict";

	/** Suggested priorities. */
	const PRIORITY = { normal: 0, result: 10, event: 50, urgent: 100 };

	function createFlow() {
		let pending = null;
		/** Event passages waiting their turn, shown one after another by continue(). */
		let queue = [];
		let depth = 0;
		let last = null;
		/** The action screen asked for in this operation, and the one on screen now (not saved). */
		let illustration = null;
		let shown = null;

		const flow = {
			PRIORITY,

			/** The main-loop passage shown when nothing else is requested. */
			home: "Here",

			/**
			 * Ask to show a passage when the current operation ends.
			 * @param {string} passage
			 * @param {number} [priority]
			 */
			request(passage, priority = PRIORITY.normal) {
				// Two events in one go (a shift event, then a promotion): the later
				// one waits and is shown when the player continues.
				if (pending && priority >= PRIORITY.event && pending.priority >= PRIORITY.event) {
					if (passage === pending.passage || queue.includes(passage)) return;
					if (priority > pending.priority) {
						queue.unshift(pending.passage);
						pending = { passage, priority };
					}
					else queue.push(passage);
					return;
				}
				if (!pending || priority > pending.priority) pending = { passage, priority };
			},

			/** The passage that shows action screens (set by the actions module). */
			illustrationPassage: null,

			/**
			 * Ask for an action screen when the current operation ends, unless
			 * something more important wants the screen (see the header).
			 * @param {{title: string, media?: {type: string, id: string}, passage?: string, placeholder?: string}} spec
			 *   media: which picture (assets/media/<type>/<id>.<ext>);
			 *   passage: the flavour-text passage; placeholder: shown if it doesn't exist.
			 */
			illustrate(spec) {
				illustration = spec;
			},

			/** @returns {object|null} The action screen being shown. */
			illustration: () => shown,

			/** @returns {string[]} Event passages waiting to be shown. */
			queued: () => [...queue],

			/** @returns {{passage: string, priority: number} | null} */
			pending: () => pending,

			/**
			 * Run an operation, then navigate to the requested passage (or home).
			 * Nested calls just run `fn`. The operation's return value is kept
			 * as the last Result for the next passage to show.
			 * @param {() => unknown} fn
			 * @param {{keepQueue?: boolean}} [opts] keepQueue: keep events that are
			 *   waiting their turn, and show the next one if nothing else is asked
			 *   for (a choice in the middle of an event uses this).
			 * @returns {unknown} Whatever fn returned.
			 */
			perform(fn, opts = {}) {
				if (depth > 0) return fn();
				depth++;
				pending = null;
				illustration = null;
				if (!opts.keepQueue) queue = [];
				let out = null;
				try {
					out = fn();
				}
				catch (err) {
					setup.reportError(err, "flow");
				}
				finally {
					depth--;
				}
				last = out ?? null;
				if (!pending && opts.keepQueue && queue.length) pending = { passage: queue.shift(), priority: PRIORITY.event };
				let target = pending ? pending.passage : flow.home;
				let back = flow.home;
				// The action screen, unless something more important asked for the screen.
				if (illustration && flow.illustrationPassage && (!pending || pending.priority < PRIORITY.result)) {
					back = target;
					target = flow.illustrationPassage;
				}
				shown = target === flow.illustrationPassage ? illustration : null;
				illustration = null;
				if (target !== flow.home) setup.vars().meta.returnTo = back;
				pending = null;
				setup.sc.play(target);
				return out;
			},

			/** Navigate to a passage through the controller. */
			go(passage) {
				return flow.perform(() => flow.request(passage));
			},

			/** "Continue" after an interruption: back to where play left off. */
			continue() {
				if (queue.length) return setup.sc.play(queue.shift());
				const meta = setup.vars().meta;
				const target = meta.returnTo || flow.home;
				meta.returnTo = null;
				setup.sc.play(target);
			},

			/** @returns {unknown} The value returned by the last perform() (not saved). */
			lastResult: () => last,

			/** Forget the last result. */
			clearResult() {
				last = null;
			},
		};
		return flow;
	}

	setup.createFlow = createFlow;
})();
