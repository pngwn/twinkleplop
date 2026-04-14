import { describe, expect, it } from "vitest";
import { compile } from "./compiler";
import type { Grammar } from "./types";

function grammar(states: Grammar["states"]): Grammar {
	return { name: "vis", states };
}

describe("slot visibility — accepts well-formed grammars", () => {
	it("a rule reading a slot owned by its own state passes", () => {
		expect(() =>
			compile(
				grammar({
					root: {
						slots: { f: { type: "bool", default: false } },
						rules: [
							{ match: "x", token: "x", slot_when: { f: false } },
						],
					},
				}),
			),
		).not.toThrow();
	});

	it("a descendant referencing an ancestor's slot via qualified name passes", () => {
		expect(() =>
			compile(
				grammar({
					root: {
						slots: { kind: { type: "u8", values: ["a"], default: "a" } },
						rules: [{ match: "(", token: "open", state: "child" }],
					},
					child: {
						rules: [
							{
								match: "x",
								token: "x_a",
								slot_when: { "root.kind": "a" },
							},
							{ match: ")", token: "close", exit: true },
						],
					},
				}),
			),
		).not.toThrow();
	});

	it("a push that initialises a no-default slot via slot_set passes", () => {
		expect(() =>
			compile(
				grammar({
					root: {
						rules: [
							{
								match: "(",
								token: "open",
								state: "child",
								slot_set: { "child.kind": "a" },
							},
						],
					},
					child: {
						slots: { kind: { type: "u8", values: ["a", "b"] } },
						rules: [{ match: "x", token: "x" }],
					},
				}),
			),
		).not.toThrow();
	});

	it("two pushers of the same descendant both with the right ancestor on stack pass", () => {
		expect(() =>
			compile(
				grammar({
					root: {
						slots: { kind: { type: "u8", values: ["a"], default: "a" } },
						rules: [
							{ match: "(", token: "open1", state: "child" },
							{ match: "[", token: "open2", state: "child" },
						],
					},
					child: {
						rules: [
							{
								match: "x",
								token: "x",
								slot_when: { "root.kind": "a" },
							},
							{ match: ")", token: "close", exit: true },
						],
					},
				}),
			),
		).not.toThrow();
	});

	it("sideways transitions correctly track owners across the change", () => {
		// X declares slot s; sideways from X to Y removes X from owners and
		// adds Y. a rule in Y referencing X.s would fail; a rule in Y
		// referencing Y's own slot passes.
		expect(() =>
			compile(
				grammar({
					root: {
						rules: [{ match: "(", token: "open", state: "x_state" }],
					},
					x_state: {
						slots: { sx: { type: "u8", default: 1 } },
						rules: [
							{ match: ">", token: "go", state: "y_state", exit: true },
						],
					},
					y_state: {
						slots: { sy: { type: "u8", default: 2 } },
						rules: [
							{ match: "x", token: "x_y", slot_when: { sy: 2 } },
							{ match: ")", token: "close", exit: true },
						],
					},
				}),
			),
		).not.toThrow();
	});
});

describe("slot visibility — rejects malformed grammars", () => {
	it("a descendant referencing an ancestor's slot when the ancestor is not on the stack fails", () => {
		// y_state is reachable directly from root (no x_state on stack), but
		// y_state's rule references x_state.sx. visibility analysis should
		// flag this.
		expect(() =>
			compile(
				grammar({
					root: {
						rules: [
							{ match: "(", token: "open1", state: "y_state" },
							{ match: "[", token: "open2", state: "x_state" },
						],
					},
					x_state: {
						slots: { sx: { type: "u8", default: 1 } },
						rules: [
							{ match: ">", token: "go", state: "y_state", exit: true },
						],
					},
					y_state: {
						rules: [
							{ match: "x", token: "x", slot_when: { "x_state.sx": 1 } },
						],
					},
				}),
			),
		).toThrow(
			/owning state "x_state" is not on the stack on every path that reaches "y_state"/,
		);
	});

	it("a child reachable both via the slot owner and via a direct push fails", () => {
		// child references owner.kind. owner is a non-root state that
		// declares the slot. child is reachable from owner (owner on stack
		// — fine) AND directly from root (owner NOT on stack — violation).
		expect(() =>
			compile(
				grammar({
					root: {
						rules: [
							{ match: "(", token: "open", state: "owner" },
							{ match: "[", token: "direct", state: "child" },
						],
					},
					owner: {
						slots: { kind: { type: "u8", values: ["a"], default: "a" } },
						rules: [
							{ match: "x", token: "x", state: "child" },
							{ match: ")", token: "close", exit: true },
						],
					},
					child: {
						rules: [
							{
								match: "y",
								token: "y",
								slot_when: { "owner.kind": "a" },
							},
						],
					},
				}),
			),
		).toThrow(/owning state "owner" is not on the stack/);
	});

	it("sideways out of the slot-owning state then access fails", () => {
		// x_state declares sx; sideways from x_state to y_state removes
		// x_state from owners. y_state's rule references x_state.sx, which
		// is no longer on the stack.
		expect(() =>
			compile(
				grammar({
					root: {
						rules: [{ match: "(", token: "open", state: "x_state" }],
					},
					x_state: {
						slots: { sx: { type: "u8", default: 1 } },
						rules: [
							{ match: ">", token: "go", state: "y_state", exit: true },
						],
					},
					y_state: {
						rules: [
							{ match: "x", token: "x", slot_when: { "x_state.sx": 1 } },
						],
					},
				}),
			),
		).toThrow(
			/owning state "x_state" is not on the stack on every path that reaches "y_state"/,
		);
	});
});

describe("slot visibility — slot-free grammars are no-ops", () => {
	it("a grammar with no slots compiles without invoking the analysis", () => {
		expect(() =>
			compile(
				grammar({
					root: {
						rules: [
							{ match: "x", token: "x" },
							{ match: "(", token: "open", state: "inner" },
						],
					},
					inner: {
						rules: [
							{ match: "y", token: "y" },
							{ match: ")", token: "close", exit: true },
						],
					},
				}),
			),
		).not.toThrow();
	});
});
