/*
 * ============================================================================
 *  Mooresville — clothes
 * ============================================================================
 *
 * What's in this file:
 *   1. Clothing slots (where on the body something goes)
 *   2. Price tiers: what a piece of clothing costs and gives you
 *   3. Every piece of clothing
 *   4. The outfit you wake up in on day one
 *   5. Effects your clothes can switch on (Cosy, Smartly dressed…)
 *
 * What's in your wardrobe at the start is in town-items.js (the wardrobe).
 * Which shop sells what is in town-shops.js.
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD A PIECE OF CLOTHING
 * ---------------------------------------------------------------------------
 *   wear({
 *       id: "red_hoodie",
 *       name: "Red hoodie",
 *       tier: "cheap",           // sets the price and the mood boost (part 2)
 *       slots: ["top"],          // see the slots below; a dress uses ["top", "bottom"]
 *       tags: ["warm", "cosy"],  // optional: see TAGS below
 *   });
 *   Then add "red_hoodie" to a shop in town-shops.js.
 *
 * ---------------------------------------------------------------------------
 *  FIELDS
 * ---------------------------------------------------------------------------
 *   tier        "basic" (£10), "cheap" (£20), "good" (£50) or "top" (£100).
 *               Better clothes cost more and lift your mood more while you
 *               wear them (decided by the user: price follows what it gives).
 *   slots       which slots it fills (it replaces whatever was there)
 *   size        room it takes in your bag (default 1; coats and shoes 2)
 *   modifiers   extra stat changes while you wear it (see `mod` in town-kit.js)
 *   tags        simple yes/no labels (decided by the user):
 *                 warm        keeps you from getting Cold outdoors on a cold day
 *                 smart       two or more smart things = "Smartly dressed"
 *                 waterproof  keeps you from Getting wet in the rain
 *                 cosy, sportswear, evening   switch on effects (part 5)
 *                 sleepwear   you can't go out in it
 *
 *  Pictures: assets/media/item/<id>.webp (or .jpg/.png/.gif).
 *
 *  The "dressed to go out" rule (top + bottoms + shoes, no sleepwear) is in
 *  src/01-engine/config.js under `clothing`.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { mod } = setup.town;

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
		 *  2. Price tiers
		 * ======================================================================
		 *
		 * Every piece of clothing is in one tier. The tier sets its price (whole
		 * pounds) and how much it lifts your mood while you wear it.
		 */

		const TIERS = {
			basic: { price: 10, mood: 0 },  // plain everyday basics
			cheap: { price: 20, mood: 1 },  // a small boost
			good: { price: 50, mood: 2 },   // a better boost
			top: { price: 100, mood: 4 },   // the best
		};

		/* ======================================================================
		 *  3. Clothes
		 * ====================================================================== */

		/** A piece of clothing (an item in the "clothes" category; each one is unique). */
		const wear = ({ id, name, tier, slots, tags = [], modifiers = [], size = 1, ...extra }) => {
			const t = TIERS[tier];
			if (!t) throw new setup.GameError(`Clothing "${id}": tier must be one of ${Object.keys(TIERS).join(", ")}`);
			return R.define("item", {
				id,
				name,
				price: t.price,
				category: "clothes",
				stackable: false,
				size,
				tier,
				tags,
				clothing: { slots, modifiers: [...(t.mood ? [mod.add("mood", t.mood)] : []), ...modifiers] },
				...extra,
			});
		};

		// ---- Tops ----
		wear({ id: "white_tshirt", name: "White T-shirt", tier: "basic", slots: ["top"] });
		wear({ id: "black_tshirt", name: "Black T-shirt", tier: "basic", slots: ["top"] });
		wear({ id: "striped_top", name: "Striped long-sleeve top", tier: "cheap", slots: ["top"] });
		wear({ id: "crop_top", name: "Black crop top", tier: "cheap", slots: ["top"] });
		wear({ id: "sports_top", name: "Sports top", tier: "cheap", slots: ["top"], tags: ["sportswear"] });
		wear({ id: "grey_hoodie", name: "Grey hoodie", tier: "cheap", slots: ["top"], tags: ["warm", "cosy"] });
		wear({ id: "knit_jumper", name: "Cream knit jumper", tier: "good", slots: ["top"], tags: ["warm", "cosy"] });
		wear({ id: "oxford_shirt", name: "Blue Oxford shirt", tier: "good", slots: ["top"], tags: ["smart"] });
		wear({ id: "silk_blouse", name: "Silk blouse", tier: "good", slots: ["top"], tags: ["smart"] });

		// ---- Bottoms ----
		wear({ id: "joggers", name: "Grey joggers", tier: "cheap", slots: ["bottom"], tags: ["cosy"] });
		wear({ id: "denim_shorts", name: "Denim shorts", tier: "cheap", slots: ["bottom"] });
		wear({ id: "leggings", name: "Black leggings", tier: "cheap", slots: ["bottom"], tags: ["sportswear"] });
		wear({ id: "blue_jeans", name: "Blue jeans", tier: "good", slots: ["bottom"] });
		wear({ id: "black_jeans", name: "Black skinny jeans", tier: "good", slots: ["bottom"] });
		wear({ id: "chinos", name: "Beige chinos", tier: "good", slots: ["bottom"], tags: ["smart"] });
		wear({ id: "pleated_skirt", name: "Pleated midi skirt", tier: "good", slots: ["bottom"], tags: ["smart"] });

		// ---- One-piece (fills top and bottom) ----
		wear({ id: "pyjamas", name: "Pyjamas", tier: "basic", slots: ["top", "bottom"], tags: ["sleepwear", "cosy"] });
		wear({ id: "summer_dress", name: "Floral summer dress", tier: "good", slots: ["top", "bottom"] });
		wear({ id: "black_dress", name: "Little black dress", tier: "top", slots: ["top", "bottom"], tags: ["smart", "evening"] });

		// ---- Coats ----
		wear({ id: "rain_jacket", name: "Navy rain jacket", tier: "good", slots: ["outer"], size: 2, tags: ["waterproof"] });
		wear({ id: "denim_jacket", name: "Denim jacket", tier: "good", slots: ["outer"], size: 2 });
		wear({ id: "wool_coat", name: "Wool coat", tier: "top", slots: ["outer"], size: 2, tags: ["warm", "smart"] });
		wear({ id: "puffer_jacket", name: "Puffer jacket", tier: "top", slots: ["outer"], size: 2, tags: ["warm", "waterproof"] });

		// ---- Underwear and socks ----
		wear({ id: "briefs", name: "Cotton briefs", tier: "basic", slots: ["under_bottom"] });
		wear({ id: "boxers", name: "Boxer shorts", tier: "basic", slots: ["under_bottom"] });
		wear({ id: "socks", name: "Pair of socks", tier: "basic", slots: ["legs"] });
		wear({ id: "tights", name: "Black tights", tier: "basic", slots: ["legs"] });
		wear({ id: "sports_bra", name: "Sports bra", tier: "cheap", slots: ["under_top"], tags: ["sportswear"] });
		wear({ id: "lace_bra", name: "Lace bra", tier: "good", slots: ["under_top"] });

		// ---- Shoes ----
		wear({ id: "sliders", name: "Sliders", tier: "basic", slots: ["feet"] });
		wear({ id: "trainers", name: "White trainers", tier: "good", slots: ["feet"], size: 2, tags: ["sportswear"] });
		wear({ id: "boots", name: "Ankle boots", tier: "good", slots: ["feet"], size: 2 });
		wear({
			id: "smart_shoes",
			name: "Smart black shoes",
			tier: "top",
			slots: ["feet"],
			size: 2,
			tags: ["smart"],
			// Smart, but not made for walking: you tire a little faster in them.
			modifiers: [mod.perHour("energy", -0.5)],
		});

		// ---- Accessories ----
		wear({ id: "beanie", name: "Beanie hat", tier: "cheap", slots: ["accessory"], tags: ["warm"] });
		wear({ id: "scarf", name: "Wool scarf", tier: "cheap", slots: ["accessory"], tags: ["warm"] });
		wear({ id: "baseball_cap", name: "Baseball cap", tier: "cheap", slots: ["accessory"] });

		/* ======================================================================
		 *  4. The outfit you wake up in on day one
		 * ====================================================================== */

		R.define("outfit", { id: "starting_outfit", label: "Pyjamas", items: ["pyjamas", "briefs"], start: true });

		/* ======================================================================
		 *  5. Effects from what you wear
		 * ======================================================================
		 *
		 * Each is on whenever its `whileCond` is true. Conditions you can use:
		 *   { wearing: "item_id" }                  wearing that exact item
		 *   { wearing: { tag: "cosy" } }            wearing anything with that tag
		 *   { wearing: { tag: "smart", min: 2 } }   wearing at least 2 things with that tag
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
			whileCond: { wearing: { tag: "smart", min: 2 } },
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
