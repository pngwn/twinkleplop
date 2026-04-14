import { describe, expect, it } from "vitest";
import { compile } from "./compiler";
import type { Grammar } from "./types";

// helper: a minimal grammar with no rules — useful when testing slot
// declarations in isolation. uses `any: true` fallbacks so the compiler does
// not complain about empty rule lists.
function grammar_with_states(
	states: Grammar["states"],
	name = "test",
): Grammar {
	return { name, states };
}

describe("compile / slots — declarations and ID assignment", () => {
	it("a single bool slot gets id 0 with the declared default", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { is_class: { type: "bool", default: true } },
					rules: [{ any: true, token: "x" }],
				},
			}),
		);
		expect(compiled.slot_count).toBe(1);
		expect(compiled.slot_name_of_id).toEqual(["is_class"]);
		expect(compiled.slot_type_of_id[0]).toBe(0); // bool
		expect(compiled.slot_default_of_id[0]).toBe(1); // true
		expect(compiled.slot_enum_values[0]).toBeNull();
		expect(compiled.slot_owner_of_id[0]).toBe(compiled.states.get("root"));
	});

	it("u8 slot stores the integer default verbatim", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { count: { type: "u8", default: 42 } },
					rules: [{ any: true, token: "x" }],
				},
			}),
		);
		expect(compiled.slot_type_of_id[0]).toBe(1);
		expect(compiled.slot_default_of_id[0]).toBe(42);
	});

	it("u8 slot without a default uses 0 as a placeholder", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { count: { type: "u8" } },
					rules: [{ any: true, token: "x" }],
				},
			}),
		);
		expect(compiled.slot_default_of_id[0]).toBe(0);
	});

	it("enum slot resolves a by-name default to its integer index", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: {
						kind: {
							type: "u8",
							values: ["class", "interface", "tuple"],
							default: "interface",
						},
					},
					rules: [{ any: true, token: "x" }],
				},
			}),
		);
		expect(compiled.slot_default_of_id[0]).toBe(1);
		expect(compiled.slot_enum_values[0]).toEqual([
			"class",
			"interface",
			"tuple",
		]);
	});

	it("multiple slots across multiple states get sequential ids", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: {
						a: { type: "bool" },
						b: { type: "u8", default: 5 },
					},
					rules: [{ any: true, token: "x", state: "child" }],
				},
				child: {
					slots: { c: { type: "bool", default: true } },
					rules: [{ any: true, token: "x" }],
				},
			}),
		);
		expect(compiled.slot_count).toBe(3);
		expect(compiled.slot_name_of_id).toEqual(["a", "b", "c"]);
		expect(Array.from(compiled.slot_type_of_id)).toEqual([0, 1, 0]);
		expect(Array.from(compiled.slot_default_of_id)).toEqual([0, 5, 1]);
		expect(compiled.slot_owner_of_id[0]).toBe(compiled.states.get("root"));
		expect(compiled.slot_owner_of_id[1]).toBe(compiled.states.get("root"));
		expect(compiled.slot_owner_of_id[2]).toBe(compiled.states.get("child"));
	});

	it("slot_decls_for_state packs (id, default) pairs per declaring state", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: {
						a: { type: "u8", default: 7 },
						b: { type: "bool", default: true },
					},
					rules: [{ any: true, token: "x", state: "child" }],
				},
				child: {
					slots: { c: { type: "u8", default: 3 } },
					rules: [{ any: true, token: "x" }],
				},
			}),
		);
		const root_id = compiled.states.get("root")!;
		const child_id = compiled.states.get("child")!;
		expect(Array.from(compiled.slot_decls_for_state.get(root_id)!)).toEqual([
			0, 7, 1, 1,
		]);
		expect(Array.from(compiled.slot_decls_for_state.get(child_id)!)).toEqual([
			2, 3,
		]);
	});

	it("states without slots produce no slot_decls_for_state entry", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					rules: [{ any: true, token: "x", state: "child" }],
				},
				child: {
					slots: { c: { type: "u8", default: 0 } },
					rules: [{ any: true, token: "x" }],
				},
			}),
		);
		const root_id = compiled.states.get("root")!;
		const child_id = compiled.states.get("child")!;
		expect(compiled.slot_decls_for_state.has(root_id)).toBe(false);
		expect(compiled.slot_decls_for_state.has(child_id)).toBe(true);
	});

	it("slot-free grammars produce zero-sized slot artefacts", () => {
		const compiled = compile(
			grammar_with_states({
				root: { rules: [{ any: true, token: "x" }] },
			}),
		);
		expect(compiled.slot_count).toBe(0);
		expect(compiled.slot_name_of_id).toEqual([]);
		expect(compiled.slot_type_of_id.length).toBe(0);
		expect(compiled.slot_default_of_id.length).toBe(0);
		expect(compiled.slot_enum_values).toEqual([]);
		expect(compiled.slot_owner_of_id.length).toBe(0);
		expect(compiled.slot_decls_for_state.size).toBe(0);
	});
});

