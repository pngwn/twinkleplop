import { describe, it, expect } from "vitest";
import { language } from "./index.js";

function enrich(input: string) {
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

function type_of(tokens: ReturnType<typeof enrich>, value: string) {
	return tokens.find((t) => t.value === value)?.type;
}

describe("Rust reclassifier — function calls", () => {
	it("plain function call", () => {
		const tokens = enrich("foo()");
		expect(type_of(tokens, "foo")).toBe("function");
	});

	it("function call with args", () => {
		const tokens = enrich("calculate(x, y)");
		expect(type_of(tokens, "calculate")).toBe("function");
		expect(type_of(tokens, "x")).toBe("identifier");
		expect(type_of(tokens, "y")).toBe("identifier");
	});

	it("method call", () => {
		const tokens = enrich("self.method()");
		expect(type_of(tokens, "method")).toBe("function");
	});

	it("associated function call", () => {
		const tokens = enrich("Vec::new()");
		expect(type_of(tokens, "new")).toBe("function");
		expect(type_of(tokens, "Vec")).toBe("identifier");
	});

	it("chained method calls", () => {
		const tokens = enrich("iter.map(f).collect()");
		expect(type_of(tokens, "map")).toBe("function");
		expect(type_of(tokens, "collect")).toBe("function");
		expect(type_of(tokens, "iter")).toBe("identifier");
	});

	it("macro invocation stays identifier", () => {
		const tokens = enrich("println!(x)");
		expect(type_of(tokens, "println")).toBe("identifier");
	});

	it("plain identifier is not rewritten", () => {
		const tokens = enrich("let x = y;");
		expect(type_of(tokens, "x")).toBe("identifier");
		expect(type_of(tokens, "y")).toBe("identifier");
	});

	it("struct field is not rewritten", () => {
		const tokens = enrich("self.name");
		expect(type_of(tokens, "name")).toBe("identifier");
	});
});
