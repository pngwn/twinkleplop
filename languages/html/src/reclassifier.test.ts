// HTML reclassifier tests — the full language() entry point that embeds
// JavaScript and CSS via the reclassifier pipeline.

import { describe, it, expect } from "vitest";
import { language } from "./index.js";

function tokens_of(src: string) {
	const result = language(src);
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

function type_of(tokens: { type: string; value: string }[], value: string) {
	return tokens.find((t) => t.value === value)?.type;
}

describe("HTML language — script embedding", () => {
	it("tokenizes script body as JavaScript", () => {
		const src = "<script>const x = 5;</script>";
		const tokens = tokens_of(src);
		// The script body should be JS tokens, not raw_script.
		expect(tokens.some((t) => t.type === "raw_script")).toBe(false);
		expect(type_of(tokens, "const")).toBe("keyword");
		expect(type_of(tokens, "x")).toBe("identifier");
		expect(type_of(tokens, "5")).toBe("number");
	});

	it("applies JS reclassifiers (function-variable) inside the script", () => {
		const src = "<script>const foo = () => 42;</script>";
		const tokens = tokens_of(src);
		// `foo` should be detected as a function by JS's function-variable
		// rule, which ran inside the sub-language before splicing.
		expect(type_of(tokens, "foo")).toBe("function");
	});

	it("remaps positions from content-local to input-global", () => {
		const src = "<script>const x = 5;</script>";
		const tokens = tokens_of(src);
		const const_tok = tokens.find((t) => t.value === "const");
		// `const` in the source text is at offset 8 (after `<script>`).
		expect(const_tok?.start).toBe(8);
		expect(const_tok?.end).toBe(13);
	});

	it("preserves HTML tokens around the embedded script", () => {
		const src = "<script>var a = 1;</script>";
		const tokens = tokens_of(src);
		// First few tokens are HTML open tag punctuation/name.
		expect(tokens[0]).toMatchObject({ type: "punctuation", value: "<" });
		expect(tokens[1]).toMatchObject({ type: "tag-name", value: "script" });
		expect(tokens[2]).toMatchObject({ type: "punctuation", value: ">" });
		// Last token is the closing tag.
		expect(tokens[tokens.length - 1]).toMatchObject({
			type: "tag-name",
			value: "</script>",
		});
	});

	it("handles multiple script blocks independently", () => {
		const src = "<script>var a = 1;</script><script>var b = 2;</script>";
		const tokens = tokens_of(src);
		// Both a and b should be JS identifiers.
		expect(type_of(tokens, "a")).toBe("identifier");
		expect(type_of(tokens, "b")).toBe("identifier");
		// No raw_script leaked through.
		expect(tokens.some((t) => t.type === "raw_script")).toBe(false);
	});
});

describe("HTML language — style embedding", () => {
	it("tokenizes style body as CSS", () => {
		const src = "<style>.btn { color: red; }</style>";
		const tokens = tokens_of(src);
		expect(tokens.some((t) => t.type === "raw_style")).toBe(false);
		// `.btn` is a CSS class selector.
		expect(type_of(tokens, ".btn")).toBe("class-name");
		// `color` is a CSS property.
		expect(type_of(tokens, "color")).toBe("property");
	});

	it("remaps CSS positions to input-global", () => {
		const src = "<style>p { margin: 0; }</style>";
		const tokens = tokens_of(src);
		const prop = tokens.find((t) => t.value === "margin");
		// `margin` starts at offset 11 in the source.
		expect(prop?.start).toBe(11);
		expect(prop?.end).toBe(17);
	});
});

describe("HTML language — combined document", () => {
	it("composes HTML + CSS + JS in a single pass", () => {
		const src = `<!DOCTYPE html>
<html>
  <head>
    <style>.hi { color: red; }</style>
  </head>
  <body>
    <p class="hi">Hello</p>
    <script>const greet = name => name + "!";</script>
  </body>
</html>`;
		const tokens = tokens_of(src);
		// No raw_* tokens leaked through.
		expect(tokens.some((t) => t.type === "raw_script")).toBe(false);
		expect(tokens.some((t) => t.type === "raw_style")).toBe(false);
		// CSS tokens are present.
		expect(tokens.some((t) => t.type === "property" && t.value === "color")).toBe(true);
		// JS tokens are present and JS reclassifiers ran.
		expect(type_of(tokens, "greet")).toBe("function");
		// HTML tokens are also present.
		expect(tokens.some((t) => t.type === "tag-name" && t.value === "p")).toBe(true);
		expect(tokens.some((t) => t.type === "attr-name" && t.value === "class")).toBe(true);
	});

	it("token offsets form a non-overlapping, monotonically increasing sequence", () => {
		const src = `<p class="x">text</p><script>var x = 1;</script><style>a {}</style>`;
		const result = language(src);
		let prev_end = 0;
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const start = result.tokens[i * 3 + 1];
			const end = result.tokens[i * 3 + 2];
			expect(start).toBeGreaterThanOrEqual(prev_end);
			expect(end).toBeGreaterThan(start);
			prev_end = end;
		}
	});

	it("falling back to raw grammar still works for consumers who want plain HTML", async () => {
		// This verifies the separate exports — grammar (raw) and reclassifiers
		// (list) — are accessible and usable.
		const { grammar, reclassifiers } = await import("./index.js");
		const { tokenize } = await import("@twinkleplop/core");
		const src = "<p>plain</p>";
		// Raw tokenize — no embedding applied.
		const raw = tokenize(src, grammar);
		expect(raw.tokens.length).toBeGreaterThan(0);
		expect(Array.isArray(reclassifiers)).toBe(true);
		expect(reclassifiers.length).toBeGreaterThan(0);
	});
});
