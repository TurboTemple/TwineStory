/*
 * sched.js — scheduler (setup.sched, §6.9).
 *
 * Jobs are plain data in $sched.jobs: { id, at, type, data, repeat? }.
 * Handlers are registered by type at install time with handle(). Jobs run
 * when time.advance() passes their `at`. A job with `repeat` (minutes)
 * re-inserts itself.
 */
(function () {
	"use strict";

	function createSched() {
		/** @type {Map<string, Function>} */
		const handlers = new Map();
		const S = () => setup.vars().sched;

		const insert = (job) => {
			const jobs = S().jobs;
			let i = jobs.length;
			while (i > 0 && jobs[i - 1].at > job.at) i--;
			jobs.splice(i, 0, job);
		};

		const sched = {
			/**
			 * Register the handler for a job type.
			 * @param {string} type
			 * @param {(data: unknown, job: object) => void} fn
			 */
			handle(type, fn) {
				if (handlers.has(type)) throw new setup.GameError(`Scheduler handler "${type}" already registered`);
				handlers.set(type, fn);
			},

			/**
			 * Add a job. An existing job with the same id is replaced.
			 * @param {{ id?: string, at: number, type: string, data?: unknown, repeat?: number }} job
			 * @returns {string} The job id.
			 */
			add(job) {
				if (!Number.isInteger(job.at)) throw new setup.GameError("Scheduler job needs an integer `at`");
				if (job.repeat != null && !(Number.isInteger(job.repeat) && job.repeat > 0)) throw new setup.GameError("Scheduler `repeat` must be a positive integer");
				const s = S();
				const id = job.id ?? `job${++s.seq}`;
				sched.cancel(id);
				insert({ id, at: job.at, type: job.type, data: job.data ?? null, ...(job.repeat ? { repeat: job.repeat } : {}) });
				return id;
			},

			/** Remove a job by id. @returns {boolean} */
			cancel(id) {
				const jobs = S().jobs;
				const i = jobs.findIndex((j) => j.id === id);
				if (i >= 0) jobs.splice(i, 1);
				return i >= 0;
			},

			/** Remove every job matching a predicate. @returns {number} Count removed. */
			cancelWhere(pred) {
				const s = S();
				const before = s.jobs.length;
				s.jobs = s.jobs.filter((j) => !pred(j));
				return before - s.jobs.length;
			},

			/** @returns {object[]} Jobs due at or before `t`. */
			due: (t) => S().jobs.filter((j) => j.at <= t),

			/** @returns {object[]} All jobs (read-only use). */
			list: () => S().jobs,

			/** @returns {number|null} The earliest job time, if any. */
			nextAt: () => (S().jobs.length ? S().jobs[0].at : null),

			/**
			 * Run every job due at or before `t`, in time order. Called by time.advance.
			 * @param {number} t
			 */
			runDue(t) {
				const s = S();
				while (s.jobs.length && s.jobs[0].at <= t) {
					const job = s.jobs.shift();
					if (job.repeat) insert({ ...job, at: job.at + job.repeat });
					const fn = handlers.get(job.type);
					if (!fn) {
						setup.reportError(new setup.GameError(`No scheduler handler for "${job.type}"`), "sched");
						continue;
					}
					try {
						fn(job.data, job);
					}
					catch (err) {
						setup.reportError(err, `sched ${job.type}`);
					}
				}
			},
		};
		return sched;
	}

	setup.createSched = createSched;
})();
