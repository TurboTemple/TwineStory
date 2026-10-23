/*
 * ============================================================================
 *  Mooresville — the apps on your phone
 * ============================================================================
 *
 * Open the phone from the sidebar menu (Menu → Phone). Each app below is an
 * icon on the home screen, in `order`.
 *
 *   view        what the app shows. These are built into the game:
 *                 "app-messages"  texts from your contacts
 *                 "app-calendar"  lessons, homework and term dates for 7 days
 *                 "app-bank"      balances and recent spending
 *                 "app-map"       every place, and whether it's open now
 *                 "app-alarm"     set a daily alarm that wakes you up
 *                 "app-diary"     every storyline you've started and its
 *                                 `hint` (what to do next)
 *   icon        an emoji (or any short text)
 *   badge       "unread" shows the number of unread messages on the icon
 *   conditions  only show the app when this is true
 *
 * To remove an app, delete its line. Opening the phone never uses up time.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const app = (def) => R.define("app", def);

		app({ id: "messages", label: "Messages", icon: "💬", order: 0, view: "app-messages", badge: "unread" });
		app({ id: "calendar", label: "Calendar", icon: "📅", order: 1, view: "app-calendar" });
		app({ id: "bank", label: "Bank", icon: "🏦", order: 2, view: "app-bank" });
		app({ id: "map", label: "Map", icon: "🗺️", order: 3, view: "app-map" });
		app({ id: "alarm", label: "Alarm", icon: "⏰", order: 4, view: "app-alarm" });
		app({ id: "diary", label: "Diary", icon: "📔", order: 5, view: "app-diary" });
	});
})();
