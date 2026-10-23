# traits

Lasting things about the player, earned through habits: Caffeine addicted, Gym regular…

Decided by the user: traits are kept apart from **effects** (the `status` module).

| | Effects (status) | Traits |
|---|---|---|
| Examples | Cold, Hungry, Tipsy, Caffeinated | Caffeine addicted, Gym regular |
| How long | minutes or hours, or while a stat or outfit says so | days or weeks |
| How you get one | the moment (an action, an item, the weather) | a habit kept up over days |
| Shown | sidebar "Effects" | sidebar "Traits", and in full on the Profile tab |

## Habits
An action or item records a habit with the effect `{ habit: "coffee" }`. Each habit remembers the days you did it (the last 30); doing it twice in one day counts once.

## Data
`trait` — `{ id, label, desc, good, modifiers, earn, needs, lose, conflicts, gained, lost, hidden, order, tags }`
- `earn: { habit, days, within? }` — gain the trait once you've done the habit on `days` of the last `within` days (default `within = days`: that many days in a row). Checked whenever you do the habit.
- `needs: { habit, missed, done }` — while you have the trait, each day without the habit runs `missed` effects the next morning; doing the habit runs `done` effects.
- `lose: { habit, daysWithout }` — lose the trait after that many days without the habit (counted from the last time, or from when you gained it).
- `modifiers` — stat changes while you have the trait; they show on the Profile tab as e.g. "Mood +3 (Gym regular)".
- `conflicts` — traits that can't be held together. `gained` / `lost` — effects on gaining or losing it.

## State
`$traits = { has: { [traitId]: { since } }, habits: { [habit]: [day, …] } }`

## API (`setup.traits`)
`defs()`, `has(id)`, `list()`, `gain(id)`, `lose(id)`, `record(habit)`, `habitDays(habit)`, `didOn(habit, day)`, `count(habit, within, day?)`

## Conditions and effects
- `{ trait: "id" }` — you have it
- `{ habit: { id, days?, within? } }` — you did the habit on `days` (default 1) of the last `within` (default 1: today) days
- `{ habit: "coffee" }` — record a habit for today
- `{ trait: "id" }` — gain a trait; `{ traitRemove: "id" }` — lose it

## Events
`trait:gained { id }`, `trait:lost { id }`, `habit:done { habit }`. The daily summary lists traits gained and lost.

## Open decisions
- Which traits exist, how they're earned and lost, and what they do. Today: Caffeine addicted (coffee 5 days in a row; withdrawal, Mood −5 until noon or your next coffee, after a day without; gone after 7 days without) and Gym regular (exercise on 4 of any 7 days; Mood +3; gone after 7 days without).
- Whether traits can come from other things (character creation, events, relationships) as well as habits.
