# actions

Things the PC can do that take time.

## Data
`action` — `{ id, label, desc, at, atTag, whenClosed, mins, durations, checkpoints[], conditions, costs[], effects[], perHour[], always[], interruptible, passage, hidden, showIf, tags[] }`
- `at`: location id(s) where it's offered. `atTag`: offered in every location with that tag (e.g. every `toilet`).
- `whenClosed`: allowed while the place is closed (e.g. waiting outside). Otherwise a closed place locks its actions.
- `mins`: how long it takes. `durations: [30, 60, "07:00"]` offers a choice instead; a `"HH:MM"` entry means "until then".
- `checkpoints: [60]`: minutes at which `action:checkpoint` fires, so events can react (or interrupt) part-way through
- `costs` run first. `effects` run only if the action finishes uninterrupted. `perHour` runs on each hour boundary while it runs. `always` runs at the end either way.
- A negative `money` effect in `costs` is the price. It's shown on the button, and the action is locked if you can't afford it.
- Tip: add a status in `costs` and remove it in `always` to change how stats move **while** the action runs (sleeping, relaxing, exercising).
- **Locked actions** (decided by the user) show what they are, greyed out, with their requirements underneath ("Needs: …"). `hidden: true` hides one completely.
- `showIf`: a condition for the action to be listed at all (e.g. once its storyline has started). When it's listed, `conditions` grey it out as usual.

## How `do(id)` runs
conditions → costs → `action:start` → advance time in pieces up to each checkpoint → `action:checkpoint` (an event may interrupt) → effects (if not interrupted) → Result → `action:end`.
An interrupted action stops the clock where it was interrupted.

Fixed-length actions are multiplied by the `actionTime` status factor. Actions you pick a duration for (sleep, waiting) aren't.

## API (`setup.actions`)
`available()`, `do(id, { mins? })`, `isRunning()`

## Conditions
- `{ action: "id" }` — the action in context (for storylets)
- `{ actionElapsed: { min?, max? } }` — minutes into it

## Events
`action:start`, `action:checkpoint { action, elapsed, ctx, result, interrupt(reason) }`, `action:end { action, elapsed, interrupted, result }`

## Open decisions
- Every real activity.
