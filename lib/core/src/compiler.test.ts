import { describe, it, expect } from "vitest";
import { compile } from "./compiler";
import { Grammar } from "./types";

describe("compile", () => {
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
		expect(compiled.char_maps).toBeInstanceOf(Uint16Array);
		expect(compiled.keywords).toBeInstanceOf(Map);
		expect(compiled.token_types).toEqual(["letter-a", "letter-b"]);
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

		const quote_char = 34;
		const root_quote_class = compiled.char_maps[0 * 128 + quote_char];
		expect(root_quote_class).toBe(0);

		const transition_idx = 0 * 256 + root_quote_class;
		const next_state = compiled.transitions[transition_idx * 3];
		const token_type = compiled.transitions[transition_idx * 3 + 1];
		const stack_op = compiled.transitions[transition_idx * 3 + 2];

		expect(next_state).toBe(1);
		expect(token_type).toBe(0);
		expect(stack_op).toBe(1);
		// a single-char push does not auto-seal; grammars opt in with seal: true
		expect(compiled.seal_flags?.[0 * 256 + root_quote_class] ?? 0).toBe(0);
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

		const char_map = compiled.char_maps;

		expect(char_map[48]).toBe(0);
		expect(char_map[57]).toBe(0);

		expect(char_map[97]).toBe(1);
		expect(char_map[122]).toBe(1);

		expect(char_map[65]).toBe(2);
		expect(char_map[90]).toBe(2);

		expect(compiled.token_types).toEqual(["digit", "lowercase", "uppercase"]);
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

		const close_paren_char = 41;
		const nested_close_class = compiled.char_maps[1 * 128 + close_paren_char];
		const transition_idx = 1 * 256 + nested_close_class;
		const stack_op = compiled.transitions[transition_idx * 3 + 2];

		expect(stack_op).toBe(2);
		// a pure pop continues the current lexeme (the closing char is part of
		// the child body), so the seal flag is not set
		expect(compiled.seal_flags?.[1 * 256 + nested_close_class] ?? 0).toBe(0);
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

		expect(compiled.char_maps[32]).toBe(0);
		expect(compiled.char_maps[9]).toBe(0);
		expect(compiled.char_maps[10]).toBe(0);
		expect(compiled.char_maps[13]).toBe(0);
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

		expect(compiled.char_maps[97]).toBe(0);
		expect(compiled.char_maps[98]).toBe(65535);
		expect(compiled.char_maps[65]).toBe(65535);
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

		expect(compiled.char_maps[48]).toBe(0);
		expect(compiled.char_maps[57]).toBe(0);
		expect(compiled.char_maps[47]).toBe(65535);
		expect(compiled.char_maps[58]).toBe(65535);
	});
});
