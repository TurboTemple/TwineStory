# body

The PC's body, built from separate **parts**, so parts can be added, removed or changed without code.

## Data
`bodyPart` — `{ id, label, kind, unit, min, max, step, decimals, start, options, change, perDay, creation, order, group, desc }`
- `kind: "number"` with `unit`, `min`, `max`, `step`, `decimals`. Add `bands: [{ label, below }, …, { label }]` to describe it in words (weight: skinny / slim / average / chubby / fat). It changes gradually underneath and moves between bands.
- `kind: "choice"` (eye colour, bust, build) with `options`.
- `change`: how it changes by itself each day: `"none"`, or `"grow"` (+`perDay`). Add more with `setup.body.registerChangeHook(name, (def, value, days) => newValue)`.
- `creation: true`: chosen on the new game screen.
- `group`: heading in the sidebar's Profile tab ("Body", "Looks").

## State
`$body = { parts: { [id]: value } }`

## API (`setup.body`)
`get(id)`, `set(id, v)`, `add(id, d)`, `display(id)`, `band(id)`, `bandValue(id, label)`, `mediaKey(id)`, `defs()`, `creationFields()`, `registerChangeHook(name, fn)`

Pictures: `assets/media/bodyPart/<part>/<look>.*` (e.g. `weight/slim`), else `assets/media/bodyPart/<part>.*`. NPCs list their own look in `body` on their character sheet.

## Conditions and effects
- `{ body: { id, min?, max?, is? } }` — `is` matches a choice or a band ("slim")
- `{ body: { weight: -0.05 } }` — add to number parts
- `{ bodySet: { hair_length: 6, hair_colour: "pink" } }`

## Events
`body:changed { id, from, to }`

## Open decisions
- Which parts exist, and how they change. Today: hair grows; workouts, jogging and big meals nudge weight (on a 0–100 scale); the salon cuts and dyes hair.
