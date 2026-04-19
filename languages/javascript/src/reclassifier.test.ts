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
			type: result.token_types[result.tokens[i * 3]],
			value: input.slice(start, end),
			start,
			end,
		});
	}
	return out;
}

function type_of(tokens, value) {
	return tokens.find((t) => t.value === value)?.type;
}

describe("JavaScript reclassifier — function-variable (positive cases)", () => {
	it("const foo = () => { }", () => {
		const tokens = enrich("const foo = () => { }");
		expect(type_of(tokens, "foo")).toBe("function");
	});

	it("const add = (a, b) => a + b", () => {
		const tokens = enrich("const add = (a, b) => a + b");
		expect(type_of(tokens, "add")).toBe("function");
		// Params inside the arrow must stay as identifiers.
		expect(type_of(tokens, "a")).toBe("identifier");
		expect(type_of(tokens, "b")).toBe("identifier");
	});

	it("const double = x => x * 2", () => {
		const tokens = enrich("const double = x => x * 2");
		expect(type_of(tokens, "double")).toBe("function");
	});

	it("const fetchData = async () => 1", () => {
		const tokens = enrich("const fetchData = async () => 1");
		expect(type_of(tokens, "fetchData")).toBe("function");
	});

	it("const baz = function() { }", () => {
		const tokens = enrich("const baz = function() { }");
		expect(type_of(tokens, "baz")).toBe("function");
	});

	it("let baz = async function() { }", () => {
		const tokens = enrich("let baz = async function() { }");
		expect(type_of(tokens, "baz")).toBe("function");
	});

	it("var f = (a, (b, c)) => a", () => {
		const tokens = enrich("var f = (a, (b, c)) => a");
		expect(type_of(tokens, "f")).toBe("function");
	});

	it("object property with arrow value", () => {
		const tokens = enrich("const obj = { foo: (x, y) => x + y }");
		expect(type_of(tokens, "foo")).toBe("function");
	});

	it("object property with function value", () => {
		const tokens = enrich("const obj = { run: function() {} }");
		expect(type_of(tokens, "run")).toBe("function");
	});

	it("reassignment without declaration", () => {
		const tokens = enrich("foo = () => 1");
		expect(type_of(tokens, "foo")).toBe("function");
	});

	it("trivia (comment) between identifier and =", () => {
		const tokens = enrich("const foo /* wat */ = () => 1");
		expect(type_of(tokens, "foo")).toBe("function");
	});
});

describe("JavaScript reclassifier — function-variable (negative cases)", () => {
	it("const x = 5", () => {
		const tokens = enrich("const x = 5");
		expect(type_of(tokens, "x")).toBe("identifier");
	});

	it("const y = someCall()", () => {
		const tokens = enrich("const y = someCall()");
		expect(type_of(tokens, "y")).toBe("identifier");
		// The base grammar already marks `someCall` as function via probe mode,
		// so this is just a sanity check that the reclassifier doesn't trample.
		expect(type_of(tokens, "someCall")).toBe("function");
	});

	it("const z = a + b", () => {
		const tokens = enrich("const z = a + b");
		expect(type_of(tokens, "z")).toBe("identifier");
	});

	it("const zs = [1, 2, 3]", () => {
		const tokens = enrich("const zs = [1, 2, 3]");
		expect(type_of(tokens, "zs")).toBe("identifier");
	});
});

describe("JavaScript reclassifier — property detection", () => {
	it("object literal: { key: value }", () => {
		const tokens = enrich("const o = { key: 1 }");
		expect(type_of(tokens, "key")).toBe("property");
	});

	it("object literal after comma: { a: 1, b: 2 }", () => {
		const tokens = enrich("const o = { a: 1, b: 2 }");
		expect(type_of(tokens, "a")).toBe("property");
		expect(type_of(tokens, "b")).toBe("property");
	});

	it("function param is NOT property: fn(body: any)", () => {
		const tokens = enrich("json(body: any)");
		expect(type_of(tokens, "body")).toBe("identifier");
	});

	it("ternary colon is NOT property: a ? b : c", () => {
		const tokens = enrich("x ? b : c");
		expect(type_of(tokens, "b")).toBe("identifier");
	});

	it("nested object in call: fn({a: 1})", () => {
		const tokens = enrich("fn({a: 1})");
		expect(type_of(tokens, "a")).toBe("property");
	});
});

