/*
 * ============================================================================
 *  Mooresville — clothes
 * ============================================================================
 *
 * What's in this file:
 *   1. Clothing slots (where on the body something goes)
 *   2. Every piece of clothing
 *   3. The outfit you wake up in on day one
 *   4. Effects your clothes can switch on (Cosy, Smartly dressed…)
 *
 * What's in your wardrobe at the start is in town-items.js (the wardrobe).
 * Which shop sells what is in town-shops.js. Prices are placeholders.
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD A PIECE OF CLOTHING
 * ---------------------------------------------------------------------------
 *   wear({
 *       id: "red_hoodie",
 *       name: "Red hoodie",
 *       price: pounds(24),
 *       slots: ["top"],          // see the slots below; a dress uses ["top", "bottom"]
 *       warmth: 3,               // 0–5
 *       tags: ["cosy"],          // optional: switches on effects (see part 4)
 *   });
 *   Then add "red_hoodie" to a shop in town-shops.js.
 *
 * ---------------------------------------------------------------------------
 *  CLOTHING FIELDS
 * ---------------------------------------------------------------------------
 *   slots       which slots it fills (it replaces whatever was there)
 *   warmth      0–5, added up over your outfit. The weather says how much
 *               you need outdoors (town-weather.js); everyday clothes are ~5.
 *   formality   0–5, added up too. 9+ makes you "Smartly dressed".
 *   size        room it takes in your bag (default 1; coats and shoes 2)
 *   modifiers   stat changes while you wear it (see `mod` in town-kit.js)
 *   tags        labels that effects can check: "cosy", "sportswear",
 *               "evening", "sleepwear", "waterproof"
 *
 *  Pictures: assets/media/item/<id>.webp (or .jpg/.png/.gif).
 *
 *  The "dressed to go out" rule (top + bottoms + shoes, no sleepwear) is in
 *  src/01-engine/config.js under `clothing`.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { pounds, mod } = setup.town;

		/* ======================================================================
		 *  1. Slots, head to toe
		 * ====================================================================== */

		const slot = (def) => R.define("clothingSlot", def);

		slot({ id: "outer", label: "Coat or jacket", order: 0 });
		slot({ id: "top", label: "Top", order: 1 });
		slot({ id: "bottom", label: "Bottoms", order: 2 });
		slot({ id: "under_top", label: "Bra", order: 3 });
		slot({ id: "under_bottom", label: "Underwear", order: 4 });
		slot({ id: "legs", label: "Socks or tights", order: 5 });
		slot({ id: "feet", label: "Shoes", order: 6 });
		slot({ id: "accessory", label: "Accessory", order: 7 });

		/* ======================================================================
		 *  2. Clothes
		 * ====================================================================== */

		/** A piece of clothing (an item in the "clothes" category; each one is unique). */
		const wear = ({ id, name, price, slots, warmth = 0, formality = 0, size = 1, modifiers = [], ...extra }) =>
			R.define("item", {
				id,
				name,
				price,
				category: "clothes",
				stackable: false,
				size,
				clothing: { slots, warmth, formality, modifiers },
				...extra,
			});

		// ---- Tops ----
		wear({ id: "white_tshirt", name: "White T-shirt", price: pounds(8), slots: ["top"], warmth: 1 });
		wear({ id: "black_tshirt", name: "Black T-shirt", price: pounds(8), slots: ["top"], warmth: 1 });
		wear({ id: "striped_top", name: "Striped long-sleeve top", price: pounds(18), slots: ["top"], warmth: 2, formality: 1 });
		wear({ id: "grey_hoodie", name: "Grey hoodie", price: pounds(22), slots: ["top"], warmth: 3, tags: ["cosy"] });
		wear({ id: "knit_jumper", name: "Cream knit jumper", price: pounds(35), slots: ["top"], warmth: 4, formality: 2, tags: ["cosy"] });
		wear({ id: "oxford_shirt", name: "Blue Oxford shirt", price: pounds(28), slots: ["top"], warmth: 1, formality: 3 });
		wear({ id: "silk_blouse", name: "Silk blouse", price: pounds(42), slots: ["top"], warmth: 1, formality: 3 });
		wear({ id: "crop_top", name: "Black crop top", price: pounds(12), slots: ["top"], warmth: 0, formality: 1 });
		wear({ id: "sports_top", name: "Sports top", price: pounds(15), slots: ["top"], warmth: 1, tags: ["sportswear"] });

		// ---- Bottoms ----
		wear({ id: "blue_jeans", name: "Blue jeans", price: pounds(30), slots: ["bottom"], warmth: 2, formality: 1 });
		wear({ id: "black_jeans", name: "Black skinny jeans", price: pounds(32), slots: ["bottom"], warmth: 2, formality: 2 });
		wear({ id: "chinos", name: "Beige chinos", price: pounds(28), slots: ["bottom"], warmth: 2, formality: 3 });
		wear({ id: "joggers", name: "Grey joggers", price: pounds(18), slots: ["bottom"], warmth: 2, tags: ["cosy"] });
		wear({ id: "denim_shorts", name: "Denim shorts", price: pounds(18), slots: ["bottom"], warmth: 0, formality: 1 });
		wear({ id: "pleated_skirt", name: "Pleated midi skirt", price: pounds(26), slots: ["bottom"], warmth: 1, formality: 2 });
		wear({ id: "leggings", name: "Black leggings", price: pounds(16), slots: ["bottom"], warmth: 1, tags: ["sportswear"] });

		// ---- One-piece (fills top and bottom) ----
		wear({ id: "summer_dress", name: "Floral summer dress", price: pounds(38), slots: ["top", "bottom"], warmth: 1, formality: 2 });
		wear({ id: "black_dress", name: "Little black dress", price: pounds(52), slots: ["top", "bottom"], warmth: 1, formality: 4, tags: ["evening"] });
		wear({ id: "pyjamas", name: "Pyjamas", price: pounds(15), slots: ["top", "bottom"], warmth: 2, tags: ["sleepwear", "cosy"] });

		// ---- Coats (rain jacket and puffer keep you dry) ----
		wear({ id: "rain_jacket", name: "Navy rain jacket", price: pounds(35), slots: ["outer"], warmth: 2, size: 2, tags: ["waterproof"] });
		wear({ id: "denim_jacket", name: "Denim jacket", price: pounds(40), slots: ["outer"], warmth: 2, formality: 1, size: 2 });
		wear({ id: "wool_coat", name: "Wool coat", price: pounds(85), slots: ["outer"], warmth: 5, formality: 4, size: 2 });
		wear({ id: "puffer_jacket", name: "Puffer jacket", price: pounds(60), slots: ["outer"], warmth: 5, size: 2, tags: ["waterproof"] });

		// ---- Underwear and socks ----
		wear({ id: "briefs", name: "Cotton briefs", price: pounds(6), slots: ["under_bottom"] });
		wear({ id: "boxers", name: "Boxer shorts", price: pounds(7), slots: ["under_bottom"] });
		wear({ id: "sports_bra", name: "Sports bra", price: pounds(14), slots: ["under_top"], tags: ["sportswear"] });
		wear({ id: "lace_bra", name: "Lace bra", price: pounds(22), slots: ["under_top"], formality: 1 });
		wear({ id: "socks", name: "Pair of socks", price: pounds(3), slots: ["legs"], warmth: 1 });
		wear({ id: "tights", name: "Black tights", price: pounds(5), slots: ["legs"], warmth: 1, formality: 2 });

		// ---- Shoes ----
		wear({ id: "trainers", name: "White trainers", price: pounds(55), slots: ["feet"], warmth: 1, size: 2, tags: ["sportswear"] });
		wear({ id: "boots", name: "Ankle boots", price: pounds(65), slots: ["feet"], warmth: 2, formality: 2, size: 2 });
		wear({
			id: "smart_shoes",
			name: "Smart black shoes",
			price: pounds(45),
			slots: ["feet"],
			warmth: 1,
			formality: 4,
			size: 2,
			// Smart, but not made for walking: you tire a little faster in them.
			modifiers: [mod.perHour("energy", -0.5)],
		});
		wear({ id: "sliders", name: "Sliders", price: pounds(15), slots: ["feet"], size: 1 });

		// ---- Accessories ----
		wear({ id: "beanie", name: "Beanie hat", price: pounds(12), slots: ["accessory"], warmth: 2 });
		wear({ id: "scarf", name: "Wool scarf", price: pounds(16), slots: ["accessory"], warmth: 2, formality: 1 });
		wear({ id: "baseball_cap", name: "Baseball cap", price: pounds(14), slots: ["accessory"] });

		/* ======================================================================
		 *  3. The outfit you wake up in on day one
		 * ====================================================================== */

		R.define("outfit", { id: "starting_outfit", label: "Pyjamas", items: ["pyjamas", "briefs"], start: true });

		/* ======================================================================
		 *  4. Effects from what you wear
		 * ======================================================================
		 *
		 * Each is on whenever its `whileCond` is true. Conditions you can use:
		 *   { wearing: "item_id" }               wearing that exact item
		 *   { wearing: { tag: "cosy" } }         wearing anything with that tag
		 *   { outfit: { formality: { min: 9 } } } outfit totals (warmth, formality)
		 * Events can check for these effects with { status: "smartly_dressed" }.
		 */

		const outfitEffect = (def) => R.define("statusEffect", { good: true, ...def });

		outfitEffect({
			id: "cosy",
			label: "Cosy",
			desc: "Soft, comfy clothes. You feel relaxed.",
			whileCond: { wearing: { tag: "cosy" } },
			modifiers: [mod.add("stress", -3), mod.add("mood", 2)],
		});
		outfitEffect({
			id: "smartly_dressed",
			label: "Smartly dressed",
			desc: "You look sharp, and you know it. People may treat you differently.",
			whileCond: { outfit: { formality: { min: 9 } } },
			modifiers: [mod.add("mood", 3)],
		});
		outfitEffect({
			id: "dressed_to_impress",
			label: "Dressed to impress",
			desc: "An outfit for a night out. Heads turn.",
			whileCond: { wearing: { tag: "evening" } },
			modifiers: [mod.add("mood", 4)],
		});
		outfitEffect({
			id: "in_sportswear",
			label: "In sportswear",
			desc: "Dressed for exercise.",
			whileCond: { all: [{ wearing: { tag: "sportswear" } }, { not: { wearing: { tag: "sleepwear" } } }] },
			modifiers: [],
			good: null,
		});
	});
})();
