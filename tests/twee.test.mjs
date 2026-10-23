import assert from "node:assert/strict";
import { test } from "node:test";
import { findPassageRefs, parseHeader, parseTwee } from "../scripts/lib/twee.mjs";

test("parseHeader reads name, tags and metadata", () => {
	assert.deepEqual(parseHeader(" Sys_Boot [init nobr]"), { name: "Sys_Boot", tags: ["init", "nobr"], meta: null });
	assert.deepEqual(parseHeader(" Start {\"position\":\"1,1\"}"), { name: "Start", tags: [], meta: "{\"position\":\"1,1\"}" });
	assert.equal(parseHeader(" Odd \\[name\\]").name, "Odd [name]");
});

test("parseTwee splits passages and records line numbers", () => {
	const src = ":: A\nhello\n\n:: B [x]\nworld\n";
	const ps = parseTwee(src, "f.twee");
	assert.equal(ps.length, 2);
	assert.deepEqual(ps.map((p) => [p.name, p.text, p.line]), [["A", "hello", 1], ["B", "world", 4]]);
	assert.deepEqual(ps[1].tags, ["x"]);
});

test("findPassageRefs handles every link form and skips dynamic targets", () => {
	const text = [
		"[[Plain]]",
		"[[Text|Piped]]",
		"[[Text->Arrow]]",
		"[[Back<-Text]]",
		"[[Text|Setter][$x to 1]]",
		"[[Text|$dynamic]]",
		"[[Text|setup.where()]]",
		'<<goto "Goto">>',
		"<<include 'Inc'>>",
		'<<link "Label" "LinkTarget">><</link>>',
		'<<button "Label">><</button>>',
	].join("\n");
	assert.deepEqual(findPassageRefs(text), ["Plain", "Piped", "Arrow", "Back", "Setter", "Goto", "Inc", "LinkTarget"]);
});
