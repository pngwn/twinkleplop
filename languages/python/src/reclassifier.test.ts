// Integration tests for the Python reclassifier pipeline.
//
// Uses the top-level `language()` entry point so reclassifier rewrites are
// applied. Snapshot tests in grammar.test.ts use raw `grammar` directly and
// see the pre-reclassifier `builtin` for `type` everywhere.

import { describe, it, expect } from "vitest";
import { language as make_language } from "./index.js";

const language = make_language();

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
		expect(type_of(tokens, "tuple")).toBe("builtin");
		expect(type_of(tokens, "int")).toBe("builtin");
		expect(type_of(tokens, "str")).toBe("builtin");
	});

	it("type Vec[T] = list[T]", () => {
		const tokens = enrich("type Vec[T] = list[T]");
		expect(type_of(tokens, "type")).toBe("keyword");
		expect(type_of(tokens, "Vec")).toBe("class_name");
		expect(type_of(tokens, "T")).toBe("class_name");
		expect(type_of(tokens, "list")).toBe("builtin");
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

describe("Python reclassifier — function promotion", () => {
	it("promotes def name", () => {
		const tokens = enrich("def greet(name):\n    pass");
		expect(type_of(tokens, "greet")).toBe("function");
		// parameter stays as identifier
		expect(type_of(tokens, "name")).toBe("identifier");
	});

	it("promotes call-site identifier", () => {
		const tokens = enrich("result = greet(world)");
		expect(type_of(tokens, "greet")).toBe("function");
		// `result` is NOT followed by `(`, stays as identifier
		expect(type_of(tokens, "result")).toBe("identifier");
	});

	it("promotes method call after attribute access", () => {
		const tokens = enrich("obj.method()");
		expect(type_of(tokens, "obj")).toBe("identifier");
		expect(type_of(tokens, "method")).toBe("function");
	});

	it("promotes only the last identifier in a chain", () => {
		const tokens = enrich("x.foo.bar()");
		expect(type_of(tokens, "foo")).toBe("identifier");
		expect(type_of(tokens, "bar")).toBe("function");
	});

	it("does NOT promote identifier when `(` does not follow", () => {
		const tokens = enrich("print = 5");
		expect(type_of(tokens, "print")).toBe("identifier");
	});

	it("leaves PascalCase class names as class_name even when called", () => {
		// constructor-call style — `Foo(...)` stays class_name, matching
		// the github theme convention of orange entity.name.
		const tokens = enrich("Foo(5)");
		expect(type_of(tokens, "Foo")).toBe("class_name");
	});

	it("leaves builtin types as builtin even when called", () => {
		const tokens = enrich("int(x)");
		expect(type_of(tokens, "int")).toBe("builtin");
	});
});

describe("Python reclassifier — type stays as builtin elsewhere", () => {
	it("type(x) function call", () => {
		const tokens = enrich("type(x)");
		expect(type_of(tokens, "type")).toBe("builtin");
	});

	it("isinstance(x, type)", () => {
		const tokens = enrich("isinstance(x, type)");
		expect(type_of(tokens, "type")).toBe("builtin");
	});

	it("type as keyword argument", () => {
		const tokens = enrich("foo(type=Bar)");
		expect(type_of(tokens, "type")).toBe("builtin");
	});

	it("type after dot (attribute access)", () => {
		const tokens = enrich("obj.type");
		expect(type_of(tokens, "type")).toBe("builtin");
	});

	it("type as variable assignment is NOT a type-alias header", () => {
		// `type = 5` looks like `type Name = ...` only if the `=` is the FIRST
		// thing after `type`. without an intervening name, the rule does not
		// match — `type` stays as builtin.
		const tokens = enrich("type = 5");
		expect(type_of(tokens, "type")).toBe("builtin");
	});
});
