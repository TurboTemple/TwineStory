/*
 * Mooresville — where things are kept, and food and drink items.
 * Prices in pence.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/* ---- Storage -------------------------------------------------------- */

		R.define("storage", { id: "bag", label: "Bag", carried: true, capacity: 16, order: 0 });
		R.define("storage", {
			id: "wardrobe", label: "Wardrobe", at: "home_bedroom", accepts: ["clothes"], order: 1,
			start: [
				{ item: "white_tshirt" }, { item: "black_tshirt" }, { item: "grey_hoodie" }, { item: "blue_jeans" },
				{ item: "joggers" }, { item: "trainers" }, { item: "socks", qty: 3 }, { item: "briefs", qty: 2 },
				{ item: "sports_bra" }, { item: "rain_jacket" }, { item: "pyjamas" },
			],
		});
		R.define("storage", {
			id: "cupboards", label: "Kitchen cupboards", at: "home_kitchen", accepts: ["food", "drink", "groceries"], order: 2,
			start: [{ item: "groceries", qty: 6 }],
		});

		/* ---- Food and drink -------------------------------------------------- */

		const eat = (mins, effects) => ({ label: "Eat", mins, effects });
		const drink = (mins, effects) => ({ label: "Drink", mins, effects });
		const food = (id, name, price, use, extra = {}) => R.define("item", { id, name, price, category: "food", use, ...extra });
		const bev = (id, name, price, use, extra = {}) => R.define("item", { id, name, price, category: "drink", use, ...extra });

		food("chocolate_bar", "Chocolate bar", 95, eat(2, [{ stat: { food: 8, mood: 2 } }]));
		food("crisps", "Packet of crisps", 85, eat(2, [{ stat: { food: 8 } }]));
		food("apple", "Apple", 45, eat(2, [{ stat: { food: 6, drink: 2 } }]));
		food("banana", "Banana", 30, eat(2, [{ stat: { food: 8 } }]));
		food("sandwich", "Sandwich", 285, eat(5, [{ stat: { food: 25 } }]), { desc: "A shop-bought sandwich." });
		food("sausage_roll", "Sausage roll", 140, eat(3, [{ stat: { food: 18 } }]));
		food("cereal_bar", "Cereal bar", 70, eat(1, [{ stat: { food: 7, energy: 2 } }]));
		bev("water_bottle", "Bottle of water", 85, drink(2, [{ stat: { drink: 25, bladder: 5 } }]));
		bev("cola", "Can of cola", 110, drink(2, [{ stat: { drink: 18, bladder: 6, energy: 3 } }]));
		bev("energy_drink", "Energy drink", 175, drink(2, [{ stat: { drink: 15, bladder: 8 } }, { status: "caffeinated" }]));
		bev("orange_juice", "Orange juice", 150, drink(2, [{ stat: { drink: 22, food: 3, bladder: 6 } }]));

		// Cooking at home uses groceries from the kitchen cupboards.
		R.define("item", {
			id: "groceries", name: "Groceries", price: 300, category: "groceries", size: 2,
			desc: "Enough food for one home-cooked meal. Keep them in the kitchen cupboards.",
		});
	});
})();
