# shops

Buying items.

## Data
`shop` — `{ id, name, desc, at, stock: [{ item, price? }], conditions, price, payWith, mins }`
- `at`: the room the shop is in. It follows that room's opening hours.
- `price`: pricing hook name (default `"default"` = the stock entry's price, else the item's price). Add more with `setup.shops.registerPriceHook(name, (shop, entry, item) => pence)`.
- `mins`: time per purchase.

## API (`setup.shops`)
`here()`, `price(shop, entry)`, `buy(shopId, itemId)`, `closedReason(shopId)`, `open(shopId)`

Buying checks the shop is open, your bag has room and you can pay (first account that covers it), then puts the item in your bag.

## UI
"Browse …" on Here → `Shops_Shop`, grouped by category.

## Open decisions
- Limited stock, sales and discounts. Stock is unlimited for now.
