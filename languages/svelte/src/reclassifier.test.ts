// Integration tests for the Svelte language pipeline — full reclassifier
// including JS/CSS embedding for script/style blocks AND JS embedding for
// `{expression}` interpolations and block expression bodies.

import { describe, it, expect } from "vitest";
import { language } from "./index.js";

function enrich(src: string) {
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

function type_of(tokens: ReturnType<typeof enrich>, value: string) {
	return tokens.find((t) => t.value === value)?.type;
}

describe("Svelte language — script embedding", () => {
	it("tokenizes <script> body as JavaScript", () => {
		const src = "<script>let count = 0; const inc = () => count++;</script>";
		const tokens = enrich(src);
		// No raw_script leftovers.
		expect(tokens.some((t) => t.type === "raw_script")).toBe(false);
		// JS keywords and function-variable detection fired inside.
		expect(type_of(tokens, "let")).toBe("keyword");
		expect(type_of(tokens, "const")).toBe("keyword");
		expect(type_of(tokens, "inc")).toBe("function"); // function-variable rule
	});
});

describe("Svelte language — style embedding", () => {
	it("tokenizes <style> body as CSS", () => {
		const src = "<style>.btn { color: red; }</style>";
		const tokens = enrich(src);
		expect(tokens.some((t) => t.type === "raw_style")).toBe(false);
		expect(type_of(tokens, ".btn")).toBe("class-name");
		expect(type_of(tokens, "color")).toBe("property");
	});
});

describe("Svelte language — `{expression}` interpolations", () => {
	it("tokenizes `{name}` as JS identifier", () => {
		const src = "<p>Hello {name}!</p>";
		const tokens = enrich(src);
		// No raw_svelte_expression leftovers.
		expect(tokens.some((t) => t.type === "raw_svelte_expression")).toBe(false);
		// The identifier is tokenized as JS.
		expect(type_of(tokens, "name")).toBe("identifier");
	});

	it("tokenizes complex expressions", () => {
		const src = "{count === 1 ? 'one' : 'many'}";
		const tokens = enrich(src);
		expect(type_of(tokens, "count")).toBe("identifier");
		expect(
			tokens.some((t) => t.type === "operator" && t.value === "==="),
		).toBe(true);
		// Strings inside the ternary are tokenized.
		expect(tokens.some((t) => t.type === "string")).toBe(true);
	});

	it("tokenizes attribute expression values", () => {
		const src = "<button onclick={handler}>Click</button>";
		const tokens = enrich(src);
		expect(type_of(tokens, "onclick")).toBe("attr-name");
		// `handler` is tokenized as JS identifier.
		expect(type_of(tokens, "handler")).toBe("identifier");
	});

	it("nested object literal in expression: {fn({a: 1})}", () => {
		const src = "{fn({a: 1})}";
		const tokens = enrich(src);
		// `fn` is a function (probe mode detected the call).
		expect(type_of(tokens, "fn")).toBe("function");
		expect(type_of(tokens, "a")).toBe("property");
		expect(type_of(tokens, "1")).toBe("number");
	});

	it("template literal inside an expression: {`hi ${x}`}", () => {
		const src = "<p>{`hi ${x}`}</p>";
		const tokens = enrich(src);
		// `x` is an identifier inside the template literal interpolation.
		expect(type_of(tokens, "x")).toBe("identifier");
		// Template tokens are present.
		expect(tokens.some((t) => t.type === "template")).toBe(true);
	});
});

describe("Svelte language — block expressions", () => {
	it("tokenizes `{#if expr}` body as JS", () => {
		const src = "{#if count > 0}yes{/if}";
		const tokens = enrich(src);
		// The block keyword is preserved.
		expect(
			tokens.some((t) => t.type === "svelte-block" && t.value === "{#if"),
		).toBe(true);
		// The expression is tokenized as JS.
		expect(type_of(tokens, "count")).toBe("identifier");
		expect(type_of(tokens, "0")).toBe("number");
		expect(tokens.some((t) => t.type === "operator" && t.value === ">")).toBe(
			true,
		);
	});

	it("tokenizes `{#each items as item}` body as JS", () => {
		const src = "{#each items as item, i (item.id)}{/each}";
		const tokens = enrich(src);
		expect(type_of(tokens, "items")).toBe("identifier");
		// `as` is a JS keyword.
		expect(type_of(tokens, "as")).toBe("keyword");
		expect(type_of(tokens, "item")).toBe("identifier");
	});

	it("tokenizes `{@const}` directive body as JS", () => {
		const src = "{@const doubled = count * 2}";
		const tokens = enrich(src);
		expect(
			tokens.some((t) => t.type === "svelte-directive" && t.value === "{@const"),
		).toBe(true);
		expect(type_of(tokens, "doubled")).toBe("identifier");
		expect(type_of(tokens, "count")).toBe("identifier");
		expect(type_of(tokens, "2")).toBe("number");
	});
});

describe("Svelte language — full component", () => {
	it("composes HTML + JS + CSS + interpolations", () => {
		const src = `<script>
  let name = "world";
  const greet = () => \`Hello, \${name}!\`;
</script>

<style>
  h1 { color: blue; }
</style>

<h1 class="greeting">Hello {name}!</h1>
{#if name}
  <p>{greet()}</p>
{/if}`;
		const tokens = enrich(src);
		// No raw leftovers — everything sub-tokenized.
		expect(tokens.some((t) => t.type === "raw_script")).toBe(false);
		expect(tokens.some((t) => t.type === "raw_style")).toBe(false);
		expect(tokens.some((t) => t.type === "raw_svelte_expression")).toBe(false);
		// Tokens from all four sub-languages present.
		const types = new Set(tokens.map((t) => t.type));
		// Svelte-specific
		expect(types.has("svelte-block")).toBe(true);
		// HTML structure
		expect(types.has("tag-name")).toBe(true);
		expect(types.has("attr-name")).toBe(true);
		// JS from script block and interpolations
		expect(types.has("keyword")).toBe(true);
		expect(types.has("identifier")).toBe(true);
		expect(types.has("function")).toBe(true); // function-variable fired
		// CSS from style block
		expect(types.has("property")).toBe(true);
	});
});