describe("compile / slots — validation rejects bad declarations", () => {
	it("duplicate slot name across states is a compile error", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { kind: { type: "u8" } },
						rules: [{ any: true, token: "x", state: "child" }],
					},
					child: {
						slots: { kind: { type: "bool" } },
						rules: [{ any: true, token: "x" }],
					},
				}),
			),
		).toThrow(/slot "kind" is declared on both state "root" and state "child"/);
	});

	it("invalid slot type is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						// @ts-expect-error testing invalid type
						slots: { x: { type: "u32" } },
						rules: [{ any: true, token: "x" }],
					},
				}),
			),
		).toThrow(/invalid type/);
	});

	it("values on a bool slot is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { x: { type: "bool", values: ["a", "b"] } },
						rules: [{ any: true, token: "x" }],
					},
				}),
			),
		).toThrow(/Enum values are only valid on u8 slots/);
	});

	it("empty values array is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { x: { type: "u8", values: [] } },
						rules: [{ any: true, token: "x" }],
					},
				}),
			),
		).toThrow(/empty values array/);
	});

	it("values array longer than 256 is rejected", () => {
		const big = Array.from({ length: 257 }, (_, i) => `v${i}`);
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { x: { type: "u8", values: big } },
						rules: [{ any: true, token: "x" }],
					},
				}),
			),
		).toThrow(/maximum is 256/);
	});

	it("enum slot with a numeric default is rejected (defaults must be by name)", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: {
							kind: { type: "u8", values: ["a", "b"], default: 0 },
						},
						rules: [{ any: true, token: "x" }],
					},
				}),
			),
		).toThrow(/Enum defaults must be specified by name/);
	});

	it("enum slot with a default not in values is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: {
							kind: { type: "u8", values: ["a", "b"], default: "c" },
						},
						rules: [{ any: true, token: "x" }],
					},
				}),
			),
		).toThrow(/is not in values/);
	});

	it("bool slot with non-boolean default is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						// @ts-expect-error testing invalid default
						slots: { x: { type: "bool", default: 1 } },
						rules: [{ any: true, token: "x" }],
					},
				}),
			),
		).toThrow(/is bool but default is/);
	});

	it("u8 slot with non-integer default is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { x: { type: "u8", default: 1.5 } },
						rules: [{ any: true, token: "x" }],
					},
				}),
			),
		).toThrow(/expected an integer/);
	});

	it("u8 slot with default out of range is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { x: { type: "u8", default: 256 } },
						rules: [{ any: true, token: "x" }],
					},
				}),
			),
		).toThrow(/out of range/);
	});
});

// helpers for stage-3 tests: pull the packed (slot_id, op, value) triples
// for a given (state_name, rule_idx) out of the compiled grammar.
function predicate_triples(
	compiled: ReturnType<typeof compile>,
	state_name: string,
	rule_idx: number,
): number[] | null {
	const state_id = compiled.states.get(state_name)!;
	const offset = compiled.rule_slot_predicate_offsets[state_id * 256 + rule_idx];
	if (offset === 0xffffffff) return null;
	const count = compiled.rule_slot_predicates_flat[offset];
	return Array.from(
		compiled.rule_slot_predicates_flat.slice(offset + 1, offset + 1 + count * 3),
	);
}

function update_triples(
	compiled: ReturnType<typeof compile>,
	state_name: string,
	rule_idx: number,
): number[] | null {
	const state_id = compiled.states.get(state_name)!;
	const offset = compiled.rule_slot_update_offsets[state_id * 256 + rule_idx];
	if (offset === 0xffffffff) return null;
	const count = compiled.rule_slot_updates_flat[offset];
	return Array.from(
		compiled.rule_slot_updates_flat.slice(offset + 1, offset + 1 + count * 3),
	);
}

describe("compile / slots — rule-level lowering", () => {
	it("rules without slot_when/slot_set get the sentinel offset", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { kind: { type: "u8", values: ["a", "b"], default: "a" } },
					rules: [{ match: "x", token: "letter_x" }],
				},
			}),
		);
		const root_id = compiled.states.get("root")!;
		expect(compiled.rule_slot_predicate_offsets[root_id * 256 + 0]).toBe(
			0xffffffff,
		);
		expect(compiled.rule_slot_update_offsets[root_id * 256 + 0]).toBe(
			0xffffffff,
		);
	});

	it("bare slot_when (in owning state) lowers to packed eq triple", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { count: { type: "u8", default: 0 } },
					rules: [
						{ match: "x", token: "x", slot_when: { count: { gt: 0 } } },
						{ match: "x", token: "x" },
					],
				},
			}),
		);
		// rule 0 has gt comparator → op 2
		expect(predicate_triples(compiled, "root", 0)).toEqual([0, 2, 0]);
		// rule 1 unconditional
		expect(predicate_triples(compiled, "root", 1)).toBeNull();
	});

	it("bare equality sugar lowers to op 0", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: {
						kind: { type: "u8", values: ["a", "b"], default: "a" },
					},
					rules: [
						{ match: "x", token: "x", slot_when: { kind: "b" } },
					],
				},
			}),
		);
		// kind = "b" → op 0 (eq), value 1 (index of "b")
		expect(predicate_triples(compiled, "root", 0)).toEqual([0, 0, 1]);
	});

	it("multiple slot_when entries pack into one triple sequence", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: {
						kind: { type: "u8", values: ["a", "b"], default: "a" },
						count: { type: "u8", default: 0 },
					},
					rules: [
						{
							match: "x",
							token: "x",
							slot_when: { kind: "a", count: { gte: 5 } },
						},
					],
				},
			}),
		);
		// 2 entries: (kind=0, eq=0, "a"=0), (count=1, gte=4, 5)
		expect(predicate_triples(compiled, "root", 0)).toEqual([0, 0, 0, 1, 4, 5]);
	});

	it("slot_set with bare value lowers to set op", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { seen: { type: "bool", default: false } },
					rules: [
						{ match: "x", token: "x", slot_set: { seen: true } },
					],
				},
			}),
		);
		expect(update_triples(compiled, "root", 0)).toEqual([0, 0, 1]);
	});

	it("slot_set with inc/dec/toggle lowers correctly", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: {
						count: { type: "u8", default: 0 },
						flag: { type: "bool", default: false },
					},
					rules: [
						{
							match: "x",
							token: "x",
							slot_set: { count: { inc: 1 }, flag: "toggle" },
						},
					],
				},
			}),
		);
		// count: id=0, op=1 (inc), value=1
		// flag:  id=1, op=3 (toggle), value=0
		expect(update_triples(compiled, "root", 0)).toEqual([0, 1, 1, 1, 3, 0]);
	});
});

