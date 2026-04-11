// Integration tests for the JavaScript language pipeline.
//
// These tests use the top-level `language(input)` entry point — the full
// tokenize + reclassify experience that consumers get from one call. They
// cover the positive cases the Phase 1 function-variable rule should catch
// and a set of negatives that must NOT be rewritten.

import { describe, it, expect } from "vitest";
import { language } from "./index.js";

function enrich(input) {
	const result = language(input);
	const out = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		out.push({
			type: result.tokenTypes[result.tokens[i * 3]],
			value: input.slice(start, end),
			start,
			end,
		});
	}
	return out;
}

function typeOf(tokens, value) {
	return tokens.find((t) => t.value === value)?.type;
}

describe("JavaScript reclassifier — function-variable (positive cases)", () => {
	it("const foo = () => { }", () => {
		const tokens = enrich("const foo = () => { }");
		expect(typeOf(tokens, "foo")).toBe("function");
	});

	it("const add = (a, b) => a + b", () => {
		const tokens = enrich("const add = (a, b) => a + b");
		expect(typeOf(tokens, "add")).toBe("function");
		// Params inside the arrow must stay as identifiers.
		expect(typeOf(tokens, "a")).toBe("identifier");
		expect(typeOf(tokens, "b")).toBe("identifier");
	});

	it("const double = x => x * 2", () => {
		const tokens = enrich("const double = x => x * 2");
		expect(typeOf(tokens, "double")).toBe("function");
	});

	it("const fetchData = async () => 1", () => {
		const tokens = enrich("const fetchData = async () => 1");
		expect(typeOf(tokens, "fetchData")).toBe("function");
	});

	it("const baz = function() { }", () => {
		const tokens = enrich("const baz = function() { }");
		expect(typeOf(tokens, "baz")).toBe("function");
	});

	it("let baz = async function() { }", () => {
		const tokens = enrich("let baz = async function() { }");
		expect(typeOf(tokens, "baz")).toBe("function");
	});

	it("var f = (a, (b, c)) => a", () => {
		const tokens = enrich("var f = (a, (b, c)) => a");
		expect(typeOf(tokens, "f")).toBe("function");
	});

	it("object property with arrow value", () => {
		const tokens = enrich("const obj = { foo: (x, y) => x + y }");
		expect(typeOf(tokens, "foo")).toBe("function");
	});

	it("object property with function value", () => {
		const tokens = enrich("const obj = { run: function() {} }");
		expect(typeOf(tokens, "run")).toBe("function");
	});

	it("reassignment without declaration", () => {
		const tokens = enrich("foo = () => 1");
		expect(typeOf(tokens, "foo")).toBe("function");
	});

	it("trivia (comment) between identifier and =", () => {
		const tokens = enrich("const foo /* wat */ = () => 1");
		expect(typeOf(tokens, "foo")).toBe("function");
	});
});

describe("JavaScript reclassifier — function-variable (negative cases)", () => {
	it("const x = 5", () => {
		const tokens = enrich("const x = 5");
		expect(typeOf(tokens, "x")).toBe("identifier");
	});

	it("const y = someCall()", () => {
		const tokens = enrich("const y = someCall()");
		expect(typeOf(tokens, "y")).toBe("identifier");
		// The base grammar already marks `someCall` as function via probe mode,
		// so this is just a sanity check that the reclassifier doesn't trample.
		expect(typeOf(tokens, "someCall")).toBe("function");
	});

	it("const z = a + b", () => {
		const tokens = enrich("const z = a + b");
		expect(typeOf(tokens, "z")).toBe("identifier");
	});

	it("const zs = [1, 2, 3]", () => {
		const tokens = enrich("const zs = [1, 2, 3]");
		expect(typeOf(tokens, "zs")).toBe("identifier");
	});
});

describe("JavaScript reclassifier — known limitations (documented misses)", () => {
	// These cases are where the Prism-style lookahead heuristic is known to
	// miss. They're documented here so regressions show up if the rule ever
	// tightens or loosens. Feel free to flip these expectations if you improve
	// the rule — they are NOT requirements.

	it("ternary: const foo = cond ? () => 1 : () => 2 — NOT detected", () => {
		const tokens = enrich("const foo = cond ? () => 1 : () => 2");
		// Miss: we'd need to peek past `?` which we don't do.
		expect(typeOf(tokens, "foo")).toBe("identifier");
	});
});

