/*
 * ============================================================================
 *  media.js — pictures, GIFs and videos (setup.media)
 * ============================================================================
 *
 * No code needed to add a picture: drop a file in the right folder with the
 * right name, and the game uses it (see assets/media/README.md).
 * Media is found by name. Put a file at
 *   assets/media/<type>/<id>.<ext>
 * and it's used automatically; the build lists every file in a manifest
 * (scripts/media-manifest.mjs). Types and keys:
 *   location/<id>            a place or room (rooms fall back to their place)
 *   action/<id>              shown after doing the action
 *   storylet/<id>            shown at the top of the event
 *   item/<id>                items in the bag, shops and wardrobe
 *   npc/<id>                 profile picture
 *   npc/<id>/<part>          an NPC body-part picture
 *   bodyPart/<part>/<value>  the PC's body part at that value (or bodyPart/<part>)
 *   statusEffect/<id>        an active effect
 *   trait/<id>               a trait
 *   pc/portrait              the player's portrait
 * A definition can also set `media` itself: a path or URL, or
 * { src, kind: "image" | "video", alt, poster }.
 */
(function () {
	"use strict";

	const VIDEO_RE = /\.(mp4|webm)(\?.*)?$/i;

	function createMedia() {
		const manifest = () => setup.__mediaManifest ?? {};

		const media = {
			/** @returns {Record<string, string>} key → URL for every media file. */
			manifest,

			/**
			 * Normalise a media value to { src, kind, alt?, poster? }.
			 * @param {string|object|null} m
			 */
			normalise(m) {
				if (!m) return null;
				const o = typeof m === "string" ? { src: m } : { ...m };
				o.kind ??= VIDEO_RE.test(o.src) ? "video" : "image";
				return o;
			},

			/**
			 * Find media for a key ("npc/dr_okafor"), trying each key in turn.
			 * @param {...string} keys
			 * @returns {{src: string, kind: string}|null}
			 */
			byKey(...keys) {
				for (const k of keys) {
					const src = manifest()[k];
					if (src) return media.normalise(src);
				}
				return null;
			},

			/**
			 * Media for a registry definition: its own `media` field, else the
			 * file named after it. Rooms fall back to their place.
			 * @param {string} type  registry type ("location", "item", …)
			 * @param {string} id
			 * @param {string} [sub] e.g. a body part for an NPC
			 */
			find(type, id, sub) {
				const def = setup.registry.tryGet(type, id);
				if (!sub && def?.media) return media.normalise(def.media);
				const key = sub ? `${type}/${id}/${sub}` : `${type}/${id}`;
				const hit = media.byKey(key);
				if (hit) return hit;
				if (!sub && type === "location" && def?.parent) return media.find("location", def.parent);
				return null;
			},

			/**
			 * Build an element for media (img or looping muted video).
			 * @param {{src: string, kind: string, alt?: string, poster?: string}|null} m
			 * @param {{class?: string, alt?: string}} [opts]
			 * @returns {HTMLElement|null}
			 */
			element(m, opts = {}) {
				if (!m) return null;
				const cls = `media ${opts.class ?? ""}`.trim();
				if (m.kind === "video") {
					return setup.ui.el("video", {
						class: cls,
						attrs: { src: m.src, poster: m.poster, autoplay: true, muted: true, loop: true, playsinline: true, preload: "metadata", "aria-label": m.alt ?? opts.alt ?? "" },
					});
				}
				return setup.ui.el("img", { class: cls, attrs: { src: m.src, alt: m.alt ?? opts.alt ?? "", loading: "lazy", decoding: "async" } });
			},

			/**
			 * Element for a definition's media, or null if it has none.
			 * @returns {HTMLElement|null}
			 */
			render(type, id, opts = {}) {
				return media.element(media.find(type, id, opts.sub), opts);
			},

			/**
			 * A small square thumbnail: the media if there is one, otherwise a
			 * neutral tile with the first letter of the name.
			 * @param {string} type @param {string} id @param {string} name
			 */
			thumb(type, id, name, opts = {}) {
				const el = media.render(type, id, { ...opts, class: `thumb ${opts.class ?? ""}`, alt: name });
				if (el) return el;
				return setup.ui.el("span", { class: `thumb thumb-empty ${opts.class ?? ""}`, text: (name || "?").charAt(0).toUpperCase(), attrs: { "aria-hidden": "true" } });
			},
		};
		return media;
	}

	setup.createMedia = createMedia;
})();
