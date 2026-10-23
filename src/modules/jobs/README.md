# jobs

Paid work, built on a storyline: the storyline's stages are the career, and the job says which stages you work in, the pay at each and when the shifts are.

## Data
`job` — `{ id, label, at, storyline, workStages, skill, xpPerHour, pay: { [stage]: pence/hour }, payTo, shifts, shiftHook ("fixed"), earlyMins (30), lateMins (10), status, perHour, quitStage, order }`
- `shifts: [{ days?: [0–6], from, to }]` for the `"fixed"` hook. Other patterns: `setup.jobs.registerShiftHook(name, (job, day) => [{ from, to }])`.
- `status`: a status on while working (stat changes per hour). `perHour`: effects each hour of a shift.

## How a shift works
Be at the job's place in a shift (from `earlyMins` before it) and tap **Start your shift**. Time runs to the end of the shift. Halfway through, `job:shift` fires so the stage's events can happen. Then you're paid (to `payTo`), the skill improves, and the storyline's `shifts` counter goes up. Arriving more than `lateMins` late adds to `late`. A shift you never started counts as `missed` the next day.

## State
`$job = { worked: { [jobId]: [day, …] } }` (last 14). Career counters live on the storyline.

## API (`setup.jobs`)
`defs()`, `employed(id)`, `current()`, `rate(id)`, `shiftsOn(id, day)`, `shiftNow(id)`, `upcoming(id)`, `worked(id, day)`, `work(id)`, `quit(id)`, `registerShiftHook(name, fn)`

## Conditions
`{ employed: id }`, `{ shiftOf: id }` (during that job's shift)

## Events
`job:shift`, `job:shiftEnd { job, mins, pay }`, `job:missed { job, day }`

## Open decisions
- Pay (placeholders: £10, £10, £11, £12.50 an hour), shift times, how many missed shifts get you fired (3), and whether lateness matters.
