// Svelte grammar tests — base tokenization without embedding.
//
// These tests exercise the raw Svelte grammar (no reclassifiers), verifying
// that HTML structure, script/style raw tokens, and Svelte block/expression
// tokens are emitted correctly. Sub-language embedding is tested separately
// in reclassifier.test.js. Fixture-driven snapshots under test/*.svelte
// exhaustively cover each construct.

import fs from "node:fs";
import path from "node:path";
import { tokenize } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { describe, expect, it, test } from "vitest";
import { grammar, raw_grammar } from "./index.js";

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

function get_snapshot_tokens(src: string) {
  const result = tokenize(src, grammar);
  const tokens = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const type = result.token_types[result.tokens[i * 3]];
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    const match = src.substring(start, end);
    tokens.push({ type, start, end, match });
  }
  return tokens;
}

describe("Svelte grammar — integrity", () => {
  test("verify", () => {
    const issues = verify(raw_grammar);
    expect(issues).toEqual([]);
  });
});

describe("Svelte grammar — HTML structure", () => {
  it("tokenizes a basic element", () => {
    const tokens = tokens_of("<p>hello</p>");
    expect(tokens.filter((t) => t.type === "tag_name").map((t) => t.value)).toEqual(["p", "p"]);
  });

  it("recognizes component tags (capitalized)", () => {
    const tokens = tokens_of("<Button>Click</Button>");
    expect(tokens.filter((t) => t.type === "tag_name").map((t) => t.value)).toEqual([
      "Button",
      "Button",
    ]);
  });

  it("splits `<svelte:component>` into svelte-element + : + tag-name", () => {
    const tokens = tokens_of("<svelte:component this={X}/>");
    expect(tokens.some((t) => t.type === "keyword" && t.value === "svelte")).toBe(true);
    expect(tokens.some((t) => t.type === "tag_name" && t.value === "component")).toBe(true);
    expect(tokens.some((t) => t.type === "punctuation" && t.value === ":")).toBe(true);
  });

  it("leaves `<notsvelte:foo>` alone", () => {
    const tokens = tokens_of("<notsvelte:foo/>");
    expect(tokens.some((t) => t.type === "tag_name" && t.value === "notsvelte:foo")).toBe(true);
    expect(tokens.some((t) => t.type === "keyword")).toBe(false);
  });

  it("does not split `<noscript>` as a script block", () => {
    const tokens = tokens_of("<noscript>hi</noscript>");
    // The `script` keyword should NOT fire mid-name.
    expect(tokens.some((t) => t.type === "raw_script")).toBe(false);
    expect(tokens.filter((t) => t.type === "tag_name").map((t) => t.value)).toEqual([
      "noscript",
      "noscript",
    ]);
  });

  it("tokenizes attributes with string values", () => {
    const tokens = tokens_of('<p class="heading" id="main">');
    const attrs = tokens.filter((t) => t.type === "attr_name").map((t) => t.value);
    expect(attrs).toEqual(["class", "id"]);
    // string chunks coalesce into one span per quoted value.
    const strings = tokens.filter((t) => t.type === "string").map((t) => t.value);
    expect(strings).toEqual(['"heading"', '"main"']);
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
  it("splits `{name}` into expression + body + expression", () => {
    const tokens = tokens_of("<p>Hello {name}!</p>");
    const braces = tokens.filter(
      (t) => t.type === "expression" && (t.value === "{" || t.value === "}"),
    );
    expect(braces.map((t) => t.value)).toEqual(["{", "}"]);
    const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
    expect(raw.map((t) => t.value).join("")).toBe("name");
  });

  it("handles nested braces via state stack", () => {
    const src = "{fn({a: 1, b: 2})}";
    const tokens = tokens_of(src);
    // Only the outer `{` and `}` are `expression`; inner braces are part
    // of the raw_svelte_expression span.
    const expr = tokens.filter(
      (t) => t.type === "expression" && (t.value === "{" || t.value === "}"),
    );
    expect(expr.map((t) => t.value)).toEqual(["{", "}"]);
    const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
    expect(raw.map((t) => t.value).join("")).toBe("fn({a: 1, b: 2})");
  });

  it("skips `}` inside string literals inside expressions", () => {
    const src = '{"has } brace"}';
    const tokens = tokens_of(src);
    const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
    expect(raw.map((t) => t.value).join("")).toBe('"has } brace"');
  });

  it("emits expression for attribute values: `attr={expr}`", () => {
    const src = "<button onclick={handler}>";
    const tokens = tokens_of(src);
    expect(tokens.some((t) => t.type === "attr_name" && t.value === "onclick")).toBe(true);
    const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
    expect(raw.map((t) => t.value).join("")).toBe("handler");
  });
});

describe("Svelte grammar — attribute string interpolation", () => {
  it("extracts `{expr}` inside double-quoted attr strings", () => {
    const src = '<a href="/p/{id}.png">';
    const tokens = tokens_of(src);
    // The `{id}` is a distinct expression inside the string.
    const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
    expect(raw.map((t) => t.value).join("")).toBe("id");
    // Surrounding string chunks include the quotes and the literal parts.
    const strings = tokens
      .filter((t) => t.type === "string")
      .map((t) => t.value)
      .join("");
    expect(strings).toBe('"/p/.png"');
  });

  it("extracts `{expr}` inside single-quoted attr strings", () => {
    const src = "<a title='{label}'>";
    const tokens = tokens_of(src);
    const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
    expect(raw.map((t) => t.value).join("")).toBe("label");
  });

  it("plain quoted attr without interpolation stays a single string", () => {
    const src = '<a class="heading">';
    const tokens = tokens_of(src);
    const strings = tokens.filter((t) => t.type === "string");
    expect(strings.map((t) => t.value).join("")).toBe('"heading"');
    expect(tokens.some((t) => t.type === "raw_svelte_expression")).toBe(false);
  });
});

describe("Svelte grammar — element directives", () => {
  it("splits `bind:value` into directive prefix + attr-name", () => {
    const tokens = tokens_of("<input bind:value={x}>");
    const direc = tokens.find((t) => t.type === "svelte_directive");
    expect(direc?.value).toBe("bind:");
    expect(tokens.some((t) => t.type === "attr_name" && t.value === "value")).toBe(true);
  });

  it("splits `on:click|preventDefault|stopPropagation` modifiers", () => {
    const tokens = tokens_of("<button on:click|preventDefault|stopPropagation={h}>");
    expect(tokens.find((t) => t.type === "svelte_directive")?.value).toBe("on:");
    const attrs = tokens.filter((t) => t.type === "attr_name").map((t) => t.value);
    expect(attrs).toEqual(["click", "preventDefault", "stopPropagation"]);
    const pipes = tokens.filter((t) => t.type === "punctuation" && t.value === "|");
    expect(pipes).toHaveLength(2);
  });

  it("handles each directive family prefix", () => {
    for (const prefix of [
      "bind:",
      "on:",
      "use:",
      "transition:",
      "in:",
      "out:",
      "animate:",
      "class:",
      "style:",
      "let:",
    ]) {
      const src = `<div ${prefix}name={x}>`;
      const tokens = tokens_of(src);
      expect(tokens.some((t) => t.type === "svelte_directive" && t.value === prefix)).toBe(true);
    }
  });

  it("does not mistake plain `class=` for a directive", () => {
    const tokens = tokens_of('<div class="foo">');
    expect(tokens.some((t) => t.type === "svelte_directive" && t.value === "class:")).toBe(false);
    expect(tokens.some((t) => t.type === "attr_name" && t.value === "class")).toBe(true);
  });
});

describe("Svelte grammar — block syntax", () => {
  it("splits `{#if expr}` into `{` + `#` + `if` + body + `}`", () => {
    const tokens = tokens_of("{#if ready}<p>yes</p>{/if}");
    const blocks = tokens.filter((t) => t.type === "svelte_block").map((t) => t.value);
    expect(blocks).toEqual(["if", "if"]);
    // The `#` and `/` sigils are emitted as punctuation before the
    // block keyword.
    const sigils = tokens
      .filter((t) => t.type === "punctuation" && (t.value === "#" || t.value === "/"))
      .map((t) => t.value);
    expect(sigils).toEqual(["#", "/"]);
    const raw = tokens.filter((t) => t.type === "raw_svelte_expression");
    expect(
      raw
        .map((t) => t.value)
        .join("")
        .trim(),
    ).toBe("ready");
    // Every `{` and `}` is `expression` (adjacent-to-other-expression
    // tokens coalesce, so count characters not tokens).
    const expr = tokens
      .filter((t) => t.type === "expression")
      .map((t) => t.value)
      .join("");
    expect([...expr].filter((c) => c === "{").length).toBe(2);
    expect([...expr].filter((c) => c === "}").length).toBe(2);
  });

  it("recognizes `{#each}` with as-binding and key", () => {
    const tokens = tokens_of("{#each items as item, i (item.id)}{/each}");
    const blocks = tokens.filter((t) => t.type === "svelte_block").map((t) => t.value);
    expect(blocks).toEqual(["each", "each"]);
  });

  it("recognizes `{:else}` and `{:else if expr}`", () => {
    const tokens1 = tokens_of("{:else}");
    expect(tokens1.some((t) => t.type === "svelte_block" && t.value === "else")).toBe(true);
    expect(tokens1.some((t) => t.type === "punctuation" && t.value === ":")).toBe(true);

    const tokens2 = tokens_of("{:else if ready}");
    expect(tokens2.some((t) => t.type === "svelte_block" && t.value === "else if")).toBe(true);
  });

  it("recognizes `{#await}` / `{:then}` / `{:catch}`", () => {
    const tokens = tokens_of("{#await fetchData()}loading{:then data}ok{:catch err}bad{/await}");
    const blocks = tokens.filter((t) => t.type === "svelte_block").map((t) => t.value);
    expect(blocks).toEqual(["await", "then", "catch", "await"]);
  });

  it("recognizes `{#key}` and `{#snippet}`", () => {
    const t1 = tokens_of("{#key x}<div/>{/key}");
    expect(t1.filter((t) => t.type === "svelte_block").map((t) => t.value)).toEqual(["key", "key"]);

    const t2 = tokens_of("{#snippet foo(x)}<p>{x}</p>{/snippet}");
    expect(t2.filter((t) => t.type === "svelte_block").map((t) => t.value)).toEqual([
      "snippet",
      "snippet",
    ]);
  });

  it("emits `{@html}`, `{@const}`, `{@debug}`, `{@render}` as svelte-block", () => {
    for (const d of ["html", "const", "debug", "render"]) {
      const t = tokens_of(`{@${d} x}`);
      expect(t.some((u) => u.type === "svelte_block" && u.value === d)).toBe(true);
      // `@` is punctuation and sits between `{` and the keyword.
      expect(t.some((u) => u.type === "punctuation" && u.value === "@")).toBe(true);
      // No `svelte_directive` tokens leak for at-directive forms.
      expect(t.some((u) => u.type === "svelte_directive")).toBe(false);
    }
  });
});

// -------------------------------------------------------------------
// Fixture-driven snapshot tests. Each `test/*.svelte` pairs with
// `test/<name>.output.js` (regenerate via `node generate-snapshots.js`).
// -------------------------------------------------------------------
const test_dir = path.join(import.meta.dirname, "..", "test");
const input_files = fs
  .readdirSync(test_dir)
  .filter((f) => f.endsWith(".svelte"))
  .sort();

const output_modules = import.meta.glob("../test/*.output.js", {
  eager: true,
}) as Record<string, { test: unknown[] }>;

describe("Svelte grammar — fixtures", () => {
  for (const filename of input_files) {
    const base = filename.replace(".svelte", "");
    const expected_path = path.join("../test", `${base}.output.js`);
    const expected_key = Object.keys(output_modules).find((k) => k.endsWith(`${base}.output.js`));

    it(`tokenizes ${base}`, () => {
      if (!expected_key) {
        throw new Error(
          `Missing snapshot for ${filename}; run \`node generate-snapshots.js\` to create ${base}.output.js`,
        );
      }
      const src = fs.readFileSync(path.join(test_dir, filename), "utf-8");
      const tokens = get_snapshot_tokens(src);
      expect(tokens).toEqual(output_modules[expected_key].test);
    });
  }
});
