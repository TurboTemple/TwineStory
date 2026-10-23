/*
 * ============================================================================
 *  Mooresville — shops
 * ============================================================================
 *
 * A shop doesn't list what it sells. Every item tagged with the shop's id is
 * for sale there, at the item's own price. To sell something in a shop, add
 * the shop's id to the item's tags (in town-items.js or town-clothing.js):
 *
 *   tags: ["food", "patels", "freshway"]   → sold at Patel's and FreshWay
 *
 * Items are listed in the order they're defined, under headings from each
 * item's first tag ("Food", "Drink", "Clothing").
 *
 * ---------------------------------------------------------------------------
 *  SHOP FIELDS
 * ---------------------------------------------------------------------------
 *   id, name, desc   the shop (its id is the tag items use) and the line at the top
 *   at               the place or room where you can browse it
 *   sells            optional: also sell every item with these tags, e.g.
 *                    sells: ["food"] for a shop that stocks all food
 *   mins             minutes each purchase takes (default 2)
 *   conditions       who may shop here (leave out for anyone)
 *   payWith          only this account, e.g. "bank" (leave out for any)
 *
 * The game checks that every shop sells at least one thing.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const shop = (def) => R.define("shop", def);

		shop({
			id: "patels",
			name: "Patel's Corner Shop",
			at: "corner_shop",
			desc: "At the end of your road and open late: snacks, drinks and groceries.",
		});

		shop({
			id: "freshway",
			name: "FreshWay Supermarket",
			at: "arcade_freshway",
			desc: "Everything you need in one place, and fresh fruit too.",
		});

		shop({
			id: "canteen_machine",
			name: "Vending machine",
			at: "academy_canteen",
			mins: 1,
		});

		shop({
			id: "threadline",
			name: "Threadline",
			at: "threadline_floor",
			desc: "Small boutique: the smarter, better-made end of things.",
		});

		shop({
			id: "urban_thread",
			name: "Urban Thread",
			at: "arcade_urban_thread",
			desc: "High-street basics, sportswear and coats.",
		});
	});
})();
