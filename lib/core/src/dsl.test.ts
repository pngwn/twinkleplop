import { describe, test, expect } from "vitest";
import {
	ALNUM,
	DIGIT,
	HEX,
	LETTER,
	LOWER,
	UPPER,
	enter,
	fallback,
	goto,
	keyword,
	leave,
	match,
	on,
	range,
	set_slots,
	to,
	when_slots,
	within,
} from "./dsl";

// ---------------------------------------------------------------------------
// Transition helpers
// ---------------------------------------------------------------------------

describe("transition helpers", () => {
	test("enter produces a push transition", () => {
		expect(enter("foo")).toEqual({ state: "foo" });
	});

	test("goto produces a sideways transition", () => {
		expect(goto("foo")).toEqual({ state: "foo", exit: true });
	});

	test("leave produces a pop transition", () => {
		expect(leave()).toEqual({ exit: true });
	});

	test("to with a state name returns a sideways transition", () => {
		expect(to("foo")).toEqual({ state: "foo", exit: true });
	});

	test("to with null returns an empty object (stay in state)", () => {
		expect(to(null)).toEqual({});
	});

	test("to with undefined returns an empty object", () => {
		expect(to()).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// range tag and pre-built classes
// ---------------------------------------------------------------------------

describe("range and pre-built character classes", () => {
	test("range tags carry pairs and an __range marker", () => {
		const r = range([["a", "z"]]);
		expect(r.__range).toBe(true);
		expect(r.pairs).toEqual([["a", "z"]]);
	});

	test("LETTER is lower + upper", () => {
		expect(LETTER.pairs).toEqual([
			["a", "z"],
			["A", "Z"],
		]);
	});

	test("LOWER and UPPER are each a single pair", () => {
		expect(LOWER.pairs).toEqual([["a", "z"]]);
		expect(UPPER.pairs).toEqual([["A", "Z"]]);
	});

	test("DIGIT is 0-9", () => {
		expect(DIGIT.pairs).toEqual([["0", "9"]]);
	});

	test("ALNUM is letters + digits", () => {
		expect(ALNUM.pairs).toEqual([
			["a", "z"],
			["A", "Z"],
			["0", "9"],
		]);
	});

	test("HEX is digits + a-f + A-F", () => {
		expect(HEX.pairs).toEqual([
			["0", "9"],
			["a", "f"],
			["A", "F"],
		]);
	});
});

// ---------------------------------------------------------------------------
// match factory
// ---------------------------------------------------------------------------

describe("match factory", () => {
	test("single string produces scalar match field", () => {
		expect(match("foo", "bar")).toEqual({ match: "foo", token: "bar" });
	});

	test("multiple strings produce an array match field", () => {
		expect(match(["a", "b"], "t")).toEqual({
			match: ["a", "b"],
			token: "t",
		});
	});

	test("single range tag produces a range field", () => {
		expect(match(DIGIT, "number")).toEqual({
			token: "number",
			range: [["0", "9"]],
		});
	});

	test("mixed strings and range produce both match and range", () => {
		expect(match(["_", "$", LETTER], "identifier")).toEqual({
			match: ["_", "$"],
			range: [
				["a", "z"],
				["A", "Z"],
			],
			token: "identifier",
		});
	});

	test("transition options are merged in", () => {
		expect(match("x", "t", goto("next"))).toEqual({
			match: "x",
			token: "t",
			state: "next",
			exit: true,
		});
	});

	test("to(null) transition is a no-op", () => {
		expect(match("x", "t", to(null))).toEqual({ match: "x", token: "t" });
	});

	test("multiple range tags flatten into one range array", () => {
		expect(match([LOWER, UPPER], "letter")).toEqual({
			token: "letter",
			range: [
				["a", "z"],
				["A", "Z"],
			],
		});
	});
});

// ---------------------------------------------------------------------------
// on (token-less match)
// ---------------------------------------------------------------------------

describe("on (token-less match)", () => {
	test("produces a rule without a token field", () => {
		const rule = on(["_", "$", LETTER], goto("identifier_probe"));
		expect(rule).toEqual({
			match: ["_", "$"],
			range: [
				["a", "z"],
				["A", "Z"],
			],
			state: "identifier_probe",
			exit: true,
		});
		expect(rule.token).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// keyword
// ---------------------------------------------------------------------------

describe("keyword helper", () => {
	test("produces a boundary-checked keyword rule by default", () => {
		expect(keyword(["if", "else"])).toEqual({
			match: ["if", "else"],
			boundary: true,
			token: "keyword",
		});
	});

	test("transition overrides flow through", () => {
		expect(keyword(["return"], goto("regex_allow"))).toEqual({
			match: ["return"],
			boundary: true,
			token: "keyword",
			state: "regex_allow",
			exit: true,
		});
	});

	test("custom token name", () => {
		expect(keyword(["true", "false"], {}, "boolean")).toEqual({
			match: ["true", "false"],
			boundary: true,
			token: "boolean",
		});
	});
});

// ---------------------------------------------------------------------------
// within
// ---------------------------------------------------------------------------

describe("within helper", () => {
	test("plain comment — no escape, no multiline", () => {
		expect(within("//", "\n", "comment")).toEqual({
			match_within: { start: "//", end: "\n" },
			token: "comment",
		});
	});

	test("string with escape and multiline", () => {
		expect(
			within('"', '"', "string", { escape: "\\", multiline: true }),
		).toEqual({
			match_within: {
				start: '"',
				end: '"',
				escape: "\\",
				multiline: true,
			},
			token: "string",
		});
	});
});

// ---------------------------------------------------------------------------
// fallback
// ---------------------------------------------------------------------------

describe("fallback helper", () => {
	test("bare fallback is any: true", () => {
		expect(fallback()).toEqual({ any: true });
	});

	test("fallback with a token", () => {
		expect(fallback({ token: "regex" })).toEqual({
			any: true,
			token: "regex",
		});
	});

	test("fallback with a transition", () => {
		expect(fallback(goto("division"))).toEqual({
			any: true,
			state: "division",
			exit: true,
		});
	});

	test("fallback with leave()", () => {
		expect(fallback(leave())).toEqual({ any: true, exit: true });
	});
});

// ---------------------------------------------------------------------------
// Slot helpers
// ---------------------------------------------------------------------------

describe("when_slots", () => {
	test("wraps conditions in a slot_when partial rule", () => {
		expect(when_slots({ kind: "class" })).toEqual({
			slot_when: { kind: "class" },
		});
	});

	test("accepts qualified names and structured comparators", () => {
		expect(
			when_slots({
				"member_body.kind": "interface",
				"class_body.field_count": { gt: 0 },
			}),
		).toEqual({
			slot_when: {
				"member_body.kind": "interface",
				"class_body.field_count": { gt: 0 },
			},
		});
	});

	test("composes with enter via spread", () => {
		expect({
			...enter("type_annotation"),
			...when_slots({ "member_body.kind": "class" }),
		}).toEqual({
			state: "type_annotation",
			slot_when: { "member_body.kind": "class" },
		});
	});
});

describe("set_slots", () => {
	test("wraps updates in a slot_set partial rule", () => {
		expect(set_slots({ seen_field: true })).toEqual({
			slot_set: { seen_field: true },
		});
	});

	test("accepts inc/dec/toggle operators and qualified names", () => {
		expect(
			set_slots({
				"class_body.field_count": { inc: 1 },
				"class_body.seen_field": "toggle",
			}),
		).toEqual({
			slot_set: {
				"class_body.field_count": { inc: 1 },
				"class_body.seen_field": "toggle",
			},
		});
	});

	test("composes with enter and when_slots via spread", () => {
		expect({
			...enter("member_body"),
			...when_slots({ "outer.kind": "class" }),
			...set_slots({ "outer.field_count": { inc: 1 } }),
		}).toEqual({
			state: "member_body",
			slot_when: { "outer.kind": "class" },
			slot_set: { "outer.field_count": { inc: 1 } },
		});
	});
});
