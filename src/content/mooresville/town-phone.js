/*
 * Mooresville — the apps on your phone.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const app = (id, label, icon, order, extra = {}) => R.define("app", { id, label, icon, order, view: `app-${id}`, ...extra });
		app("messages", "Messages", "💬", 0, { badge: "unread" });
		app("calendar", "Calendar", "📅", 1);
		app("bank", "Bank", "🏦", 2);
		app("map", "Map", "🗺️", 3);
		app("alarm", "Alarm", "⏰", 4);
	});
})();
