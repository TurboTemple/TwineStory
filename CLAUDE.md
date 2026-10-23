# CLAUDE.md — Life Sim Framework (SugarCube 2 + Tweego)

This file is the **technical specification for the game's framework**. Read it in full at the start of every session.

**What we are building right now:** the engine and module framework for a modern-day RPG life simulator. That means the systems, data types, APIs and UI shell that game content will plug into.

**What we are NOT building yet:** game content and game rules. That covers locations, items, characters, events, checks, balance numbers and story. The user designs those and will ask for them explicitly.

---

## 0. Ground rules for Claude Code

### 0.1 The user decides the game design — you build the framework
- **Do not invent gameplay rules, mechanics, formulas, balance numbers, random-event logic, checks, content or story.** If a system needs a value or rule to work, do one of these:
  - expose it as data or configuration with a neutral placeholder, and mark it `// DESIGN: user to decide`, or
  - make it a pluggable hook (a registered function or data field) with a no-op or pass-through default.
- **Test content only.** To prove a system works, you may add clearly-labelled placeholder content in `src/content/_test/` (e.g. `test_item_a`, `Test Location 1`). It is only loaded in debug mode. Never add real game content unless asked.
- **List open decisions in every PR.** Include a "Needs your decision" list in plain English for each placeholder or hook you introduced.
- If a request is ambiguous about design, ask the user rather than choosing for them.

### 0.2 Working environment — iPhone + GitHub only
**The user has no computer.** They work from an iPhone using:
- Claude Code (web / iOS app)
- the GitHub app and Safari
- Safari to play-test

What this means for you:
- **Never tell the user to run a command, install software or open a terminal.** Anything that needs running, you run in your sandbox or put in GitHub Actions.
- **GitHub Actions builds the game and deploys it to GitHub Pages** (§12). The user tests at the Pages URL.
- **Verify in your sandbox before pushing.** Run the Node checks (§11), and Tweego if you can install it (§2). If something can't run there, push and read the Actions result. Never skip verification silently.
- **Work on a branch and open a pull request.** The user merges it in the GitHub app, and merging to `main` deploys.
- **Debugging happens on the phone:** `?debug` mode with an on-screen console (§13).
- **Talk to the user in plain English.** When you finish a task, tell them:
  - what changed
  - what to merge
  - the URL to open
  - what to tap to test it
  - the "Needs your decision" list

---

## 1. Project facts (decided by the user)

- **Genre:** a text-based RPG life simulator set in the modern world. The core of the game is everyday life. Other kinds of events (including confrontations) may exist, and the user will design how they work later.
- **Player character:** an 18-year-old adult in their final year of school. Day to day they attend school and events, work jobs, shop, sleep, wear clothes, use a phone and have stats that change.
- **Everything is modular and data-driven**, so the game can grow without engine rewrites.
- **Age rules (hard requirements):**
  - Every NPC definition has an explicit `age`.
  - **All classmates and school students are 18.**
  - The PC is 18 at game start.
  - Any relationship content tagged `romance` requires all participants to be 18+.

  The validator (§11) enforces all of these.

---

## 2. Toolchain and pinned versions

| Tool | Version | Notes |
|---|---|---|
| SugarCube | **2.37.3** | `format-version` in StoryData, and pinned in the workflow |
| Tweego | **2.1.1** | `https://github.com/tmedwards/tweego/releases/download/v2.1.1/tweego-2.1.1-linux-x64.zip`. The binary lacks the executable bit, so `chmod +x` it. |
| Node.js | runner default | Used only for the validator and tests, never shipped in the game |
| Actions | `actions/checkout@v7`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5` | Checked for newer major versions at Phase 0 (Oct 2026); recheck when touching the workflow |

- **SugarCube download:** the GitHub release `tmedwards/sugarcube-2` tag `v2.37.3`, asset `sugarcube-2.37.3-for-twine-2.1-local.zip` (pinned in the workflow, sha256 `da00a8c15ec4e88a9e231a3ff6c516c57055f84231bb999f869ed34ade353dab`).
- Point Tweego at it with `TWEEGO_PATH`. Confirm with `tweego --list-formats` (note: that command always exits with status 1, so the workflow greps its output instead).

### Verify SugarCube API names — don't guess
SugarCube 2.37 rewrote the Save API and replaced the JSON extensions with the `Serial` API. Check exact names and signatures in the docs (`https://www.motoslave.net/sugarcube/2/docs/`) or the `tmedwards/sugarcube-2` repo before use.

