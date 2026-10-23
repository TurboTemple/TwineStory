# storylines

Progression through **stages**: a job career, a friendship, therapy… Each stage can have an entry event, a pool of events that only happen in that stage, and gates that move it on.

## Data
`storyline` — `{ id, label, desc, start, hidden, order, stages: [stage] }`

stage — `{ id, label, desc, hint, enter, onEnter, events, gates }`
- `hint`: what to do next, shown in the Diary ("Keep working shifts at the café").
- `enter`: a storylet shown once on reaching the stage (interview, first day, promotion). Usually `kind: "manual"`.
- `onEnter`: effects applied on reaching it (e.g. a text message).
- `events`: storylets that can only fire in this stage (usually `kind: "pool"`; give them a `chance` to make them occasional).
- `gates: [{ to, when }]`: move to stage `to` as soon as the condition `when` passes. Checked after actions, shifts, lessons, skill and relationship changes, travel, entering a place and each new day.
- `start`: begin the storyline at this stage on a new game (otherwise it starts when something moves it).

Example: the barista job (`src/content/mooresville/town-work.js`): hired → (1 shift) trainee → (Barista 20) barista → (Barista 50) supervisor.

## Diary
The view `app-diary` (the phone's Diary app) lists every started storyline with its stage's `label`, `desc` and `hint`. Gates and counters are never shown (decided by the user): the next stage is a surprise.

## State
`$arcs = { [id]: { stage, since, counts: { [key]: n }, history: [[stage, t]] } }`

## API (`setup.storylines`)
`stage(id)`, `stageDef(id)`, `started(id)`, `count(id, key)`, `addCount(id, key, n)`, `moveTo(id, stage, { quiet })`, `check(id)`, `checkAll()`, `active()`

## Conditions and effects
- `{ storyline: { id, stage?: id | [ids], started?: false } }`
- `{ storylineCount: { id, key, min?, max? } }`
- `{ storyline: { id, to } }` — start it or move it on
- `{ storylineCount: { id, key, add } }` (`add` defaults to 1; negative takes away)

## Events
`storyline:stage { id, from, to }`, `storyline:count { id, key, value }`

## Open decisions
- The stages, gates and events of every storyline.
