# bills

Money that comes and goes on a schedule: rent, pocket money, a phone contract.

## Data
`bill` — `{ id, label, amount, kind, every, weekday, date, account, activeIf, onPaid, onMissed, desc, order }`
- `amount`: whole pounds. `kind`: `"charge"` (you pay) or `"income"` (you're paid).
- `every`: `"day"`, `"week"` (on `weekday`, 0 = Sunday) or `"month"` (on `date`, 1–28).
- `account`: which account to use. Leave it out to pay from any account, or be paid into the first one.
- `activeIf`: only while this condition is true (e.g. `{ renting: "riverside_flat" }`).
- `onPaid`, `onMissed`: effects. A charge you can't afford counts as missed: its count goes up, and resets when a payment goes through.

## How it works
At midnight, every active bill due that day is settled once. A notice says what happened. Active bills are listed on the Me page ("Regular money") and in the phone's calendar.

## State
`$bills = { missed: { [id]: n }, last: { [id]: day } }`

## API (`setup.bills`)
`defs()`, `active(id)`, `dueOn(id, day)`, `nextDue(id, from?)`, `missed(id)`, `settle(id)`, `markPaid(id)` (the next due day is already paid), `describeWhen(def)`

## Conditions
`{ billMissed: { id, min } }` — this many payments missed in a row

## Events
`bill:paid { bill, amount }`, `bill:missed { bill, missed }`

## Open decisions
- Which bills exist, their amounts and what missing one does (placeholders: £20 pocket money on Saturdays, £80 rent on Mondays, eviction after two missed rent payments).