Route every SugarCube API call through `src/01-engine/sc-adapter.js`, so that any mismatch is a one-file fix. Mark anything you couldn't verify with `// VERIFY:`.

APIs relied on:

| API | Notes |
|---|---|
| `State.variables`, `State.temporary`, `setup`, `Story.get/has`, `Engine.play` | |
| `Config.history.maxStates`, `Config.history.controls` | |
| `Config.cleanupWikifierOutput`, `Config.enableOptionalDebugging` | 2.37 |
| `Config.saves.version`, `Config.saves.maxSlotSaves` | |
| `Save.onLoad.add` / `Save.onSave.add` | 2.36+; the old `Config.saves.onLoad/onSave` are deprecated |
| `Serial.createReviver` | replaces `JSON.reviveWrapper` |
| `State.prng.init()` | |
| `UI.update()` and the `:uiupdate` event | 2.37 |
| `Dialog.create()` | `Dialog.setup` is deprecated |
| `jQuery.wikiPassage()` | 2.37 |
| `<<do>>` / `<<redo>>` | 2.37 |
| `init` special tag | 2.36 |
| `_args` in widgets | `$args` is deprecated |
| `Setting.*` | |
| Passage events | `:passageinit`, `:passagestart`, `:passagerender`, `:passagedisplay`, `:passageend`, `:storyready` |

---

## 3. Repository layout

```
/
├── CLAUDE.md
├── .gitignore                      # dist/, tweego/, storyformats/, *.zip, node_modules/
├── .github/workflows/pages.yml     # validate → test → build → deploy (§12)
├── assets/                         # images/audio/fonts → copied to dist/assets/ at build
├── scripts/validate.mjs            # content validator (§11)
├── tests/                          # Node unit tests (§11)
├── src/
│   ├── 00-story/                   # StoryData, StoryTitle, StoryInit, StoryInterface, boot passage
│   ├── 01-engine/                  # engine core (§6) — no game content
│   ├── 02-ui/                      # UI shell, widgets, tokens, layout (§8)
│   ├── modules/<module>/           # one folder per system (§7)
│   │   ├── <module>.js  <module>.twee  <module>.css
│   │   └── README.md               # API, data types, state, events, hooks, open decisions
│   ├── content/                    # game content — added only when the user asks
│   │   └── _test/                  # placeholder content for proving systems; debug only
│   └── story/                      # narrative passages — added only when the user asks
└── dist/                           # build output — gitignored, never edit
```

- Media goes in `assets/` (never `src/`, or Tweego will embed it). Reference it with relative paths only. The game is served from `/<repo>/`, so leading-slash paths break.
- **File order must not matter** (§5.2).

---

## 4. SugarCube rules (non-negotiable)

1. **History:** `Config.history.maxStates = 1` and `Config.history.controls = false`. Every history moment copies all story variables, which is too heavy for a big sim.
2. **What goes where:**

   | Kind of data | Where it lives |
   |---|---|
   | Static data (definitions, tables) | `setup` — not saved |
   | Changing state | `$variables` — saved |
   | Per-passage scratch values | `_temp` |
   | Preferences | `Setting` API |

3. **State is plain data only:**
   - Allowed: objects, arrays, strings, finite numbers, booleans, `null`.
   - Not allowed: functions, DOM nodes, `Map`/`Set`/`Date`, class instances. If a class is ever unavoidable, it needs `clone()` and a `toJSON()` that returns `Serial.createReviver(...)`.
   - Time is stored as integer minutes. Money is stored as integer minor units (pence).
4. **Startup order:**
   1. Story JavaScript runs.
   2. `init`-tagged passages run (engine boot, §5.2).
   3. `StoryInit` runs (new-game state).
   4. The start passage loads.

   Widgets only go in `widget`-tagged passages, never in special passages.
5. **Randomness:** call `State.prng.init()` in Story JavaScript. Never use `Math.random()` in game logic; use `setup.rng` (§6.7).
6. **Saves:** use the Save Events API for migrations and metadata, and set `Config.saves.version` to `setup.SCHEMA_VERSION`.
7. **Output:** `Config.cleanupWikifierOutput = true`, and the `nobr` tag on logic-heavy passages.
8. **Live updates:** use `UI.update()` for the HUD and `<<do>>`/`<<redo>>` for regions of a passage. Don't reload the passage just to update numbers.
9. **Scope:** expose code only through `setup`. The single exception is `window.GAME` in debug mode.

---

## 5. Architecture

