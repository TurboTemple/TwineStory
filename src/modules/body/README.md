# body

The PC's body, built from separate **parts**, so parts can be added, removed or changed without code.

## Data
`bodyPart` — `{ id, label, kind, unit, min, max, step, decimals, start, options, change, perDay, creation, order, group, desc }`
- `kind: "number"` (height, weight, hair length) with `unit`, `min`, `max`, `step`, `decimals`.
- `kind: "choice"` (eye colour, bust, build) with `options`.
- `change`: how it changes by itself each day: `"none"`, or `"grow"` (+`perDay`). Add more with `setup.body.registerChangeHook(name, (def, value, days) => newValue)`.
- `creation: true`: chosen on the new game screen.
- `group`: heading on the Me page ("Body", "Looks").

## State
`$body = { parts: { [id]: value } }`

## API (`setup.body`)
`get(id)`, `set(id, v)`, `add(id, d)`, `display(id)`, `defs()`, `creationFields()`, `registerChangeHook(name, fn)`

## Conditions and effects
- `{ body: { id, min?, max?, is? } }`
- `{ body: { weight: -0.05 } }` — add to number parts
- `{ bodySet: { hair_length: 6, hair_colour: "pink" } }`

## Events
`body:changed { id, from, to }`

## Open decisions
- Which parts exist, and how they change. Today: hair grows; workouts, jogging and big meals nudge weight; the salon cuts and dyes hair.
