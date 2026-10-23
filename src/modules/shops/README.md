# shops

Buying items.

A shop doesn't keep a stock list: it sells every item tagged with the shop's id (plus any item with one of its `sells` tags). To put an item on sale, add the shop's id to the item's `tags`.

## Data
`shop` — `{ id, name, desc, at, sells[], conditions, price, payWith, mins }`
- `at`: the room the shop is in. It follows that room's opening hours.
- `sells`: extra tags to sell, e.g. `["food"]` for every food item.
- `price`: pricing hook name (default `"default"` = the item's own price). Add more with `setup.shops.registerPriceHook(name, (shop, item) => pounds)`.
- `mins`: time per purchase.

Validation fails if a shop sells nothing.

## API (`setup.shops`)
`here()`, `stock(shop)`, `price(shop, item)`, `buy(shopId, itemId)`, `closedReason(shopId)`, `open(shopId)`

Buying checks the shop is open, your bag has room and you can pay (first account that covers it), then puts the item in your bag.

## UI
"Browse …" on Here → `Shops_Shop`. Items are grouped under their first tag, and each row shows the item's qualities (its other tags, without shop ids).

## Open decisions
- Limited stock, sales and discounts. Stock is unlimited for now.
