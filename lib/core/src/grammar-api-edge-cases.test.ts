/**
 * Grammar API Edge Case Tests
 *
 * These tests document the CURRENT behavior of the grammar API for edge cases
 * identified in grammar-api-analysis.md. Each test cites its issue ID (C1–C5,
 * M1–M4, m1–m5, Q6–Q7) and notes the DESIRED behavior after a fix.
 *
 * Tests pass against the current implementation. They are diagnostic, not
 * prescriptive — the assertions describe what actually happens today.
 */

import { describe, test, expect, vi } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import type { Grammar, TokenizeResult } from "./types";

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

function token_values(
	result: TokenizeResult,
	input: string,
): { type: string; value: string }[] {
	const out: { type: string; value: string }[] = [];
	const count = result.tokens.length / 3;
	for (let i = 0; i < count; i++) {
		const type_idx = result.tokens[i * 3];
		const type = result.token_types[type_idx];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		if (type !== undefined) {
			out.push({ type, value: input.slice(start, end) });
		}
	}
	return out;
}

// ---------------------------------------------------------------------------
// C3 — Dangling state reference: typo compiles silently to no-op
// ---------------------------------------------------------------------------

describe("C3: Dangling state reference", () => {
	test("unknown state name throws at compile time with a clear message", () => {
		const grammar: Grammar = {
			name: "dangling-state-test",
			states: {
				main: {
					rules: [
						// Typo: "inner_state" does not exist (correct would be "inner")
						{ match: "(", token: "open", state: "inner_state" as any },
						{ range: ["a", "z"], token: "letter" },
						{ match: ")", token: "close" },
					],
				},
				inner: {
					rules: [
						{ match: ")", token: "close", exit: true },
						{ range: ["A", "Z"], token: "caps" },
					],
				},
			},
		};

		expect(() => compile(grammar)).toThrow(
			/unknown state "inner_state"/,
		);
	});

	test("sideways transition to unknown state also throws at compile time", () => {
		const grammar: Grammar = {
			name: "dangling-sideways-test",
			states: {
				main: {
					rules: [
						{ match: "a", token: "a", state: "typo_state" as any, exit: true },
					],
				},
			},
		};

		expect(() => compile(grammar)).toThrow(/unknown state "typo_state"/);
	});

	test("dangling probe fallback reference throws at compile time", () => {
		const grammar: Grammar = {
			name: "dangling-fallback-test",
			states: {
				main: {
					rules: [{ range: ["a", "z"], state: "probing" as any }],
				},
				probing: {
					mode: "probe",
					fallback: "not_a_real_state" as any,
					rules: [{ match: "!", state: "resolved" }],
				},
				resolved: {
					rules: [{ range: ["a", "z"], token: "resolved" }],
				},
			},
		};

		expect(() => compile(grammar)).toThrow(/unknown state "not_a_real_state"/);
	});
});

// ---------------------------------------------------------------------------
// C5 — exit:true in root state is a silent no-op
// ---------------------------------------------------------------------------

