# actions

Things the PC can do that take time.

## Data
`action` — `{ id, label, desc, at, mins, durations, checkpoints[], conditions, costs[], effects[], perHour[], interruptible, passage, hidden, tags[] }`
- `at`: location id(s) where it's offered
- `mins`: how long it takes; `durations: [30, 60]` offers a choice instead
- `checkpoints: [60]`: minutes at which `action:checkpoint` fires, so events can react (or interrupt) part-way through
- `costs` run first, `effects` only if the action finishes uninterrupted, `perHour` on each hour boundary while it runs
- **Locked actions** (decided by the user) show their requirements ("Needs: …") but not what the action is. `hidden: true` hides one completely.

## How `do(id)` runs
conditions → costs → `action:start` → advance time in pieces up to each checkpoint → `action:checkpoint` (an event may interrupt) → effects (if not interrupted) → Result → `action:end`.
An interrupted action stops the clock where it was interrupted.

## API (`setup.actions`)
`available()`, `do(id, { mins? })`, `isRunning()`

## Conditions
- `{ action: "id" }` — the action in context (for storylets)
- `{ actionElapsed: { min?, max? } }` — minutes into it

## Events
`action:start`, `action:checkpoint { action, elapsed, ctx, result, interrupt(reason) }`, `action:end { action, elapsed, interrupted, result }`

## Open decisions
- Every real activity.
