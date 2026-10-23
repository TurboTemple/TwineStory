# shops

Buying items.

A shop doesn't keep a stock list: it sells every item whose `shops` list includes the shop's id (plus every item of a kind in its `sells`). To put an item on sale, add the shop's id to the item's `shops`.

## Data
`shop` — `{ id, name, desc, at, sells[], conditions, price, payWith, mins }`
- `at`: the room the shop is in. It follows that room's opening hours.
- `sells`: kinds of item to sell all of, e.g. `["food"]`.
- `price`: pricing hook name (default `"default"` = the item's own price). Add more with `setup.shops.registerPriceHook(name, (shop, item) => pounds)`.
- `mins`: time per purchase.

Validation fails if a shop sells nothing.

## API (`setup.shops`)
`here()`, `stock(shop)`, `price(shop, item)`, `buy(shopId, itemId)`, `closedReason(shopId)`, `open(shopId)`

Buying checks the shop is open, your bag has room and you can pay (first account that covers it), then puts the item in your bag.

## UI
"Browse …" on Here → `Shops_Shop`. Items are grouped under their kind, and each row shows the item's attributes.

## Open decisions
- Limited stock, sales and discounts. Stock is unlimited for now.
