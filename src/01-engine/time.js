/*
 * time.js — clock and calendar (setup.time, §6.8).
 *
 * $time.t is integer minutes since setup.config.epoch (UTC, no DST).
 * The clock only moves through advance().
 *
 * Events (emitted per segment, in this order):
 *   time:advanced {from, to, reason}
 *   time:hour     {t, hour}          when a segment ends on the hour
 *   time:day      {t, day}           when it ends at midnight
 *   time:week     {t, day}           when that midnight starts a Monday
 * then scheduler jobs due at the segment end run.
 */
(function () {
	"use strict";

	const MIN_PER_DAY = 1440;
	const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

	/**
	 * Parse "HH:MM" into minutes after midnight.
	 * @param {string} hm
	 * @returns {number}
	 */
	function parseHM(hm) {
		const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm));
		if (!m || Number(m[1]) > 24 || Number(m[2]) > 59) throw new setup.GameError(`Bad time "${hm}" (expected HH:MM)`);
		return Number(m[1]) * 60 + Number(m[2]);
	}

	function createTime() {
		const epochMs = () => Date.parse(setup.config.epoch);
		let advancing = null;

		const time = {
			MIN_PER_DAY,
			WEEKDAYS,
			parseHM,

			/** @returns {number} Current time in minutes since the epoch. */
			now: () => setup.vars().time.t,

			/** @returns {number} Day number (0 = epoch day). */
			day: (t) => Math.floor(t / MIN_PER_DAY),

			/** @returns {number} Minutes since midnight (0–1439). */
			minuteOfDay: (t) => ((t % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY,

			/** @returns {number} Hour of day (0–23). */
			hour: (t) => Math.floor(time.minuteOfDay(t) / 60),

			/** @returns {number} 0 = Sunday … 6 = Saturday. */
			weekday: (t) => new Date(epochMs() + t * 60000).getUTCDay(),

			/** @returns {{year: number, month: number, day: number, weekday: number}} month is 1–12. */
			date(t) {
				const d = new Date(epochMs() + t * 60000);
				return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
			},

			/**
			 * Is `t` within [from, to)? Handles overnight ranges like "22:00"–"06:00".
			 * @param {number} t @param {string} from @param {string} to
			 */
			isBetween(t, from, to) {
				const m = time.minuteOfDay(t);
				const a = parseHM(from);
				const b = parseHM(to);
				return a <= b ? m >= a && m < b : m >= a || m < b;
			},

			/**
			 * The first time at or after `t` whose clock reads `hm`.
			 * @param {number} t @param {string} hm
			 */
			nextAt(t, hm) {
				const candidate = time.day(t) * MIN_PER_DAY + parseHM(hm);
				return candidate >= t ? candidate : candidate + MIN_PER_DAY;
			},

			/**
			 * Time of day `hm` on day `day`.
			 * @param {number} day @param {string} hm
			 */
			at: (day, hm) => day * MIN_PER_DAY + parseHM(hm),

			/**
			 * Move the clock forward, splitting at hour, day and scheduler
			 * breakpoints. Handlers may call interrupt() to stop early.
			 * @param {number} mins  Whole minutes ≥ 0.
			 * @param {{reason?: string, interruptible?: boolean}} [opts]
			 * @returns {{from: number, to: number, elapsed: number, interrupted: null | {reason: string, data: unknown}}}
			 */
			advance(mins, opts = {}) {
				if (!Number.isInteger(mins) || mins < 0) throw new setup.GameError(`time.advance needs whole minutes ≥ 0 (got ${mins})`);
				if (advancing) throw new setup.GameError("time.advance called while time is already advancing");
				const V = setup.vars();
				const from = V.time.t;
				const end = from + mins;
				const reason = opts.reason ?? "";
				advancing = { interruptible: opts.interruptible !== false, interrupted: null };
				try {
					let t = from;
					while (t < end && !advancing.interrupted) {
						let stop = Math.min(end, (Math.floor(t / 60) + 1) * 60);
						const job = setup.sched.nextAt();
						if (job != null && job > t && job < stop) stop = job;
						V.time.t = stop;
						setup.bus.emit("time:advanced", { from: t, to: stop, reason });
						t = stop;
						if (t % 60 === 0) {
							setup.bus.emit("time:hour", { t, hour: time.hour(t) });
							if (t % MIN_PER_DAY === 0) {
								setup.bus.emit("time:day", { t, day: time.day(t) });
								if (time.weekday(t) === 1) setup.bus.emit("time:week", { t, day: time.day(t) });
							}
						}
						setup.sched.runDue(t);
					}
					return { from, to: V.time.t, elapsed: V.time.t - from, interrupted: advancing.interrupted };
				}
				finally {
					advancing = null;
				}
			},

			/** @returns {boolean} Whether advance() is currently running. */
			isAdvancing: () => advancing !== null,

			/**
			 * Stop the current advance at the end of this segment. Ignored when
			 * nothing is advancing or the advance isn't interruptible.
			 * @param {string} reason @param {unknown} [data]
			 * @returns {boolean} Whether the interrupt took effect.
			 */
			interrupt(reason, data) {
				if (!advancing || !advancing.interruptible) return false;
				advancing.interrupted ??= { reason, data };
				return true;
			},
		};
		return time;
	}

	setup.createTime = createTime;
})();
