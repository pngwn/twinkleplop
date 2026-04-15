// Integration tests for the Python reclassifier pipeline.
//
// Uses the top-level `language()` entry point so reclassifier rewrites are
// applied. Snapshot tests in grammar.test.ts use raw `grammar` directly and
// see the pre-reclassifier `class_name` for `type` everywhere.

import { describe, it, expect } from "vitest";
import { language } from "./index.js";

function enrich(input: string) {
	const result = language(input);
	const out: { type: string; value: string; start: number; end: number }[] = [];
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

function type_of(tokens: ReturnType<typeof enrich>, value: string) {
	return tokens.find((t) => t.value === value)?.type;
}

describe("Python reclassifier — type alias (PEP 695)", () => {
	it("type Pair = tuple[int, str]", () => {
		const tokens = enrich("type Pair = tuple[int, str]");
		expect(type_of(tokens, "type")).toBe("keyword");
		expect(type_of(tokens, "Pair")).toBe("class_name");
		expect(type_of(tokens, "tuple")).toBe("class_name");
		expect(type_of(tokens, "int")).toBe("class_name");
		expect(type_of(tokens, "str")).toBe("class_name");
	});

	it("type Vec[T] = list[T]", () => {
		const tokens = enrich("type Vec[T] = list[T]");
		expect(type_of(tokens, "type")).toBe("keyword");
		expect(type_of(tokens, "Vec")).toBe("class_name");
		expect(type_of(tokens, "T")).toBe("class_name");
		expect(type_of(tokens, "list")).toBe("class_name");
	});

	it("type Mapping[K, V] = dict[K, V]", () => {
		const tokens = enrich("type Mapping[K, V] = dict[K, V]");
		expect(type_of(tokens, "type")).toBe("keyword");
	});

	it("lowercase alias name still triggers promotion", () => {
		const tokens = enrich("type my_alias = int");
		expect(type_of(tokens, "type")).toBe("keyword");
	});
});

describe("Python reclassifier — type stays as class_name elsewhere", () => {
	it("type(x) function call", () => {
		const tokens = enrich("type(x)");
		expect(type_of(tokens, "type")).toBe("class_name");
	});

	it("isinstance(x, type)", () => {
		const tokens = enrich("isinstance(x, type)");
		expect(type_of(tokens, "type")).toBe("class_name");
	});

	it("type as keyword argument", () => {
		const tokens = enrich("foo(type=Bar)");
		expect(type_of(tokens, "type")).toBe("class_name");
	});

	it("type after dot (attribute access)", () => {
		const tokens = enrich("obj.type");
		expect(type_of(tokens, "type")).toBe("class_name");
	});

	it("type as variable assignment is NOT a type-alias header", () => {
		// `type = 5` looks like `type Name = ...` only if the `=` is the FIRST
		// thing after `type`. without an intervening name, the rule does not
		// match — `type` stays as class_name (the builtin).
		const tokens = enrich("type = 5");
		expect(type_of(tokens, "type")).toBe("class_name");
	});
});
