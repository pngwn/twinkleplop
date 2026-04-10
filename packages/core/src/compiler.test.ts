import { describe, it, expect } from "vitest";
import { compile } from "./compiler";
import { Grammar } from "./types";

describe("compile", () => {
	it("should expand reusable group rules into consuming states", () => {
		const grammar: Grammar = {
			name: "test",
			groups: {
				shared: {
					rules: [
						{
							match: "a",
							token: "letter-a",
						},
					],
				},
			},
			states: {
				root: {
					extend: "shared",
					rules: [
						{
							match: "b",
							token: "letter-b",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);
		const rootState = compiled.states.get("root");
		expect(rootState).toBe(0);

		const charCodeA = "a".charCodeAt(0);
		const charCodeB = "b".charCodeAt(0);

		expect(compiled.charMaps[rootState! * 128 + charCodeA]).not.toBe(65535);
		expect(compiled.charMaps[rootState! * 128 + charCodeB]).not.toBe(65535);
		expect(new Set(compiled.tokenTypes)).toEqual(new Set(["letter-a", "letter-b"]));
	});

	it("should inherit mode and fallback metadata from groups", () => {
		const grammar: Grammar = {
			name: "test",
			groups: {
				probing: {
					mode: "probe",
					fallback: "value",
					rules: [
						{
							match: "?",
							state: "value",
						},
					],
				},
			},
			states: {
				root: {
					extend: "probing",
					rules: [
						{
							match: "=",
							token: "equals",
							exit: true,
						},
					],
				},
				value: {
					rules: [
						{
							range: ["0", "9"],
							token: "digit",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);
		const rootState = compiled.states.get("root");
		const valueState = compiled.states.get("value");

		expect(rootState).toBeDefined();
		expect(valueState).toBeDefined();
		expect(compiled.probeStates.has(rootState!)).toBe(true);
		expect(compiled.probeFallbacks?.get(rootState!)).toBe(valueState);
	});

	it("should compile a simple grammar", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{
							match: "a",
							token: "letter-a",
						},
						{
							match: "b",
							token: "letter-b",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		expect(compiled.states).toBeInstanceOf(Map);
		expect(compiled.states.get("root")).toBe(0);
		expect(compiled.transitions).toBeInstanceOf(Uint16Array);
		expect(compiled.charMaps).toBeInstanceOf(Uint16Array);
		expect(compiled.keywords).toBeInstanceOf(Map);
		expect(compiled.tokenTypes).toEqual(["letter-a", "letter-b"]);
	});

	it("should handle state transitions", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{
							match: '"',
							token: "quote",
							state: "string",
						},
					],
				},
				string: {
					rules: [
						{
							match: '"',
							token: "quote",
							exit: true,
						},
						{
							range: [32, 126],
							token: "text",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		expect(compiled.states.get("root")).toBe(0);
		expect(compiled.states.get("string")).toBe(1);

		const quoteChar = 34;
		const rootQuoteClass = compiled.charMaps[0 * 128 + quoteChar];
		expect(rootQuoteClass).toBe(0);

		const transitionIdx = 0 * 256 + rootQuoteClass;
		const nextState = compiled.transitions[transitionIdx * 3];
		const tokenType = compiled.transitions[transitionIdx * 3 + 1];
		const stackOp = compiled.transitions[transitionIdx * 3 + 2];

		expect(nextState).toBe(1);
		expect(tokenType).toBe(0);
		expect(stackOp).toBe(1);
	});

	it("should handle character ranges", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{
							range: ["0", "9"],
							token: "digit",
						},
						{
							range: ["a", "z"],
							token: "lowercase",
						},
						{
							range: ["A", "Z"],
							token: "uppercase",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		const charMap = compiled.charMaps;

		expect(charMap[48]).toBe(0);
		expect(charMap[57]).toBe(0);

		expect(charMap[97]).toBe(1);
		expect(charMap[122]).toBe(1);

		expect(charMap[65]).toBe(2);
		expect(charMap[90]).toBe(2);

		expect(compiled.tokenTypes).toEqual(["digit", "lowercase", "uppercase"]);
	});

	it("should handle exit transitions", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{
							match: "(",
							state: "nested",
						},
					],
				},
				nested: {
					rules: [
						{
							match: ")",
							exit: true,
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		const closeParenChar = 41;
		const nestedCloseClass = compiled.charMaps[1 * 128 + closeParenChar];
		const transitionIdx = 1 * 256 + nestedCloseClass;
		const stackOp = compiled.transitions[transitionIdx * 3 + 2];

		expect(stackOp).toBe(2);
	});

	it("should handle multiple match characters", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{
							match: [" ", "\t", "\n", "\r"],
							token: "whitespace",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		expect(compiled.charMaps[32]).toBe(0);
		expect(compiled.charMaps[9]).toBe(0);
		expect(compiled.charMaps[10]).toBe(0);
		expect(compiled.charMaps[13]).toBe(0);
	});

	it("should fill unmapped characters with 65535", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{
							match: "a",
							token: "letter-a",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		expect(compiled.charMaps[97]).toBe(0);
		expect(compiled.charMaps[98]).toBe(65535);
		expect(compiled.charMaps[65]).toBe(65535);
	});

	it("should handle numeric character codes in ranges", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{
							range: [48, 57],
							token: "digit",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		expect(compiled.charMaps[48]).toBe(0);
		expect(compiled.charMaps[57]).toBe(0);
		expect(compiled.charMaps[47]).toBe(65535);
		expect(compiled.charMaps[58]).toBe(65535);
	});
});
