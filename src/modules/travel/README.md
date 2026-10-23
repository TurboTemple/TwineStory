# travel

Moving between locations. **Travel always takes time.**

## Data
- `travelMode` — `{ id, label, conditions, time: hookName, cost: hookName, order }`
- `route` — `{ id, from, to, mins, modes? }` — usable in both directions; `modes` limits which modes can use it

## Hooks
- Time: `setup.travel.registerTimeHook(name, (route, mode, ctx) => minutes)`. Default `"route"` = the route's `mins`.
- Cost: `setup.travel.registerCostHook(name, (route, mode, ctx) => pence)`. Default `"none"` = free (charging needs the money module).

## API (`setup.travel`)
`destinations()`, `go(to, modeId)`, `routesFrom(loc)`

## Events
`travel:depart { from, to, mode, mins }`, `travel:arrived { from, to, mode, mins }`

## UI
"Go somewhere else" on Here → `Travel_Pick` (`<<view "travel">>`).

## Open decisions
- Travel modes (walk, bus, …), their speeds and costs.
- Whether only directly-connected places are reachable, or journeys chain through several routes.
- What an interruption mid-journey means (now: you still arrive).
