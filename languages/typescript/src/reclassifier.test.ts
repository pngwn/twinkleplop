// Integration tests for the TypeScript pipeline. Uses the `language` entry
// point (tokenize + reclassify) so it covers the full path including the
// interface_member_promoter pass.

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

describe("TypeScript reclassifier — interface member promotion", () => {
	// The rule-based reclassifier's broad type-annotation exclusion would
	// demote interface members to identifier (because `: id ;` and `: type`
	// match). The stateful interface_member_promoter walks the token stream,
	// identifies brace depths inside `interface IDENT [extends ...] {`, and
	// re-promotes those members to property.

	it("interface members with custom type annotations classify as property", () => {
		const tokens = enrich("interface I { x: T; y: U; }");
		expect(type_of(tokens, "x")).toBe("property");
		expect(type_of(tokens, "y")).toBe("property");
	});

	it("interface members with builtin type annotations classify as property", () => {
		const tokens = enrich("interface I { x: number; y: string; }");
		expect(type_of(tokens, "x")).toBe("property");
		expect(type_of(tokens, "y")).toBe("property");
	});

	it("interface with extends clause works", () => {
		const tokens = enrich("interface I extends J { x: T; }");
		expect(type_of(tokens, "x")).toBe("property");
	});

	it("interface members with readonly modifier classify as property", () => {
		const tokens = enrich("interface I { readonly x: T; }");
		expect(type_of(tokens, "x")).toBe("property");
	});

	it("interface methods stay as function (followed by `(` not `:`)", () => {
		const tokens = enrich("interface I { method(): T; x: number; }");
		expect(type_of(tokens, "method")).toBe("function");
		expect(type_of(tokens, "x")).toBe("property");
	});

	it("optional interface members classify as property", () => {
		const tokens = enrich("interface I { x?: T; }");
		// `?:` is a single operator token in this grammar.
		expect(type_of(tokens, "x")).toBe("property");
	});

	it("typed parameters in interface methods stay as identifier", () => {
		// regression: the promoter must skip identifiers inside `(...)` so
		// `find(id: number)` doesn't reclassify `id` as a property.
		const tokens = enrich(
			"interface Repository { find(id: number): User; save(user: User): void; }",
		);
		expect(type_of(tokens, "find")).toBe("function");
		expect(type_of(tokens, "id")).toBe("identifier");
		expect(type_of(tokens, "user")).toBe("identifier");
		expect(type_of(tokens, "save")).toBe("function");
	});

	it("interface with mixed fields and methods classifies each correctly", () => {
		const tokens = enrich(`interface Repository extends Collection {
			field: thing;
			find(id: number): User;
			save(user: User): void;
			field2: thing;
		}`);
		expect(type_of(tokens, "field")).toBe("property");
		expect(type_of(tokens, "field2")).toBe("property");
		expect(type_of(tokens, "find")).toBe("function");
		expect(type_of(tokens, "save")).toBe("function");
		expect(type_of(tokens, "id")).toBe("identifier");
		expect(type_of(tokens, "user")).toBe("identifier");
	});

	it("computed key inside interface stays as identifier", () => {
		// `[key]: T` — the bracketed identifier shouldn't get promoted.
		const tokens = enrich("interface I { [key]: T; field: T; }");
		expect(type_of(tokens, "key")).toBe("identifier");
		expect(type_of(tokens, "field")).toBe("property");
	});
});

describe("TypeScript reclassifier — class field exclusion still wins over property", () => {
	// regression: the class field rule and interface promoter must not
	// interfere with each other.

	it("class field with default value stays identifier (not property)", () => {
		const tokens = enrich("class C { x: T = 1; }");
		expect(type_of(tokens, "x")).toBe("identifier");
	});

	it("class field with type annotation only stays identifier", () => {
		const tokens = enrich("class C { x: T; }");
		expect(type_of(tokens, "x")).toBe("identifier");
	});

	it("class extends doesn't accidentally trigger interface promoter", () => {
		const tokens = enrich("class C extends D { x: T = 1; }");
		expect(type_of(tokens, "x")).toBe("identifier");
	});
});

describe("TypeScript reclassifier — object literal / destructure unaffected", () => {
	it("object literal property classification works", () => {
		const tokens = enrich("let o = { a: 1, b: 2 };");
		expect(type_of(tokens, "a")).toBe("property");
		expect(type_of(tokens, "b")).toBe("property");
	});

	it("destructure-with-rename keeps the key as property", () => {
		const tokens = enrich("let { a: b } = obj;");
		expect(type_of(tokens, "a")).toBe("property");
	});

	it("destructure-with-default keeps the key as property", () => {
		const tokens = enrich("let { a: b = c } = obj;");
		expect(type_of(tokens, "a")).toBe("property");
	});
});