describe("JavaScript reclassifier — tagged template literals", () => {
	it("tokenizes html`<div>hi</div>` as HTML", () => {
		const src = "const x = html`<div>hi</div>`";
		const tokens = enrich(src);
		// The backticks stay as template (wrapToken preserved them).
		const templateToks = tokens.filter((t) => t.type === "template");
		expect(templateToks.map((t) => t.value)).toEqual(["`", "`"]);
		// The content is tokenized as HTML — we see HTML-specific token types.
		expect(tokens.some((t) => t.type === "tag-name" && t.value === "div")).toBe(
			true,
		);
		// raw_template_html should NOT appear — embedGrammars replaced it.
		expect(tokens.some((t) => t.type === "raw_template_html")).toBe(false);
	});

	it("tokenizes css`color: red;` as CSS", () => {
		const src = "const s = css`color: red;`";
		const tokens = enrich(src);
		// The backticks stay as template.
		expect(
			tokens.filter((t) => t.type === "template").map((t) => t.value),
		).toEqual(["`", "`"]);
		// `color` should be tokenized as CSS (the CSS grammar tags bare names
		// outside a declaration block as `selector` — we don't care about the
		// exact CSS semantics here, just that CSS tokens are present).
		const cssTokens = tokens.filter(
			(t) =>
				t.type === "selector" ||
				t.type === "property" ||
				t.type === "pseudo-selector",
		);
		expect(cssTokens.length).toBeGreaterThan(0);
		// raw_template_css should NOT appear.
		expect(tokens.some((t) => t.type === "raw_template_css")).toBe(false);
	});

	it("untagged template literals stay as `template`", () => {
		const src = "const x = `not a tag`";
		const tokens = enrich(src);
		// Full template (backticks + content) stays as one `template` token.
		expect(
			tokens.some((t) => t.type === "template" && t.value === "`not a tag`"),
		).toBe(true);
	});

	it("templates tagged with unknown identifiers are left alone", () => {
		const src = "const x = foo`some content`";
		const tokens = enrich(src);
		// `foo` is still identifier, not a function-variable (doesn't match
		// the anchor value for the tagged template rule).
		expect(typeOf(tokens, "foo")).toBe("identifier");
		// The template stays as one unclassified template token.
		expect(
			tokens.some((t) => t.type === "template" && t.value === "`some content`"),
		).toBe(true);
	});

	it("preserves input-global positions across the splice", () => {
		const src = "const x = html`<p>hi</p>`";
		const tokens = enrich(src);
		// The `<p>` should be at its real offsets in the source.
		const lt = tokens.find(
			(t) => t.type === "punctuation" && t.value === "<",
		);
		expect(lt?.start).toBe(15); // Position right after the opening backtick
		// The `</p>` should be at the right offset too — find the closing
		// punctuation token that starts with `</`.
		const closeP = tokens.find(
			(t) => t.type === "punctuation" && t.value === "</",
		);
		expect(closeP).toBeDefined();
	});

	it("function-variable rule still fires around tagged templates", () => {
		// The `render` identifier is a function-variable; the `html` tagged
		// template is inside its body. Both rewrites should apply cleanly.
		const src = "const render = () => html`<p></p>`";
		const tokens = enrich(src);
		expect(typeOf(tokens, "render")).toBe("function");
		expect(tokens.some((t) => t.type === "tag-name" && t.value === "p")).toBe(
			true,
		);
	});
});

