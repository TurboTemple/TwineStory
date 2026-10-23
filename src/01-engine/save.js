/*
 * save.js — save migrations and metadata (setup.save, §6.10).
 *
 * $meta.schema holds each module's state version. migrate() brings any
 * story-variables object up to date: it adds slices for new modules and runs
 * each module's pending migrations in order. It is idempotent.
 */
(function () {
	"use strict";

	/** Engine-owned slices: version of their shape (bump + add a migration when changed). */
	const CORE_VERSION = 1;
	const CORE_MIGRATIONS = {};

	function createSave() {
		/** @type {Function[]} */
		const metadataProviders = [];

		const save = {
			CORE_VERSION,

			/**
			 * Bring a story-variables object up to the current schema.
			 * @param {object} vars
			 * @returns {object} vars
			 */
			migrate(vars) {
				vars.meta ??= {};
				const meta = vars.meta;
				meta.schema ??= {};
				meta.flags ??= {};
				meta.counters ??= {};
				for (let v = (meta.schema.core ?? 1) + 1; v <= CORE_VERSION; v++) CORE_MIGRATIONS[v]?.(vars);
				meta.schema.core = CORE_VERSION;
				for (const m of setup.modules.list()) {
					if (!m.state) continue;
					const current = meta.schema[m.id];
					if (!(m.state in vars)) {
						vars[m.state] = m.defaultState ? m.defaultState() : {};
					}
					else if (current != null) {
						for (let v = current + 1; v <= m.version; v++) {
							const fn = m.migrations?.[v];
							if (fn) {
								const out = fn(vars[m.state], vars);
								if (out !== undefined) vars[m.state] = out;
							}
						}
					}
					meta.schema[m.id] = m.version;
				}
				meta.schemaVersion = setup.SCHEMA_VERSION;
				return vars;
			},

			/** @returns {boolean} Whether `vars` needs migrate(). */
			needsMigration(vars) {
				const meta = vars.meta;
				if (!meta || !meta.schema || meta.schemaVersion !== setup.SCHEMA_VERSION || meta.schema.core !== CORE_VERSION) return true;
				return setup.modules.list().some((m) => m.state && (meta.schema[m.id] !== m.version || !(m.state in vars)));
			},

			/**
			 * Add a provider of readable save metadata (e.g. in-game date, place).
			 * @param {() => object} fn
			 */
			addMetadata(fn) {
				metadataProviders.push(fn);
			},

			/** @returns {object} Merged metadata from every provider. */
			metadata() {
				const out = {};
				for (const fn of metadataProviders) {
					try {
						Object.assign(out, fn());
					}
					catch (err) {
						setup.reportError(err, "save metadata");
					}
				}
				return out;
			},

			/**
			 * Hook: decide when autosaves happen. DESIGN: user to decide —
			 * default null keeps SugarCube's behaviour.
			 * @param {null | ((saveType: number) => boolean)} fn
			 */
			setAutosaveRule(fn) {
				setup.sc.setSaveAllowed(fn);
			},

			/** Wire migrations and metadata into SugarCube. Called by boot. */
			install() {
				setup.sc.onSaveLoad((s) => {
					for (const moment of s.state.history) save.migrate(moment.variables);
				});
				// Guard for sessions restored after a deploy without going through a save load.
				setup.sc.on(":passagestart", () => {
					const vars = setup.vars();
					if (vars.meta && save.needsMigration(vars)) save.migrate(vars);
				});
				setup.sc.setSaveMetadata(() => save.metadata());
				save.addMetadata(() => {
					const t = setup.vars().time?.t;
					return t == null ? {} : { when: `${setup.fmt.date(t)} ${setup.fmt.time(t)}` };
				});
			},
		};
		return save;
	}

	setup.createSave = createSave;
})();
