/*
 * ============================================================================
 *  registry.js — the game's data catalogue (setup.registry, §6.3)
 * ============================================================================
 *
 * Every "thing" in the game that doesn't change during play (a place, an
 * item, a person, a stat, an event…) is a *definition* stored here, filed
 * under its *type* ("location", "item", "npc"…).
 *
 *   Modules declare types:   registry.defineType("item", { required, defaults, … })
 *   Content adds things:     R.define("item", { id: "apple", name: "Apple", … })
 *   Everything reads them:   registry.get("item", "apple")
 *
 * Definitions are NOT saved with the game; they are rebuilt from the code
 * every time the page loads. Only what changes (where you are, what you
 * own…) goes in the save. That's why editing content takes effect even on
 * old saves.
 *
 * A type's schema also tells the validator what to check: which fields
 * point at other definitions (`refs`), which hold passage names, conditions
 * or effects. That's how a typo like at: "hgih_street" is caught before the
 * game is published.
 */
(function () {
	"use strict";

	const ID_RE = /^[a-z][a-z0-9_]*$/;

	/**
	 * @typedef {object} TypeSchema
	 * @property {string[]} [required]    Fields every definition must have (besides id).
	 * @property {object}   [defaults]    Default field values (deep-copied per definition).
	 * @property {Object<string,string>} [refs]  Field path → registry type it must reference.
	 * @property {string[]} [passages]    Field paths holding passage names that must exist.
	 * @property {string[]} [conditions]  Field paths holding condition data.
	 * @property {string[]} [effects]     Field paths holding effect lists.
	 * @property {(def: object) => string[]} [check]  Extra per-definition checks.
	 */

	function createRegistry() {
		const { clone, deepFreeze, valuesAt, toArray } = setup.util;
		/** @type {Map<string, {schema: TypeSchema, defs: Map<string, object>, aliases: Map<string, string>}>} */
		const types = new Map();
		let frozen = false;

		const entry = (type) => {
			const t = types.get(type);
			if (!t) throw new setup.GameError(`Unknown registry type "${type}"`);
			return t;
		};
		const resolveId = (t, id) => (t.defs.has(id) ? id : t.aliases.get(id) ?? id);

		const registry = {
			/**
			 * Declare a type.
			 * @param {string} type
			 * @param {TypeSchema} [schema]
			 */
			defineType(type, schema = {}) {
				if (types.has(type)) throw new setup.GameError(`Registry type "${type}" already defined`);
				types.set(type, { schema: { required: [], defaults: {}, refs: {}, passages: [], conditions: [], effects: [], ...schema }, defs: new Map(), aliases: new Map() });
			},

			/**
			 * Add fields to an existing type's schema (e.g. a module adding a
			 * `clothing` block to items).
			 * @param {string} type
			 * @param {Partial<TypeSchema>} patch
			 */
			extendType(type, patch) {
				const s = entry(type).schema;
				for (const key of ["required", "passages", "conditions", "effects"]) {
					if (patch[key]) s[key] = s[key].concat(patch[key]);
				}
				if (patch.defaults) Object.assign(s.defaults, patch.defaults);
				if (patch.refs) Object.assign(s.refs, patch.refs);
				if (patch.check) {
					const prev = s.check;
					s.check = (def) => [...(prev ? prev(def) : []), ...patch.check(def)];
				}
			},

			/** @param {string} type */
			hasType: (type) => types.has(type),

			/** @returns {string[]} */
			types: () => [...types.keys()],

			/**
			 * Add a definition.
			 * @param {string} type
			 * @param {object} def
			 * @returns {object} The stored definition (with defaults applied).
			 */
			define(type, def) {
				// Content can only be added during boot, before freeze().
				if (frozen) throw new setup.GameError(`Registry is frozen; cannot define ${type} "${def?.id}"`);
				const t = entry(type);
				if (!def || typeof def.id !== "string" || !ID_RE.test(def.id)) {
					throw new setup.GameError(`${type} id "${def?.id}" must match ${ID_RE}`);
				}
				if (t.defs.has(def.id)) throw new setup.GameError(`Duplicate ${type} id "${def.id}"`);
				// Fill in any field the definition left out from the type's defaults.
				// (Defaults are copied, so two definitions never share one array.)
				const stored = { ...clone(t.schema.defaults), ...def };
				const missing = t.schema.required.filter((k) => stored[k] === undefined);
				if (missing.length) throw new setup.GameError(`${type} "${def.id}" is missing ${missing.join(", ")}`);
				t.defs.set(def.id, stored);
				return stored;
			},

			/**
			 * Point an old id at a new one, so renamed content keeps working.
			 * @param {string} type @param {string} oldId @param {string} newId
			 */
			alias(type, oldId, newId) {
				entry(type).aliases.set(oldId, newId);
			},

			/** @returns {object} The definition; throws if missing. */
			get(type, id) {
				const t = entry(type);
				const def = t.defs.get(resolveId(t, id));
				if (!def) throw new setup.GameError(`Unknown ${type} "${id}"`);
				return def;
			},

			/** @returns {object|undefined} */
			tryGet(type, id) {
				const t = types.get(type);
				return t ? t.defs.get(resolveId(t, id)) : undefined;
			},

			/** @returns {boolean} */
			has(type, id) {
				return registry.tryGet(type, id) !== undefined;
			},

			/** @returns {object[]} All definitions of a type, in definition order. */
			all(type) {
				return [...entry(type).defs.values()];
			},

			/** @returns {object[]} */
			query(type, pred) {
				return registry.all(type).filter(pred);
			},

			/** @returns {object[]} Definitions whose `tags` include `tag`. */
			byTag(type, tag) {
				return registry.query(type, (d) => toArray(d.tags).includes(tag));
			},

			/** @returns {{type: string, def: object}[]} Every definition of every type. */
			entries() {
				return [...types].flatMap(([type, t]) => [...t.defs.values()].map((def) => ({ type, def })));
			},

			/** @returns {Object<string, number>} Definition count per type. */
			counts() {
				return Object.fromEntries([...types].map(([type, t]) => [type, t.defs.size]));
			},

			/** Deep-freeze all definitions; no more define() calls allowed. */
			freeze() {
				frozen = true;
				for (const t of types.values()) for (const def of t.defs.values()) deepFreeze(def);
			},

			/** @returns {boolean} */
			isFrozen: () => frozen,

			/**
			 * Check references, passages and condition/effect operators.
			 * @param {{ hasPassage?: (name: string) => boolean }} [opts]
			 * @returns {string[]} Error messages (empty when valid).
			 */
			validate(opts = {}) {
				// Walk every definition of every type and check each field the
				// type's schema says is a reference, a passage, a condition or a
				// list of effects. Field paths can reach into lists, e.g.
				// "stages[].gates[].when" (see util.valuesAt).
				const errors = [];
				const hasPassage = opts.hasPassage ?? (() => true);
				for (const [type, t] of types) {
					const s = t.schema;
					for (const def of t.defs.values()) {
						const label = `${type} "${def.id}"`;
						for (const [path, refType] of Object.entries(s.refs)) {
							for (const v of valuesAt(def, path).flatMap(toArray)) {
								if (!types.has(refType)) errors.push(`${label}: ${path} refers to unknown type "${refType}"`);
								else if (!registry.has(refType, v)) errors.push(`${label}: ${path} refers to missing ${refType} "${v}"`);
							}
						}
						for (const path of s.passages) {
							for (const v of valuesAt(def, path)) {
								if (!hasPassage(v)) errors.push(`${label}: passage "${v}" (field ${path}) does not exist`);
							}
						}
						for (const path of s.conditions) {
							for (const c of valuesAt(def, path)) {
								for (const op of setup.cond.ops(c)) {
									if (!setup.cond.has(op)) errors.push(`${label}: ${path} uses unknown condition "${op}"`);
								}
							}
						}
						for (const path of s.effects) {
							for (const list of valuesAt(def, path)) {
								for (const op of setup.effects.ops(list)) {
									if (!setup.effects.has(op)) errors.push(`${label}: ${path} uses unknown effect "${op}"`);
								}
							}
						}
						if (s.check) errors.push(...s.check(def).map((e) => `${label}: ${e}`));
					}
				}
				return errors;
			},
		};
		return registry;
	}

	setup.createRegistry = createRegistry;
	setup.ID_RE = ID_RE;
})();
