/*
 * Mooresville — clothing slots and clothes.
 *
 * `warmth` and `formality` (0–5) are added up over your outfit, and can
 * switch effects on (see the bottom of this file). An item can also have
 * its own `modifiers`, which apply while you wear it.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/* ---- Slots (head to toe) ------------------------------------------- */

		const slot = (id, label, order) => R.define("clothingSlot", { id, label, order });
		slot("outer", "Coat or jacket", 0);
		slot("top", "Top", 1);
		slot("bottom", "Bottoms", 2);
		slot("under_top", "Bra", 3);
		slot("under_bottom", "Underwear", 4);
		slot("legs", "Socks or tights", 5);
		slot("feet", "Shoes", 6);
		slot("accessory", "Accessory", 7);

		/** A piece of clothing. */
		const wear = (id, name, price, slots, attrs = {}, extra = {}) => R.define("item", {
			id, name, price, category: "clothes", stackable: false, size: attrs.size ?? 1,
			clothing: { slots, warmth: attrs.warmth ?? 0, formality: attrs.formality ?? 0, modifiers: attrs.modifiers ?? [] },
			...extra,
		});
		const cosy = { tags: ["cosy"] };

		// Tops
		wear("white_tshirt", "White T-shirt", 800, ["top"], { warmth: 1 });
		wear("black_tshirt", "Black T-shirt", 800, ["top"], { warmth: 1 });
		wear("striped_top", "Striped long-sleeve top", 1800, ["top"], { warmth: 2, formality: 1 });
		wear("grey_hoodie", "Grey hoodie", 2200, ["top"], { warmth: 3 }, cosy);
		wear("knit_jumper", "Cream knit jumper", 3500, ["top"], { warmth: 4, formality: 2 }, cosy);
		wear("oxford_shirt", "Blue Oxford shirt", 2800, ["top"], { warmth: 1, formality: 3 });
		wear("silk_blouse", "Silk blouse", 4200, ["top"], { warmth: 1, formality: 3 });
		wear("crop_top", "Black crop top", 1200, ["top"], { warmth: 0, formality: 1 });
		wear("sports_top", "Sports top", 1500, ["top"], { warmth: 1 }, { tags: ["sportswear"] });

		// Bottoms
		wear("blue_jeans", "Blue jeans", 3000, ["bottom"], { warmth: 2, formality: 1 });
		wear("black_jeans", "Black skinny jeans", 3200, ["bottom"], { warmth: 2, formality: 2 });
		wear("chinos", "Beige chinos", 2800, ["bottom"], { warmth: 2, formality: 3 });
		wear("joggers", "Grey joggers", 1800, ["bottom"], { warmth: 2 }, cosy);
		wear("denim_shorts", "Denim shorts", 1800, ["bottom"], { warmth: 0, formality: 1 });
		wear("pleated_skirt", "Pleated midi skirt", 2600, ["bottom"], { warmth: 1, formality: 2 });
		wear("leggings", "Black leggings", 1600, ["bottom"], { warmth: 1 }, { tags: ["sportswear"] });

		// One-piece
		wear("summer_dress", "Floral summer dress", 3800, ["top", "bottom"], { warmth: 1, formality: 2 });
		wear("black_dress", "Little black dress", 5200, ["top", "bottom"], { warmth: 1, formality: 4 }, { tags: ["evening"] });
		wear("pyjamas", "Pyjamas", 1500, ["top", "bottom"], { warmth: 2 }, { tags: ["sleepwear", "cosy"] });

		// Coats
		wear("rain_jacket", "Navy rain jacket", 3500, ["outer"], { warmth: 2, size: 2 });
		wear("denim_jacket", "Denim jacket", 4000, ["outer"], { warmth: 2, formality: 1, size: 2 });
		wear("wool_coat", "Wool coat", 8500, ["outer"], { warmth: 5, formality: 4, size: 2 });
		wear("puffer_jacket", "Puffer jacket", 6000, ["outer"], { warmth: 5, size: 2 });

		// Underwear and socks
		wear("briefs", "Cotton briefs", 600, ["under_bottom"]);
		wear("boxers", "Boxer shorts", 700, ["under_bottom"]);
		wear("sports_bra", "Sports bra", 1400, ["under_top"], {}, { tags: ["sportswear"] });
		wear("lace_bra", "Lace bra", 2200, ["under_top"], { formality: 1 });
		wear("socks", "Pair of socks", 300, ["legs"], { warmth: 1 });
		wear("tights", "Black tights", 500, ["legs"], { warmth: 1, formality: 2 });

		// Shoes
		wear("trainers", "White trainers", 5500, ["feet"], { warmth: 1, size: 2 }, { tags: ["sportswear"] });
		wear("boots", "Ankle boots", 6500, ["feet"], { warmth: 2, formality: 2, size: 2 });
		// Smart but not made for walking.
		wear("smart_shoes", "Smart black shoes", 4500, ["feet"], { warmth: 1, formality: 4, size: 2, modifiers: [{ stat: "energy", op: "rateAdd", value: -0.5 }] });
		wear("sliders", "Sliders", 1500, ["feet"], { size: 1 });

		// Accessories
		wear("beanie", "Beanie hat", 1200, ["accessory"], { warmth: 2 });
		wear("scarf", "Wool scarf", 1600, ["accessory"], { warmth: 2, formality: 1 });
		wear("baseball_cap", "Baseball cap", 1400, ["accessory"]);

		// You wake up on day one in pyjamas.
		R.define("outfit", { id: "starting_outfit", label: "Pyjamas", items: ["pyjamas", "briefs"], start: true });

		/* ---- Effects from what you wear ------------------------------------- */

		const outfitEffect = (id, label, desc, whileCond, modifiers, good = true) =>
			R.define("statusEffect", { id, label, desc, whileCond, modifiers, good });
		outfitEffect("cosy", "Cosy", "Soft, comfy clothes. You feel relaxed.", { wearing: { tag: "cosy" } },
			[{ stat: "stress", op: "add", value: -3 }, { stat: "mood", op: "add", value: 2 }]);
		outfitEffect("smartly_dressed", "Smartly dressed", "You look sharp, and you know it. People may treat you differently.", { outfit: { formality: { min: 9 } } },
			[{ stat: "mood", op: "add", value: 3 }]);
		outfitEffect("dressed_to_impress", "Dressed to impress", "An outfit for a night out. Heads turn.", { wearing: { tag: "evening" } },
			[{ stat: "mood", op: "add", value: 4 }]);
		outfitEffect("in_sportswear", "In sportswear", "Dressed for exercise.", { all: [{ wearing: { tag: "sportswear" } }, { not: { wearing: { tag: "sleepwear" } } }] }, [], null);
	});
})();