describe("compile / slots — qualified vs unqualified name resolution", () => {
	it("bare slot reference in the owning state succeeds", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { count: { type: "u8", default: 0 } },
					rules: [
						{ match: "x", token: "x", slot_when: { count: 0 } },
					],
				},
			}),
		);
		expect(predicate_triples(compiled, "root", 0)).toEqual([0, 0, 0]);
	});

	it("qualified slot reference from a different state succeeds", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { kind: { type: "u8", values: ["a"], default: "a" } },
					rules: [{ match: "x", token: "x", state: "child" }],
				},
				child: {
					rules: [
						{
							match: "y",
							token: "y",
							slot_when: { "root.kind": "a" },
						},
					],
				},
			}),
		);
		expect(predicate_triples(compiled, "child", 0)).toEqual([0, 0, 0]);
	});

	it("bare reference from outside the owning state is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { kind: { type: "u8", values: ["a"], default: "a" } },
						rules: [{ match: "x", token: "x", state: "child" }],
					},
					child: {
						rules: [
							{ match: "y", token: "y", slot_when: { kind: "a" } },
						],
					},
				}),
			),
		).toThrow(/without a qualifier.*Use the qualified form "root.kind"/);
	});

	it("qualified reference to wrong owner is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { kind: { type: "u8", values: ["a"], default: "a" } },
						rules: [{ match: "x", token: "x", state: "child" }],
					},
					child: {
						rules: [
							{
								match: "y",
								token: "y",
								slot_when: { "child.kind": "a" },
							},
						],
					},
				}),
			),
		).toThrow(/owned by state "root", not "child"/);
	});

	it("reference to undeclared slot is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						rules: [
							{
								match: "x",
								token: "x",
								slot_when: { ghost: true },
							},
						],
					},
				}),
			),
		).toThrow(/references unknown slot "ghost"/);
	});
});

describe("compile / slots — comparator and update validation", () => {
	it("gt on a bool slot is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { f: { type: "bool", default: false } },
						rules: [
							{ match: "x", token: "x", slot_when: { f: { gt: 0 } } },
						],
					},
				}),
			),
		).toThrow(/uses gt on slot "f" but gt is only valid on numeric/);
	});

	it("gt on an enum slot is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: {
							kind: { type: "u8", values: ["a"], default: "a" },
						},
						rules: [
							{
								match: "x",
								token: "x",
								slot_when: { kind: { gt: 0 } },
							},
						],
					},
				}),
			),
		).toThrow(/only valid on numeric/);
	});

	it("toggle on a u8 slot is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { count: { type: "u8", default: 0 } },
						rules: [
							{
								match: "x",
								token: "x",
								slot_set: { count: "toggle" },
							},
						],
					},
				}),
			),
		).toThrow(/applies "toggle" to slot "count" but toggle is only valid on bool/);
	});

	it("inc on a bool slot is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { f: { type: "bool", default: false } },
						rules: [
							{
								match: "x",
								token: "x",
								slot_set: { f: { inc: 1 } },
							},
						],
					},
				}),
			),
		).toThrow(/uses inc on slot "f" but inc is only valid on u8/);
	});

	it("eq with wrong type for a bool slot is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { f: { type: "bool", default: false } },
						rules: [
							{ match: "x", token: "x", slot_when: { f: 1 } },
						],
					},
				}),
			),
		).toThrow(/expects a boolean/);
	});

	it("eq with non-enum-member for an enum slot is rejected", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: {
							kind: { type: "u8", values: ["a", "b"], default: "a" },
						},
						rules: [
							{
								match: "x",
								token: "x",
								slot_when: { kind: "c" },
							},
						],
					},
				}),
			),
		).toThrow(/is not a member of slot "kind" enum/);
	});
});

