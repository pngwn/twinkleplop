// Svelte grammar tests — base tokenization without embedding.
//
// These tests exercise the raw Svelte grammar (no reclassifiers), verifying
// that HTML structure, script/style raw tokens, and Svelte block/expression
// tokens are emitted correctly. Sub-language embedding is tested separately
// in reclassifier.test.js.

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

describe("Svelte grammar — HTML structure", () => {
	it("tokenizes a basic element", () => {
		const tokens = tokens_of("<p>hello</p>");
		expect(tokens.filter((t) => t.type === "tag-name").map((t) => t.value)).toEqual([
			"p",
			"p",
		]);
	});

	it("recognizes component tags (capitalized)", () => {
		const tokens = tokens_of("<Button>Click</Button>");
		expect(tokens.filter((t) => t.type === "tag-name").map((t) => t.value)).toEqual([
			"Button",
			"Button",
		]);
	});

	it("tokenizes attributes with string values", () => {
		const tokens = tokens_of('<p class="heading" id="main">');
		const attrs = tokens.filter((t) => t.type === "attr-name").map((t) => t.value);
		expect(attrs).toEqual(["class", "id"]);
		const strings = tokens.filter((t) => t.type === "string");
		expect(strings.map((t) => t.value)).toEqual(['"heading"', '"main"']);
	});

	it("emits raw_script for <script> body", () => {
		const tokens = tokens_of("<script>let x = 1;</script>");
		const raw = tokens.filter((t) => t.type === "raw_script");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("let x = 1;");
	});

	it("emits raw_style for <style> body", () => {
		const tokens = tokens_of("<style>p { color: red; }</style>");
		const raw = tokens.filter((t) => t.type === "raw_style");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("p { color: red; }");
	});
});

describe("Svelte grammar — `{expression}` interpolations", () => {
	it("emits punctuation + raw_svelte_expression for `{name}`", () => {
		const tokens = tokens_of("<p>Hello {name}!</p>");
		// The `{` is punctuation, `name` is raw_svelte_expression, `}` is punctuation.
		const braces = tokens.filter(
			(t) => t.type === "punctuation" && (t.value === "{" || t.value === "}"),
		);
		expect(braces.map((t) => t.value)).toEqual(["{", "}"]);
		const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
		expect(raw).toHaveLength(1);
		expect(raw[0].value).toBe("name");
	});

	it("handles nested braces via state stack", () => {
		const src = "{fn({a: 1, b: 2})}";
		const tokens = tokens_of(src);
		// The outer `{` and `}` are punctuation; everything else (including
		// the inner braces) is raw_svelte_expression, coalesced.
		const punct = tokens.filter(
			(t) => t.type === "punctuation" && (t.value === "{" || t.value === "}"),
		);
		expect(punct).toHaveLength(2);
		const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
		expect(raw).toHaveLength(1);
		// The raw content includes the inner braces verbatim.
		expect(raw[0].value).toBe("fn({a: 1, b: 2})");
	});

	it("skips `}` inside string literals inside expressions", () => {
		// `{"has } brace"}` — the `}` inside the string should not end the
		// expression.
		const src = '{"has } brace"}';
		const tokens = tokens_of(src);
		// Should have one open brace, one raw content (the string), one close.
		const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
		// The string itself is tokenized via within — its source is a single
		// raw_svelte_expression token spanning `"has } brace"`.
		expect(raw.map((t) => t.value).join("")).toBe('"has } brace"');
	});

	it("emits expression for attribute values: `attr={expr}`", () => {
		const src = "<button onclick={handler}>";
		const tokens = tokens_of(src);
		expect(tokens.some((t) => t.type === "attr-name" && t.value === "onclick")).toBe(
			true,
		);
		const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
		expect(raw.map((t) => t.value).join("")).toBe("handler");
	});
});

describe("Svelte grammar — block syntax", () => {
	it("recognizes `{#if expr}` with trailing expression body", () => {
		const tokens = tokens_of("{#if ready}<p>yes</p>{/if}");
		const blocks = tokens.filter((t) => t.type === "svelte-block");
		expect(blocks.map((t) => t.value)).toEqual(["{#if", "{/if}"]);
		// The expression content is in raw_svelte_expression. The leading
		// space after `{#if` is part of the content — JavaScript's tokenizer
		// will ignore it downstream.
		const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
		expect(raw.map((t) => t.value).join("").trim()).toBe("ready");
	});

	it("recognizes `{#each}` with as-binding and key", () => {
		const tokens = tokens_of("{#each items as item, i (item.id)}{/each}");
		const blocks = tokens.filter((t) => t.type === "svelte-block");
		expect(blocks.map((t) => t.value)).toEqual(["{#each", "{/each}"]);
	});

	it("recognizes `{:else}` and `{:else if expr}`", () => {
		const tokens1 = tokens_of("{:else}");
		expect(
			tokens1.some((t) => t.type === "svelte-block" && t.value === "{:else}"),
		).toBe(true);

		const tokens2 = tokens_of("{:else if ready}");
		expect(
			tokens2.some((t) => t.type === "svelte-block" && t.value === "{:else if"),
		).toBe(true);
	});

	it("recognizes `{#await}` / `{:then}` / `{:catch}`", () => {
		const tokens = tokens_of(
			"{#await fetchData()}loading{:then data}ok{:catch err}bad{/await}",
		);
		const blocks = tokens.filter((t) => t.type === "svelte-block").map((t) => t.value);
		expect(blocks).toEqual(["{#await", "{:then", "{:catch", "{/await}"]);
	});

	it("recognizes `{#key}` and `{#snippet}`", () => {
		const t1 = tokens_of("{#key x}<div/>{/key}");
		expect(t1.some((t) => t.type === "svelte-block" && t.value === "{#key")).toBe(
			true,
		);
		expect(t1.some((t) => t.type === "svelte-block" && t.value === "{/key}")).toBe(
			true,
		);

		const t2 = tokens_of("{#snippet foo(x)}<p>{x}</p>{/snippet}");
		expect(
			t2.some((t) => t.type === "svelte-block" && t.value === "{#snippet"),
		).toBe(true);
		expect(
			t2.some((t) => t.type === "svelte-block" && t.value === "{/snippet}"),
		).toBe(true);
	});

	it("recognizes `{@html}` and `{@const}` directives", () => {
		const t1 = tokens_of("{@html rawMarkup}");
		expect(
			t1.some((t) => t.type === "svelte-directive" && t.value === "{@html"),
		).toBe(true);

		const t2 = tokens_of("{@const doubled = count * 2}");
		expect(
			t2.some((t) => t.type === "svelte-directive" && t.value === "{@const"),
		).toBe(true);
	});
});
