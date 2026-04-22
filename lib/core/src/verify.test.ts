import { describe, it, expect } from "vitest";
import { verify } from "./verify";
import type { Grammar } from "./types";

describe("verify", () => {
	it("returns no issues for a clean grammar", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ match: '"', state: "string" },
						{ match: "a", token: "letter-a" },
					],
				},
				string: {
					rules: [
						{ match: '"', exit: true },
						{ range: [32, 126], token: "text" },
					],
				},
			},
		};

		expect(verify(grammar)).toEqual([]);
	});

	it("flags a rule that pushes to an undefined state", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ match: "(", state: "nope" },
					],
				},
			},
		};

		const issues = verify(grammar);
		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({
			type: "invalid-transition",
			state: "root",
			rule_index: 0,
			target: "nope",
			from: "rule",
		});
	});

	it("flags a sideways exit to an undefined state", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [{ match: "a", state: "phantom", exit: true }],
				},
			},
		};

		const issues = verify(grammar);
		expect(issues).toContainEqual(
			expect.objectContaining({
				type: "invalid-transition",
				state: "root",
				rule_index: 0,
				target: "phantom",
				from: "rule",
			}),
		);
	});

	it("flags a probe fallback that references an undefined state", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					mode: "probe",
					fallback: "ghost",
					rules: [{ match: "?", token: "qmark" }],
				},
			},
		};

		const issues = verify(grammar);
		expect(issues).toContainEqual(
			expect.objectContaining({
				type: "invalid-transition",
				state: "root",
				target: "ghost",
				from: "fallback",
			}),
		);
	});

	it("flags unused states", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [{ match: "a", token: "letter-a" }],
				},
				orphan: {
					rules: [{ match: "b", token: "letter-b" }],
				},
			},
		};

		const issues = verify(grammar);
		expect(issues).toEqual([
			{
				type: "unused-state",
				state: "orphan",
				message: 'state "orphan" is defined but never referenced',
			},
		]);
	});

	it("does not report the root state as unused", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [{ match: "a", token: "letter-a" }],
				},
			},
		};

		expect(verify(grammar)).toEqual([]);
	});

	it("treats self-referencing states as used", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [{ match: "a", state: "root" }],
				},
			},
		};

		expect(verify(grammar)).toEqual([]);
	});

	it("treats probe fallbacks as references for the unused-state check", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					mode: "probe",
					fallback: "value",
					rules: [{ match: "?", state: "value" }],
				},
				value: {
					rules: [{ range: ["0", "9"], token: "digit" }],
				},
			},
		};

		expect(verify(grammar)).toEqual([]);
	});

	it("reports multiple issues together", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ match: "a", state: "real" },
						{ match: "b", state: "missing" },
					],
				},
				real: {
					rules: [{ match: "c", exit: true }],
				},
				orphan: {
					rules: [{ match: "d", token: "letter-d" }],
				},
			},
		};

		const issues = verify(grammar);
		expect(issues).toHaveLength(2);
		expect(issues).toContainEqual(
			expect.objectContaining({
				type: "invalid-transition",
				state: "root",
				rule_index: 1,
				target: "missing",
				from: "rule",
			}),
		);
		expect(issues).toContainEqual(
			expect.objectContaining({
				type: "unused-state",
				state: "orphan",
			}),
		);
	});

});
