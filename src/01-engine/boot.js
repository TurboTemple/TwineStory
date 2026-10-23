/*
 * boot.js — setup.boot() and setup.newGame() (§5.2, §6.1).
 *
 * Every .js file only queues work:
 *   setup.__modules     module descriptors (see modules.js)
 *   setup.__content     content functions: (R) => { R.define(...) }
 *   setup.__testContent the same, for src/content/_test (debug mode only)
 *
 * boot() runs from the `Sys_Boot` init passage, after all Story JavaScript.
 */
(function () {
	"use strict";

	let booted = false;

	/** Build the API object passed to module hooks. */
	const api = () => ({
		registry: setup.registry, bus: setup.bus, cond: setup.cond, effects: setup.effects,
		time: setup.time, sched: setup.sched, rng: setup.rng, flow: setup.flow, fmt: setup.fmt,
		text: setup.text, ui: setup.ui, config: setup.config, balance: setup.balance,
		save: setup.save, modules: setup.modules,
	});

	/**
	 * Start the engine: create services, install modules in dependency order,
	 * load content, freeze the registry and (in debug) validate.
	 * @param {{ includeTest?: boolean }} [opts]  includeTest forces _test content on (tests/validator).
	 */
	setup.boot = function boot(opts = {}) {
		if (booted) return;
		booted = true;
		const debug = setup.config.debug;

		// 1. Engine services.
		setup.registry = setup.createRegistry();
		setup.bus = setup.createBus();
		setup.cond = setup.createCond();
		setup.effects = setup.createEffects();
		setup.rng = setup.createRng();
		setup.time = setup.createTime();
		setup.sched = setup.createSched();
		setup.flow = setup.createFlow();
		setup.fmt = setup.createFmt();
		setup.text = setup.createText();
		setup.ui = setup.createUi();
		setup.save = setup.createSave();
		setup.modules = setup.createModules();
		setup.coreOps.install();

		// 2–3. Sort and install modules.
		const order = setup.sortModules(setup.__modules ?? []);
		setup.modules.setInstalled(order);
		for (const m of order) m.install?.(api());

		// 4. Content (test content only in debug mode).
		for (const fn of setup.__content ?? []) fn(setup.registry);
		if (debug || opts.includeTest) for (const fn of setup.__testContent ?? []) fn(setup.registry);

		// 5. Freeze, then let modules index the finished content.
		setup.registry.freeze();
		for (const m of order) m.ready?.(api());

		setup.save.install();
		setup.ui.install();

		// 6. Validation banner and devtools in debug mode.
		if (debug) {
			for (const err of setup.validate()) setup.sc.banner(err, "error");
			setup.devtools.init();
		}
	};

	/**
	 * Every validation error: registry refs/passages/operators plus each
	 * module's own validate().
	 * @param {{ hasPassage?: (name: string) => boolean }} [opts]
	 * @returns {string[]}
	 */
	setup.validate = function validate(opts = {}) {
		const errors = setup.registry.validate({ hasPassage: opts.hasPassage ?? ((n) => setup.sc.hasPassage(n)) });
		for (const m of setup.modules.list()) {
			if (m.validate) errors.push(...m.validate(api()).map((e) => `${m.id}: ${e}`));
		}
		return errors;
	};

	/**
	 * Create the state for a new game. Called only from StoryInit.
	 */
	setup.newGame = function newGame() {
		const V = setup.vars();
		const start = setup.config.start;
		V.meta = {
			schemaVersion: setup.SCHEMA_VERSION,
			schema: { core: setup.save.CORE_VERSION },
			seed: Math.floor(setup.sc.random() * 4294967296),
			flags: {},
			counters: {},
			returnTo: null,
		};
		V.time = { t: setup.time.at(start.day, start.time) };
		V.sched = { jobs: [], seq: 0 };
		for (const m of setup.modules.list()) {
			if (!m.state) continue;
			V[m.state] = m.defaultState ? m.defaultState() : {};
			V.meta.schema[m.id] = m.version;
		}
		for (const m of setup.modules.list()) m.newGame?.(api());
		setup.bus.emit("game:new", {});
	};
})();
