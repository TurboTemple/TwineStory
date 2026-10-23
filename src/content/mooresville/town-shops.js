/*
 * ============================================================================
 *  Mooresville — shops and what they sell
 * ============================================================================
 *
 * Each shop has a stock list. An entry is either:
 *   "item_id"                         sold at the item's own price
 *   { item: "item_id", price: 25 }    sold at this shop's price instead (whole pounds)
 *
 * The items themselves and their prices are in town-items.js and
 * town-clothing.js. Decided by the user: things cost the same everywhere,
 * so no shop sets its own prices at the moment.
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
		/** A shop; plain item ids in the stock list become { item }. */
		const shop = ({ stock, ...def }) =>
			R.define("shop", { ...def, stock: stock.map((s) => (typeof s === "string" ? { item: s } : s)) });

		// ---- Patel's Corner Shop (Elm Park) ----
		shop({
			id: "patels",
			name: "Patel's Corner Shop",
			at: "corner_shop",
			desc: "At the end of your road and open late: snacks, drinks and groceries.",
			stock: [
				"chocolate_bar",
				"crisps",
				"sandwich",
				"sausage_roll",
				"banana",
				"water_bottle",
				"cola",
				"energy_drink",
				"orange_juice",
				"groceries",
			],
		});

		// ---- FreshWay Supermarket (inside The Arcade) ----
		shop({
			id: "freshway",
			name: "FreshWay Supermarket",
			at: "arcade_freshway",
			desc: "Everything you need in one place, and fresh fruit too.",
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
				"water_bottle",
				"cola",
			],
		});

		// ---- Threadline (boutique, High Street) ----
		shop({
			id: "threadline",
			name: "Threadline",
			at: "threadline_floor",
			desc: "Small boutique: the smarter, better-made end of things.",
			stock: [
				"striped_top",
				"knit_jumper",
				"oxford_shirt",
				"silk_blouse",
				"black_jeans",
				"chinos",
				"pleated_skirt",
				"summer_dress",
				"black_dress",
				"denim_jacket",
				"wool_coat",
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
			desc: "High-street basics, sportswear and coats.",
			stock: [
				"white_tshirt",
				"black_tshirt",
				"crop_top",
				"grey_hoodie",
				"sports_top",
				"blue_jeans",
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
