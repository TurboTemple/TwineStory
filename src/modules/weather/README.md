# weather

The day's weather, worked out from the climate data and the game's seed. It's the same every time you look and needs no save data.

## Data
- `weatherKind` — `{ id, label, icon, wet, tags, order }` (tag `warm` nudges temperatures up)
- `climate` — `{ id, months: { 1…12: { temp: [min, max], kinds: { [kind]: weight } } }, generate ("seasonal"), coldBelow (10), warmTag ("warm") }`

Other generation models: `setup.weather.registerGenerator(name, (climate, day) => ({ kind, temp }))`.

## API (`setup.weather`)
`onDay(day)`, `at(t)`, `isCold(t)`, `dressedWarm()`, `outdoors()`

Warmth is yes or no (decided by the user): a day below `coldBelow` °C is cold, and wearing anything tagged `warm` is enough to keep the cold off.

## Conditions
- `{ weather: { kind?, wet?, tempMin?, tempMax? } }`
- `{ outdoors: true }` (the location has `outdoor: true`)
- `{ tooCold: true }` (outdoors on a cold day, wearing nothing warm)

Content uses these for the Cold and Getting wet effects, and for ambient lines.

## Open decisions
- The climate numbers, what cold and rain do to you, and whether weather should affect travel or NPCs.