describe("compile / slots — push-with-no-default check", () => {
	it("entering a state with a no-default slot requires slot_set", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						rules: [{ match: "x", token: "x", state: "child" }],
					},
					child: {
						slots: {
							kind: { type: "u8", values: ["a", "b"] },
						},
						rules: [{ any: true, token: "y" }],
					},
				}),
			),
		).toThrow(
			/enters state "child" which declares slot "kind" without a default/,
		);
	});

	it("entering with the required slot_set succeeds", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					rules: [
						{
							match: "x",
							token: "x",
							state: "child",
							slot_set: { "child.kind": "a" },
						},
					],
				},
				child: {
					slots: {
						kind: { type: "u8", values: ["a", "b"] },
					},
					rules: [{ any: true, token: "y" }],
				},
			}),
		);
		expect(update_triples(compiled, "root", 0)).toEqual([0, 0, 0]);
	});

	it("missing one of multiple required slots is reported", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						rules: [
							{
								match: "x",
								token: "x",
								state: "child",
								slot_set: { "child.kind": "a" },
							},
						],
					},
					child: {
						slots: {
							kind: { type: "u8", values: ["a"] },
							count: { type: "u8" },
						},
						rules: [{ any: true, token: "y" }],
					},
				}),
			),
		).toThrow(/declares slot "count" without a default/);
	});

	it("entering with default-bearing slots needs no slot_set", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						rules: [{ match: "x", token: "x", state: "child" }],
					},
					child: {
						slots: { kind: { type: "u8", default: 0 } },
						rules: [{ any: true, token: "y" }],
					},
				}),
			),
		).not.toThrow();
	});

	it("sideways transition (state + exit) also triggers the check", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						rules: [
							{ match: "x", token: "x", state: "sibling", exit: true },
						],
					},
					sibling: {
						slots: { kind: { type: "u8", values: ["a"] } },
						rules: [{ any: true, token: "y" }],
					},
				}),
			),
		).toThrow(/declares slot "kind" without a default/);
	});
});

describe("compile / slots — slot-only grammar still tokenizes", () => {
	it("declaration alone (no slot_when/slot_set) doesn't change tokenization", async () => {
		const { tokenize } = await import("./tokenizer");
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { kind: { type: "u8", values: ["a", "b"] } },
					rules: [{ match: "x", token: "letter_x" }],
				},
			}),
		);
		const result = tokenize("xxx", compiled);
		// adjacent same-type tokens coalesce into one spanning [0, 3)
		const letter_x_id = compiled.token_types.indexOf("letter_x");
		expect(result.tokens.length).toBe(3);
		expect(result.tokens[0]).toBe(letter_x_id);
		expect(result.tokens[1]).toBe(0);
		expect(result.tokens[2]).toBe(3);
	});
});

// helper: tokenize and decode each (type_id, start, end) triple back into a
// readable [type_name, value] pair. used by stage-4 runtime tests to check
// behavior black-box.
async function decode_tokens(
	input: string,
	compiled: ReturnType<typeof compile>,
): Promise<Array<{ type: string; value: string }>> {
	const { tokenize } = await import("./tokenizer");
	const result = tokenize(input, compiled);
	const out: Array<{ type: string; value: string }> = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type_id = result.tokens[i * 3];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		out.push({
			type: result.token_types[type_id],
			value: input.slice(start, end),
		});
	}
	return out;
}

// note: stage 4's runtime supports slot_when on multi-char patterns (the
// bucket loop falls through to the next pattern when a predicate fails) but
// not on single-char rules in char_maps (only one rule_idx per char). these
// tests use multi-char patterns to exercise the multi-rule slot_when path.
// the single-char-fall-through case is stage 5.