### 5.1 Layers
```
 UI shell        StoryInterface, HUD, bottom nav, phone overlay, sheets, widgets
 Modules         character, stats, skills, status, traits, inventory, clothing, housing,
                 sleep, food, phone, apps, world, travel, weather, npcs, relationships,
                 money, bills, shops, actions, jobs, education, city events, events,
                 goals, achievements, journal, settings, debug
 Engine core     registry · modules · bus · conditions · effects · rng · time ·
                 scheduler · save/migrate · flow · text · fmt · sc-adapter
 SugarCube 2.37
```
Dependencies only point downward. The engine knows nothing about specific modules. Modules talk to each other only through public APIs and the event bus, never by touching another module's state.

### 5.2 Deferred registration (load-order independent)
Each `.js` file only **queues** work:
```js
(function () {
  "use strict";
  (setup.__modules ??= []).push({
    id: "inventory", version: 1, deps: ["registry", "bus", "effects"],
    state: "inv", defaultState: () => ({ /* … */ }),
    migrations: { /* 2: (slice, vars) => … */ },
    install(api) { /* define types, register condition/effect ops, bus listeners; set setup.inventory */ },
  });
})();

(function () {
  (setup.__content ??= []).push((R) => { R.define("item", { id: "…", /* … */ }); });
})();
```
Test content in `src/content/_test/` queues onto `setup.__testContent` instead of `setup.__content`, so boot can load it only in debug mode.

Boot runs from `:: Sys_Boot [init nobr]` → `<<run setup.boot()>>`:
1. Create the engine services.
2. Topologically sort the modules by `deps`, failing loudly on a cycle or a missing dependency.
3. Call each `install()`.
4. Run the content functions (`_test` content only in debug mode).
5. Freeze the registries.
6. In debug mode, run validation.

`StoryInit` contains only `<<run setup.newGame()>>`. That fills each module's state slice from `defaultState()`, sets the schema versions and starts the clock.

### 5.3 Conventions
- **IDs:** `^[a-z][a-z0-9_]*$`, unique per type, and never renamed once shipped. If a rename is needed, use `R.alias(type, old, new)`.
- **Passage prefixes:**

  | Prefix | Used for |
  |---|---|
  | `Sys_` | engine |
  | `<Module>_` | module UI |
  | `Loc_` | locations |
  | `Ev_` | events |
  | `Act_` | actions |
  | `App_` | phone apps |
  | `Test_` | debug tests |

- **Units:** time in integer minutes, money in integer minor units. Other units are decided per stat by the user.
- **State access:** go through `setup.vars()`, which returns `State.variables`. This lets Node tests stub it.
- **Pure functions first.** Calculations are pure and unit-tested. Side effects only happen through effects and module APIs.
- **Navigation:** modules never call `Engine.play()`. They call `setup.flow.request(passage, priority)`, and the flow controller navigates once the current operation finishes (§6.12).

### 5.4 State shape
Each module owns exactly one top-level slice:
```
$meta  $time  $sched  $pc  $inv  $wear  $home  $money  $bills  $world  $npcs  $school  $job  $phone  $story  $journal
```
The fields inside each slice are defined in that module's README and grow as the user designs content.

Engine-owned slices: `$meta` (schema versions, seed, generic `flags`/`counters`, `returnTo`), `$time`, `$sched`. The PC's current location is `$pc.loc`, owned by `character`; other modules change it only through `setup.world.moveTo()`.

- Keep state lean: static data lives in `setup`, NPC state is created lazily (only once met), and logs are capped.
- Serialised state should stay well under 200 KB. Every `*.github.io` site shares one browser storage quota.

### 5.5 Configuration
`src/01-engine/config.js` holds:
- **`setup.config`**: title, city name, locale (language, currency symbol, clock format), calendar epoch, start time, `debug` flag (from `?debug` in the URL).
- **`setup.balance`**: an empty object. Modules read tunable numbers from it with neutral defaults, and the user fills it in over time. Every key added is listed in the PR's "Needs your decision" section.

This file also sets SugarCube's `Config.*` values and calls `State.prng.init()`.

---

## 6. Engine core (`src/01-engine/`)

These are pure mechanisms with no game rules.

### 6.1 Boot — `setup.boot()`, `setup.newGame()`, `setup.vars()`
As in §5.2.

### 6.2 Module system — `setup.modules`
- Descriptor fields: `{ id, version, deps[], state, defaultState(), migrations{}, install(api), validate()? }`.
- `install` receives `{ registry, bus, cond, effects, time, sched, rng, flow, fmt, text, ui, config, balance }`.
- `get(id)` and `has(id)`. Modules use `has()` to integrate optionally with other modules.

