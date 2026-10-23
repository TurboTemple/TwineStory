/*
 * ============================================================================
 *  Mooresville — home, family, money that comes and goes, and renting
 * ============================================================================
 *
 * What's in this file:
 *   1. Storage at home and in the flat (wardrobe, cupboards, furniture)
 *   2. Where you can live: the family home, and a flat to rent
 *   3. Regular money: pocket money, and the flat's rent
 *   4. Furniture (bought furniture is delivered home, and can unlock things)
 *   5. Family life: chores, and the curfew
 *
 * Your parents are in town-people.js; the flat and the letting agent are
 * in town-map.js. All numbers are first proposals (decided by the user:
 * prices are placeholders).
 *
 * ---------------------------------------------------------------------------
 *  HOW RENTING WORKS
 * ---------------------------------------------------------------------------
 *   At Keys & Co Lettings (High Street) every residence with `listed: true`
 *   is shown with its rent and deposit. Renting one pays the deposit and the
 *   first rent, and you move in: everything in your wardrobe, cupboards and
 *   furniture moves with you (by `storage` role). The rent bill then charges
 *   you on its day. Missing the rent runs the bill's `onMissed` effects: here,
 *   a text from the agent, and after two missed payments in a row, eviction
 *   (you move back home and lose the deposit). Ending your tenancy at the
 *   agent's gives the deposit back.
 *
 * ---------------------------------------------------------------------------
 *  RESIDENCE FIELDS
 * ---------------------------------------------------------------------------
 *   id, label, desc  the place, as listed at the letting agent
 *   at               the place on the map (its rooms count as home)
 *   start: true      where you live on a new game (exactly one)
 *   storage          your storage there, by role: wardrobe, cupboards, furniture
 *   rentBill         the bill that charges the rent (part 3)
 *   deposit          paid when you move in, back when you leave properly
 *   conditions       who can rent it ({ employed: true } = you need a job)
 *   listed: true     shown at letting agents
 *
 *  BILL FIELDS (part 3)
 *   label, amount    shown in the Me page and calendar; whole pounds
 *   kind             "charge" (you pay) or "income" (you're paid)
 *   every            "day", "week" (on `weekday`, 0 = Sunday) or "month" (on `date`, 1–28)
 *   account          which account it uses (leave out: any for a charge, the first for income)
 *   activeIf         only while this is true (e.g. while you rent the flat)
 *   onPaid, onMissed effects when it's paid, or when you can't pay
 *                    ({ billMissed: { id, min: 2 } } tests missed payments in a row)
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		/* ======================================================================
		 *  1. Storage
		 * ====================================================================== */

		const storage = (def) => R.define("storage", def);

		// At home (the wardrobe and cupboards are in town-items.js).
		storage({ id: "home_furniture", label: "Furniture", at: "home_living_room", accepts: ["furniture"], order: 3 });

		// In the flat.
		storage({ id: "flat_wardrobe", label: "Clothes rail", at: "flat_bedroom", accepts: ["clothing"], order: 1 });
		storage({ id: "flat_cupboards", label: "Kitchen cupboards", at: "flat_kitchen", accepts: ["food", "drink", "groceries"], order: 2 });
		storage({ id: "flat_furniture", label: "Furniture", at: "flat_living", accepts: ["furniture"], order: 3 });

		/* ======================================================================
		 *  2. Where you can live
		 * ====================================================================== */

		R.define("residence", {
			id: "family_home",
			label: "14 Elm Road (with your parents)",
			at: "home",
			start: true,
			storage: { wardrobe: "wardrobe", cupboards: "cupboards", furniture: "home_furniture" },
		});

		R.define("residence", {
			id: "riverside_flat",
			label: "Flat 4, Riverside Court",
			desc: "A one-bedroom flat by the river. Small, a bit damp, all yours.",
			at: "riverside_court",
			storage: { wardrobe: "flat_wardrobe", cupboards: "flat_cupboards", furniture: "flat_furniture" },
			rentBill: "rent_riverside_flat",
			deposit: 160,
			conditions: { employed: true }, // the agent wants to see you have a job
			listed: true,
		});

		/* ======================================================================
		 *  3. Regular money
		 * ====================================================================== */

		R.define("bill", {
			id: "pocket_money",
			label: "Pocket money from Mum and Dad",
			kind: "income",
			amount: 20,
			every: "week",
			weekday: 6, // Saturday
			account: "cash",
			activeIf: { livesAt: "family_home" },
		});

		R.define("bill", {
			id: "rent_riverside_flat",
			label: "Rent: Flat 4, Riverside Court",
			amount: 80,
			every: "week",
			weekday: 1, // Monday
			activeIf: { renting: "riverside_flat" },
			onMissed: [
				{ contact: "dawn_fletcher" },
				{ message: { from: "dawn_fletcher", text: "Hi, it's Dawn from Keys & Co. Your rent didn't go through this week. Please sort it as soon as you can." } },
				// Two missed in a row and you're out.
				{ if: { cond: { billMissed: { id: "rent_riverside_flat", min: 2 } }, then: [{ evict: true }] } },
			],
		});

		/* ======================================================================
		 *  4. Furniture
		 * ======================================================================
		 *
		 * kind: "furniture" items are delivered to your home's furniture storage
		 * when you buy them. { furniture: "tv_set" } is true while one is in the
		 * home you live in, so furniture can unlock actions (below).
		 */

		R.define("item", {
			id: "tv_set",
			name: "TV",
			desc: "A flat-screen TV. Delivered to your home.",
			price: 100,
			kind: "furniture",
			shops: ["freshway"],
			size: 4,
		});

		R.define("action", {
			id: "flat_watch_tv",
			label: "Watch TV",
			at: "flat_living",
			mins: 60,
			hidden: true, // only once you've a TV here
			conditions: { furniture: "tv_set" },
			costs: [{ status: "watching_tv" }],
			always: [{ statusRemove: "watching_tv" }],
		});

		/* ======================================================================
		 *  5. Family life
		 * ======================================================================
		 *
		 * Chores: helping out at home makes your parents happier. Once every 12
		 * hours (the hidden "Did your chores" effect is the timer).
		 */

		R.define("statusEffect", { id: "did_chores", label: "Did your chores", hidden: true, mins: 720 });

		const chore = (def) => R.define("action", {
			...def,
			conditions: { livesAt: "family_home", not: { status: "did_chores" } },
			effects: [...def.effects, { status: "did_chores" }],
		});
		chore({
			id: "chore_washing_up",
			label: "Do the washing up",
			at: "home_kitchen",
			mins: 20,
			effects: [{ rel: { npc: "mum", friendship: 2 } }, { rel: { npc: "dad", friendship: 1 } }, { stat: { stress: 1 } }],
		});
		chore({
			id: "chore_hoover",
			label: "Hoover the living room",
			at: "home_living_room",
			mins: 25,
			effects: [{ rel: { npc: "dad", friendship: 2 } }, { rel: { npc: "mum", friendship: 1 } }, { stat: { energy: -3 } }],
		});

		// The curfew: living at home and still out at 11pm, Mum texts and isn't
		// pleased. Once a night.
		R.define("storylet", {
			id: "curfew",
			kind: "story",
			passage: "Ev_curfew",
			triggers: ["time:hour"],
			conditions: { livesAt: "family_home", atHome: false, time: { from: "23:00", to: "05:00" }, not: { status: "asleep" } },
			cooldown: 720,
			effects: [
				{ message: { from: "mum", text: "It's gone 11. Where are you? Home. Now, please." } },
				{ rel: { npc: "mum", friendship: -3 } },
			],
		});
	});
})();
