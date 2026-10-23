# events

The storylet (event) framework.

## Data
`storylet` — `{ id, passage, triggers[], conditions, chance, priority, effects[], once, tags[] }`
- `triggers`: bus events that make it a candidate, e.g. `"action:checkpoint"`
- `conditions`: checked against the trigger's context (e.g. `{ action: "…", actionElapsed: { min: 60 } }`)
- `chance`: 0–1, used by the `"chance"` selection hook
- `effects`: run when it fires; `{ interrupt: "reason" }` ends the activity in progress
- `passage`: shown via the flow controller (prefix `Ev_`); end it with `<<view "event-end">>` (a Continue button)

## Selection hook
`setup.config.events.selector` names the active hook:
- `"chance"` (current setting, decided by the user): highest priority first; each storylet rolls its own `chance`; the first success fires. Storylets with no `chance` never fire randomly.
- `"none"`: no random events.
Add others with `setup.events.registerSelector(name, (eligible, ctx) => chosen[])`.

## State
`$story = { seen: { [id]: timesFired } }`

## API (`setup.events`)
`handle(trigger, payload)`, `eligible(trigger, ctx)`, `fire(id, ctx?)`, `seen(id)`, `force(id, true|false|null)` (debug/tests)

## Events
`event:fired { id }`

## Open decisions
- Cooldowns, frequency limits, and how several eligible events compete.
- All real event content.
