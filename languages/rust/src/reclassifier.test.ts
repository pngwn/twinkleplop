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

function types_of(tokens: ReturnType<typeof enrich>, value: string) {
	return tokens.filter((t) => t.value === value).map((t) => t.type);
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
		expect(type_of(tokens, "Vec")).toBe("class_name");
	});

	it("chained method calls", () => {
		const tokens = enrich("iter.map(f).collect()");
		expect(type_of(tokens, "map")).toBe("function");
		expect(type_of(tokens, "collect")).toBe("function");
		expect(type_of(tokens, "iter")).toBe("identifier");
	});

	it("macro invocation stays identifier", () => {
		const tokens = enrich("println!(x)");
		expect(type_of(tokens, "println")).toBe("function");
	});

	it("generic function declaration `fn foo<'a>()`", () => {
		const tokens = enrich("fn foo<'a>(x: &'a str) {}");
		expect(type_of(tokens, "foo")).toBe("function");
	});

	it("turbofish call `collect::<Vec<T>>()`", () => {
		const tokens = enrich("let v = collect::<Vec<T>>();");
		expect(type_of(tokens, "collect")).toBe("function");
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

describe("Rust reclassifier — type-position angle brackets", () => {
	it("enum Option<T> generics are punctuation", () => {
		const tokens = enrich("enum Option<T> {}");
		expect(types_of(tokens, "<")).toEqual(["punctuation"]);
		expect(types_of(tokens, ">")).toEqual(["punctuation"]);
	});

	it("nested generics HashMap<String, Vec<i32>>", () => {
		const tokens = enrich("HashMap<String, Vec<i32>>");
		expect(types_of(tokens, "<")).toEqual(["punctuation", "punctuation"]);
		expect(types_of(tokens, ">>")).toEqual(["punctuation"]);
	});

	it("fn foo<'a>(x: &'a str) — generics + lifetimes", () => {
		const tokens = enrich("fn foo<'a>(x: &'a str) {}");
		expect(types_of(tokens, "<")).toEqual(["punctuation"]);
		expect(types_of(tokens, ">")).toEqual(["punctuation"]);
		// `&` stays an operator
		expect(type_of(tokens, "&")).toBe("operator");
		// `'` is punctuation; in generics the `'a` lifetime has no trailing
		// type so its body stays `a`, while in the reference `&'a str` the
		// lifetime extends to cover the following identifier as `a str`.
		expect(types_of(tokens, "'")).toEqual(["punctuation", "punctuation"]);
		expect(type_of(tokens, "a")).toBe("lifetime");
		expect(type_of(tokens, "a str")).toBe("lifetime");
	});

	it("impl<T> Trait<T> for Foo<T>", () => {
		const tokens = enrich("impl<T> Trait<T> for Foo<T> {}");
		expect(types_of(tokens, "<")).toEqual([
			"punctuation",
			"punctuation",
			"punctuation",
		]);
		expect(types_of(tokens, ">")).toEqual([
			"punctuation",
			"punctuation",
			"punctuation",
		]);
	});

	it("turbofish Vec::<u32>::new()", () => {
		const tokens = enrich("Vec::<u32>::new()");
		expect(types_of(tokens, "<")).toEqual(["punctuation"]);
		expect(types_of(tokens, ">")).toEqual(["punctuation"]);
	});

	it("let annotation: Vec<u32>", () => {
		const tokens = enrich("let x: Vec<u32> = vec![];");
		expect(types_of(tokens, "<")).toEqual(["punctuation"]);
		expect(types_of(tokens, ">")).toEqual(["punctuation"]);
	});

	it("comparison `a < b` remains operator", () => {
		const tokens = enrich("let z = a < b;");
		expect(type_of(tokens, "<")).toBe("operator");
	});

	it("shift `1 << 4` remains operator", () => {
		const tokens = enrich("let x = 1 << 4;");
		expect(type_of(tokens, "<<")).toBe("operator");
	});
});

describe("Rust reclassifier — lifetimes", () => {
	it("`'` is punctuation in generics position", () => {
		const tokens = enrich("fn foo<'a>() {}");
		expect(type_of(tokens, "'")).toBe("punctuation");
		expect(type_of(tokens, "a")).toBe("lifetime");
	});

	it("&'a str extends lifetime over trailing type", () => {
		const tokens = enrich("&'a str");
		expect(type_of(tokens, "&")).toBe("operator");
		expect(type_of(tokens, "'")).toBe("punctuation");
		expect(type_of(tokens, "a str")).toBe("lifetime");
	});

	it("&'a i32 extends lifetime over trailing primitive", () => {
		const tokens = enrich("&'a i32");
		expect(type_of(tokens, "&")).toBe("operator");
		expect(type_of(tokens, "'")).toBe("punctuation");
		expect(type_of(tokens, "a i32")).toBe("lifetime");
	});

	it("&'static str extends lifetime over trailing type", () => {
		const tokens = enrich("&'static str");
		expect(type_of(tokens, "&")).toBe("operator");
		expect(type_of(tokens, "'")).toBe("punctuation");
		expect(type_of(tokens, "static str")).toBe("lifetime");
	});

	it("'a without trailing type stays as the lifetime name only", () => {
		const tokens = enrich("fn foo<'a, 'b>()");
		expect(types_of(tokens, "a")).toEqual(["lifetime"]);
		expect(types_of(tokens, "b")).toEqual(["lifetime"]);
	});
});
