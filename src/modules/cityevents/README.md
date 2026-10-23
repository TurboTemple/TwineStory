# cityevents

Things happening around town on set days: a market, a fair, fireworks night.

## Data
`cityEvent` — `{ id, label, at, desc, days, dates, from, to, hours, conditions, order }`
- `at`: the place (it covers that place's rooms too).
- When it happens, using one of these: `days: [6]` (weekdays, 0 = Sunday), `dates: ["2026-11-05"]`, or `from`/`to` dates.
- `hours`: `{ from, to }` (leave it out for all day). `conditions`: any extra rule.

While it's on, the place shows "On now: …" and the phone's calendar lists it. What there is to do is ordinary actions with `conditions: { happening: "id" }` and `hidden: true`.

## API (`setup.cityEvents`)
`defs()`, `onDay(id, day)`, `active(id, t?)`, `at(loc?, t?)`

## Conditions
`{ happening: "id" }` (or a list) — that event is on now

## Open decisions
- Which events happen, and when.
