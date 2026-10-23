# money

Accounts, paying and earning. All amounts are **whole pounds** (decided by the user: no pennies). `fmt.money(20)` shows "£20".

## Data
`account` — `{ id, label, kind ("cash" | "bank"), start, order }`. `start` is the balance at a new game.

## State
`$money = { balances: { [accountId]: pounds }, log: [{ t, amount, account, reason }] }`. The log keeps the last 50 entries.

Version 2 (this change) turns old saves' pence into whole pounds, rounding to the nearest pound.

## API (`setup.money`)
- `balance(id?)`: one account, or the total
- `pay(amount, { from?, reason? })` → `{ ok, account }` or `{ ok: false, reason }`. Uses the first account (in `from`, or display order) that can cover the whole amount.
- `earn(amount, { to?, reason? })`
- `enabled()`, `log()`

## Conditions and effects
- `{ money: { min?, max?, account? } }`
- `{ money: { amount, account?, reason? } }`: positive earns, negative pays

## Events
`money:paid`, `money:earned`

## UI
The total shows in the status line on Here.

## Open decisions
- Splitting a payment across accounts, overdrafts, card limits.
- Which accounts the player starts with, and how much is in them.
