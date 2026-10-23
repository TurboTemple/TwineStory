// The media framework: finding files by name, and choosing what to show.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildManifest, manifestScript } from "../scripts/lib/media.mjs";
import { bootTown, plain } from "./helpers.mjs";

test("the manifest finds media by folder and name, preferring video, then GIF, then images", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "media-"));
	const put = (p) => {
		fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
		fs.writeFileSync(path.join(root, p), "x");
	};
	put("assets/media/location/red_lion.jpg");
	put("assets/media/location/red_lion.mp4");
	put("assets/media/npc/dr_okafor.webp");
	put("assets/media/npc/dr_okafor/hair_colour.png");
	put("assets/media/bodyPart/weight/slim.gif");
	put("assets/media/notes.txt");
	assert.deepEqual(buildManifest(root), {
		"bodyPart/weight/slim": "assets/media/bodyPart/weight/slim.gif",
		"location/red_lion": "assets/media/location/red_lion.mp4",
		"npc/dr_okafor": "assets/media/npc/dr_okafor.webp",
		"npc/dr_okafor/hair_colour": "assets/media/npc/dr_okafor/hair_colour.png",
	});
	assert.match(manifestScript({ a: "b" }), /setup\.__mediaManifest = \{/);
	assert.deepEqual(buildManifest(path.join(root, "nowhere")), {});
});

/** A town game with a pretend set of media files. */
function withMedia(files) {
	return bootTown({
		before(setup) {
			setup.__mediaManifest = files;
		},
	});
}

test("lookup: by name, rooms fall back to their place, explicit media wins", () => {
	const { setup } = withMedia({
		"location/red_lion": "assets/media/location/red_lion.mp4",
		"item/chocolate_bar": "assets/media/item/chocolate_bar.webp",
	});
	assert.deepEqual(plain(setup.media.find("location", "red_lion")), { src: "assets/media/location/red_lion.mp4", kind: "video" });
	assert.equal(setup.media.find("location", "lion_toilets").src, "assets/media/location/red_lion.mp4", "room → its place");
	assert.equal(setup.media.find("item", "chocolate_bar").kind, "image");
	assert.equal(setup.media.find("item", "crisps"), null);
	assert.deepEqual(plain(setup.media.normalise("https://example.com/a.webm")), { src: "https://example.com/a.webm", kind: "video" });
});

test("body-part pictures follow the current look", () => {
	const { setup } = withMedia({ "bodyPart/weight/slim": "a.gif", "bodyPart/weight": "b.png" });
	assert.equal(setup.media.byKey(`bodyPart/${setup.body.mediaKey("weight")}`, "bodyPart/weight").src, "b.png", "average has no picture of its own");
	setup.body.set("weight", 25);
	assert.equal(setup.media.byKey(`bodyPart/${setup.body.mediaKey("weight")}`, "bodyPart/weight").src, "a.gif");
});

test("effects describe what they do", () => {
	const { setup } = bootTown();
	const d = (m) => setup.stats.describeModifier(m);
	assert.equal(d({ stat: "mood", op: "add", value: 6 }), "Mood +6");
	assert.equal(d({ stat: "stress", op: "add", value: -3 }), "Stress −3");
	assert.equal(d({ stat: "energy", op: "rateAdd", value: -1 }), "Energy −1 an hour");
	assert.equal(d({ stat: "food", op: "rateMul", value: 0.5 }), "Food changes 50% slower");
});

test("NPCs have an appearance, checked against the body parts", () => {
	const { setup } = bootTown();
	assert.equal(setup.npcs.get("dr_okafor").body.hair_colour, "black");
	// Key story characters' looks are left for the user to write.
	for (const n of setup.registry.all("npc").filter((x) => !x.tags.includes("story"))) assert.ok(Object.keys(n.body).length > 0, n.id);
});
