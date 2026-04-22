import { describe, it, expect } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import type { Grammar, TokenizeResult } from "./types";

function tokens_of(result: TokenizeResult, input: string) {
	const out: { type: string; value: string; start: number; end: number }[] = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.token_types[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		out.push({ type, value: input.substring(start, end), start, end });
	}
	return out;
}

describe("seal predicate — acceptance cases", () => {
	it("adjacent strings preserve their lexeme boundary", () => {
		// `"a""b"` must emit two separate `string` lexemes, not one coalesced
		// run. the grammar opts in with `seal: true` on the opening quote so
		// the two strings do not fuse at the boundary.
		const grammar: Grammar = {
			name: "strings",
			states: {
				root: {
					rules: [
						{ match: '"', token: "string", state: "body", seal: true },
						{ range: ["a", "z"], token: "ident" },
					],
				},
				body: {
					rules: [
						{ match: '"', token: "string", exit: true },
						{ range: [0, 127], token: "string" },
					],
				},
			},
		};
		const result = tokenize('"a""b"', compile(grammar));
		const got = tokens_of(result, '"a""b"');
		expect(got).toEqual([
			{ type: "string", value: '"a"', start: 0, end: 3 },
			{ type: "string", value: '"b"', start: 3, end: 6 },
		]);
	});

	it("a long identifier still coalesces into a single token", () => {
		const grammar: Grammar = {
			name: "ident",
			states: {
				root: {
					rules: [{ range: ["a", "z"], token: "ident" }],
				},
			},
		};
		const result = tokenize("abcdefghijklmnop", compile(grammar));
		const got = tokens_of(result, "abcdefghijklmnop");
		expect(got).toEqual([
			{ type: "ident", value: "abcdefghijklmnop", start: 0, end: 16 },
		]);
	});

	it("multi-char keyword matches remain single atoms, sealed from adjacent idents", () => {
		const grammar: Grammar = {
			name: "kw",
			states: {
				root: {
					rules: [
						{ match: "return", boundary: true, token: "ident" },
						{ range: ["a", "z"], token: "ident" },
					],
				},
			},
		};
		const input = "return x";
		const result = tokenize(input, compile(grammar));
		const got = tokens_of(result, input);
		// the keyword "return" must stay a single lexeme, and the following `x`
		// must not coalesce backwards into it even though both emit `ident`
		expect(got[0]).toMatchObject({
			type: "ident",
			value: "return",
			start: 0,
			end: 6,
		});
		expect(got[got.length - 1]).toMatchObject({
			type: "ident",
			value: "x",
			start: 7,
			end: 8,
		});
	});

	it("adjacent numbers separated by non-emitting whitespace do not coalesce", () => {
		// the whitespace rule consumes chars without emitting, so the two
		// number lexemes would be pos-contiguous in the emitted stream if
		// nothing sealed them. `seal: true` on the opening digit rule forces a
		// lexeme boundary between the numbers.
		const grammar: Grammar = {
			name: "nums",
			states: {
				root: {
					rules: [
						{
							range: ["0", "9"],
							token: "number",
							state: "number_body",
							seal: true,
						},
						{ match: [" ", "\t"] },
					],
				},
				number_body: {
					rules: [
						{ range: ["0", "9"], token: "number" },
						{ any: true, exit: true },
					],
				},
			},
		};
		const input = "12 34";
		const result = tokenize(input, compile(grammar));
		const got = tokens_of(result, input);
		expect(got).toEqual([
			{ type: "number", value: "12", start: 0, end: 2 },
			{ type: "number", value: "34", start: 3, end: 5 },
		]);
	});
});