### 6.3 Registry — `setup.registry`
- `defineType(type, schema)`. The schema contains `required`, `defaults`, `refs` (field path → type), `passages`, `conditions` and `effects`. These let the validator check references.
- `define(type, def)` applies defaults, rejects duplicates and bad ids, and deep-freezes after boot.
- `get` / `tryGet` / `all` / `query` / `byTag` / `alias`.
- `validate()` checks refs, passages, and condition and effect operators. It returns a list of errors, shown as a debug banner.

### 6.4 Event bus — `setup.bus`
- `on(event, handler, { priority, once })` and `off`.
- `emit(event, payload)` is synchronous and runs handlers in priority order. Errors are isolated per handler.
- Handlers are registered only at install, never stored in state, and never navigate.
- Names are `domain:verb`. Core emits `time:advanced`, `time:hour`, `time:day` and `time:week`. Each module documents what it emits and listens to.

### 6.5 Conditions — `setup.cond`
- A requirement language written as **data**. Combinators: `{ all:[…] }`, `{ any:[…] }`, `{ not:… }`, `true`/`false`.
- Leaf operators are registered by modules: `setup.cond.register(name, { test(spec, ctx), describe(spec, ctx) })`. Each module registers the operators for its own data (e.g. `stat`, `has`, `at`, `time`, `flag`).
- `test(cond, ctx)` returns a boolean. `explain(cond, ctx)` returns a list of `{ ok, text }`, so the UI can say *why* something is unavailable.
- Whether locked options are shown or hidden is a per-definition setting (`hidden: true|false`). The default is a design decision.

### 6.6 Effects — `setup.effects`
- An outcome language written as **data**: an ordered list of `{ op: spec }` objects.
- Operators are registered by modules: `register(name, { apply(spec, ctx, result), describe(spec) })`.
- `apply(list, ctx)` returns a **Result**: `{ changes:[…], toasts:[…], goto, interrupted }`. The UI can render it as a summary.
- Generic built-in operators:
  - `if` (`{cond, then, else}`)
  - `random` (weighted branches)
  - `time` (advance the clock; queued and applied once at the end of the list)
  - `flag`, `counter`
  - `goto` (via flow)
  - `toast`
- **Skill or stat checks:** provide a `check` operator **hook** only. It takes `{ resolver: "<name>", …, then, else }` and calls a resolver function registered with `setup.effects.registerResolver(name, fn)`. The engine ships no resolver formula; the user designs those. Include one `_test` resolver for unit tests.

### 6.7 RNG — `setup.rng`
- Wraps the seeded `State.random()`. Provides `float`, `int`, `chance`, `pick`, `weighted`, `shuffle`.
- `seeded(key)` gives a deterministic sub-generator from `$meta.seed` plus the key, for values that must not change on re-render (e.g. daily rolls).

### 6.8 Time and calendar — `setup.time`
- `$time.t` is integer minutes since `setup.config.epoch` (UTC maths, no DST).
- Pure helpers: `day`, `minuteOfDay`, `hour`, `weekday`, `date`, `isBetween(t, "HH:MM", "HH:MM")` (handles overnight ranges), `nextAt`, `parseHM`.
- `advance(mins, { reason, interruptible })`:
  1. Splits the span at hour, day and scheduler breakpoints.
  2. For each segment, emits `time:advanced {from, to}` (modules apply their own continuous changes), then the boundary events, then runs due jobs.
  3. A handler may call `time.interrupt(reason, data)` to stop the advance early.
- The **clock only moves through `advance()`**.

### 6.9 Scheduler — `setup.sched`
- Jobs are data: `{ id, at, type, data, repeat? }`.
- `handle(type, fn)` is registered at install. Also `add`, `cancel`, `cancelWhere`, `due`. Repeating jobs re-insert themselves.

### 6.10 Saves and migrations — `setup.save`
- Per-module `version`s are stored in `$meta.schema`. `setup.SCHEMA_VERSION` is bumped whenever any module's version bumps.
- `migrate(vars)` runs each module's pending migrations in order and adds slices for new modules. It must be idempotent.
- It runs:
  - in `Save.onLoad.add` (for each history moment in the save), and
  - as a guard in `:passagestart`, for sessions restored after a deploy.
- `Save.onSave.add` writes readable metadata (in-game date, location).
- The autosave trigger point is a hook. When it fires is a design decision.

