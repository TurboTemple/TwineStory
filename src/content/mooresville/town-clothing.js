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
 * Each piece of clothing is one self-contained item: its price, which shops
 * sell it, what it does for you and what it's like are all in its own
 * definition. Nothing else needs changing to add, sell or remove one.
 * (What's in your wardrobe at the start is in town-items.js.)
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD A PIECE OF CLOTHING
 * ---------------------------------------------------------------------------
 *   item({
 *       id: "red_hoodie",
 *       name: "Red hoodie",
 *       price: 20,                                      // whole pounds
 *       tags: ["clothing", "urban_thread", "warm", "cosy"],
 *       slots: ["top"],
 *       modifiers: [mod.add("mood", 1)],                // while you wear it
 *   });
 *
 * ---------------------------------------------------------------------------
 *  FIELDS
 * ---------------------------------------------------------------------------
 *   price       what it costs, in whole pounds (see the price guide in part 2)
 *   tags        everything about it, as simple yes/no labels:
 *                 "clothing"        it's something you wear (the wardrobe
 *                                   takes it). Put this first: shops list
 *                                   items under their first tag.
 *                 a shop's id       that shop sells it: "urban_thread",
 *                                   "threadline" (see town-shops.js)
 *                 "warm"            keeps you from getting Cold outdoors on a
 *                                   cold day (5°C or below)
 *                 "waterproof"      keeps you from Getting wet in the rain
 *                 "smart"           two or more smart things = "Smartly dressed"
 *                 "cosy", "sportswear", "evening"   switch on effects (part 4)
 *                 "sleepwear"       you can't go out in it
 *   slots       where it's worn (it replaces whatever was there); a dress
 *               uses ["top", "bottom"]
 *   modifiers   stat changes while you wear it (see `mod` in town-kit.js)
 *   size        room it takes in your bag (default 1; coats and shoes 2)
 *   desc        a line about it, shown in shops and your bag
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
		 *  2. Clothes
		 * ======================================================================
		 *
		 * Price guide (decided by the user: price follows what it gives you):
		 *   £10  basics        no boost
		 *   £20  cheap         Mood +1 while worn
		 *   £50  good          Mood +2
		 *   £100 top           Mood +4
		 */

		const item = (def) => R.define("item", def);

		// ---- Tops ----
		item({
			id: "white_tshirt",
			name: "White T-shirt",
			price: 10,
			tags: ["clothing", "urban_thread"],
			slots: ["top"],
		});
		item({
			id: "black_tshirt",
			name: "Black T-shirt",
			price: 10,
			tags: ["clothing", "urban_thread"],
			slots: ["top"],
		});
		item({
			id: "striped_top",
			name: "Striped long-sleeve top",
			price: 20,
			tags: ["clothing", "threadline"],
			slots: ["top"],
			modifiers: [mod.add("mood", 1)],
		});
		item({
			id: "crop_top",
			name: "Black crop top",
			price: 20,
			tags: ["clothing", "urban_thread"],
			slots: ["top"],
			modifiers: [mod.add("mood", 1)],
		});
		item({
			id: "sports_top",
			name: "Sports top",
			price: 20,
			tags: ["clothing", "urban_thread", "sportswear"],
			slots: ["top"],
			modifiers: [mod.add("mood", 1)],
		});
		item({
			id: "grey_hoodie",
			name: "Grey hoodie",
			price: 20,
			tags: ["clothing", "urban_thread", "warm", "cosy"],
			slots: ["top"],
			modifiers: [mod.add("mood", 1)],
		});
		item({
			id: "knit_jumper",
			name: "Cream knit jumper",
			price: 50,
			tags: ["clothing", "threadline", "warm", "cosy"],
			slots: ["top"],
			modifiers: [mod.add("mood", 2)],
		});
		item({
			id: "oxford_shirt",
			name: "Blue Oxford shirt",
			price: 50,
			tags: ["clothing", "threadline", "smart"],
			slots: ["top"],
			modifiers: [mod.add("mood", 2)],
		});
		item({
			id: "silk_blouse",
			name: "Silk blouse",
			price: 50,
			tags: ["clothing", "threadline", "smart"],
			slots: ["top"],
			modifiers: [mod.add("mood", 2)],
		});

		// ---- Bottoms ----
		item({
			id: "joggers",
			name: "Grey joggers",
			price: 20,
			tags: ["clothing", "urban_thread", "cosy"],
			slots: ["bottom"],
			modifiers: [mod.add("mood", 1)],
		});
		item({
			id: "denim_shorts",
			name: "Denim shorts",
			price: 20,
			tags: ["clothing", "urban_thread"],
			slots: ["bottom"],
			modifiers: [mod.add("mood", 1)],
		});
		item({
			id: "leggings",
			name: "Black leggings",
			price: 20,
			tags: ["clothing", "urban_thread", "sportswear"],
			slots: ["bottom"],
			modifiers: [mod.add("mood", 1)],
		});
		item({
			id: "blue_jeans",
			name: "Blue jeans",
			price: 50,
			tags: ["clothing", "urban_thread"],
			slots: ["bottom"],
			modifiers: [mod.add("mood", 2)],
		});
		item({
			id: "black_jeans",
			name: "Black skinny jeans",
			price: 50,
			tags: ["clothing", "urban_thread", "threadline"],
			slots: ["bottom"],
			modifiers: [mod.add("mood", 2)],
		});
		item({
			id: "chinos",
			name: "Beige chinos",
			price: 50,
			tags: ["clothing", "threadline", "smart"],
			slots: ["bottom"],
			modifiers: [mod.add("mood", 2)],
		});
		item({
			id: "pleated_skirt",
			name: "Pleated midi skirt",
			price: 50,
			tags: ["clothing", "threadline", "smart"],
			slots: ["bottom"],
			modifiers: [mod.add("mood", 2)],
		});

		// ---- One-piece (fills top and bottom) ----
		item({
			id: "pyjamas",
			name: "Pyjamas",
			price: 10,
			tags: ["clothing", "urban_thread", "sleepwear", "cosy"],
			slots: ["top", "bottom"],
		});
		item({
			id: "summer_dress",
			name: "Floral summer dress",
			price: 50,
			tags: ["clothing", "urban_thread", "threadline"],
			slots: ["top", "bottom"],
			modifiers: [mod.add("mood", 2)],
		});
		item({
			id: "black_dress",
			name: "Little black dress",
			price: 100,
			tags: ["clothing", "threadline", "smart", "evening"],
			slots: ["top", "bottom"],
			modifiers: [mod.add("mood", 4)],
		});

		// ---- Coats ----
		item({
			id: "rain_jacket",
			name: "Navy rain jacket",
			price: 50,
			tags: ["clothing", "urban_thread", "waterproof"],
			slots: ["outer"],
			modifiers: [mod.add("mood", 2)],
			size: 2,
		});
		item({
			id: "denim_jacket",
			name: "Denim jacket",
			price: 50,
			tags: ["clothing", "threadline"],
			slots: ["outer"],
			modifiers: [mod.add("mood", 2)],
			size: 2,
		});
		item({
			id: "wool_coat",
			name: "Wool coat",
			price: 100,
			tags: ["clothing", "threadline", "warm", "smart"],
			slots: ["outer"],
			modifiers: [mod.add("mood", 4)],
			size: 2,
		});
		item({
			id: "puffer_jacket",
			name: "Puffer jacket",
			price: 100,
			tags: ["clothing", "urban_thread", "warm", "waterproof"],
			slots: ["outer"],
			modifiers: [mod.add("mood", 4)],
			size: 2,
		});

		// ---- Underwear and socks ----
		item({
			id: "briefs",
			name: "Cotton briefs",
			price: 10,
			tags: ["clothing", "urban_thread"],
			slots: ["under_bottom"],
		});
		item({
			id: "boxers",
			name: "Boxer shorts",
			price: 10,
			tags: ["clothing", "urban_thread"],
			slots: ["under_bottom"],
		});
		item({
			id: "socks",
			name: "Pair of socks",
			price: 10,
			tags: ["clothing", "urban_thread"],
			slots: ["legs"],
		});
		item({
			id: "tights",
			name: "Black tights",
			price: 10,
			tags: ["clothing", "urban_thread", "threadline"],
			slots: ["legs"],
		});
		item({
			id: "sports_bra",
			name: "Sports bra",
			price: 20,
			tags: ["clothing", "urban_thread", "sportswear"],
			slots: ["under_top"],
			modifiers: [mod.add("mood", 1)],
		});
		item({
			id: "lace_bra",
			name: "Lace bra",
			price: 50,
			tags: ["clothing", "threadline"],
			slots: ["under_top"],
			modifiers: [mod.add("mood", 2)],
		});

		// ---- Shoes ----
		item({
			id: "sliders",
			name: "Sliders",
			price: 10,
			tags: ["clothing", "urban_thread"],
			slots: ["feet"],
		});
		item({
			id: "trainers",
			name: "White trainers",
			price: 50,
			tags: ["clothing", "urban_thread", "sportswear"],
			slots: ["feet"],
			modifiers: [mod.add("mood", 2)],
			size: 2,
		});
		item({
			id: "boots",
			name: "Ankle boots",
			price: 50,
			tags: ["clothing", "threadline"],
			slots: ["feet"],
			modifiers: [mod.add("mood", 2)],
			size: 2,
		});
		item({
			id: "smart_shoes",
			name: "Smart black shoes",
			price: 100,
			tags: ["clothing", "threadline", "smart"],
			slots: ["feet"],
			modifiers: [mod.add("mood", 4), mod.perHour("energy", -0.5) /* not made for walking */],
			size: 2,
		});

		// ---- Accessories ----
		item({
			id: "beanie",
			name: "Beanie hat",
			price: 20,
			tags: ["clothing", "urban_thread", "warm"],
			slots: ["accessory"],
			modifiers: [mod.add("mood", 1)],
		});
		item({
			id: "scarf",
			name: "Wool scarf",
			price: 20,
			tags: ["clothing", "threadline", "warm"],
			slots: ["accessory"],
			modifiers: [mod.add("mood", 1)],
		});
		item({
			id: "baseball_cap",
			name: "Baseball cap",
			price: 20,
			tags: ["clothing", "urban_thread"],
			slots: ["accessory"],
			modifiers: [mod.add("mood", 1)],
		});

		/* ======================================================================
		 *  3. The outfit you wake up in on day one
		 * ====================================================================== */

		R.define("outfit", { id: "starting_outfit", label: "Pyjamas", items: ["pyjamas", "briefs"], start: true });

		/* ======================================================================
		 *  4. Effects from what you wear
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