describe("runtime / slots — read/write in hot path", () => {
	it("slot_set with bare value writes, observable via slot_when", async () => {
		// "aa" sets seen; "bb" emits one of two tokens based on seen.
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { seen: { type: "bool", default: false } },
					rules: [
						{ match: "aa", token: "letter_a", slot_set: { seen: true } },
						{ match: "bb", token: "after_a", slot_when: { seen: true } },
						{ match: "bb", token: "before_a", slot_when: { seen: false } },
					],
				},
			}),
		);
		const tokens = await decode_tokens("bbaabb", compiled);
		expect(tokens).toEqual([
			{ type: "before_a", value: "bb" },
			{ type: "letter_a", value: "aa" },
			{ type: "after_a", value: "bb" },
		]);
	});

	it("slot_set inc on u8 increments and is observable", async () => {
		// each "aa" bumps the counter; bucket-loop slot_when picks the right
		// branch. "." separators prevent same-type adjacent tokens coalescing
		// (which would mask the "two later_a" outcome).
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { count: { type: "u8", default: 0 } },
					rules: [
						{
							match: "aa",
							token: "first_a",
							slot_when: { count: 0 },
							slot_set: { count: { inc: 1 } },
						},
						{
							match: "aa",
							token: "second_a",
							slot_when: { count: 1 },
							slot_set: { count: { inc: 1 } },
						},
						{
							match: "aa",
							token: "later_a",
							slot_when: { count: { gte: 2 } },
							slot_set: { count: { inc: 1 } },
						},
						{ match: ".", token: "sep" },
					],
				},
			}),
		);
		const tokens = await decode_tokens("aa.aa.aa.aa", compiled);
		expect(tokens.map((t) => t.type)).toEqual([
			"first_a",
			"sep",
			"second_a",
			"sep",
			"later_a",
			"sep",
			"later_a",
		]);
	});

	it("slot inc wraps at 255 to 0", async () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { count: { type: "u8", default: 254 } },
					rules: [
						{
							match: "aa",
							token: "fresh",
							slot_when: { count: 0 },
							slot_set: { count: { inc: 1 } },
						},
						{
							match: "aa",
							token: "bumped",
							slot_when: { count: { gte: 1 } },
							slot_set: { count: { inc: 1 } },
						},
						{ match: ".", token: "sep" },
					],
				},
			}),
		);
		// start: 254 → bumped (255), bumped (wraps to 0), fresh (1), bumped (2)
		const tokens = await decode_tokens("aa.aa.aa.aa", compiled);
		expect(tokens.map((t) => t.type)).toEqual([
			"bumped",
			"sep",
			"bumped",
			"sep",
			"fresh",
			"sep",
			"bumped",
		]);
	});

	it("toggle on bool flips the value", async () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { f: { type: "bool", default: false } },
					rules: [
						{
							match: "xx",
							token: "off_then_toggle",
							slot_when: { f: false },
							slot_set: { f: "toggle" },
						},
						{
							match: "xx",
							token: "on_then_toggle",
							slot_when: { f: true },
							slot_set: { f: "toggle" },
						},
					],
				},
			}),
		);
		const tokens = await decode_tokens("xxxxxxxx", compiled);
		expect(tokens.map((t) => t.type)).toEqual([
			"off_then_toggle",
			"on_then_toggle",
			"off_then_toggle",
			"on_then_toggle",
		]);
	});
});

describe("runtime / slots — push/pop frame discipline", () => {
	it("popping back restores the parent frame's slot value", async () => {
		// outer state owns counter. rule 'a' bumps it. rule '(' enters an
		// inner state that has its own slot 'c' with default 99 — but our
		// observer rule 'b' reads outer.count, not inner.c. when we ')' back
		// out, outer.count should be unchanged by anything that happened inside.
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { count: { type: "u8", default: 0 } },
					rules: [
						{ match: "a", token: "bump", slot_set: { count: { inc: 1 } } },
						{
							match: "b",
							token: "low",
							slot_when: { count: { lt: 2 } },
						},
						{
							match: "b",
							token: "high",
							slot_when: { count: { gte: 2 } },
						},
						{ match: "(", token: "open", state: "inner" },
					],
				},
				inner: {
					slots: { c: { type: "u8", default: 99 } },
					rules: [
						{ match: "x", token: "inner_x" },
						{ match: ")", token: "close", exit: true },
					],
				},
			}),
		);
		// "ab(x)b" → bump (count=1), low, open, inner_x, close, low (count still 1)
		const tokens = await decode_tokens("ab(x)b", compiled);
		expect(tokens.map((t) => t.type)).toEqual([
			"bump",
			"low",
			"open",
			"inner_x",
			"close",
			"low",
		]);
	});

	it("popping then re-pushing the same state re-initialises its slot", async () => {
		// inner has slot c with no default, so the rule that pushes inner must
		// set c. each push should give a fresh c regardless of writes during
		// the previous activation. uses "xx" multi-char to exercise the bucket
		// loop where multi-rule slot_when works in stage 4.
		const compiled = compile(
			grammar_with_states({
				root: {
					rules: [
						{
							match: "(",
							token: "open",
							state: "inner",
							slot_set: { "inner.c": "a" },
						},
						{
							match: "[",
							token: "open2",
							state: "inner",
							slot_set: { "inner.c": "b" },
						},
					],
				},
				inner: {
					slots: { c: { type: "u8", values: ["a", "b"] } },
					rules: [
						{
							match: "xx",
							token: "x_a",
							slot_when: { c: "a" },
						},
						{
							match: "xx",
							token: "x_b",
							slot_when: { c: "b" },
						},
						{ match: ")", token: "close", exit: true },
						{ match: "]", token: "close2", exit: true },
					],
				},
			}),
		);
		const tokens = await decode_tokens("(xx)[xx]", compiled);
		expect(tokens.map((t) => t.type)).toEqual([
			"open",
			"x_a",
			"close",
			"open2",
			"x_b",
			"close2",
		]);
	});

	it("sideways transition restores the leaving state's slots", async () => {
		// state X has slot s=1; sideways to state Y resets s to (Y's) default 7;
		// observer in Y reads its own s. without proper restore+save+init the
		// slot would show 1 instead of 7.
		const compiled = compile(
			grammar_with_states({
				root: {
					rules: [{ any: true, token: "x", state: "x_state" }],
				},
				x_state: {
					slots: { sx: { type: "u8", default: 1 } },
					rules: [
						{ match: "1", token: "is_one", slot_when: { sx: 1 } },
						{
							match: ">",
							token: "go",
							state: "y_state",
							exit: true,
						},
					],
				},
				y_state: {
					slots: { sy: { type: "u8", default: 7 } },
					rules: [
						{ match: "7", token: "is_seven", slot_when: { sy: 7 } },
						{ any: true, token: "fallback" },
					],
				},
			}),
		);
		// the leading "x" pushes x_state via root's any:true rule. then '1'
		// fires under sx=1; '>' sideways-transitions to y_state with sy=7
		// initialised; '7' fires under sy=7.
		const tokens = await decode_tokens("x1>7", compiled);
		expect(tokens.map((t) => t.type)).toEqual([
			"x",
			"is_one",
			"go",
			"is_seven",
		]);
	});
});