describe("JavaScript reclassifier — class_name promoter", () => {
	it("class Foo { } — Foo becomes class_name", () => {
		const tokens = enrich("class Foo { }");
		expect(type_of(tokens, "Foo")).toBe("class_name");
	});

	it("class Foo extends Bar — both become class_name", () => {
		const tokens = enrich("class Foo extends Bar { }");
		expect(type_of(tokens, "Foo")).toBe("class_name");
		expect(type_of(tokens, "Bar")).toBe("class_name");
	});

	it("new Foo() — Foo becomes class_name (not function)", () => {
		const tokens = enrich("const e = new Foo();");
		expect(type_of(tokens, "Foo")).toBe("class_name");
	});

	it("new pkg.util.Foo() — only last segment promotes", () => {
		const tokens = enrich("const d = new pkg.util.Foo();");
		expect(type_of(tokens, "pkg")).toBe("identifier");
		expect(type_of(tokens, "util")).toBe("identifier");
		expect(type_of(tokens, "Foo")).toBe("class_name");
	});

	it("instanceof Foo — Foo becomes class_name", () => {
		const tokens = enrich("if (x instanceof Foo) { }");
		expect(type_of(tokens, "Foo")).toBe("class_name");
	});

	it("extends SuperClass works even with dotted path", () => {
		const tokens = enrich("class Foo extends pkg.Bar { }");
		expect(type_of(tokens, "pkg")).toBe("identifier");
		expect(type_of(tokens, "Bar")).toBe("class_name");
	});

	it("plain identifier in value position is NOT class_name", () => {
		const tokens = enrich("const x = Foo + 1;");
		// Foo here is just a value reference, not a class anchor
		expect(type_of(tokens, "Foo")).not.toBe("class_name");
	});

	it("function call does not get class_name", () => {
		const tokens = enrich("const x = fn();");
		expect(type_of(tokens, "fn")).toBe("function");
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
		expect(type_of(tokens, "foo")).toBe("identifier");
	});
});

