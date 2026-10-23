# journal

A log of each day, and the summary shown when you wake up.

## How it works
Bus listeners add up each day in `$journal.days` (the last week): money in and out, lessons attended and skipped, shifts, people met, level-ups, relationship tiers, storyline stages, messages. When an action tagged `sleep` ends on a later day than it began, `Journal_Summary` shows the day you went to sleep on. The game autosaves there (the autosave rule allows autosaves on that passage only; one autosave slot).

## State
`$journal = { days: { [day]: { earned, spent, lessons, skipped, shifts, workMins, met, levels, tiers, stages, messages } } }`

## API (`setup.journal`)
`entry(day)`, `get(day)`, `summary(day)`, `registerSummary(name, (entry, day) => lines)`

`setup.config.journal.summary` picks the summary hook (default `"default"`).

## Open decisions
- What the summary shows, and whether to autosave at other times too.