### 6.11 Text and formatting — `setup.text`, `setup.fmt`
- `fmt.money`, `fmt.time`, `fmt.date`, `fmt.duration`, all driven by locale config.
- Pronoun helpers for the PC and NPCs, `plural`, `list`.
- `vary(key, variants)` picks a deterministic variant, so text doesn't change on re-render.

### 6.12 Flow controller — `setup.flow`
- `request(passage, priority)` keeps the highest-priority request.
- `perform(fn)` runs an operation, then navigates to the requested passage or, by default, `Here`. All in-game links go through `perform`.
- Stores `$pc.returnTo` for "Continue" after interruptions.

### 6.13 SugarCube adapter — `sc-adapter.js`
Wraps saves, `UI.update`, dialogs, `wikiPassage` and settings.

---

## 7. Module framework (`src/modules/`)

Every module provides:
- **registry types** (starting schemas, extended as the user designs content)
- a **state slice**
- a **public API** on `setup.<module>`
- **condition/effect operators** for its own data
- **events**
- **hooks** for rules the user hasn't designed yet
- a minimal UI passage that lists or uses its data

The behaviour listed below is **mechanism only**. Wherever it says *hook* or *DESIGN*, ship a neutral default and add it to the PR's "Needs your decision" list.

| Module | Registry types (starting fields) | State | Mechanism to build | Hooks / design left open |
|---|---|---|---|---|
| **character** | `background` (id, name, desc, start effects) | `$pc` identity | Character creation wizard driven by registry data, with steps defined as data so they can be added or removed. `age(t)` from date of birth. Assert age 18 at start. | Creation steps, backgrounds, starting kit |
| **stats** | `stat` (id, label, kind, min, max, start, hud, order, `change: hookName`) | `$pc.stats` (base values only) | Get/set/add with clamping. **Modifier pipeline:** effective = base adjusted by data modifiers `{stat, op, value}` collected from status, traits, clothing and furniture, never stored. Threshold events from data-defined thresholds. Calls a per-stat change hook on `time:advanced`. Derived stats are computed by a registered function. | Which stats exist; how and whether they change over time; derived formulas such as mood; thresholds and their consequences |
| **skills** | `skill` (id, label, maxLevel, `curve: hookName`) | `$pc.skills` (xp) | `addXp`, `level`, `progress`. Level comes from a registered curve function. Emits `skill:levelup`. | Skills list, XP curves, learning modifiers |
| **status** | `statusEffect` (id, label, durationMins, stacking, modifiers, onExpire, tags) | `$pc.status` | Add, remove, expiry on time advance, stacking modes, modifiers fed into the stats pipeline | Which statuses exist and what they do |
| **traits** | `trait` (id, label, desc, conflicts, modifiers, tags) | `$pc.traits` | Assign with conflict checks; modifiers fed into the stats pipeline | Trait list, costs, how they're gained |
| **inventory** | `item` (id, name, category, tags, price, stackable, size, `use: {conditions, effects, mins}`, unique) | `$inv` | Storage places defined as data (e.g. bag, home); stacks vs unique instances with UIDs; add, remove, move, count, use; capacity per place from data. Ops: `has` condition, `item` effect. | Item list, places, capacity rules, perishability |
| **clothing** | item `clothing` block (slot, plus open attribute map such as warmth or formality) | `$wear` | Data-defined slots, equip/unequip, outfits, `outfitStats()` aggregating attributes. `wearing` condition. Per-hour change hook. | Slot list, attributes and what they affect, "dressed" rule, dirt/laundry |
| **housing** | `residence` (id, location, rooms/slots, places), furniture block on items (slot, attributes, unlocks) | `$home` | Place furniture in slots; furniture unlocks actions and provides modifiers | Residences, rent, furniture effects |
| **sleep** | uses `actions` | — | `sleep` action framework: variable duration, wake conditions (alarm, hook), recovery via a hook called per segment | Recovery rules, sleep debt, wake rules |
| **food** | `recipe` (ingredients, tools, conditions, mins, output, effects) | — | Cooking: check ingredients, tools and conditions, consume, produce output, outcome via a hook | Recipes, failure rules, nutrition |
| **phone** | phone item block (attributes such as battery, open-ended) | `$phone` | Phone device state; change hook on time advance; `phone` condition (usable, etc.) | Battery, contract, damage rules |
| **apps** | `app` (id, name, icon, passage, conditions, badge hook, order) | `$phone.appState` | Phone overlay UI (not a passage) rendering app passages; home screen from the registry; badges; notifications. Opening apps doesn't move time unless an app action does. | Which apps exist and what they do |
| **world** | `district`, `location` (id, name, district, tags, hours, actions, shops, places, passage, entry conditions) | `$pc.loc`, `$world` | The **`Here` main loop passage** rendered from location data: description passage, people present, available actions, shops, travel. Opening-hours engine. `at`/`open` conditions. Location events. | Locations, districts, hours, entry checks |
| **travel** | `travelMode` (id, conditions, cost and time hooks) | `$pc.known` | Destination picker, per-mode time and cost from hooks, pay, advance time, move, events. Discovery list. | Modes, formulas, costs |
| **weather** | `climate` data (open schema) | `$world.weather` | Daily generation via a hook using `rng.seeded`; `at(t)` query; `weather` condition | Climate data, generation model, effects |
| **npcs** | `npc` (id, name, **age**, pronouns, role, tags, home, schedule, portrait, passage), `scheduleTemplate` | `$npcs` (lazy) | `whereIs(npc, t)` computed from schedule data plus overrides; `peopleAt(loc, t)` with a cache; meeting/profile UI; `npc` condition | Cast, schedules |
| **relationships** | `relTrack` (id, range, tiers, conditions), `interaction` (id, label, conditions, effects, mins, cooldown) | `$npcs[id].rel` | Track values, tiers, tier events, interactions menu for the NPC in context, plans/overrides. Romance-tagged content must require 18+ (§1). Change-over-time hook. | Tracks, interactions, decay, gain rules |
| **money** | — | `$money` | Integer minor units; cash/bank (account types as data); `pay`/`earn` returning ok or a reason; capped transaction log; `money` condition and effect | Payment rules, overdraft, accounts |
| **bills** | `bill` (id, amount, schedule, autopay, activeIf, onMissed effects) | `$bills` | Recurring charges via the scheduler, pay attempts, missed-payment effects from data | Which bills exist, consequences |
| **shops** | `shop` (id, location, stock list, price hook, payment methods, conditions) | `$world.stock` | Shop UI, basket, checkout through money, stock tracking; price via a hook (default = item price) | Shops, stock, pricing, sales |
| **actions** | `action` (id, label, at, mins, conditions, costs, effects, perHour effects, interruptible, passage) | — | `available(ctx)` merges location, tag, item, furniture and NPC actions; `do(id, opts)`: conditions → costs → advance time with per-segment effects → effects → Result → events; duration picker UI | Every actual activity |
| **jobs** | `job` (id, employer, location, pay, requirements, application flow hook, shift pattern hook) | `$job` | Apply/hire/quit lifecycle, shift generation through a hook, shift attendance through actions, pay via the scheduler, job events | Jobs, hiring, performance, promotion, firing |
| **education** | `school` (id, location, terms, day structure, key dates), `subject` | `$school` | Calendar of terms and key dates from data, timetable generated deterministically from data plus seed, attendance tracking hook, tasks/assignments framework, grade records | Subjects, attendance consequences, grading, exams, post-school paths |
| **city-events** | `cityEvent` (id, location, schedule, conditions, actions, ticket) | `$world` | Scheduled events attach actions to a location while active; listed in Calendar | Which events, when |
| **events** | `storylet` (id, passage, triggers, conditions, tags, plus open fields) | `$story.storylets` | Generic **event framework**: triggers subscribe to bus events, eligible events are filtered by conditions, then a **selection hook** chooses (default: none, i.e. no random events fire until the user designs the rules). Display through the flow controller. `<<gchoice>>` widget and `<<eventEnd>>` record history. | Selection rules, frequency, cooldowns, all event content |
| **goals** | `quest` (id, title, stages with done conditions and effects) | `$story.quests` | Stage evaluation on bus events, journal UI | Quest content |
| **achievements** | `achievement` (id, title, condition or event) | `$story.ach` | Evaluation and display | Achievement list |
| **journal** | — | `$journal` | Notification toasts, daily log aggregation via bus listeners, summary hook | What the daily summary shows |
| **settings** | — | `Setting` API | Theme, text size, clock format; registry for modules to add settings | Gameplay settings |
| **debug** | — | — | Debug panel (§13): time controls, edit any stat/money/skill, teleport, give items, fire any event by id, list scheduler jobs, registry counts, validation, save size, export state | — |

