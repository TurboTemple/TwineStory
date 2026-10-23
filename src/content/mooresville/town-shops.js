/*
 * ============================================================================
 *  Mooresville — shops and what they sell
 * ============================================================================
 *
 * Each shop has a stock list. An entry is either:
 *   "item_id"                              sold at the item's own price
 *   { item: "item_id", price: pounds(…) }  sold at this shop's price instead
 *
 * The items themselves (and their normal prices) are in town-items.js and
 * town-clothing.js. Prices are placeholders: the user will set them by hand.
 *
 * ---------------------------------------------------------------------------
 *  SHOP FIELDS
 * ---------------------------------------------------------------------------
 *   id, name, desc   the shop and the line shown at the top of it
 *   at               the place or room where you can browse it
 *   stock            what it sells, in the order shown
 *   mins             minutes each purchase takes (default 2)
 *   conditions       who may shop here (leave out for anyone)
 *   payWith          only this account, e.g. "bank" (leave out for any)
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { pounds } = setup.town;

		/** A shop; plain item ids in the stock list become { item }. */
		const shop = ({ stock, ...def }) =>
			R.define("shop", { ...def, stock: stock.map((s) => (typeof s === "string" ? { item: s } : s)) });

		// ---- Patel's Corner Shop (Elm Park) ----
		shop({
			id: "patels",
			name: "Patel's Corner Shop",
			at: "corner_shop",
			desc: "A bit pricier than the supermarket, but it's at the end of your road and open late.",
			stock: [
				"chocolate_bar",
				"crisps",
				{ item: "sandwich", price: pounds(2.99) },
				"sausage_roll",
				"banana",
				"water_bottle",
				"cola",
				"energy_drink",
				"orange_juice",
				{ item: "groceries", price: pounds(3.50) },
			],
		});

		// ---- FreshWay Supermarket (inside The Arcade) ----
		shop({
			id: "freshway",
			name: "FreshWay Supermarket",
			at: "arcade_freshway",
			desc: "Everything you need, slightly cheaper than the corner shop.",
			stock: [
				"groceries",
				"apple",
				"banana",
				"cereal_bar",
				"chocolate_bar",
				"crisps",
				"sandwich",
				"water_bottle",
				"cola",
				"orange_juice",
				"energy_drink",
			],
		});

		// ---- Vending machine (school canteen) ----
		shop({
			id: "canteen_machine",
			name: "Vending machine",
			at: "academy_canteen",
			mins: 1,
			stock: [
				"chocolate_bar",
				"crisps",
				{ item: "water_bottle", price: pounds(1.00) },
				{ item: "cola", price: pounds(1.20) },
			],
		});

		// ---- Threadline (boutique, High Street) ----
		shop({
			id: "threadline",
			name: "Threadline",
			at: "threadline_floor",
			desc: "Small boutique: fewer things, nicer quality, higher prices.",
			stock: [
				"striped_top",
				{ item: "knit_jumper", price: pounds(42) },
				"oxford_shirt",
				"silk_blouse",
				"black_jeans",
				"chinos",
				"pleated_skirt",
				"summer_dress",
				{ item: "black_dress", price: pounds(58) },
				"denim_jacket",
				{ item: "wool_coat", price: pounds(95) },
				"boots",
				"smart_shoes",
				"lace_bra",
				"tights",
				"scarf",
			],
		});

		// ---- Urban Thread (high-street chain, inside The Arcade) ----
		shop({
			id: "urban_thread",
			name: "Urban Thread",
			at: "arcade_urban_thread",
			desc: "High-street basics at high-street prices.",
			stock: [
				"white_tshirt",
				"black_tshirt",
				"crop_top",
				{ item: "grey_hoodie", price: pounds(20) },
				"sports_top",
				{ item: "blue_jeans", price: pounds(25) },
				"black_jeans",
				"joggers",
				"denim_shorts",
				"leggings",
				"summer_dress",
				"rain_jacket",
				"puffer_jacket",
				"briefs",
				"boxers",
				"sports_bra",
				"socks",
				"tights",
				"trainers",
				"sliders",
				"beanie",
				"baseball_cap",
				"pyjamas",
			],
		});
	});
})();