describe("JavaScript reclassifier — interpolated tagged templates", () => {
	it("content-position interpolation: html`<p>${name}</p>`", () => {
		const src = "const x = html`<p>${name}</p>`";
		const tokens = enrich(src);
		// Opening and closing backticks preserved as template.
		const templates = tokens.filter((t) => t.type === "template");
		expect(templates.map((t) => t.value)).toEqual(["`", "`"]);
		// Both `<p>` and `</p>` tokenized as HTML.
		expect(tokens.some((t) => t.type === "tag-name" && t.value === "p")).toBe(
			true,
		);
		expect(
			tokens.filter((t) => t.type === "tag-name" && t.value === "p"),
		).toHaveLength(2);
		// JS interpolation tokens preserved between chunks.
		expect(
			tokens.some((t) => t.type === "punctuation" && t.value === "${"),
		).toBe(true);
		expect(typeOf(tokens, "name")).toBe("identifier");
		expect(
			tokens.some((t) => t.type === "punctuation" && t.value === "}"),
		).toBe(true);
	});

	// THE EXEMPLAR CASE — the attribute-position interpolation that the
	// previous per-chunk approach could not support. This test must pass.
	it("attribute-position interpolation: html`<p class=\"${cls}\">hi</p>`", () => {
		const src = 'const x = html`<p class="${cls}">hi</p>`';
		const tokens = enrich(src);
		// Backticks preserved.
		const templates = tokens.filter((t) => t.type === "template");
		expect(templates.map((t) => t.value)).toEqual(["`", "`"]);
		// The attribute name `class` is tokenized as HTML attr-name.
		expect(typeOf(tokens, "class")).toBe("attr-name");
		// The attribute value's opening and closing quotes are BOTH tokenized
		// as string — the sub-tokenizer saw a well-formed attribute value
		// thanks to virtual-source state continuity, and the resulting string
		// token was split at the hole boundary into two "-char pieces.
		const strings = tokens.filter((t) => t.type === "string");
		expect(strings).toHaveLength(2);
		expect(strings[0]).toMatchObject({ value: '"' });
		expect(strings[1]).toMatchObject({ value: '"' });
		// Between them sit the JS interpolation tokens.
		const stringPositions = strings.map((t) => t.start);
		expect(stringPositions[0]).toBeLessThan(stringPositions[1]);
		const interpolation = tokens.filter(
			(t) => t.start > stringPositions[0] && t.end <= stringPositions[1],
		);
		expect(interpolation.some((t) => t.value === "${")).toBe(true);
		expect(interpolation.some((t) => t.value === "cls")).toBe(true);
		expect(interpolation.some((t) => t.value === "}")).toBe(true);
		// `hi` is plain text after the attribute value — no specific token
		// type; just verify `</p>` is tokenized as HTML.
		expect(
			tokens.some((t) => t.type === "punctuation" && t.value === "</"),
		).toBe(true);
	});

	it("tag-name-position interpolation: html`<${Tag}>hi</${Tag}>`", () => {
		const src = "const x = html`<${Tag}>hi</${Tag}>`";
		const tokens = enrich(src);
		// Opening and closing HTML `<` and `>` punctuation preserved.
		expect(
			tokens.some((t) => t.type === "punctuation" && t.value === "<"),
		).toBe(true);
		expect(
			tokens.some((t) => t.type === "punctuation" && t.value === "</"),
		).toBe(true);
		// Interpolations passed through as JS.
		const identifiers = tokens.filter(
			(t) => t.type === "identifier" && t.value === "Tag",
		);
		expect(identifiers).toHaveLength(2);
	});

	it("multiple interpolations: html`<p>${a}<br>${b}</p>`", () => {
		const src = "const x = html`<p>${a}<br>${b}</p>`";
		const tokens = enrich(src);
		// Two interpolations preserved.
		const interpolationStarts = tokens.filter((t) => t.value === "${");
		expect(interpolationStarts).toHaveLength(2);
		const interpolationEnds = tokens.filter(
			(t) => t.type === "punctuation" && t.value === "}",
		);
		expect(interpolationEnds).toHaveLength(2);
		// All three HTML tags tokenized: <p>, <br>, </p>.
		const tagNames = tokens.filter((t) => t.type === "tag-name");
		const tagNameValues = tagNames.map((t) => t.value);
		expect(tagNameValues).toContain("p");
		expect(tagNameValues).toContain("br");
	});

	it("nested-brace interpolation: html`<p>${fn({ a: 1 })}</p>`", () => {
		// The JS grammar tracks brace depth inside interpolations via pushed
		// states, so `${fn({ a: 1 })}` correctly closes the interpolation at
		// the OUTER `}` — not the inner one — even though there's an object
		// literal inside the function call.
		const src = "const x = html`<p>${fn({ a: 1 })}</p>`";
		const tokens = enrich(src);
		expect(tokens.filter((t) => t.type === "template")).toHaveLength(2);
		expect(
			tokens.filter((t) => t.type === "tag-name" && t.value === "p"),
		).toHaveLength(2);
		expect(typeOf(tokens, "fn")).toBe("function");
		expect(typeOf(tokens, "a")).toBe("identifier");
		expect(typeOf(tokens, "1")).toBe("number");
	});

	it("css-tagged template with interpolation: css`color: ${c}; margin: 0;`", () => {
		const src = "const s = css`color: ${c}; margin: 0;`";
		const tokens = enrich(src);
		// Two backticks preserved.
		expect(tokens.filter((t) => t.type === "template")).toHaveLength(2);
		// CSS tokens present (color/margin are selectors in this context
		// because the CSS grammar treats bare names outside `{}` as selectors).
		expect(
			tokens.some((t) => t.type === "selector" && t.value === "color"),
		).toBe(true);
		expect(
			tokens.some((t) => t.type === "selector" && t.value === "margin"),
		).toBe(true);
		// JS interpolation preserved.
		expect(typeOf(tokens, "c")).toBe("identifier");
		expect(tokens.some((t) => t.value === "${")).toBe(true);
	});

	it("interpolation positions are globally correct", () => {
		const src = "const x = html`<p>${name}</p>`";
		const tokens = enrich(src);
		// `name` in the source is at offset 20.
		const nameTok = tokens.find((t) => t.value === "name");
		expect(nameTok?.start).toBe(20);
		// The closing backtick is at the final position of the source.
		const templates = tokens.filter((t) => t.type === "template");
		expect(templates[templates.length - 1].start).toBe(src.length - 1);
	});

	it("malformed tagged template (unterminated) leaves tokens untouched", () => {
		// Unterminated template — no closing backtick. The scanner should
		// bail and the `template` token stays as-is.
		const src = "const x = html`<p>";
		const tokens = enrich(src);
		// No HTML tag-name tokens — the scan bailed out.
		expect(tokens.some((t) => t.type === "tag-name")).toBe(false);
	});
});
