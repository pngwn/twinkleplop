// HTML grammar tests — base tokenization without embedding.
//
// These tests exercise the raw HTML grammar (no reclassifiers), verifying
// that tags, attributes, comments, doctype, and script/style raw content
// tokens are emitted correctly. The embed_grammars integration is tested
// separately in reclassifier.test.js.

import { describe, it, expect } from "vitest";
import { tokenize } from "@twinkleplop/core";
import { grammar } from "./index.js";

function tokens_of(src: string) {
	const result = tokenize(src, grammar);
	const out = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		out.push({
			type: result.token_types[result.tokens[i * 3]],
			value: src.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
			start: result.tokens[i * 3 + 1],
			end: result.tokens[i * 3 + 2],
		});
	}
	return out;
}

function types_of(tokens: { type: string }[]) {
	return tokens.map((t) => t.type);
}

describe("HTML grammar — basic elements", () => {
	it("tokenizes a self-closing tag", () => {
		const tokens = tokens_of("<br/>");
		expect(tokens).toEqual([
			{ type: "punctuation", value: "<", start: 0, end: 1 },
			{ type: "tag-name", value: "br", start: 1, end: 3 },
			{ type: "punctuation", value: "/>", start: 3, end: 5 },
		]);
	});

	it("tokenizes an open/close tag pair", () => {
		const tokens = tokens_of("<p></p>");
		// Note: adjacent same-type punctuation tokens are coalesced by the
		// tokenizer (performance optimization — rendering is byte-identical).
		// So the `>` of the open tag and the `</` of the close tag fuse into
		// a single `></` punctuation token. We verify the structure via the
		// type sequence and the accumulated values.
		expect(types_of(tokens)).toEqual([
			"punctuation", // <
			"tag-name",    // p
			"punctuation", // ></
			"tag-name",    // p
			"punctuation", // >
		]);
		expect(tokens.map((t) => t.value).join("")).toBe("<p></p>");
	});

	it("tokenizes an attribute with a double-quoted value", () => {
		const tokens = tokens_of('<a href="/home">');
		const names = tokens.filter((t) => t.type === "attr-name");
		const strings = tokens.filter((t) => t.type === "string");
		expect(names[0].value).toBe("href");
		expect(strings.map((s) => s.value).join("")).toBe('"/home"');
	});

	it("tokenizes an attribute with a single-quoted value", () => {
		const tokens = tokens_of("<a href='/home'>");
		const strings = tokens.filter((t) => t.type === "string");
		expect(strings.map((s) => s.value).join("")).toBe("'/home'");
	});

	it("tokenizes multiple attributes", () => {
		const tokens = tokens_of('<input type="text" name="q" required>');
		const names = tokens.filter((t) => t.type === "attr-name").map((t) => t.value);
		expect(names).toEqual(["type", "name", "required"]);
	});

	it("tokenizes an HTML comment as a single token", () => {
		const tokens = tokens_of("<!-- hi there -->");
		const comments = tokens.filter((t) => t.type === "comment");
		expect(comments).toHaveLength(1);
		expect(comments[0].value).toBe("<!-- hi there -->");
	});

	it("tokenizes a DOCTYPE declaration", () => {
		const tokens = tokens_of("<!DOCTYPE html>");
		const doctype = tokens.filter((t) => t.type === "doctype");
		expect(doctype.length).toBeGreaterThan(0);
		const last_tok = tokens[tokens.length - 1];
		expect(last_tok).toMatchObject({ type: "punctuation", value: ">" });
	});

	it("leaves plain text content untokenized", () => {
		const tokens = tokens_of("<p>hello world</p>");
		const tag_tokens = tokens.filter((t) => t.type !== undefined);
		// The text "hello world" is in the gap between > at pos 2 and </ at pos 14
		const p_end = tag_tokens.find((t) => t.value === ">");
		const p_close = tag_tokens.find((t) => t.value === "</");
		expect(p_end?.end).toBe(3);
		expect(p_close?.start).toBe(14);
	});
});

describe("HTML grammar — script element", () => {
	it("emits raw_script for the body of <script>", () => {
		const tokens = tokens_of("<script>var x = 1;</script>");
		const raw = tokens.filter((t) => t.type === "raw_script");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("var x = 1;");
	});

	it("handles <script> with attributes before the body", () => {
		const tokens = tokens_of('<script type="module">let y = 2;</script>');
		const raw = tokens.filter((t) => t.type === "raw_script");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("let y = 2;");
	});

	it("handles self-closing <script/>", () => {
		const tokens = tokens_of("<script/>");
		// No raw_script — self-closing has no body.
		const raw = tokens.filter((t) => t.type === "raw_script");
		expect(raw).toHaveLength(0);
	});

	it("does NOT enter script content for a tag that merely starts with 'script'", () => {
		// Custom element `<scripting>` starts with `script` but boundary check
		// must fail because the next char is alphabetic.
		const tokens = tokens_of("<scripting></scripting>");
		const raw = tokens.filter((t) => t.type === "raw_script");
		expect(raw).toHaveLength(0);
	});

	it("treats `</script>` as the end even if it appears to be inside a JS string", () => {
		// HTML's script data state is content-blind — any literal `</script>`
		// ends it, regardless of surrounding quotes. This is correct per spec.
		const src = `<script>var x = "</script>";</script>`;
		const tokens = tokens_of(src);
		const raw = tokens.filter((t) => t.type === "raw_script");
		// The first `</script>` ends the script; only `var x = "` is the body.
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe('var x = "');
	});
});

describe("HTML grammar — style element", () => {
	it("emits raw_style for the body of <style>", () => {
		const tokens = tokens_of("<style>body { color: red; }</style>");
		const raw = tokens.filter((t) => t.type === "raw_style");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("body { color: red; }");
	});

	it("handles <style> with attributes", () => {
		const tokens = tokens_of('<style type="text/css">p {}</style>');
		const raw = tokens.filter((t) => t.type === "raw_style");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("p {}");
	});
});
