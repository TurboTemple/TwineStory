/*
 * ============================================================================
 *  Mooresville — storage, food and drink
 * ============================================================================
 *
 * What's in this file:
 *   1. Storage: your bag, your wardrobe and the kitchen cupboards, and what
 *      is in them on a new game
 *   2. Food and drink you can buy and carry
 *   3. Groceries (for cooking at home)
 *
 * Every item is one self-contained definition: its price, which shops sell
 * it, and what it does are all in it. Clothes are items too (town-clothing.js).
 *
 * Prices are whole pounds, and things that do the same cost the same
 * (decided by the user):
 *   snack £1          small food boost (about +8)
 *   soft drink £1     drink +20 or so
 *   juice or energy drink £2
 *   light meal £3     food about +25
 *   groceries £3      one home-cooked meal
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD A SNACK
 * ---------------------------------------------------------------------------
 *   item({
 *       id: "doughnut",
 *       name: "Doughnut",
 *       price: 1,                                  // whole pounds
 *       tags: ["food", "patels", "freshway"],      // what it is, then the shops that sell it
 *       use: { label: "Eat", mins: 3, effects: [{ stat: { food: 10, mood: 3 } }] },
 *   });
 *
 * ---------------------------------------------------------------------------
 *  ITEM FIELDS
 * ---------------------------------------------------------------------------
 *   id, name, desc    the item and its description
 *   price             what it costs, in whole pounds
 *   tags              simple labels that say everything else:
 *                       what it is, FIRST: "food", "drink", "groceries",
 *                         "clothing"… (shops list items under it; storage
 *                         places accept items by it)
 *                       which shops sell it: "patels", "freshway",
 *                         "canteen_machine", "urban_thread", "threadline"
 *                         (the shops are in town-shops.js)
 *                       qualities: "warm", "waterproof", "smart"…
 *   use               the button on the item in your bag:
 *                       label    the button text ("Eat", "Drink")
 *                       mins     how long it takes
 *                       effects  what it does (stat changes, effects…)
 *                       consume  false = keep it after using (default: used up)
 *   modifiers         stat changes while it's in use (worn, for clothing)
 *   size              how much room it takes in a storage place (default 1)
 *   stackable         true/false to say whether copies share a slot in your
 *                     bag (leave out: clothing is unique, everything else stacks)
 *
 *  STORAGE FIELDS
 *   label, order      name and position in lists
 *   carried: true     you have it with you everywhere (the bag)
 *   at                where it is (you must be there to use it)
 *   capacity          total `size` it holds (leave out for no limit)
 *   accepts           only items with one of these tags (leave out for anything)
 *   start             what's in it on a new game: [{ item, qty }]
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/* ======================================================================
		 *  1. Storage
		 * ====================================================================== */

		R.define("storage", {
			id: "bag",
			label: "Bag",
			carried: true,
			capacity: 16,
			order: 0,
		});

		R.define("storage", {
			id: "wardrobe",
			label: "Wardrobe",
			at: "home_bedroom",
			accepts: ["clothing"],
			order: 1,
			// Decided by the user: pyjamas (worn on day one) and one outfit for going out.
			start: [
				{ item: "pyjamas" },
				{ item: "briefs" },
				{ item: "white_tshirt" },
				{ item: "blue_jeans" },
				{ item: "socks" },
				{ item: "trainers" },
			],
		});

		R.define("storage", {
			id: "cupboards",
			label: "Kitchen cupboards",
			at: "home_kitchen",
			accepts: ["food", "drink", "groceries"],
			order: 2,
			start: [{ item: "groceries", qty: 6 }],
		});

		/* ======================================================================
		 *  2. Food and drink
		 * ====================================================================== */

		const item = (def) => R.define("item", def);

		// ---- Food: snacks £1, light meals £3 ----
		item({
			id: "chocolate_bar",
			name: "Chocolate bar",
			price: 1,
			tags: ["food", "patels", "freshway", "canteen_machine"],
			use: { label: "Eat", mins: 2, effects: [{ stat: { food: 8, mood: 2 } }] },
		});
		item({
			id: "crisps",
			name: "Packet of crisps",
			price: 1,
			tags: ["food", "patels", "freshway", "canteen_machine"],
			use: { label: "Eat", mins: 2, effects: [{ stat: { food: 8 } }] },
		});
		item({
			id: "apple",
			name: "Apple",
			price: 1,
			tags: ["food", "freshway"],
			use: { label: "Eat", mins: 2, effects: [{ stat: { food: 6, drink: 2 } }] },
		});
		item({
			id: "banana",
			name: "Banana",
			price: 1,
			tags: ["food", "patels", "freshway"],
			use: { label: "Eat", mins: 2, effects: [{ stat: { food: 8 } }] },
		});
		item({
			id: "cereal_bar",
			name: "Cereal bar",
			price: 1,
			tags: ["food", "freshway"],
			use: { label: "Eat", mins: 1, effects: [{ stat: { food: 7, energy: 2 } }] },
		});
		item({
			id: "sandwich",
			name: "Sandwich",
			desc: "A shop-bought sandwich.",
			price: 3,
			tags: ["food", "patels", "freshway"],
			use: { label: "Eat", mins: 5, effects: [{ stat: { food: 25 } }] },
		});
		item({
			id: "sausage_roll",
			name: "Sausage roll",
			price: 3,
			tags: ["food", "patels"],
			use: { label: "Eat", mins: 3, effects: [{ stat: { food: 25 } }] },
		});

		// ---- Drinks: soft drinks £1, juice and energy drinks £2 ----
		item({
			id: "water_bottle",
			name: "Bottle of water",
			price: 1,
			tags: ["drink", "patels", "freshway", "canteen_machine"],
			use: { label: "Drink", mins: 2, effects: [{ stat: { drink: 25, bladder: 5 } }] },
		});
		item({
			id: "cola",
			name: "Can of cola",
			price: 1,
			tags: ["drink", "patels", "freshway", "canteen_machine"],
			use: { label: "Drink", mins: 2, effects: [{ stat: { drink: 18, bladder: 6, energy: 3 } }] },
		});
		item({
			id: "orange_juice",
			name: "Orange juice",
			price: 2,
			tags: ["drink", "patels", "freshway"],
			use: { label: "Drink", mins: 2, effects: [{ stat: { drink: 22, food: 3, bladder: 6 } }] },
		});
		item({
			id: "energy_drink",
			name: "Energy drink",
			price: 2,
			tags: ["drink", "patels", "freshway"],
			use: { label: "Drink", mins: 2, effects: [{ stat: { drink: 15, bladder: 8 } }, { status: "caffeinated" }, { habit: "coffee" }] },
		});

		/* ======================================================================
		 *  3. Groceries
		 * ======================================================================
		 *
		 * Cooking at home (town-actions.js) uses groceries from the kitchen
		 * cupboards or your bag. One lot = one home-cooked meal.
		 */

		R.define("item", {
			id: "groceries",
			name: "Groceries",
			desc: "Enough food for one home-cooked meal. Keep them in the kitchen cupboards.",
			price: 3,
			tags: ["groceries", "patels", "freshway"],
			size: 2,
		});
	});
})();
