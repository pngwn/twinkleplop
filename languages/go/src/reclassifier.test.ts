// Fidelity integration tests for the Go language factory.
//
// The grammar emits `function` for predeclared builtins (`len`, `make`,
// `append`, ...) directly; the reclassifier promotes user-declared functions,
// call sites, constants, namespaces, and parameters. Under `fidelity: "low"`
// or an allowlist that excludes a promoted type, the output downgrades to the
// base grammar stream.

import { describe, expect, it } from "vitest";
import { tokenize as make_language } from "./index.js";

function tokens_of(input: string, options?: Parameters<typeof make_language>[0]) {
  const result = make_language(options)(input);
  const out: { type: string; value: string }[] = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    out.push({
      type: result.token_types[result.tokens[i * 3]],
      value: input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
    });
  }
  return out;
}

function type_of(tokens: ReturnType<typeof tokens_of>, value: string) {
  return tokens.find((t) => t.value === value)?.type;
}

function types_of(tokens: ReturnType<typeof tokens_of>, value: string) {
  return tokens.filter((t) => t.value === value).map((t) => t.type);
}

describe("Go fidelity — predeclared-function downgrade", () => {
  const src = "func demo() { _ = len(xs); _ = make([]int, 0); }";

  it("fidelity='high' keeps predeclared functions as function", () => {
    const tokens = tokens_of(src, { fidelity: "high" });
    expect(type_of(tokens, "len")).toBe("function");
    expect(type_of(tokens, "make")).toBe("function");
  });

  it("fidelity undefined behaves like high", () => {
    const tokens = tokens_of(src);
    expect(type_of(tokens, "len")).toBe("function");
    expect(type_of(tokens, "make")).toBe("function");
  });

  it("fidelity='low' downgrades predeclared functions to identifier", () => {
    const tokens = tokens_of(src, { fidelity: "low" });
    expect(type_of(tokens, "len")).toBe("identifier");
    expect(type_of(tokens, "make")).toBe("identifier");
  });

  it("fidelity allowlist including 'function' keeps them", () => {
    const tokens = tokens_of(src, { fidelity: ["function"] });
    expect(type_of(tokens, "len")).toBe("function");
  });

  it("fidelity allowlist excluding 'function' downgrades them", () => {
    const tokens = tokens_of(src, { fidelity: ["boolean"] });
    expect(type_of(tokens, "len")).toBe("identifier");
  });

  it("fidelity='low' still preserves booleans as identifier", () => {
    const tokens = tokens_of("var ok = true", { fidelity: "low" });
    expect(type_of(tokens, "true")).toBe("identifier");
  });
});

describe("Go fidelity — function promotion", () => {
  it("declared function names promote", () => {
    const tokens = tokens_of("func add(x int, y int) int { return x + y }");
    expect(type_of(tokens, "add")).toBe("function");
  });

  it("selector call targets promote but package names stay identifiers", () => {
    const tokens = tokens_of('func demo() { fmt.Println("hi") }');
    expect(type_of(tokens, "fmt")).toBe("identifier");
    expect(type_of(tokens, "Println")).toBe("function");
  });

  it("generic function declarations and calls promote", () => {
    const tokens = tokens_of("func Map[T any](xs []T) []T { return Map[T](xs) }");
    expect(types_of(tokens, "Map")).toEqual(["function", "function"]);
  });

  it("fidelity='low' leaves user functions as identifiers", () => {
    const tokens = tokens_of("func demo() { helper() }", {
      fidelity: "low",
    });
    expect(type_of(tokens, "helper")).toBe("identifier");
  });

  it("fidelity allowlist including 'function' promotes user functions", () => {
    const tokens = tokens_of("func demo() { helper() }", {
      fidelity: ["function"],
    });
    expect(type_of(tokens, "helper")).toBe("function");
  });
});

describe("Go fidelity — constant promotion", () => {
  const src = "const MAX_SIZE = 1024";

  it("UPPER_SNAKE_CASE names promote to constant at high fidelity", () => {
    const tokens = tokens_of(src);
    expect(type_of(tokens, "MAX_SIZE")).toBe("constant");
  });

  it("fidelity='low' leaves UPPER_SNAKE_CASE as identifier", () => {
    const tokens = tokens_of(src, { fidelity: "low" });
    expect(type_of(tokens, "MAX_SIZE")).toBe("identifier");
  });

  it("fidelity allowlist excluding 'constant' leaves as identifier", () => {
    const tokens = tokens_of(src, { fidelity: ["function"] });
    expect(type_of(tokens, "MAX_SIZE")).toBe("identifier");
  });
});

