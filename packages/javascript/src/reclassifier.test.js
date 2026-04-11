// Integration tests for the JavaScript language pipeline.
//
// These tests use the top-level `language(input)` entry point — the full
// tokenize + reclassify experience that consumers get from one call. They
// cover the positive cases the Phase 1 function-variable rule should catch
// and a set of negatives that must NOT be rewritten.

import { describe, it, expect } from "vitest";
import { language } from "./index.js";

function enrich(input) {
	const result = language(input);
	const out = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		out.push({
			type: result.tokenTypes[result.tokens[i * 3]],
			value: input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
		});
	}
	return out;
}

function typeOf(tokens, value) {
	return tokens.find((t) => t.value === value)?.type;
}

describe("JavaScript reclassifier — function-variable (positive cases)", () => {
	it("const foo = () => { }", () => {
		const tokens = enrich("const foo = () => { }");
		expect(typeOf(tokens, "foo")).toBe("function");
	});

	it("const add = (a, b) => a + b", () => {
		const tokens = enrich("const add = (a, b) => a + b");
		expect(typeOf(tokens, "add")).toBe("function");
		// Params inside the arrow must stay as identifiers.
		expect(typeOf(tokens, "a")).toBe("identifier");
		expect(typeOf(tokens, "b")).toBe("identifier");
	});

	it("const double = x => x * 2", () => {
		const tokens = enrich("const double = x => x * 2");
		expect(typeOf(tokens, "double")).toBe("function");
	});

	it("const fetchData = async () => 1", () => {
		const tokens = enrich("const fetchData = async () => 1");
		expect(typeOf(tokens, "fetchData")).toBe("function");
	});

	it("const baz = function() { }", () => {
		const tokens = enrich("const baz = function() { }");
		expect(typeOf(tokens, "baz")).toBe("function");
	});

	it("let baz = async function() { }", () => {
		const tokens = enrich("let baz = async function() { }");
		expect(typeOf(tokens, "baz")).toBe("function");
	});

	it("var f = (a, (b, c)) => a", () => {
		const tokens = enrich("var f = (a, (b, c)) => a");
		expect(typeOf(tokens, "f")).toBe("function");
	});

	it("object property with arrow value", () => {
		const tokens = enrich("const obj = { foo: (x, y) => x + y }");
		expect(typeOf(tokens, "foo")).toBe("function");
	});

	it("object property with function value", () => {
		const tokens = enrich("const obj = { run: function() {} }");
		expect(typeOf(tokens, "run")).toBe("function");
	});

	it("reassignment without declaration", () => {
		const tokens = enrich("foo = () => 1");
		expect(typeOf(tokens, "foo")).toBe("function");
	});

	it("trivia (comment) between identifier and =", () => {
		const tokens = enrich("const foo /* wat */ = () => 1");
		expect(typeOf(tokens, "foo")).toBe("function");
	});
});

describe("JavaScript reclassifier — function-variable (negative cases)", () => {
	it("const x = 5", () => {
		const tokens = enrich("const x = 5");
		expect(typeOf(tokens, "x")).toBe("identifier");
	});

	it("const y = someCall()", () => {
		const tokens = enrich("const y = someCall()");
		expect(typeOf(tokens, "y")).toBe("identifier");
		// The base grammar already marks `someCall` as function via probe mode,
		// so this is just a sanity check that the reclassifier doesn't trample.
		expect(typeOf(tokens, "someCall")).toBe("function");
	});

	it("const z = a + b", () => {
		const tokens = enrich("const z = a + b");
		expect(typeOf(tokens, "z")).toBe("identifier");
	});

	it("const zs = [1, 2, 3]", () => {
		const tokens = enrich("const zs = [1, 2, 3]");
		expect(typeOf(tokens, "zs")).toBe("identifier");
	});
});

describe("JavaScript reclassifier — known limitations (documented misses)", () => {
	// These cases are where the Prism-style lookahead heuristic is known to
	// miss. They're documented here so regressions show up if the rule ever
	// tightens or loosens. Feel free to flip these expectations if you improve
	// the rule — they are NOT requirements.

	it("ternary: const foo = cond ? () => 1 : () => 2 — NOT detected", () => {
		const tokens = enrich("const foo = cond ? () => 1 : () => 2");
		// Miss: we'd need to peek past `?` which we don't do.
		expect(typeOf(tokens, "foo")).toBe("identifier");
	});
});
