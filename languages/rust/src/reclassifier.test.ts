import { describe, it, expect } from "vitest";
import { language as make_language } from "./index.js";

const language = make_language();

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

describe("Rust reclassifier — constant promotion", () => {
	it("UPPER_SNAKE_CASE names promote to constant", () => {
		const tokens = enrich("const MAX_SIZE: usize = 1024;");
		expect(type_of(tokens, "MAX_SIZE")).toBe("constant");
	});

	it("PascalCase names still promote to class_name, not constant", () => {
		const tokens = enrich("struct Foo { x: i32 }");
		expect(type_of(tokens, "Foo")).toBe("class_name");
	});

	it("primitive type names keep class_name (not caught as constant)", () => {
		const tokens = enrich("let x: i32 = 0;");
		expect(type_of(tokens, "i32")).toBe("class_name");
	});

	it("fidelity='low' leaves UPPER_SNAKE_CASE as identifier", () => {
		const lang = make_language({ fidelity: "low" });
		const result = lang("const MAX_SIZE: usize = 1024;");
		let found;
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const s = result.tokens[i * 3 + 1];
			const e = result.tokens[i * 3 + 2];
			if ("const MAX_SIZE: usize = 1024;".slice(s, e) === "MAX_SIZE") {
				found = result.token_types[result.tokens[i * 3]];
			}
		}
		expect(found).toBe("identifier");
	});
});

describe("Rust reclassifier — namespace promotion", () => {
	it("`use std::fs;` tags std as namespace", () => {
		const tokens = enrich("use std::fs;");
		expect(type_of(tokens, "std")).toBe("namespace");
	});

	it("multi-segment path promotes every segment before `::`", () => {
		const tokens = enrich("use std::collections::HashMap;");
		expect(type_of(tokens, "std")).toBe("namespace");
		expect(type_of(tokens, "collections")).toBe("namespace");
		// last segment stays as class_name (via pascal_case)
		expect(type_of(tokens, "HashMap")).toBe("class_name");
	});

	it("braced import group promotes parent segments only", () => {
		const tokens = enrich("use std::fs::{File, Read};");
		expect(type_of(tokens, "std")).toBe("namespace");
		expect(type_of(tokens, "fs")).toBe("namespace");
		expect(type_of(tokens, "File")).toBe("class_name");
		expect(type_of(tokens, "Read")).toBe("class_name");
	});

	it("non-`use` `::` chains are left alone (no namespace coloring)", () => {
		// `String::from("x")` — String is a type, not a namespace. blanket
		// ::-preceded promotion would be wrong here.
		const tokens = enrich('fn main() { String::from("x"); }');
		expect(type_of(tokens, "String")).toBe("class_name");
	});

	it("fidelity='low' leaves namespace names as identifier", () => {
		const lang = make_language({ fidelity: "low" });
		const src = "use std::fs;";
		const result = lang(src);
		let found;
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const s = result.tokens[i * 3 + 1];
			const e = result.tokens[i * 3 + 2];
			if (src.slice(s, e) === "std") {
				found = result.token_types[result.tokens[i * 3]];
			}
		}
		expect(found).toBe("identifier");
	});
});

describe("Rust reclassifier — variant promotion", () => {
	it("`Color::Red` at value position promotes Red to variant", () => {
		const tokens = enrich("let x = Color::Red;");
		expect(type_of(tokens, "Color")).toBe("class_name");
		expect(type_of(tokens, "Red")).toBe("variant");
	});

	it("`Option::Some(x)` promotes Some to variant (call-site still matches)", () => {
		const tokens = enrich("let x = Option::Some(1);");
		expect(type_of(tokens, "Some")).toBe("variant");
	});

	it("`match` pattern arms promote variants", () => {
		const tokens = enrich(
			"match c { Color::Red => 1, Color::Green => 2, _ => 0 }",
		);
		expect(type_of(tokens, "Red")).toBe("variant");
		expect(type_of(tokens, "Green")).toBe("variant");
	});

	it("inside `use` the trailing segment is not variant", () => {
		// use std::collections::HashMap — HashMap is a type being imported,
		// not a variant, so it stays as class_name.
		const tokens = enrich("use std::collections::HashMap;");
		expect(type_of(tokens, "HashMap")).toBe("class_name");
	});

	it("method call `String::from(x)` promotes from to function, not variant", () => {
		// variant requires trailing class_name (PascalCase). camelCase call
		// targets get the function tag from promote_rust_function_calls, so
		// the variant pass doesn't fire.
		const tokens = enrich('let s = String::from("x");');
		expect(type_of(tokens, "from")).toBe("function");
	});

	it("fidelity='low' leaves variants as identifier", () => {
		const lang = make_language({ fidelity: "low" });
		const src = "let x = Color::Red;";
		const result = lang(src);
		let found;
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const s = result.tokens[i * 3 + 1];
			const e = result.tokens[i * 3 + 2];
			if (src.slice(s, e) === "Red") {
				found = result.token_types[result.tokens[i * 3]];
			}
		}
		expect(found).toBe("identifier");
	});
});

describe("Rust reclassifier — parameter promotion", () => {
	it("fn params promote to parameter", () => {
		const tokens = enrich("fn f(x: i32, y: i32) -> i32 { x + y }");
		expect(type_of(tokens, "x")).toBe("parameter");
		expect(type_of(tokens, "y")).toBe("parameter");
		// type annotation stays as class_name (i32 is a primitive type)
		expect(type_of(tokens, "i32")).toBe("class_name");
	});

	it("method `&self` is skipped; other params promote", () => {
		const tokens = enrich("fn method(&self, x: i32) { }");
		expect(type_of(tokens, "x")).toBe("parameter");
		// self stays as its grammar token (keyword)
		expect(type_of(tokens, "self")).not.toBe("parameter");
	});

	it("generic params in `<...>` are NOT treated as parameters", () => {
		// `<T, U>` after `fn name` is a generic list; my walker skips it.
		// T, U stay as class_name (pascal_case).
		const tokens = enrich("fn f<T, U>(x: T, y: U) { }");
		expect(type_of(tokens, "T")).toBe("class_name");
		expect(type_of(tokens, "U")).toBe("class_name");
		expect(type_of(tokens, "x")).toBe("parameter");
		expect(type_of(tokens, "y")).toBe("parameter");
	});

	it("call-site arguments stay as identifier", () => {
		const tokens = enrich("fn main() { f(a, b); }");
		// a and b are call-site; only parameters (at declaration) get promoted.
		expect(type_of(tokens, "a")).toBe("identifier");
		expect(type_of(tokens, "b")).toBe("identifier");
	});

	it("fidelity='low' leaves params as identifier", () => {
		const lang = make_language({ fidelity: "low" });
		const src = "fn f(x: i32) { }";
		const result = lang(src);
		let x_type;
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const s = result.tokens[i * 3 + 1];
			const e = result.tokens[i * 3 + 2];
			if (src.slice(s, e) === "x") {
				x_type = result.token_types[result.tokens[i * 3]];
			}
		}
		expect(x_type).toBe("identifier");
	});
});
