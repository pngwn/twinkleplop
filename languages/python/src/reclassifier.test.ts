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
		// parameter gets promoted by promote_python_parameters
		expect(type_of(tokens, "name")).toBe("parameter");
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

describe("Python reclassifier — constant promotion", () => {
	it("UPPER_SNAKE_CASE names promote to constant", () => {
		const tokens = enrich("MAX_BYTES = 1024\nPI = 3.14");
		expect(type_of(tokens, "MAX_BYTES")).toBe("constant");
		expect(type_of(tokens, "PI")).toBe("constant");
	});

	it("PascalCase names still promote to class_name, not constant", () => {
		const tokens = enrich("class MyClass: pass");
		expect(type_of(tokens, "MyClass")).toBe("class_name");
	});

	it("fidelity='low' leaves UPPER_SNAKE_CASE as identifier", () => {
		const lang = make_language({ fidelity: "low" });
		const result = lang("MAX_BYTES = 1024");
		const tokens = [];
		for (let i = 0; i < result.tokens.length / 3; i++) {
			tokens.push({
				type: result.token_types[result.tokens[i * 3]],
				value: "MAX_BYTES = 1024".slice(
					result.tokens[i * 3 + 1],
					result.tokens[i * 3 + 2],
				),
			});
		}
		expect(tokens.find((t) => t.value === "MAX_BYTES")?.type).toBe(
			"identifier",
		);
	});
});

describe("Python reclassifier — namespace promotion", () => {
	it("`import math` promotes math to namespace", () => {
		const tokens = enrich("import math");
		expect(type_of(tokens, "math")).toBe("namespace");
	});

	it("dotted import promotes every segment", () => {
		const tokens = enrich("import os.path");
		expect(type_of(tokens, "os")).toBe("namespace");
		expect(type_of(tokens, "path")).toBe("namespace");
	});

	it("`import X as Y` promotes both X and Y", () => {
		const tokens = enrich("import numpy as np");
		expect(type_of(tokens, "numpy")).toBe("namespace");
		expect(type_of(tokens, "np")).toBe("namespace");
	});

	it("`from X import a, b` promotes X but not a, b", () => {
		const tokens = enrich("from math import sqrt, pi");
		expect(type_of(tokens, "math")).toBe("namespace");
		expect(type_of(tokens, "sqrt")).toBe("identifier");
		expect(type_of(tokens, "pi")).toBe("identifier");
	});

	it("`from X.Y import z` promotes X and Y", () => {
		const tokens = enrich("from os.path import join");
		expect(type_of(tokens, "os")).toBe("namespace");
		expect(type_of(tokens, "path")).toBe("namespace");
		expect(type_of(tokens, "join")).toBe("identifier");
	});

	it("use-site `math.pi` leaves math as identifier", () => {
		const tokens = enrich("x = math.pi");
		expect(type_of(tokens, "math")).toBe("identifier");
	});

	it("fidelity='low' leaves namespace names as identifier", () => {
		const lang = make_language({ fidelity: "low" });
		const src = "import math";
		const result = lang(src);
		let type_for_math;
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const s = result.tokens[i * 3 + 1];
			const e = result.tokens[i * 3 + 2];
			if (src.slice(s, e) === "math") {
				type_for_math = result.token_types[result.tokens[i * 3]];
			}
		}
		expect(type_for_math).toBe("identifier");
	});
});

describe("Python reclassifier — parameter promotion", () => {
	it("def params promote to parameter", () => {
		const tokens = enrich("def f(x, y): pass");
		expect(type_of(tokens, "x")).toBe("parameter");
		expect(type_of(tokens, "y")).toBe("parameter");
	});

	it("type-annotated params still promote; type does not", () => {
		const tokens = enrich("def f(x: int, y: str): pass");
		expect(type_of(tokens, "x")).toBe("parameter");
		expect(type_of(tokens, "y")).toBe("parameter");
		expect(type_of(tokens, "int")).toBe("builtin");
		expect(type_of(tokens, "str")).toBe("builtin");
	});

	it("default values keep the name as parameter", () => {
		const tokens = enrich("def f(x=1, y=2): pass");
		expect(type_of(tokens, "x")).toBe("parameter");
		expect(type_of(tokens, "y")).toBe("parameter");
	});

	it("self and varargs still promote", () => {
		const tokens = enrich("def f(self, *args, **kwargs): pass");
		expect(type_of(tokens, "self")).toBe("parameter");
		expect(type_of(tokens, "args")).toBe("parameter");
		expect(type_of(tokens, "kwargs")).toBe("parameter");
	});

	it("lambda params promote", () => {
		const tokens = enrich("f = lambda x, y: x + y");
		expect(type_of(tokens, "x")).toBe("parameter");
		expect(type_of(tokens, "y")).toBe("parameter");
	});

	it("call-site arguments stay as identifier", () => {
		const tokens = enrich("f(a, b)");
		expect(type_of(tokens, "a")).toBe("identifier");
		expect(type_of(tokens, "b")).toBe("identifier");
	});

	it("fidelity='low' leaves params as identifier", () => {
		const lang = make_language({ fidelity: "low" });
		const src = "def f(x): pass";
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