describe("Go fidelity — namespace promotion", () => {
  it("`package main` promotes main to namespace", () => {
    const tokens = tokens_of("package main");
    expect(type_of(tokens, "main")).toBe("namespace");
  });

  it('aliased single import `import f "fmt"` promotes f', () => {
    const tokens = tokens_of('import f "fmt"');
    expect(type_of(tokens, "f")).toBe("namespace");
  });

  it("unaliased single import leaves identifiers alone", () => {
    const tokens = tokens_of('import "fmt"');
    // nothing to promote — fmt is a string, not an identifier.
    expect(type_of(tokens, "fmt")).toBeUndefined();
  });

  it("grouped imports with aliases promote each alias", () => {
    const tokens = tokens_of('import (\n\tf "fmt"\n\to "os"\n)');
    expect(type_of(tokens, "f")).toBe("namespace");
    expect(type_of(tokens, "o")).toBe("namespace");
  });

  it("use-site `fmt.Println` leaves fmt as identifier", () => {
    const tokens = tokens_of('package x\nfmt.Println("hi")');
    expect(type_of(tokens, "fmt")).toBe("identifier");
  });

  it("fidelity='low' leaves package name as identifier", () => {
    const tokens = tokens_of("package main", { fidelity: "low" });
    expect(type_of(tokens, "main")).toBe("identifier");
  });
});

describe("Go fidelity — parameter promotion", () => {
  it("func params promote to parameter", () => {
    const tokens = tokens_of("func add(x int, y int) int { return x + y }");
    expect(type_of(tokens, "x")).toBe("parameter");
    expect(type_of(tokens, "y")).toBe("parameter");
  });

  it("shared-type `x, y int` promotes both", () => {
    const tokens = tokens_of("func f(x, y int) int { return x + y }");
    expect(type_of(tokens, "x")).toBe("parameter");
    expect(type_of(tokens, "y")).toBe("parameter");
  });

  it("method receiver also promotes", () => {
    const tokens = tokens_of("func (r *Receiver) Method(x int) { }");
    expect(type_of(tokens, "r")).toBe("parameter");
    expect(type_of(tokens, "x")).toBe("parameter");
  });

  it("variadic param promotes", () => {
    const tokens = tokens_of("func f(xs ...int) { }");
    expect(type_of(tokens, "xs")).toBe("parameter");
  });

  it("generic function params promote after type parameters", () => {
    const tokens = tokens_of("func Map[T any, U any](xs []T, f func(T) U) []U { return nil }");
    expect(type_of(tokens, "xs")).toBe("parameter");
    expect(type_of(tokens, "f")).toBe("parameter");
    expect(types_of(tokens, "T")).not.toContain("parameter");
  });

  it("method receivers with generic receiver types promote only the receiver name", () => {
    const tokens = tokens_of("func (p Pair[A, B]) Swap(x int) { }");
    expect(type_of(tokens, "p")).toBe("parameter");
    expect(type_of(tokens, "Swap")).toBe("function");
    expect(type_of(tokens, "x")).toBe("parameter");
    expect(types_of(tokens, "Pair")).not.toContain("parameter");
  });

  it("unnamed function-type params stay identifiers", () => {
    const tokens = tokens_of("var fn func(T, U) V");
    expect(types_of(tokens, "T")).not.toContain("parameter");
    expect(types_of(tokens, "U")).not.toContain("parameter");
  });

  it("named function-type params promote", () => {
    const tokens = tokens_of("var fn func(x T, y U) V");
    expect(type_of(tokens, "x")).toBe("parameter");
    expect(type_of(tokens, "y")).toBe("parameter");
  });

  it("unnamed qualified, slice, and instantiated types do not promote", () => {
    const tokens = tokens_of("var fn func(context.Context, []T, Box[int])");
    expect(types_of(tokens, "context")).not.toContain("parameter");
    expect(types_of(tokens, "T")).not.toContain("parameter");
    expect(types_of(tokens, "Box")).not.toContain("parameter");
  });

  it("fidelity='low' leaves params as identifier", () => {
    const tokens = tokens_of("func f(x int) { }", { fidelity: "low" });
    expect(type_of(tokens, "x")).toBe("identifier");
  });
});
