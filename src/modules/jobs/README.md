# jobs

Paid work, built on a storyline: the storyline's stages are the career, and the job says which stages you work in and the pay at each.

## Data
`job` — `{ id, label, at, storyline, workStages, shiftMins (120), skill, skillPerShift, pay: { [stage]: whole pounds/hour }, payTo, effects, status, perHour, quitStage, order }`
- `shiftMins`: how long one shift is.
- `skillPerShift`: the job's `skill` gained each shift (through the skill's gain rule).
- `effects`: run at the end of every full shift, e.g. a `random` outcome that adds to or takes from the skill, with a `note` for the summary.
- `status`: a status on while working (stat changes per hour). `perHour`: effects each hour of a shift.

## How a shift works (decided by the user)
Be at the job's place while it's open and tap **Work a shift**. One tap works one whole shift. There's no rota: you can work as many shifts as you like, as long as each ends before the place closes. Halfway through, `job:shift` fires so the stage's events can happen. At the end you're paid for the time worked (to `payTo`), and, if the shift wasn't cut short, the skill improves, `effects` run and the storyline's `shifts` counter goes up.

The Work section shows how far you are towards the career's next stage (`setup.storylines.progress`, e.g. "Next: Barista skill 12 / 20").

## State
`$job = {}` (version 2 dropped the old rota record). Career counters live on the storyline.

## API (`setup.jobs`)
`defs()`, `employed(id)`, `current()`, `rate(id)`, `shiftPay(id)`, `canWork(id)` → `{ ok, reason }`, `work(id)`, `isWorking()`, `quit(id)`

## Conditions
`{ employed: id }`, `{ shiftOf: id }` (during that job's shift)

## Events
`job:shift`, `job:shiftEnd { job, mins, pay }`

## Open decisions
- Pay (placeholders: £10, £10, £11, £12 an hour), shift length per job, Barista skill per shift (2), the random shift outcomes and how likely each is, and how often shift events happen (15% each).