describe("C5: exit:true in root state", () => {
	test("exit in root state is silently ignored — tokenizer stays in root", () => {
		const grammar: Grammar = {
			name: "root-exit-test",
			states: {
				main: {
					rules: [
						{ match: "x", token: "x", exit: true }, // exit on stackPtr=0 → no-op
						{ range: ["a", "z"], token: "letter" },
					],
				},
			},
		};

		const warn_spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const compiled = compile(grammar);
		expect(warn_spy).toHaveBeenCalledWith(
			expect.stringContaining('rule 0 in root state "main"')
		);
		expect(warn_spy).toHaveBeenCalledWith(
			expect.stringContaining("exit will be a no-op")
		);
		warn_spy.mockRestore();

		const result = tokenize("axb", compiled);
		const tokens = token_values(result, "axb");

		// exit fires but stackPtr=0 so pop is skipped, stays in main
		expect(tokens).toEqual([
			{ type: "letter", value: "a" },
			{ type: "x", value: "x" },
			{ type: "letter", value: "b" },
		]);
	});

	test("exit with sideways in root state IS valid — transitions without stack change", () => {
		// Sideways transition (state + exit) does not require a stack entry —
		// it just changes currentState. So this is valid even in root state.
		const grammar: Grammar = {
			name: "sideways-from-root",
			states: {
				main: {
					rules: [
						{ match: "a", token: "a", state: "other", exit: true },
						{ range: ["b", "z"], token: "letter" },
					],
				},
				other: {
					rules: [
						{ range: ["a", "z"], token: "other-letter" },
						{ any: true, state: "main", exit: true },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const result = tokenize("abc", compiled);
		const tokens = token_values(result, "abc");

		// 'a' → sideways to "other" state (valid, no stack)
		// 'b' in "other" → other-letter
		// 'c' in "other" → other-letter (coalesced)
		expect(tokens).toEqual([
			{ type: "a", value: "a" },
			{ type: "other-letter", value: "bc" },
		]);
	});
});

// ---------------------------------------------------------------------------
// C4 — State count limit: 254 is safe, behavior at limit
// ---------------------------------------------------------------------------

describe("C4: State count limit", () => {
	test("grammar with 100 states compiles cleanly", () => {
		const states: Record<string, any> = {};
		for (let i = 0; i < 100; i++) {
			states[`s${i}`] = {
				rules: [{ match: `${i % 10}`, token: "num" }],
			};
		}
		const grammar: Grammar = { name: "limit-safe", states };
		expect(() => compile(grammar)).not.toThrow();
		const compiled = compile(grammar);
		expect(compiled.states.size).toBe(100);
	});

	test("grammar with 253 states compiles without error (well under the 254 safe limit)", () => {
		// match_within generates hidden states — keep user-defined states well under 254
		const states: Record<string, any> = {};
		for (let i = 0; i < 253; i++) {
			states[`s${i}`] = {
				rules: [{ range: ["a", "z"], token: "letter" }],
			};
		}
		const grammar: Grammar = { name: "limit-near", states };
		expect(() => compile(grammar)).not.toThrow();
		const compiled = compile(grammar);
		expect(compiled.states.size).toBe(253);
	});

	test("match_within expands to hidden states — state count inflates", () => {
		// Each match_within with escape generates 2 hidden states.
		// 3 match_within rules with escape = 6 hidden states.
		const grammar: Grammar = {
			name: "hidden-state-count",
			states: {
				main: {
					rules: [
						{ match_within: { start: '"', end: '"', escape: "\\" }, token: "str1" },
						{ match_within: { start: "'", end: "'", escape: "\\" }, token: "str2" },
						{ match_within: { start: "`", end: "`", escape: "\\" }, token: "str3" },
						{ range: ["a", "z"], token: "letter" },
					],
				},
			},
		};

		const compiled = compile(grammar);
		// 1 user state + 6 hidden states = 7 total
		// (each match_within with escape: 1 content state + 1 escape state)
		expect(compiled.states.size).toBe(7);
	});
});

// ---------------------------------------------------------------------------
// C1 — match_within: "begin" key is silently ignored (docs say "begin", code uses "start")
// ---------------------------------------------------------------------------

describe("C1: match_within begin vs start", () => {
	test("using 'start' (correct) tokenizes strings properly", () => {
		const grammar: Grammar = {
			name: "match-within-start",
			states: {
				main: {
					rules: [
						{ match_within: { start: '"', end: '"' }, token: "string" },
						{ range: ["a", "z"], token: "word" },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const result = tokenize('"hello" world', compiled);
		const tokens = token_values(result, '"hello" world');

		expect(tokens).toContainEqual({ type: "string", value: '"hello"' });
		expect(tokens).toContainEqual({ type: "word", value: "world" });
	});

	test("using 'begin' (documented but wrong) throws a clear error at compile time", () => {
		const grammar = {
			name: "match-within-begin",
			states: {
				main: {
					rules: [
						{ match_within: { begin: '"', end: '"' }, token: "string" },
						{ range: ["a", "z"], token: "word" },
					],
				},
			},
		} as unknown as Grammar;

		expect(() => compile(grammar)).toThrow('match_within uses "start" not "begin"');
	});
});

// ---------------------------------------------------------------------------
// M3 — "No token → no advance" claim in grammar.md is wrong
// ---------------------------------------------------------------------------

describe("M3: Cursor advance without token emission", () => {
	test("rule with no token but explicit match DOES advance cursor", () => {
		// grammar.md:51 claims: "If token is not present then the pointer will not be progressed"
		// This test shows that is incorrect for non-exit rules.
		const grammar: Grammar = {
			name: "no-token-advance",
			states: {
				main: {
					rules: [
						// Transition to inner state without emitting a token
						// grammar.md implies cursor stays — actual behavior: advances by 1
						{ match: "(", state: "inner" },
						{ range: ["a", "z"], token: "letter" },
					],
				},
				inner: {
					rules: [
						// Emit a token in inner state
						{ range: ["a", "z"], token: "inner-letter" },
						{ match: ")", token: "close", exit: true },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const result = tokenize("(abc)", compiled);
		const tokens = token_values(result, "(abc)");

		// '(' triggers state push but no token — cursor advances past '('
		// Inner state then processes 'abc' → inner-letter, ')' → close (exits inner)
		// If grammar.md were correct (no advance), '(' would be processed again → infinite loop
		expect(tokens).toEqual([
			{ type: "inner-letter", value: "abc" },
			{ type: "close", value: ")" },
		]);
	});

	test("exit:true without token and without sideways does NOT advance cursor", () => {
		// This is the one case where grammar.md is correct: exit without token
		// does NOT advance, allowing parent to reprocess the character.
		const grammar: Grammar = {
			name: "exit-no-advance",
			states: {
				main: {
					rules: [
						{ range: ["a", "z"], token: "letter", state: "word" },
					],
				},
				word: {
					rules: [
						{ range: ["a", "z"], token: "letter" },
						// Exit without token on non-letter: cursor does NOT advance
						{ any: true, exit: true },
					],
				},
			},
		};

		const compiled = compile(grammar);
		// '1' is not a-z → word state exits without consuming '1'
		// Parent state (main) then sees '1' → no rule → silently skipped
		const result = tokenize("abc1def", compiled);
		const tokens = token_values(result, "abc1def");

		expect(tokens).toEqual([
			{ type: "letter", value: "abc" },
			{ type: "letter", value: "def" },
		]);
	});

	test("any:true without token still advances cursor — does not infinite loop", () => {
		const grammar: Grammar = {
			name: "any-no-token-advances",
			states: {
				main: {
					rules: [
						{ match: "a", token: "a" },
						{ any: true }, // no token — does this advance?
					],
				},
			},
		};

		const compiled = compile(grammar);
		// 'b' and 'c' have no matching token rule (any:true fires, no token, no exit)
		// If cursor didn't advance, this would infinite loop on 'b'
		const result = tokenize("bac", compiled);
		const tokens = token_values(result, "bac");

		// 'b' → any:true fires, no token, cursor advances (no infinite loop)
		// 'a' → "a" token
		// 'c' → any:true fires, no token, cursor advances
		expect(tokens).toEqual([{ type: "a", value: "a" }]);
	});
});

// ---------------------------------------------------------------------------
// M4 — Probe without fallback: silent failure at EOF
// ---------------------------------------------------------------------------

describe("M4: Probe without fallback", () => {
	test("probe with no fallback compiles without error", () => {
		const grammar: Grammar = {
			name: "probe-no-fallback",
			states: {
				main: {
					rules: [
						// Enter probe state on 'a'
						{ match: "a", state: "probing" },
						{ range: ["a", "z"], token: "letter" },
					],
				},
				probing: {
					mode: "probe",
					// No fallback — grammar.md doesn't say this is required
					rules: [{ match: "!", state: "resolved" }],
				},
				resolved: {
					rules: [{ range: ["a", "z"], token: "resolved" }],
				},
			},
		};

		// CURRENT: compiles without error
		expect(() => compile(grammar)).not.toThrow();

		// The tokenizer now correctly guards the single-char charMaps path with
		// failedProbes, so "abc" (where the probe never resolves) no longer loops.
		// The probe fires on 'a', scans to EOF without finding '!', marks the
		// (pos=0, state, ruleIdx) key as failed, then skips 'a' and continues.
		const compiled = compile(grammar);
		expect(() => tokenize("abc", compiled)).not.toThrow();

		// DESIRED (after fix): compile() should throw:
		// 'Grammar: probe state "probing" must have a "fallback" property'
	});

	test("probe with fallback correctly resolves on EOF", () => {
		const grammar: Grammar = {
			name: "probe-with-fallback",
			states: {
				main: {
					rules: [
						{ match: "a", state: "probing" },
						{ range: ["a", "z"], token: "letter" },
					],
				},
				probing: {
					mode: "probe",
					fallback: "fallback_state",
					rules: [{ match: "!", state: "resolved" }],
				},
				resolved: {
					rules: [{ range: ["a", "z"], token: "resolved" }],
				},
				fallback_state: {
					rules: [{ range: ["a", "z"], token: "fallback-letter" }],
				},
			},
		};

		const compiled = compile(grammar);
		// 'a' enters probe. 'bc' scanned. EOF → fallback to "fallback_state".
		// Reset to original pos. 'a' now in fallback_state context → fallback-letter.
		// 'b', 'c' also → fallback-letter (coalesced).
		const result = tokenize("abc", compiled);
		const tokens = token_values(result, "abc");

		expect(tokens).toEqual([{ type: "fallback-letter", value: "abc" }]);
	});
});

// ---------------------------------------------------------------------------
// m1 — Nested probe: probe-to-probe transition has undefined behavior
// ---------------------------------------------------------------------------

describe("m1: Nested probe states", () => {
	test("probe transitioning to another probe does not hang", () => {
		// This tests that nested probes don't cause an infinite loop.
		// The behavior is undefined — this test just validates safety.
		const grammar: Grammar = {
			name: "nested-probe-safety",
			states: {
				main: {
					rules: [
						{ match: "a", state: "outer_probe" },
						{ range: ["a", "z"], token: "letter" },
					],
				},
				outer_probe: {
					mode: "probe",
					fallback: "outer_fallback",
					rules: [
						{ match: "b", state: "inner_probe" }, // probe → probe transition
					],
				},
				inner_probe: {
					mode: "probe",
					fallback: "inner_fallback",
					rules: [{ match: "c", state: "resolved" }],
				},
				outer_fallback: {
					rules: [{ range: ["a", "z"], token: "outer-fallback" }],
				},
				inner_fallback: {
					rules: [{ range: ["a", "z"], token: "inner-fallback" }],
				},
				resolved: {
					rules: [{ range: ["a", "z"], token: "resolved" }],
				},
			},
		};

		const compiled = compile(grammar);

		// Must complete without hanging. The actual token output is implementation-defined
		// due to the nested probe limitation.
		expect(() => {
			tokenize("abc", compiled);
		}).not.toThrow();

		const result = tokenize("abc", compiled);
		// Just verify it produces a result (not an infinite loop)
		expect(result.tokens).toBeInstanceOf(Uint32Array);

		// DESIRED (after fix): compile() should throw:
		// 'Grammar: probe state "outer_probe" rule 0 transitions to another probe state "inner_probe"'
	});
});

// ---------------------------------------------------------------------------
// Q6 — Sideways transition cursor behavior with any:true
// ---------------------------------------------------------------------------

describe("Q6: Sideways transition cursor behavior", () => {
	test("any:true sideways transition does NOT advance cursor — parent reprocesses char", () => {
		// This is the critical 'end of identifier' pattern used throughout CSS and JS grammars.
		const grammar: Grammar = {
			name: "sideways-cursor-test",
			states: {
				main: {
					rules: [
						{ range: ["0", "9"], token: "digit", state: "number" },
						{ range: ["a", "z"], token: "letter" },
					],
				},
				number: {
					rules: [
						{ range: ["0", "9"], token: "digit" },
						// any:true + sideways: exits number state WITHOUT consuming char
						// Main state then sees and processes the non-digit char
						{ any: true, state: "main", exit: true },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const result = tokenize("12ab34", compiled);
		const tokens = token_values(result, "12ab34");

		// '12' → digits (coalesced in number state)
		// 'a' → any:true fires in number, sideways to main, cursor NOT advanced
		// 'a' now processed by main → letter
		// 'b' → letter (coalesced)
		// '3' → back to number
		// '4' → digit (coalesced)
		expect(tokens).toEqual([
			{ type: "digit", value: "12" },
			{ type: "letter", value: "ab" },
			{ type: "digit", value: "34" },
		]);
	});

	test("explicit match sideways DOES advance cursor by match length", () => {
		const grammar: Grammar = {
			name: "explicit-match-sideways",
			states: {
				main: {
					rules: [
						{ range: ["0", "9"], token: "digit", state: "number" },
						{ range: ["a", "z"], token: "letter" },
					],
				},
				number: {
					rules: [
						{ range: ["0", "9"], token: "digit" },
						// Explicit match sideways: ';' is consumed, cursor advances by 1
						{ match: ";", token: "semi", state: "main", exit: true },
						{ any: true, state: "main", exit: true },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const result = tokenize("12;ab", compiled);
		const tokens = token_values(result, "12;ab");

		expect(tokens).toEqual([
			{ type: "digit", value: "12" },
			{ type: "semi", value: ";" },
			{ type: "letter", value: "ab" },
		]);
	});
});

// ---------------------------------------------------------------------------
// C2 — match_within multiline: ignored silently
// ---------------------------------------------------------------------------

describe("C2: match_within multiline property", () => {
	test("strings span newlines by default — multiline flag has no effect", () => {
		// The JS grammar uses { match_within: { ..., multiline: true } }
		// but the types.ts has no multiline field. The compiler ignores it.
		// Content state uses range: [0, 127] which includes \n (code 10).
		const grammar = {
			name: "multiline-test",
			states: {
				main: {
					rules: [
						{
							match_within: { start: '"', end: '"', escape: "\\" },
							token: "string",
						},
						{ range: ["a", "z"], token: "word" },
					],
				},
			},
		} as Grammar;

		const compiled = compile(grammar);

		// String spanning a newline — works because [0,127] includes \n
		const input = '"hello\nworld"';
		const result = tokenize(input, compiled);
		const tokens = token_values(result, input);

		const str_tokens = tokens.filter((t) => t.type === "string");
		expect(str_tokens[0]?.value).toBe('"hello\nworld"');

		// Now with the multiline flag (silently ignored — same behavior)
		const grammar_with_flag = {
			name: "multiline-flag-test",
			states: {
				main: {
					rules: [
						{
							match_within: {
								start: '"',
								end: '"',
								escape: "\\",
								multiline: true, // silently ignored
							} as any,
							token: "string",
						},
						{ range: ["a", "z"], token: "word" },
					],
				},
			},
		} as Grammar;

		const compiled2 = compile(grammar_with_flag);
		const result2 = tokenize(input, compiled2);
		const tokens2 = token_values(result2, input);

		// Behavior is identical — multiline flag has no effect
		expect(tokens2).toEqual(tokens);

		// DESIRED (after fix implementing A2):
		// multiline: false → string ends at \n; multiline: true (or omitted) → spans newlines
	});
});

// ---------------------------------------------------------------------------
// Q7 — Markdown emphasis: probe cannot pair delimiters
// ---------------------------------------------------------------------------

describe("Q7: Markdown emphasis tokenization limitation", () => {
	test("probe mode cannot reliably distinguish *emphasis* from multiplication", () => {
		// To correctly tokenize *text*, we need to verify a matching * exists ahead
		// without whitespace between the openers/closers. Probe can only detect
		// the FIRST disambiguating character, not a paired one at unknown distance.

		// Best-effort grammar: probe for '*' before whitespace → emphasis; else → operator
		// This works for '*text*' but fails for 'x * y' if * comes before any whitespace.
		const grammar: Grammar = {
			name: "md-emphasis-attempt",
			states: {
				main: {
					rules: [
						{ range: ["a", "z"], token: "text" },
						{ match: " ", token: "space" },
						// Enter probe to check what follows *
						{ match: "*", state: "star_probe" },
					],
				},
				star_probe: {
					mode: "probe",
					fallback: "operator_context",
					rules: [
						// If we hit another * before space → probably emphasis delimiter
						{ match: "*", state: "emphasis_context" },
						// If we hit space first → probably operator
						{ match: " ", state: "operator_context" },
					],
				},
				emphasis_context: {
					rules: [
						{ match: "*", token: "em-delim" },
						{ range: ["a", "z"], token: "em-text" },
						{ any: true, exit: true },
					],
				},
				operator_context: {
					rules: [
						{ match: "*", token: "operator", exit: true },
					],
				},
			},
		};

		const compiled = compile(grammar);

		// Case 1: *text* — the probe should ideally detect this as emphasis
		const r1 = tokenize("*text*", compiled);
		const t1 = token_values(r1, "*text*");
		// Probe scans forward: 't', 'e', 'x', 't', '*' found before space → emphasis_context
		// Reset to '*', now in emphasis_context: first '*' → em-delim, text → em-text, '*' → em-delim
		// This WORKS for simple cases
		expect(r1.tokens).toBeInstanceOf(Uint32Array);

		// Case 2: x * y — multiplication, not emphasis
		const r2 = tokenize("x * y", compiled);
		const t2 = token_values(r2, "x * y");
		// 'x' → text, ' ' → space
		// '*' enters probe. Probe scans: ' ' (space) found before another '*'
		// → operator_context. Reset to '*'. In operator_context: '*' → operator.
		// Then ' ' and 'y' processed normally.
		expect(r2.tokens).toBeInstanceOf(Uint32Array);

		// Case 3: *x* y *z* — correct parsing requires knowing * at position 3
		// is a closer. The probe from position 4 would find '*' at position 6 — emphasis.
		// But '*' at position 4 (standalone) would probe forward and find nothing or space first.
		// The grammar cannot reliably handle interleaved emphasis and operators.
		const r3 = tokenize("*x* y *z*", compiled);
		expect(r3.tokens).toBeInstanceOf(Uint32Array);

		// This test primarily documents the LIMITATION:
		// - Probe mode cannot look for a PAIRED delimiter at unknown distance
		// - It cannot express "match * only if a non-space * appears before whitespace"
		// - Correct Markdown emphasis requires PEG-style backtracking or a separate pass
		//
		// CONCLUSION: The grammar API is not well-suited for paired-delimiter languages
		// like Markdown without significant extensions to the probe model.
	});

	test("deeply nested recursive constructs work up to stack limit", () => {
		// This tests Q3 (recursive constructs) and the practical depth limit (Q2).
		const grammar: Grammar = {
			name: "recursive-parens",
			states: {
				main: {
					rules: [
						{ match: "(", token: "open", state: "main" }, // self-recursive
						{ match: ")", token: "close", exit: true },
						{ range: ["a", "z"], token: "letter" },
					],
				},
			},
		};

		const compiled = compile(grammar);

		// 5 levels deep — well within 256-level limit.
		const five_deep = "(((((a)))))";
		const result5 = tokenize(five_deep, compiled);
		const tokens5 = token_values(result5, five_deep);
		// Verify it doesn't crash and produces tokens for all characters.
		expect(result5.tokens).toBeInstanceOf(Uint32Array);
		expect(result5.tokens.length).toBeGreaterThan(0);
		// Closing ')' chars coalesce (consecutive exits, same token type, contiguous positions)
		const closes5 = tokens5.filter((t) => t.type === "close");
		expect(closes5).toHaveLength(1);
		expect(closes5[0]?.value).toBe(")))))");

		// 200 levels deep — still within 256-level production limit.
		// Key assertion: must complete without throwing or hanging.
		const input200 = "(".repeat(200) + "a" + ")".repeat(200);
		expect(() => tokenize(input200, compiled)).not.toThrow();
		const result200 = tokenize(input200, compiled);
		expect(result200.tokens).toBeInstanceOf(Uint32Array);
		// Closing parens must all coalesce
		const tokens200 = token_values(result200, input200);
		const closes200 = tokens200.filter((t) => t.type === "close");
		expect(closes200).toHaveLength(1);
		expect(closes200[0]?.value).toHaveLength(200);
	});
});

// ---------------------------------------------------------------------------
// m4 — extend always prepends: inherited rules have unconditional priority
// ---------------------------------------------------------------------------

describe("m4: extend always prepends inherited rules", () => {
	test("inherited rules fire before state-local rules for the same character", () => {
		const grammar: Grammar = {
			name: "extend-priority-test",
			groups: {
				base: {
					rules: [
						// Group has a catch-all letter rule
						{ range: ["a", "z"], token: "base-letter" },
					],
				},
			},
			states: {
				main: {
					extend: "base",
					rules: [
						// State wants to override 'a' specifically — but can't!
						// 'extend' prepends group rules, so base-letter fires first for 'a'.
						{ match: "a", token: "special-a" },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const result = tokenize("abc", compiled);
		const tokens = token_values(result, "abc");

		// CURRENT BEHAVIOR: 'a', 'b', 'c' all get "base-letter" because
		// the inherited range: [a-z] fires before the state's match: "a".
		// The "special-a" rule is never reached.
		expect(tokens).toEqual([{ type: "base-letter", value: "abc" }]);

		// DESIRED (with extend_after or override):
		// 'a' → special-a, 'b' → base-letter, 'c' → base-letter
	});
});
