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
 * Clothes are items too, but they live in town-clothing.js. What each shop
 * sells, and for how much, is in town-shops.js.
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
 *   food({
 *       id: "doughnut",
 *       name: "Doughnut",
 *       price: 1,                      // whole pounds
 *       use: { label: "Eat", mins: 3, effects: [{ stat: { food: 10, mood: 3 } }] },
 *   });
 *   Then add "doughnut" to a shop's stock in town-shops.js.
 *
 * ---------------------------------------------------------------------------
 *  ITEM FIELDS
 * ---------------------------------------------------------------------------
 *   id, name, desc    the item and its description
 *   price             what it costs, in whole pounds
 *   category          "food", "drink", "groceries", "clothes"… (storage can
 *                     accept only some categories, e.g. the cupboards)
 *   use               the button on the item in your bag:
 *                       label    the button text ("Eat", "Drink")
 *                       mins     how long it takes
 *                       effects  what it does (stat changes, effects…)
 *                       consume  false = keep it after using (default: used up)
 *   size              how much room it takes in a storage place (default 1)
 *   stackable         false for things that are each unique (clothes)
 *
 *  STORAGE FIELDS
 *   label, order      name and position in lists
 *   carried: true     you have it with you everywhere (the bag)
 *   at                where it is (you must be there to use it)
 *   capacity          total `size` it holds (leave out for no limit)
 *   accepts           only these item categories (leave out for anything)
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
			accepts: ["clothes"],
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

		const food = (def) => R.define("item", { ...def, category: "food" });
		const drink = (def) => R.define("item", { ...def, category: "drink" });

		// ---- Food: snacks £1, light meals £3 ----

		food({
			id: "chocolate_bar",
			name: "Chocolate bar",
			price: 1,
			use: { label: "Eat", mins: 2, effects: [{ stat: { food: 8, mood: 2 } }] },
		});
		food({
			id: "crisps",
			name: "Packet of crisps",
			price: 1,
			use: { label: "Eat", mins: 2, effects: [{ stat: { food: 8 } }] },
		});
		food({
			id: "apple",
			name: "Apple",
			price: 1,
			use: { label: "Eat", mins: 2, effects: [{ stat: { food: 6, drink: 2 } }] },
		});
		food({
			id: "banana",
			name: "Banana",
			price: 1,
			use: { label: "Eat", mins: 2, effects: [{ stat: { food: 8 } }] },
		});
		food({
			id: "sandwich",
			name: "Sandwich",
			desc: "A shop-bought sandwich.",
			price: 3,
			use: { label: "Eat", mins: 5, effects: [{ stat: { food: 25 } }] },
		});
		food({
			id: "sausage_roll",
			name: "Sausage roll",
			price: 3,
			use: { label: "Eat", mins: 3, effects: [{ stat: { food: 25 } }] },
		});
		food({
			id: "cereal_bar",
			name: "Cereal bar",
			price: 1,
			use: { label: "Eat", mins: 1, effects: [{ stat: { food: 7, energy: 2 } }] },
		});

		// ---- Drinks: soft drinks £1, juice and energy drinks £2 ----

		drink({
			id: "water_bottle",
			name: "Bottle of water",
			price: 1,
			use: { label: "Drink", mins: 2, effects: [{ stat: { drink: 25, bladder: 5 } }] },
		});
		drink({
			id: "cola",
			name: "Can of cola",
			price: 1,
			use: { label: "Drink", mins: 2, effects: [{ stat: { drink: 18, bladder: 6, energy: 3 } }] },
		});
		drink({
			id: "energy_drink",
			name: "Energy drink",
			price: 2,
			use: { label: "Drink", mins: 2, effects: [{ stat: { drink: 15, bladder: 8 } }, { status: "caffeinated" }] },
		});
		drink({
			id: "orange_juice",
			name: "Orange juice",
			price: 2,
			use: { label: "Drink", mins: 2, effects: [{ stat: { drink: 22, food: 3, bladder: 6 } }] },
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
			category: "groceries",
			size: 2,
		});
	});
})();