---

## 8. UI shell (`src/02-ui/`)

- **`StoryInterface`** replaces the default sidebar: a `#hud` header, a `#toasts` region, `#passages`, and a `#bottomnav`. Use `data-passage` regions for the HUD and nav.
- **HUD:** time/date, money, and the stats with `hud: true`, in their `order`. What appears is decided through stat data, not code.
- **Bottom nav:** Here · Phone · Bag · Me · Menu, each ≥44 px. Menu contains saves, settings, and debug in debug mode.
- **Widgets:** `<<btn>>`, `<<card>>`, `<<bar>>`, `<<chip>>`, `<<sheet>>`, `<<tabs>>`, `<<locked>>`, `<<result>>`, `<<gchoice>>`. Check that each name doesn't clash with a built-in macro.
- **Long lists:** build them with DOM helpers (`setup.ui`), not by wikifying large strings. Modules register named views with `setup.ui.view(name, fn)`; passages show them with `<<view "name">>`.
- **Styling:**
  - Mobile-first. Body text ≥16 px.
  - Safe-area insets. No hover-only interactions.
  - CSS custom-property tokens with light and dark themes. `prefers-reduced-motion` respected.
  - Real `<button>`s with labels.
- The visual design (colours, fonts, look) is a design decision. Use a neutral placeholder theme.

