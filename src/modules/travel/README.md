# travel

Moving between locations. **Travel always takes time, and may cost money.**

## How travel works (decided by the user)
- **Walking goes one place at a time.** You can only walk to a neighbouring place; to get further you walk through each place on the way.
- **Public transport goes to hubs.** A bus runs along its own line and drops you at any stop on it. A taxi can be taken anywhere and goes to places tagged `hub` (e.g. the city centre or a suburb).
- **Travel costs money.** The fare is paid before you set off; if you can't pay, you can't go.
- **Interruptions depend on the event.** A journey pauses at each stop on the way (`travel:checkpoint`). An event that interrupts it leaves you at the last place you reached. Its effects can also move you somewhere else with `{ moveTo: "loc" }`.

## Data
- `route` — `{ id, from, to, mins, network }`. A link between two neighbouring places, usable both ways. `network` defaults to `"walk"`; a bus line uses its own network name.
- `travelMode` —
  `{ id, label, order, conditions, network, multiHop, boardTag, destTag, stopsOnWay, timeFactor, time, cost, fare, payWith }`

  | Field | Meaning |
  |---|---|
  | `network` | which routes it follows (`"walk"` or a line's network) |
  | `multiHop` | `false`: neighbours only (walking). `true`: anywhere reachable on the network |
  | `boardTag` / `destTag` | only start from / go to places with this tag (e.g. `destTag: "hub"`) |
  | `stopsOnWay` | `true`: passes each stop (checkpoints). `false`: one direct trip (taxi) |
  | `minDistance` | only offered for trips at least this long on the network (e.g. no taxi for a 2-minute walk) |
  | `timeFactor` | multiplies route minutes (a taxi at 0.25 is four times faster than walking) |
  | `time` / `cost` | names of the time and fare hooks |
  | `fare` | numbers for the fare hook: `{ flat }` or `{ base, perMin }` (pence) |
  | `payWith` | account ids allowed (default: any) |

Journeys start from the site: if you're in a room, you walk out first (shown as "N minutes to get outside").

## Hooks
- Time: `registerTimeHook(name, (legs, mode, ctx) => minutesPerLeg[])`. Default `"path"`: each leg's minutes × `timeFactor`, rounded up.
- Fare: `registerCostHook(name, (mins, legs, mode, ctx) => pence)`. Built in: `"none"`, `"flat"`, `"meter"`.

## API (`setup.travel`)
`options()`, `go(to, modeId)`, `isTravelling()`

## Conditions
`{ travel: { mode?, to?, at? } }` — for events during a journey.

## Events
`travel:depart`, `travel:checkpoint { mode, from, to, at, elapsed, interrupt() }`, `travel:arrived`, `travel:interrupted`

## UI
"Go somewhere else" on Here → `Travel_Pick`, grouped by mode, showing time, fare and stops.

## Open decisions
- Bus timetables (waiting for the next bus) — buses currently leave as soon as you board.
- Discovering new places (all routes are known from the start).