describe("runtime / slots — introspector integration (stage 8)", () => {
	it("pushed_state events carry decoded slot snapshots", async () => {
		const { tokenize } = await import("./tokenizer");
		const { TokenizerIntrospector } = await import("./introspector");
		const { GrammarMapper } = await import("./grammar-mapper");
		const grammar: Grammar = {
			name: "introspect-slots",
			states: {
				root: {
					slots: {
						kind: { type: "u8", values: ["a", "b"], default: "a" },
						count: { type: "u8", default: 7 },
						flag: { type: "bool", default: true },
					},
					rules: [
						{ match: "(", token: "open", state: "child" },
					],
				},
				child: {
					rules: [{ match: ")", token: "close", exit: true }],
				},
			},
		};
		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector({
			grammar_mapper: new GrammarMapper(grammar, compiled),
		});
		tokenize("()", compiled, introspector);

		// look at the pushed_state event when entering child.
		const push_event = introspector.state_transitions.find(
			(e) => e.type === "PUSHED_STATE" && e.to_state === "child",
		);
		expect(push_event).toBeDefined();
		expect(push_event?.slot_snapshot).toEqual({
			kind: "a",
			count: 7,
			flag: true,
		});
	});

	it("popped_state events also carry slot snapshots", async () => {
		const { tokenize } = await import("./tokenizer");
		const { TokenizerIntrospector } = await import("./introspector");
		const grammar: Grammar = {
			name: "introspect-pop",
			states: {
				root: {
					slots: { tag: { type: "bool", default: false } },
					rules: [{ match: "(", token: "open", state: "child" }],
				},
				child: {
					rules: [{ match: ")", token: "close", exit: true }],
				},
			},
		};
		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();
		tokenize("()", compiled, introspector);

		const pop_event = introspector.state_transitions.find(
			(e) => e.type === "POPPED_STATE",
		);
		expect(pop_event).toBeDefined();
		expect(pop_event?.slot_snapshot).toEqual({ tag: false });
	});

	it("slot_write events fire when a rule's slot_set runs and capture the post-update snapshot", async () => {
		const { tokenize } = await import("./tokenizer");
		const { TokenizerIntrospector } = await import("./introspector");
		const grammar: Grammar = {
			name: "introspect-slot-write",
			states: {
				root: {
					slots: { count: { type: "u8", default: 0 } },
					rules: [
						{
							match: "+",
							token: "plus",
							slot_set: { count: { inc: 1 } },
						},
					],
				},
			},
		};
		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();
		tokenize("+++", compiled, introspector);

		const writes = introspector.history.filter(
			(e) => e.type === "SLOT_WRITE",
		);
		expect(writes).toHaveLength(3);
		expect(writes[0].slot_snapshot).toEqual({ count: 1 });
		expect(writes[1].slot_snapshot).toEqual({ count: 2 });
		expect(writes[2].slot_snapshot).toEqual({ count: 3 });
	});

	it("slot-free grammars produce events without slot_snapshot", async () => {
		const { tokenize } = await import("./tokenizer");
		const { TokenizerIntrospector } = await import("./introspector");
		const grammar: Grammar = {
			name: "no-slots",
			states: {
				root: {
					rules: [{ match: "(", token: "open", state: "child" }],
				},
				child: {
					rules: [{ match: ")", token: "close", exit: true }],
				},
			},
		};
		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();
		tokenize("()", compiled, introspector);

		const push_event = introspector.state_transitions.find(
			(e) => e.type === "PUSHED_STATE",
		);
		expect(push_event).toBeDefined();
		expect(push_event?.slot_snapshot).toBeUndefined();
	});

	it("grammar mapper exposes slot_name and decode_slot_value", async () => {
		const { GrammarMapper } = await import("./grammar-mapper");
		const grammar: Grammar = {
			name: "mapper-slots",
			states: {
				root: {
					slots: {
						kind: { type: "u8", values: ["x", "y", "z"] },
						active: { type: "bool", default: true },
					},
					rules: [
						{
							match: "(",
							token: "open",
							slot_set: { kind: "y" },
						},
					],
				},
			},
		};
		const compiled = compile(grammar);
		const mapper = new GrammarMapper(grammar, compiled);
		const kind_id = compiled.slot_name_of_id.indexOf("kind");
		const active_id = compiled.slot_name_of_id.indexOf("active");
		expect(mapper.slot_name(kind_id)).toBe("kind");
		expect(mapper.slot_name(active_id)).toBe("active");
		expect(mapper.decode_slot_value(kind_id, 1)).toBe("y");
		expect(mapper.decode_slot_value(kind_id, 2)).toBe("z");
		expect(mapper.decode_slot_value(active_id, 0)).toBe(false);
		expect(mapper.decode_slot_value(active_id, 1)).toBe(true);
	});
});