---

## 9. Coding rules

- **JS:**
  - IIFE plus `"use strict"` in every file. No `import`/`require`, no npm runtime dependencies.
  - ES2020+ is fine.
  - Expose code only on `setup.<module>`.
  - Namespace DOM listeners.
  - No `eval` or `new Function`. Conditions and effects are data.
  - Errors go through `setup.GameError`: loud in debug, graceful in release.
  - JSDoc on public APIs.
- **Twee:**
  - Unique passage names with the prefixes from §5.3.
  - Widgets only in `widget` passages.
  - No links to passages that don't exist.
- **CSS:** scope module styles under `.m-<module>`. Tokens go in `tokens.css`.
- **Performance:**
  - `maxStates = 1` and lean state.
  - Per-passage caches in `State.temporary`.
  - `time.advance` works at breakpoints only.
  - Images as webp with lazy loading.

---

## 10. Authoring content (for when the user asks)

Content is one `R.define(type, {...})` call per thing, in `src/content/<type>/`, plus optional passages in `src/story/`.

Adding a location, item, NPC, job or event must never require engine or module code changes. If it does, the module is missing a hook: add the hook rather than special-casing.

Text style (voice, tense, spelling) is set by the user. Use British English in UI strings until told otherwise.

---

## 11. Validation and tests (CI and sandbox)

**`scripts/validate.mjs`:**
1. Stubs `globalThis.setup` and loads every `src/**/*.js` with `vm`.
2. Runs the registry code with the content.
3. Parses `.twee` files.
4. Fails on any of:
   - duplicate ids or passages
   - unknown refs or missing passages
   - unknown condition/effect operators
   - **NPCs without `age`**
   - **classmates or students whose age isn't 18**
   - **romance-tagged content without an 18+ condition**

**Unit tests (`node --test tests/*.test.mjs` — a bare directory argument does not work on Node 22)** cover:
- time maths and breakpoints
- each condition and effect operator, and `explain`
- the stats modifier pipeline
- registry and validation
- the module topological sort
- the scheduler
- migrations, from an old fixture to current
- RNG determinism
- the events framework's trigger and filter path (with the default selection hook)

**In game:** `Test_*` scenario passages, listed by `Test_Index`, using `_test` content.

**Browser smoke test (sandbox only, not CI):** `scripts/smoke.mjs` opens the built game in headless Chromium, normally and with `?debug`, and fails on any page/console error or any non-PASS row on the `Test_*` pages it lists. The sandbox can't reach jsDelivr, so point `ERUDA_FILE` at the pinned `eruda.js` from `npm pack eruda@<version>`.

---

## 12. Build and deploy (GitHub Actions → Pages)

The live workflow is `.github/workflows/pages.yml` (it is the source of truth; this is its outline):
- triggers on every push, pull request and manual run
- steps: checkout → `node scripts/validate.mjs` → `node --test tests/` → install Tweego + pinned SugarCube (checksum-verified) → confirm `SugarCube (2.37.3)` is listed → build `dist/index.html` with Tweego (any Tweego warning fails the build) → copy `assets/` → upload the Pages artifact (main only)
- a `deploy` job (main only) runs `actions/deploy-pages`

Branches and pull requests validate, test and build. Only `main` deploys.

