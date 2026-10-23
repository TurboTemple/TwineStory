/*
 * Mooresville — what the shops sell. A stock entry can set its own price;
 * otherwise the item's price is used.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const stock = (ids, markup = {}) => ids.map((item) => (markup[item] ? { item, price: markup[item] } : { item }));

		R.define("shop", {
			id: "patels", name: "Patel's Corner Shop", at: "corner_shop",
			desc: "A bit pricier than the supermarket, but it's at the end of your road and open late.",
			stock: stock(
				["chocolate_bar", "crisps", "sandwich", "sausage_roll", "banana", "water_bottle", "cola", "energy_drink", "orange_juice", "groceries"],
				{ groceries: 350, sandwich: 299 },
			),
		});
		R.define("shop", {
			id: "freshway", name: "FreshWay Supermarket", at: "arcade_freshway",
			desc: "Everything you need, slightly cheaper than the corner shop.",
			stock: stock(["groceries", "apple", "banana", "cereal_bar", "chocolate_bar", "crisps", "sandwich", "water_bottle", "cola", "orange_juice", "energy_drink"]),
		});
		R.define("shop", {
			id: "canteen_machine", name: "Vending machine", at: "academy_canteen", mins: 1,
			stock: stock(["chocolate_bar", "crisps", "water_bottle", "cola"], { water_bottle: 100, cola: 120 }),
		});
		R.define("shop", {
			id: "threadline", name: "Threadline", at: "threadline_floor",
			desc: "Small boutique: fewer things, nicer quality, higher prices.",
			stock: stock(
				["striped_top", "knit_jumper", "oxford_shirt", "silk_blouse", "black_jeans", "chinos", "pleated_skirt", "summer_dress", "black_dress", "denim_jacket", "wool_coat", "boots", "smart_shoes", "lace_bra", "tights", "scarf"],
				{ knit_jumper: 4200, black_dress: 5800, wool_coat: 9500 },
			),
		});
		R.define("shop", {
			id: "urban_thread", name: "Urban Thread", at: "arcade_urban_thread",
			desc: "High-street basics at high-street prices.",
			stock: stock([
				"white_tshirt", "black_tshirt", "crop_top", "grey_hoodie", "sports_top", "blue_jeans", "black_jeans", "joggers", "denim_shorts",
				"leggings", "summer_dress", "rain_jacket", "puffer_jacket", "briefs", "boxers", "sports_bra", "socks", "tights",
				"trainers", "sliders", "beanie", "baseball_cap", "pyjamas",
			], { grey_hoodie: 2000, blue_jeans: 2500 }),
		});
	});
})();