describe("runtime / slots — probe snapshot/restore (stage 6)", () => {
	// shared probe grammar: root has a `flag` slot; probe_a pushes from root,
	// and a rule inside probe_a writes root.flag during probe execution.
	// observer rules in root differentiate based on flag value after probe.
	function probe_grammar(): Grammar {
		return {
			name: "probe-test",
			states: {
				root: {
					slots: { flag: { type: "bool", default: false } },
					rules: [
						{ match: "?", state: "probe_a" },
						{ match: "F", token: "is_false", slot_when: { flag: false } },
						{ match: "F", token: "is_true", slot_when: { flag: true } },
						{ any: true, token: "any" },
					],
				},
				probe_a: {
					mode: "probe",
					fallback: "fallback_state",
					rules: [
						// writes flag during probe; consumes char without transitioning.
						{ match: "y", slot_set: { "root.flag": true } },
						// resolves probe to x_target on encountering 'x'.
						{ match: "x", state: "x_target" },
					],
				},
				x_target: {
					rules: [{ any: true, token: "x_tok", exit: true }],
				},
				fallback_state: {
					rules: [{ any: true, token: "fallback_tok", exit: true }],
				},
			},
		};
	}

	it("slot write inside a probe persists when the probe succeeds", async () => {
		const compiled = compile(probe_grammar());
		// "?yx F": probe enters at "?", "y" sets flag, "x" resolves probe to
		// x_target. snapshot is discarded. "F" in root sees flag=true.
		const tokens = await decode_tokens("?yxF", compiled);
		// after probe success at "x", x_target consumes "?" via any:true and
		// exits; subsequent y/x pass through root.any; F sees flag=true.
		const types = tokens.map((t) => t.type);
		expect(types).toContain("is_true");
		expect(types).not.toContain("is_false");
	});

	it("slot write inside a probe is reverted when the probe fails (fallback)", async () => {
		const compiled = compile(probe_grammar());
		// "?yzF": probe enters at "?", "y" sets flag, "z" doesn't match in
		// probe so it's skipped; eventually end-of-input triggers fallback.
		// snapshot restores flag=false; F in root sees flag=false.
		const tokens = await decode_tokens("?yzF", compiled);
		const types = tokens.map((t) => t.type);
		expect(types).toContain("is_false");
		expect(types).not.toContain("is_true");
	});

	it("slot write inside a probe is reverted when the probe fails (no fallback)", async () => {
		// same shape but probe state has no fallback → rewind path instead of
		// enter_probe_fallback.
		const grammar: Grammar = {
			name: "probe-test-no-fallback",
			states: {
				root: {
					slots: { flag: { type: "bool", default: false } },
					rules: [
						{ match: "?", state: "probe_a" },
						{ match: "F", token: "is_false", slot_when: { flag: false } },
						{ match: "F", token: "is_true", slot_when: { flag: true } },
						{ any: true, token: "any" },
					],
				},
				probe_a: {
					mode: "probe",
					// no fallback — probe failure rewinds and marks failed.
					rules: [
						{ match: "y", slot_set: { "root.flag": true } },
						{ match: "x", state: "x_target" },
					],
				},
				x_target: {
					rules: [{ any: true, token: "x_tok", exit: true }],
				},
			},
		};
		const compiled = compile(grammar);
		// "?yz": probe enters, "y" sets flag, "z" no match, end-of-input,
		// no fallback → rewind_to_probe_entry. flag must revert to false.
		// the failed-probe cache then prevents re-entering at the same pos,
		// so we then fall through to root.any:true on "?" / "y" / "z".
		const tokens = await decode_tokens("?yzF", compiled);
		const types = tokens.map((t) => t.type);
		expect(types).toContain("is_false");
		expect(types).not.toContain("is_true");
	});

	it("fallback state's own slots are properly initialized after probe failure", async () => {
		// gives the fallback state its own slot with a default; verifies the
		// fallback path runs save+init for the fallback's owned slots so the
		// fallback's rules see the correct value.
		const grammar: Grammar = {
			name: "probe-fallback-slots",
			states: {
				root: {
					rules: [{ match: "?", state: "probe_a" }],
				},
				probe_a: {
					mode: "probe",
					fallback: "fallback_state",
					rules: [
						{ match: "x", state: "x_target" },
					],
				},
				x_target: {
					rules: [{ any: true, token: "x_tok", exit: true }],
				},
				fallback_state: {
					slots: { fallback_flag: { type: "bool", default: true } },
					rules: [
						{
							any: true,
							token: "fallback_default_set",
							slot_when: { fallback_flag: true },
							exit: true,
						},
						{ any: true, token: "fallback_default_unset", exit: true },
					],
				},
			},
		};
		const compiled = compile(grammar);
		// "?z": probe enters, "z" doesn't match, end-of-input, fallback path.
		// fallback_state must have fallback_flag initialized to true.
		const tokens = await decode_tokens("?z", compiled);
		expect(tokens.map((t) => t.type)).toContain("fallback_default_set");
	});
});