**One-time setup for the user (give these steps in plain English):**
1. In Safari, open the repo → **Settings → Pages → Source: GitHub Actions**. The setting isn't in the GitHub app; "Request Desktop Website" helps.
2. Merge the setup PR.
3. Wait for the green tick, then open `https://<user>.github.io/<repo>/`.

---

## 13. Debug mode (iPhone)

`?debug` in the URL turns on:
- `Config.debug` and `Config.enableOptionalDebugging`
- the Eruda console, loaded only in debug mode via `https://cdn.jsdelivr.net/npm/eruda` (pinned to an exact version in `config.js`) and then `eruda.init()`
- the Debug panel and `Test_Index`
- the validation banner
- `_test` content
- `window.GAME = setup`

Ask the user for screenshots of errors.

---

## 14. Build order

Each phase ends with: validator ✅, tests ✅, build ✅, README updated, phone test steps, and a "Needs your decision" list.

| # | Phase | Done when |
|---|---|---|
| 0 | Repo setup: layout, StoryData (generate the IFID once), workflow, config, sc-adapter, validator/test skeleton | Pages shows a placeholder passage; `?debug` shows Eruda; CI green |
| 1 | Engine core (§6) | All core unit tests pass; `Test_Engine` shows the clock, scheduler, conditions and effects working |
| 2 | UI shell (§8) and settings, debug | Navigation, HUD, toasts and sheets work one-handed |
| 3 | character, stats, skills, status, traits, actions, journal | A test character can do test actions; stats and modifiers update in the HUD |
| 4 | inventory, clothing, housing, sleep, food, money | Test items can be bought, carried, used, worn and placed |
| 5 | world, travel, weather, shops, bills | The `Here` loop renders test locations; travel and shopping work |
| 6 | phone, apps | The phone overlay opens; test apps render |
| 7 | npcs, relationships | Test NPCs appear on schedule; interactions change tracks |
| 8 | education, jobs, city-events | Test school/job/event data drive schedules and actions |
| 9 | events, goals, achievements | A test event fires when its selection hook is enabled in a test; quest stages advance |

**Don't start a phase until the previous one deploys green.**

---

## 15. Never do

- Invent game rules, formulas, balance numbers, random-event behaviour, checks or real content. Use hooks, placeholders and `_test` content instead (§0.1).
- Tell the user to run commands or use a computer. Push to `main` unasked.
- Edit or commit `dist/`. Change the IFID. Rename shipped ids without an alias.
- Store functions, classes, `Date`, `Map` or `Set`, or static data, in `$variables`.
- Use `Math.random()`. Set `$time.t` directly. Call `Engine.play()` outside the flow controller.
- Use deprecated SugarCube APIs: `Config.saves.onLoad/onSave`, `JSON.reviveWrapper`, `Dialog.setup`, `$args`, the built-in `<<choice>>`/`<<actions>>`, `UIBar.update`.
- Create a classmate or student NPC who isn't 18, or romance content open to anyone under 18.
- Leave the build, validator or tests failing.

---

## 16. Progress log

Keep this up to date so a new session knows where things stand.

| Date | What | Notes |
|---|---|---|
| 2026-10-23 | Phase 0 | Merged to `main`; GitHub Pages is on (source: GitHub Actions). |
| 2026-10-23 | Phase 1 engine core + early `character` (minimal), `world`, `npcs`, `actions`, `travel`, `events` | Built ahead of the phase order because the user asked for a test therapy storyline. The rest of each module's §7 scope still comes in its phase. |

| 2026-10-23 | Travel rules, `money` (early), event rules, locked actions, NPC meeting | Built from the user's answers to the PR #1 decisions. |

User decisions so far:
- Title "Life Sim" (for now); city Mooresville; en-GB, £, 24-hour clock; epoch 1 Sept 2026, start 07:00 day 0; 12 save slots.
- NPC age lives on each NPC's character sheet (the `npc` definition).
- Random events roll their own `chance` (`setup.config.events.selector = "chance"`). The test therapy interruption is 50%.
- The event rules (story before random, cooldowns, groups, daily limits, game-wide limits of 4 a day and 60 minutes apart) were proposed by Claude at the user's request and are open to adjustment.
- Locked actions show their requirements but not what the action is.
- Travel: walking goes one neighbouring place at a time. Public transport only goes to hubs (a bus to its stops, a taxi to the city or suburbs). Travel costs money. What an interrupted journey means depends on the event.
- Travel times should be sensible for the distance (e.g. 5 minutes to a house on the same street, much longer across town).
- An NPC is met at the first encounter.