describe("seal predicate — each seal condition fires", () => {
	function seal_bit_of(
		compiled: ReturnType<typeof compile>,
		state_id: number,
		char_code: number,
	): number {
		const char_class = compiled.char_maps[state_id * 128 + char_code];
		return compiled.seal_flags?.[state_id * 256 + char_class] ?? 0;
	}

	it("(a) structural transitions alone do not auto-seal; grammars opt in", () => {
		// structural transitions are a lexeme-shape cue but the compiler does
		// not force a seal on them: most single-char push/pop rules exist to
		// drive continuation states whose body tokens should coalesce back
		// into the opener. grammars that need a structural seal opt in with
		// `seal: true`.
		const grammar: Grammar = {
			name: "stack_op",
			states: {
				root: {
					rules: [
						{ match: "(", token: "open", state: "inner" },
						{ match: "[", token: "open", state: "inner", seal: true },
					],
				},
				inner: {
					rules: [{ match: ")", token: "close", exit: true }],
				},
			},
		};
		const compiled = compile(grammar);
		const root_id = compiled.states.get("root")!;
		const inner_id = compiled.states.get("inner")!;
		// plain push does not seal
		expect(seal_bit_of(compiled, root_id, "(".charCodeAt(0))).toBeFalsy();
		// opting in via `seal: true` does seal the same push
		expect(seal_bit_of(compiled, root_id, "[".charCodeAt(0))).toBeTruthy();
		// pure pop does not seal
		expect(seal_bit_of(compiled, inner_id, ")".charCodeAt(0))).toBeFalsy();
	});

	it("(a) sideways transition does not auto-seal either", () => {
		const grammar: Grammar = {
			name: "sideways",
			states: {
				a: { rules: [{ match: "x", token: "t", state: "b" }] },
				b: { rules: [{ match: "y", token: "t", state: "c", exit: true }] },
				c: { rules: [{ match: "z", token: "t" }] },
			},
		};
		const compiled = compile(grammar);
		const b_id = compiled.states.get("b")!;
		// structural sideways does not auto-seal
		expect(seal_bit_of(compiled, b_id, "y".charCodeAt(0))).toBeFalsy();
	});

	it("(b) multi-char match seals at runtime (matched_length > 0)", () => {
		// multi-char sealing is enforced by the tokenizer at emission time
		// rather than in the compile-time seal bit, so that rules mixing
		// multi-char and single-char alternatives (e.g. `match: [...OP_4CHAR,
		// "?"]`) still coalesce their single-char hits.
		const grammar: Grammar = {
			name: "multi",
			states: {
				root: {
					rules: [
						{ match: ["ab", "c"], token: "mixed" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		// the rule is not compile-time sealed — single-char matches of the
		// same rule must still coalesce
		const root_id = compiled.states.get("root")!;
		expect(compiled.seal_flags?.[root_id * 256 + 0] ?? 0).toBeFalsy();

		// at runtime, adjacent single-char `c` hits coalesce, but a multi-char
		// `ab` hit stays a distinct atom
		const result = tokenize("ccab", compile(grammar));
		const got = tokens_of(result, "ccab");
		expect(got).toEqual([
			{ type: "mixed", value: "cc", start: 0, end: 2 },
			{ type: "mixed", value: "ab", start: 2, end: 4 },
		]);
	});

	it("(c) boundary rule seals", () => {
		const grammar: Grammar = {
			name: "bound",
			states: {
				root: {
					rules: [
						{ match: "x", boundary: true, token: "kw" },
						{ range: ["a", "z"], token: "ident" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const root_id = compiled.states.get("root")!;
		// the boundary rule occupies rule_idx 0
		const t_base = (root_id * 256 + 0) * 3;
		// stack_op stays in {0,1,2}; seal flag lives in seal_flags
		expect(compiled.transitions[t_base + 2]).toBe(0);
		expect(compiled.seal_flags?.[root_id * 256 + 0]).toBe(1);
	});

	it("(d) seal: true opt-in forces a seal on a plain single-char rule", () => {
		const grammar: Grammar = {
			name: "opt",
			states: {
				root: {
					rules: [
						{ match: "a", token: "letter", seal: true },
						{ match: "b", token: "letter" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const root_id = compiled.states.get("root")!;
		expect(compiled.seal_flags?.[root_id * 256 + 0]).toBe(1);
		expect(compiled.seal_flags?.[root_id * 256 + 1] ?? 0).toBe(0);

		// at runtime the sealed rule forces a lexeme boundary even though
		// both rules emit the same token type: the second `a` (sealed) does
		// not coalesce backward into the first. the trailing `b` (unsealed)
		// coalesces forward into the second `a` since the seal is backward
		// only — `seal: true` prevents merging into a previous lexeme but
		// allows a later unsealed same-type emission to continue the lexeme.
		const result = tokenize("aab", compile(grammar));
		const got = tokens_of(result, "aab");
		expect(got).toEqual([
			{ type: "letter", value: "a", start: 0, end: 1 },
			{ type: "letter", value: "ab", start: 1, end: 3 },
		]);
	});

	it("stack_op stays in {0,1,2} even when the rule is sealed", () => {
		// seal is tracked in a parallel Uint8Array so the tokenizer's hot
		// path reads stack_op without masking.
		const grammar: Grammar = {
			name: "mask",
			states: {
				root: {
					rules: [
						{ match: "a", token: "t", seal: true },
						{ match: "(", token: "t", state: "inner", seal: true },
						{ match: "x", token: "t" },
						{ match: "=>", token: "t", state: "inner", exit: true, seal: true },
					],
				},
				inner: {
					rules: [{ match: ")", token: "t", exit: true }],
				},
			},
		};
		const compiled = compile(grammar);
		const root_id = compiled.states.get("root")!;
		const inner_id = compiled.states.get("inner")!;

		const a_op = compiled.transitions[(root_id * 256 + 0) * 3 + 2];
		const open_op = compiled.transitions[(root_id * 256 + 1) * 3 + 2];
		const x_op = compiled.transitions[(root_id * 256 + 2) * 3 + 2];
		const arrow_op = compiled.transitions[(root_id * 256 + 3) * 3 + 2];
		const close_op = compiled.transitions[(inner_id * 256 + 0) * 3 + 2];

		expect(a_op).toBe(0);
		expect(compiled.seal_flags?.[root_id * 256 + 0]).toBe(1);
		expect(open_op).toBe(1);
		expect(compiled.seal_flags?.[root_id * 256 + 1]).toBe(1);
		expect(x_op).toBe(0);
		expect(compiled.seal_flags?.[root_id * 256 + 2] ?? 0).toBe(0);
		expect(arrow_op).toBe(2);
		expect(compiled.seal_flags?.[root_id * 256 + 3]).toBe(1);
		expect(close_op).toBe(2);
		expect(compiled.seal_flags?.[inner_id * 256 + 0] ?? 0).toBe(0);
	});
});

describe("seal predicate — probe mode is unaffected", () => {
	it("probe resolution emits same atoms as direct matches", () => {
		// probe-internal transitions never emit tokens, so the seal bit can
		// only affect the eventual resolved rule's emission. verify a probe
		// path produces the same sealed atoms as the direct path.
		const grammar: Grammar = {
			name: "probe_seal",
			states: {
				main: {
					rules: [{ match: "a", state: "probing" }],
				},
				probing: {
					mode: "probe",
					rules: [{ match: "b", state: "found" }],
				},
				found: {
					rules: [
						{ match: "a", token: "t" },
						{ match: "b", token: "t" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("ab", compiled);
		const got = tokens_of(result, "ab");
		// both emissions are range-less single-char matches with no stack_op,
		// so neither seals: the two tokens coalesce into one `t` lexeme.
		expect(got).toEqual([{ type: "t", value: "ab", start: 0, end: 2 }]);
	});
});
