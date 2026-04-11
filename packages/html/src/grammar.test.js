// HTML grammar tests — base tokenization without embedding.
//
// These tests exercise the raw HTML grammar (no reclassifiers), verifying
// that tags, attributes, comments, doctype, and script/style raw content
// tokens are emitted correctly. The embedGrammars integration is tested
// separately in reclassifier.test.js.

import { describe, it, expect } from "vitest";
import { tokenize } from "@twinkleplop/core";
import { grammar } from "./index.js";

function tokensOf(src) {
	const result = tokenize(src, grammar);
	const out = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		out.push({
			type: result.tokenTypes[result.tokens[i * 3]],
			value: src.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
			start: result.tokens[i * 3 + 1],
			end: result.tokens[i * 3 + 2],
		});
	}
	return out;
}

function typesOf(tokens) {
	return tokens.map((t) => t.type);
}

describe("HTML grammar — basic elements", () => {
	it("tokenizes a self-closing tag", () => {
		const tokens = tokensOf("<br/>");
		expect(tokens).toEqual([
			{ type: "punctuation", value: "<", start: 0, end: 1 },
			{ type: "tag-name", value: "br", start: 1, end: 3 },
			{ type: "punctuation", value: "/>", start: 3, end: 5 },
		]);
	});

	it("tokenizes an open/close tag pair", () => {
		const tokens = tokensOf("<p></p>");
		// Note: adjacent same-type punctuation tokens are coalesced by the
		// tokenizer (performance optimization — rendering is byte-identical).
		// So the `>` of the open tag and the `</` of the close tag fuse into
		// a single `></` punctuation token. We verify the structure via the
		// type sequence and the accumulated values.
		expect(typesOf(tokens)).toEqual([
			"punctuation", // <
			"tag-name",    // p
			"punctuation", // ></
			"tag-name",    // p
			"punctuation", // >
		]);
		expect(tokens.map((t) => t.value).join("")).toBe("<p></p>");
	});

	it("tokenizes an attribute with a double-quoted value", () => {
		const tokens = tokensOf('<a href="/home">');
		const names = tokens.filter((t) => t.type === "attr-name");
		const strings = tokens.filter((t) => t.type === "string");
		expect(names[0].value).toBe("href");
		expect(strings.map((s) => s.value).join("")).toBe('"/home"');
	});

	it("tokenizes an attribute with a single-quoted value", () => {
		const tokens = tokensOf("<a href='/home'>");
		const strings = tokens.filter((t) => t.type === "string");
		expect(strings.map((s) => s.value).join("")).toBe("'/home'");
	});

	it("tokenizes multiple attributes", () => {
		const tokens = tokensOf('<input type="text" name="q" required>');
		const names = tokens.filter((t) => t.type === "attr-name").map((t) => t.value);
		expect(names).toEqual(["type", "name", "required"]);
	});

	it("tokenizes an HTML comment as a single token", () => {
		const tokens = tokensOf("<!-- hi there -->");
		const comments = tokens.filter((t) => t.type === "comment");
		expect(comments).toHaveLength(1);
		expect(comments[0].value).toBe("<!-- hi there -->");
	});

	it("tokenizes a DOCTYPE declaration", () => {
		const tokens = tokensOf("<!DOCTYPE html>");
		const doctype = tokens.filter((t) => t.type === "doctype");
		expect(doctype.length).toBeGreaterThan(0);
		const lastTok = tokens[tokens.length - 1];
		expect(lastTok).toMatchObject({ type: "punctuation", value: ">" });
	});

	it("leaves plain text content untokenized", () => {
		const tokens = tokensOf("<p>hello world</p>");
		const tagTokens = tokens.filter((t) => t.type !== undefined);
		// The text "hello world" is in the gap between > at pos 2 and </ at pos 14
		const pEnd = tagTokens.find((t) => t.value === ">");
		const pClose = tagTokens.find((t) => t.value === "</");
		expect(pEnd.end).toBe(3);
		expect(pClose.start).toBe(14);
	});
});

describe("HTML grammar — script element", () => {
	it("emits raw_script for the body of <script>", () => {
		const tokens = tokensOf("<script>var x = 1;</script>");
		const raw = tokens.filter((t) => t.type === "raw_script");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("var x = 1;");
	});

	it("handles <script> with attributes before the body", () => {
		const tokens = tokensOf('<script type="module">let y = 2;</script>');
		const raw = tokens.filter((t) => t.type === "raw_script");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("let y = 2;");
	});

	it("handles self-closing <script/>", () => {
		const tokens = tokensOf("<script/>");
		// No raw_script — self-closing has no body.
		const raw = tokens.filter((t) => t.type === "raw_script");
		expect(raw).toHaveLength(0);
	});

	it("does NOT enter script content for a tag that merely starts with 'script'", () => {
		// Custom element `<scripting>` starts with `script` but boundary check
		// must fail because the next char is alphabetic.
		const tokens = tokensOf("<scripting></scripting>");
		const raw = tokens.filter((t) => t.type === "raw_script");
		expect(raw).toHaveLength(0);
	});

	it("treats `</script>` as the end even if it appears to be inside a JS string", () => {
		// HTML's script data state is content-blind — any literal `</script>`
		// ends it, regardless of surrounding quotes. This is correct per spec.
		const src = `<script>var x = "</script>";</script>`;
		const tokens = tokensOf(src);
		const raw = tokens.filter((t) => t.type === "raw_script");
		// The first `</script>` ends the script; only `var x = "` is the body.
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe('var x = "');
	});
});

describe("HTML grammar — style element", () => {
	it("emits raw_style for the body of <style>", () => {
		const tokens = tokensOf("<style>body { color: red; }</style>");
		const raw = tokens.filter((t) => t.type === "raw_style");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("body { color: red; }");
	});

	it("handles <style> with attributes", () => {
		const tokens = tokensOf('<style type="text/css">p {}</style>');
		const raw = tokens.filter((t) => t.type === "raw_style");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("p {}");
	});
});
