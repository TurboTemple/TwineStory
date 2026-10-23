# skills

Things the PC gets better at (Barista…). A skill is a number from 0 to `max`; the whole number is its level.

## Data
`skill` — `{ id, label, desc, max (100), start (0), gain ("flat"), order, hidden }`

`gain` names a learning rule: `"flat"` (every point counts the same) or `"slowing"` (half speed at max). Add more with `setup.skills.registerGainHook(name, (def, current, amount) => gain)`.

## State
`$skills = { values: { [id]: number } }`

## API (`setup.skills`)
`defs()`, `value(id)`, `level(id)`, `add(id, amount)`, `set(id, v)`, `registerGainHook(name, fn)`

## Conditions and effects
- `{ skill: { id, min?, max? } }` — the level is in range
- `{ skill: { barista: 0.5 } }` — improve skills

## Events
`skill:levelup { id, level, from }` (also a notice on the Here screen), `skill:changed { id, from, to }`

## Open decisions
- Which skills exist and how fast they grow. Today: Barista only, "slowing", 1 point per hour worked plus a little from some shift events.