describe("runtime / slots — predicate-rules list (stage 5)", () => {
	it("a slot-gated rule whose predicate fails falls through to any:true fallback", async () => {
		// stage 5: slot-gated rules live in predicate_rules (not char_maps),
		// so a failing gate falls through to whatever other rules cover the
		// char. with the gate off here, the any:true rule handles 'a'.
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { f: { type: "bool", default: false } },
					rules: [
						{
							match: "a",
							token: "gated_a",
							slot_when: { f: true },
						},
						{ any: true, token: "anything" },
					],
				},
			}),
		);
		const tokens = await decode_tokens("a", compiled);
		expect(tokens.map((t) => t.type)).toEqual(["anything"]);
	});

	it("two slot-gated single-char rules at the same char with mutually exclusive predicates both fire", async () => {
		// classic stage-5 case: char_maps couldn't represent this in stage 4
		// because it stores one rule per char. with the predicate_rules list,
		// declaration-order first-match-wins picks the right rule.
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { f: { type: "bool", default: false } },
					rules: [
						{ match: "x", token: "x_off", slot_when: { f: false } },
						{ match: "x", token: "x_on", slot_when: { f: true } },
						{ match: ".", token: "flip", slot_set: { f: "toggle" } },
					],
				},
			}),
		);
		const tokens = await decode_tokens("x.x.x", compiled);
		expect(tokens.map((t) => t.type)).toEqual([
			"x_off",
			"flip",
			"x_on",
			"flip",
			"x_off",
		]);
	});

	it("predicate rules respect declaration order (first match wins)", async () => {
		// when both predicates would pass, the earlier rule wins.
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { count: { type: "u8", default: 5 } },
					rules: [
						// both gates pass for count=5; the earlier rule wins.
						{
							match: "x",
							token: "first",
							slot_when: { count: { gte: 1 } },
						},
						{
							match: "x",
							token: "second",
							slot_when: { count: { gte: 0 } },
						},
					],
				},
			}),
		);
		const tokens = await decode_tokens("x", compiled);
		expect(tokens.map((t) => t.type)).toEqual(["first"]);
	});

	it("slot_predicate_mask is zero for slot-free states", () => {
		const compiled = compile(
			grammar_with_states({
				root: { rules: [{ match: "a", token: "letter_a" }] },
			}),
		);
		const root_id = compiled.states.get("root")!;
		expect(compiled.slot_predicate_mask![root_id]).toBe(0);
		expect(compiled.predicate_rules!.size).toBe(0);
	});

	it("slot_predicate_mask is set for states with slot_when rules", () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { f: { type: "bool", default: false } },
					rules: [
						{ match: "a", token: "ax", slot_when: { f: true } },
						{ any: true, token: "any" },
					],
				},
			}),
		);
		const root_id = compiled.states.get("root")!;
		expect(compiled.slot_predicate_mask![root_id]).toBe(1);
		const rules_for_root = compiled.predicate_rules!.get(root_id)!;
		expect(rules_for_root.length).toBe(1);
		expect(rules_for_root[0].codes[0]).toBe("a".charCodeAt(0));
		expect(rules_for_root[0].length).toBe(1);
	});

	it("slot-gated any:true matches on ASCII chars not covered by other rules", async () => {
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { armed: { type: "bool", default: false } },
					rules: [
						{ match: "a", token: "letter_a", slot_set: { armed: true } },
						{ any: true, token: "armed_any", slot_when: { armed: true } },
						{ any: true, token: "idle_any" },
					],
				},
			}),
		);
		const tokens = await decode_tokens("?a?", compiled);
		expect(tokens.map((t) => t.type)).toEqual([
			"idle_any",
			"letter_a",
			"armed_any",
		]);
	});

	it("compile error: range matcher combined with slot_when", () => {
		expect(() =>
			compile(
				grammar_with_states({
					root: {
						slots: { f: { type: "bool", default: false } },
						rules: [
							{
								range: [["a", "z"]],
								token: "letter",
								slot_when: { f: true },
							},
						],
					},
				}),
			),
		).toThrow(/combines slot_when with a range matcher/);
	});

	it("two same-first-char multi-char rules with mutually exclusive slot_when work via the bucket loop", async () => {
		// the bucket loop iterates patterns and supports falling through to the
		// next pattern when a slot_when fails. so multi-char patterns with
		// mutually exclusive slot_when work in stage 4.
		const compiled = compile(
			grammar_with_states({
				root: {
					slots: { f: { type: "bool", default: false } },
					rules: [
						{
							match: "ab",
							token: "ab_off",
							slot_when: { f: false },
						},
						{
							match: "ab",
							token: "ab_on",
							slot_when: { f: true },
						},
						{ match: "yy", token: "flip", slot_set: { f: "toggle" } },
						{ any: true, token: "any" },
					],
				},
			}),
		);
		const tokens = await decode_tokens("abyyab", compiled);
		expect(tokens.map((t) => t.type)).toEqual([
			"ab_off",
			"flip",
			"ab_on",
		]);
	});
});
