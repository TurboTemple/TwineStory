# housing

Where you live: the family home at the start, and places you can rent.

## Data
`residence` — `{ id, label, desc, at, start, storage: { wardrobe, cupboards, furniture }, rentBill, deposit, conditions, listed, order }`
- `at`: the place (site). Its rooms count as home.
- `start: true`: where you live on a new game (exactly one).
- `storage`: your storage there, by role. Moving moves everything from each role to the same role at the new place.
- `rentBill`: the bill that charges the rent. `deposit`: paid on moving in, given back when you leave properly.
- `conditions`: who can rent it. `listed: true`: shown at letting agents (places tagged `letting_agent`).

## Renting
At a letting agent's, each listed residence shows its rent, its deposit and what's needed. Renting pays the deposit and the first rent from one account, then moves you in. After that the rent bill charges you, and the first due day is covered by the rent you paid up front. What missing rent leads to is data on the bill (`onMissed`). The Mooresville flat texts you, then evicts you after two missed payments. "End your tenancy" gives the deposit back and moves you home.

## Furniture
Items of kind `"furniture"` that you buy are delivered to your home's `furniture` storage (through `shops.addDestination`). `{ furniture: "tv_set" }` is true while one is at the home you live in, so furniture can unlock actions.

## State
`$home = { current, renting, deposit }`

## API (`setup.housing`)
`current()`, `isHome(loc?)`, `renting()`, `rentOf(id)`, `rentBlocks(id)`, `moveIn(id)`, `rent(id)`, `leave({ evicted })`, `furniture(item)`

## Conditions and effects
- `{ livesAt: "id" }`, `{ atHome: true | false }`, `{ renting: true | false | "id" }`, `{ furniture: "item" }`
- `{ moveIn: "id" }`, `{ leaveHome: true }` (end the tenancy, deposit back), `{ evict: true }` (no deposit back)

## Events
`home:moved { from, to }`, `home:rented { id }`, `home:left { id, evicted }`

## Open decisions
- Which places can be rented, rents, deposits, who can rent (placeholder: you need a job), and what missing rent leads to.
