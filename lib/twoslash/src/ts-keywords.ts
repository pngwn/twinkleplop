// TypeScript-only keyword reclassifier.
import { type TokenizeResult  } from "@twinkleplop/core";

const TS_KEYWORDS = new Set([
	"type",
	"interface",
	"enum",
	"namespace",
	"declare",
	"satisfies",
	"as",
	"readonly",
	"public",
	"private",
	"protected",
	"override",
	"abstract",
	"implements",
	"keyof",
	"infer",
	"is",
	"asserts",
	"unique",
	"module",
	"global",
	"out",
	"in",
]);

export function ts_keyword_reclassifier(input: string, result: TokenizeResult): TokenizeResult {
	const { tokens, token_types } = result;

	const identifier_id = token_types.indexOf("identifier");
	if (identifier_id === -1) return result;

	// ensure a "keyword" entry exists. JS grammar always defines it, but
	// stay defensive so composition with other grammars doesn't blow up.
	let keyword_id = token_types.indexOf("keyword");
	if (keyword_id === -1) {
		keyword_id = token_types.length;
		token_types.push("keyword");
	}

	for (let i = 0; i < tokens.length; i += 3) {
		if (tokens[i] !== identifier_id) continue;
		const start = tokens[i + 1];
		const end = tokens[i + 2];
		if (TS_KEYWORDS.has(input.substring(start, end))) {
			tokens[i] = keyword_id;
		}
	}

	return result;
}
