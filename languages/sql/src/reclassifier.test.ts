// Integration tests for the SQL language pipeline.
//
// These tests use the top-level `language(input)` entry point to verify
// case-insensitive keyword / type / boolean reclassification. The grammar
// alone emits every unquoted word as `identifier`; this post-pass is what
// actually gives a themed renderer keyword colouring.

import { describe, it, expect } from "vitest";
import { language as make_language } from "./index.js";

const language = make_language();

function enrich(input: string) {
	const result = language(input);
	const out: { type: string; value: string; start: number; end: number }[] = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		out.push({
			type: result.token_types[result.tokens[i * 3]],
			value: input.slice(start, end),
			start,
			end,
		});
	}
	return out;
}

function type_of(tokens: ReturnType<typeof enrich>, value: string) {
	return tokens.find((t) => t.value === value)?.type;
}

describe("SQL reclassifier — keywords", () => {
	it("classifies SELECT as keyword regardless of case", () => {
		for (const word of ["SELECT", "select", "Select", "SeLeCt"]) {
			const tokens = enrich(`${word} 1`);
			expect(type_of(tokens, word)).toBe("keyword");
		}
	});

	it("classifies common dml keywords", () => {
		const tokens = enrich(
			"INSERT INTO t VALUES (1); UPDATE t SET a=1; DELETE FROM t",
		);
		for (const w of ["INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "FROM"]) {
			expect(type_of(tokens, w)).toBe("keyword");
		}
	});

	it("classifies control-flow keywords", () => {
		const tokens = enrich(
			"CASE WHEN x THEN 1 ELSE 2 END IF EXISTS (SELECT 1)",
		);
		for (const w of ["CASE", "WHEN", "THEN", "ELSE", "END", "IF", "EXISTS"]) {
			expect(type_of(tokens, w)).toBe("keyword");
		}
	});

	it("classifies join keywords", () => {
		const tokens = enrich("SELECT * FROM a LEFT OUTER JOIN b ON a.id = b.a_id");
		for (const w of ["LEFT", "OUTER", "JOIN", "ON"]) {
			expect(type_of(tokens, w)).toBe("keyword");
		}
	});
});

describe("SQL reclassifier — types", () => {
	it("classifies scalar types", () => {
		const tokens = enrich(
			"DECLARE x INT; y VARCHAR; z BOOLEAN; t TIMESTAMP; j JSONB",
		);
		for (const w of ["INT", "VARCHAR", "BOOLEAN", "TIMESTAMP", "JSONB"]) {
			expect(type_of(tokens, w)).toBe("type");
		}
	});

	it("is case-insensitive for types", () => {
		const tokens = enrich("DECLARE x int; y varchar; z Boolean");
		expect(type_of(tokens, "int")).toBe("type");
		expect(type_of(tokens, "varchar")).toBe("type");
		expect(type_of(tokens, "Boolean")).toBe("type");
	});
});

describe("SQL reclassifier — booleans and null", () => {
	it("classifies TRUE and FALSE as boolean", () => {
		const tokens = enrich("SELECT TRUE, FALSE, true, false");
		expect(type_of(tokens, "TRUE")).toBe("boolean");
		expect(type_of(tokens, "FALSE")).toBe("boolean");
		expect(type_of(tokens, "true")).toBe("boolean");
		expect(type_of(tokens, "false")).toBe("boolean");
	});

	it("classifies NULL and UNKNOWN as boolean-ish", () => {
		const tokens = enrich("SELECT NULL, UNKNOWN, null");
		expect(type_of(tokens, "NULL")).toBe("boolean");
		expect(type_of(tokens, "UNKNOWN")).toBe("boolean");
		expect(type_of(tokens, "null")).toBe("boolean");
	});
});

describe("SQL reclassifier — does not touch non-matches", () => {
	it("plain identifiers stay as identifier", () => {
		const tokens = enrich("SELECT my_col FROM my_table");
		expect(type_of(tokens, "my_col")).toBe("identifier");
		expect(type_of(tokens, "my_table")).toBe("identifier");
	});

	it("quoted identifiers are not reclassified even if they match a keyword", () => {
		const tokens = enrich('SELECT "select" FROM "from"');
		expect(type_of(tokens, '"select"')).toBe("identifier");
		expect(type_of(tokens, '"from"')).toBe("identifier");
		expect(type_of(tokens, "SELECT")).toBe("keyword");
		expect(type_of(tokens, "FROM")).toBe("keyword");
	});

	it("backtick-quoted identifiers are not reclassified", () => {
		const tokens = enrich("SELECT `order` FROM `from`");
		expect(type_of(tokens, "`order`")).toBe("identifier");
		expect(type_of(tokens, "`from`")).toBe("identifier");
	});

	it("bracket-quoted identifiers are not reclassified", () => {
		const tokens = enrich("SELECT [order] FROM [from]");
		expect(type_of(tokens, "[order]")).toBe("identifier");
		expect(type_of(tokens, "[from]")).toBe("identifier");
	});
});

describe("SQL fidelity — function-call promotion", () => {
	function tokens_of(
		input: string,
		options?: Parameters<typeof make_language>[0],
	) {
		const lang = make_language(options);
		const result = lang(input);
		const out: { type: string; value: string }[] = [];
		for (let i = 0; i < result.tokens.length / 3; i++) {
			out.push({
				type: result.token_types[result.tokens[i * 3]],
				value: input.slice(
					result.tokens[i * 3 + 1],
					result.tokens[i * 3 + 2],
				),
			});
		}
		return out;
	}
	const pick = (tokens: ReturnType<typeof tokens_of>, value: string) =>
		tokens.find((t) => t.value === value)?.type;

	it("builtin function calls promote to function", () => {
		const tokens = tokens_of("SELECT COUNT(*), LOWER(name) FROM users");
		expect(pick(tokens, "COUNT")).toBe("function");
		expect(pick(tokens, "LOWER")).toBe("function");
	});

	it("NOW() with no args still promotes", () => {
		const tokens = tokens_of("SELECT NOW()");
		expect(pick(tokens, "NOW")).toBe("function");
	});

	it("plain column reference stays identifier (no paren)", () => {
		const tokens = tokens_of("SELECT username FROM users");
		expect(pick(tokens, "username")).toBe("identifier");
	});

	it("keyword followed by `(` is not caught as function", () => {
		// `SELECT` is already promoted to keyword before function_calls runs,
		// so the `(` predicate (which looks for `identifier`) doesn't fire.
		const tokens = tokens_of("SELECT (x)");
		expect(pick(tokens, "SELECT")).toBe("keyword");
	});

	it("fidelity='low' leaves function calls as identifier", () => {
		const tokens = tokens_of("SELECT COUNT(*) FROM t", { fidelity: "low" });
		expect(pick(tokens, "COUNT")).toBe("identifier");
	});

	it("fidelity allowlist excluding 'function' leaves as identifier", () => {
		const tokens = tokens_of("SELECT COUNT(*) FROM t", {
			fidelity: ["keyword"],
		});
		expect(pick(tokens, "COUNT")).toBe("identifier");
	});
});