describe("JavaScript reclassifier — tagged template literals", () => {
	it("tokenizes html`<div>hi</div>` as HTML", () => {
		const src = "const x = html`<div>hi</div>`";
		const tokens = enrich(src);
		// The backticks stay as template (wrap_token preserved them).
		const template_toks = tokens.filter((t) => t.type === "template");
		expect(template_toks.map((t) => t.value)).toEqual(["`", "`"]);
		// The content is tokenized as HTML — we see HTML-specific token types.
		expect(tokens.some((t) => t.type === "tag_name" && t.value === "div")).toBe(
			true,
		);
		// raw_template_html should NOT appear — embed_grammars replaced it.
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
		const css_tokens = tokens.filter(
			(t) =>
				t.type === "selector" ||
				t.type === "property" ||
				t.type === "selector_pseudo",
		);
		expect(css_tokens.length).toBeGreaterThan(0);
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
		expect(type_of(tokens, "foo")).toBe("identifier");
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
		// tag-boundary token that starts with `</`.
		const close_p = tokens.find(
			(t) => t.type === "punctuation" && t.value === "</",
		);
		expect(close_p).toBeDefined();
	});

	it("function-variable rule still fires around tagged templates", () => {
		// The `render` identifier is a function-variable; the `html` tagged
		// template is inside its body. Both rewrites should apply cleanly.
		const src = "const render = () => html`<p></p>`";
		const tokens = enrich(src);
		expect(type_of(tokens, "render")).toBe("function");
		expect(tokens.some((t) => t.type === "tag_name" && t.value === "p")).toBe(
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
		expect(tokens.some((t) => t.type === "tag_name" && t.value === "p")).toBe(
			true,
		);
		expect(
			tokens.filter((t) => t.type === "tag_name" && t.value === "p"),
		).toHaveLength(2);
		// JS interpolation tokens preserved between chunks.
		expect(
			tokens.some((t) => t.type === "punctuation" && t.value === "${"),
		).toBe(true);
		expect(type_of(tokens, "name")).toBe("identifier");
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
		expect(type_of(tokens, "class")).toBe("attr_name");
		// The attribute value's opening and closing quotes are BOTH tokenized
		// as string — the sub-tokenizer saw a well-formed attribute value
		// thanks to virtual-source state continuity, and the resulting string
		// token was split at the hole boundary into two "-char pieces.
		const strings = tokens.filter((t) => t.type === "string");
		expect(strings).toHaveLength(2);
		expect(strings[0]).toMatchObject({ value: '"' });
		expect(strings[1]).toMatchObject({ value: '"' });
		// Between them sit the JS interpolation tokens.
		const string_positions = strings.map((t) => t.start);
		expect(string_positions[0]).toBeLessThan(string_positions[1]);
		const interpolation = tokens.filter(
			(t) => t.start > string_positions[0] && t.end <= string_positions[1],
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
		// Opening and closing HTML `<` and `>` boundary tokens preserved.
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
		const interpolation_starts = tokens.filter((t) => t.value === "${");
		expect(interpolation_starts).toHaveLength(2);
		const interpolation_ends = tokens.filter(
			(t) => t.type === "punctuation" && t.value === "}",
		);
		expect(interpolation_ends).toHaveLength(2);
		// All three HTML tags tokenized: <p>, <br>, </p>.
		const tag_names = tokens.filter((t) => t.type === "tag_name");
		const tag_name_values = tag_names.map((t) => t.value);
		expect(tag_name_values).toContain("p");
		expect(tag_name_values).toContain("br");
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
			tokens.filter((t) => t.type === "tag_name" && t.value === "p"),
		).toHaveLength(2);
		expect(type_of(tokens, "fn")).toBe("function");
		expect(type_of(tokens, "a")).toBe("property");
		expect(type_of(tokens, "1")).toBe("number");
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
		expect(type_of(tokens, "c")).toBe("identifier");
		expect(tokens.some((t) => t.value === "${")).toBe(true);
	});

	it("interpolation positions are globally correct", () => {
		const src = "const x = html`<p>${name}</p>`";
		const tokens = enrich(src);
		// `name` in the source is at offset 20.
		const name_tok = tokens.find((t) => t.value === "name");
		expect(name_tok?.start).toBe(20);
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
		expect(tokens.some((t) => t.type === "tag_name")).toBe(false);
	});

	// THE NESTED TAGGED TEMPLATE REGRESSION GUARD.
	//
	// `` html`<style>${css`body { color: red; }`}</style>` `` has TWO tagged
	// templates — an outer `html` that contains a `css` nested inside an
	// interpolation hole of the outer template. The first scan pass finds
	// only the outer one and advances past the whole group, so the inner
	// `css` template sits untouched in the hole. embed_interleaved iterates
	// until stable, so a second pass picks up the inner template and the
	// CSS sub-language tokenizes `body { color: red; }`.
	it("nested tagged templates compose: html`<style>${css`...`}</style>`", () => {
		const src = "const page = html`<style>${css`body { color: red; }`}</style>`";
		const tokens = enrich(src);
		// Outer HTML tag-name for style is present.
		expect(
			tokens.some((t) => t.type === "tag_name" && t.value === "style"),
		).toBe(true);
		// The inner CSS is tokenized — `body` as selector, `color` as property.
		expect(type_of(tokens, "body")).toBe("selector");
		expect(type_of(tokens, "color")).toBe("property");
		// `red` is emitted as a keyword (CSS named color) by the CSS grammar.
		expect(type_of(tokens, "red")).toBe("keyword");
		// The inner `css` identifier has been consumed by the inner group,
		// so no leftover raw template body shows up as a plain `template`
		// token spanning the CSS source text.
		expect(
			tokens.some(
				(t) =>
					t.type === "template" &&
					t.value.includes("body") &&
					t.value.includes("color"),
			),
		).toBe(false);
	});
});

describe("JavaScript reclassifier — class field exclusion", () => {
	// the bug: `class C { name: T = value; }` would otherwise rewrite `name`
	// to property because it's preceded by `{` and followed by `:`. the
	// type-annotation rule didn't catch it (`: id =` doesn't end in `;`).
	// the new exclusion rule's lookbehind matches the actual `class IDENT
	// [extends IDENT] {` header sequence, so it's precise.

	it("first class field with a default value stays as identifier", () => {
		const tokens = enrich("class Foo { bar: T = 1; }");
		expect(type_of(tokens, "bar")).toBe("identifier");
	});

	it("works with extends in the class header", () => {
		const tokens = enrich("class Foo extends Bar { baz: T = 2; }");
		expect(type_of(tokens, "baz")).toBe("identifier");
	});

	it("works with a class-member modifier between { and the field name", () => {
		const tokens = enrich(`class Foo { static name: T = "x"; }`);
		expect(type_of(tokens, "name")).toBe("identifier");
	});

	it("regression: destructure-with-default keeps the key as property", () => {
		const tokens = enrich("let { a: b = c } = obj;");
		expect(type_of(tokens, "a")).toBe("property");
	});

	it("regression: object literal with assignment value keeps the key as property", () => {
		const tokens = enrich("let obj = { a: b = 1 };");
		expect(type_of(tokens, "a")).toBe("property");
	});

	it("regression: regular object literal property classification still works", () => {
		const tokens = enrich("let obj = { a: b, c: d };");
		expect(type_of(tokens, "a")).toBe("property");
		expect(type_of(tokens, "c")).toBe("property");
	});

	it("regression: class field with no default still classifies as identifier", () => {
		const tokens = enrich("class Foo { bar: T; }");
		expect(type_of(tokens, "bar")).toBe("identifier");
	});

	it("regression: subsequent class fields (after ;) stay as identifier", () => {
		const tokens = enrich("class C { x; y: T = 5; z = 6; w: T = 7; }");
		expect(type_of(tokens, "y")).toBe("identifier");
		expect(type_of(tokens, "z")).toBe("identifier");
		expect(type_of(tokens, "w")).toBe("identifier");
	});

	it("methods continue to classify as function", () => {
		const tokens = enrich("class Foo { bar: T = 1; method() { return 1; } }");
		expect(type_of(tokens, "bar")).toBe("identifier");
		expect(type_of(tokens, "method")).toBe("function");
	});
});
