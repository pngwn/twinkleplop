// Go reclassifier pipeline.
//
// The Go grammar emits richer token types directly (predeclared types as
// `keyword`, predeclared builtins as `function`), so most highlighting work
// is done at lex time. this pipeline layers on identifier-level distinctions
// that a text predicate can resolve cheaply after tokenization.
//
// idiomatic Go prefers MixedCaps (`MaxSize`) over UPPER_SNAKE_CASE for
// constants, but `const MAX_BYTES = 1024` is still common. the UPPER_SNAKE
// promoter handles the latter. pascal_case and function-call promotion are
// deliberately omitted: exported names in Go are PascalCase regardless of
// whether they're types, functions, variables, or constants, so a blind
// case-based promotion overfits. future contextual passes can tighten
// this up.

import {
	make_token_view,
	promote_by_upper_snake_case,
	tag,
} from "@twinkleplop/core";
import type { LanguagePipeline, Reclassifier } from "@twinkleplop/core";

export const promote_go_constants: Reclassifier = promote_by_upper_snake_case(
	"identifier",
	"constant",
);

// namespace promotion for Go package declarations and aliased imports:
//   - `package foo`               → foo = namespace
//   - `import f "fmt"`            → f = namespace  (aliased import)
//   - `import ( f "fmt"; x "os" )` → f, x = namespace
// un-aliased imports `import "fmt"` use a string literal so there's no
// identifier to promote. use-site package references (`fmt.Println`) need
// scope tracking and are left as identifier.
export const promote_go_namespaces: Reclassifier = (input, result) => {
	const { tokens, token_types } = result;
	const identifier_id = token_types.indexOf("identifier");
	const keyword_id = token_types.indexOf("keyword");
	const punctuation_id = token_types.indexOf("punctuation");
	const string_id = token_types.indexOf("string");
	if (identifier_id < 0 || keyword_id < 0) return result;
	let namespace_id = token_types.indexOf("namespace");
	if (namespace_id < 0) {
		namespace_id = token_types.length;
		token_types.push("namespace");
	}
	const view = make_token_view(input, tokens, token_types);
	const n = view.count;

	for (let i = 0; i < n; i++) {
		if (view.is_trivia(i)) continue;
		if (view.kind_of(i) !== keyword_id) continue;
		const kw = view.text_of(i);

		// `package X` — the next identifier is the package name.
		if (kw === "package") {
			const j = view.next_non_trivia(i + 1);
			if (j >= 0 && view.kind_of(j) === identifier_id) {
				tokens[j * 3] = namespace_id;
			}
			continue;
		}

		// `import` — could be single `import "path"`, aliased
		// `import alias "path"`, or grouped `import ( ... )`. scan through
		// the spec block(s), promoting any identifier that is immediately
		// followed by a string literal (the import path). stop at the end
		// of the statement: the closing `)` for grouped, or newline/`;`
		// for single-line forms.
		if (kw === "import" && string_id >= 0 && punctuation_id >= 0) {
			let j = view.next_non_trivia(i + 1);
			let in_group = false;
			if (
				j >= 0 &&
				view.kind_of(j) === punctuation_id &&
				view.text_of(j) === "("
			) {
				in_group = true;
				j = view.next_non_trivia(j + 1);
			}
			while (j >= 0 && j < n) {
				const k = view.kind_of(j);
				const t = view.text_of(j);
				if (k === punctuation_id && t === ")") break;
				if (k === punctuation_id && t === ";") {
					if (!in_group) break;
					j = view.next_non_trivia(j + 1);
					continue;
				}
				// alias form: identifier immediately followed by a string
				// literal (skipping trivia).
				if (k === identifier_id) {
					const after = view.next_non_trivia(j + 1);
					if (after >= 0 && view.kind_of(after) === string_id) {
						tokens[j * 3] = namespace_id;
						j = view.next_non_trivia(after + 1);
						continue;
					}
					// lone identifier (no string follows) — not an import
					// alias; stop for this statement when not grouped.
					if (!in_group) break;
				}
				if (k === string_id) {
					// un-aliased path; move past it.
					j = view.next_non_trivia(j + 1);
					continue;
				}
				// anything else inside a group (newlines are trivia): skip;
				// outside a group, end the statement.
				if (in_group) {
					j++;
				} else {
					break;
				}
			}
		}
	}

	return { tokens, token_types };
};

// parameter promotion: after `func name(...)` or `func (recv *R) name(...)`
// tag identifiers in parameter position. the first identifier after `(` or
// `,` at depth 1 is the param name; Go's `x, y int` syntax works because
// each comma resets expect_param. method receivers (the `recv` in
// `func (recv *R) Method(...)`) are also promoted since they are a
// self-parameter semantically.
export const promote_go_parameters: Reclassifier = (input, result) => {
	const { tokens, token_types } = result;
	const identifier_id = token_types.indexOf("identifier");
	const keyword_id = token_types.indexOf("keyword");
	const punctuation_id = token_types.indexOf("punctuation");
	const operator_id = token_types.indexOf("operator");
	if (identifier_id < 0 || keyword_id < 0 || punctuation_id < 0) {
		return result;
	}
	let parameter_id = token_types.indexOf("parameter");
	if (parameter_id < 0) {
		parameter_id = token_types.length;
		token_types.push("parameter");
	}
	const view = make_token_view(input, tokens, token_types);
	const n = view.count;

	const promote_paren_list = (open_idx: number): number => {
		let depth = 1;
		let expect_param = true;
		let k = open_idx + 1;
		while (k < n && depth > 0) {
			if (view.is_trivia(k)) {
				k++;
				continue;
			}
			const kind = view.kind_of(k);
			const t = view.text_of(k);
			if (kind === punctuation_id) {
				for (const ch of t) {
					if (ch === "(" || ch === "[" || ch === "{") depth++;
					else if (ch === ")" || ch === "]" || ch === "}") {
						depth--;
						if (depth === 0) break;
					} else if (ch === "," && depth === 1) {
						expect_param = true;
					}
				}
				k++;
				continue;
			}
			if (depth === 1 && expect_param) {
				// skip pointer `*` and variadic `...` qualifiers.
				if (
					kind === operator_id &&
					(t === "*" || t === "..." || t === "&")
				) {
					k++;
					continue;
				}
				if (kind === identifier_id) {
					tokens[k * 3] = parameter_id;
					expect_param = false;
				} else {
					expect_param = false;
				}
			}
			k++;
		}
		return k;
	};

	for (let i = 0; i < n; i++) {
		if (view.is_trivia(i)) continue;
		if (view.kind_of(i) !== keyword_id) continue;
		if (view.text_of(i) !== "func") continue;

		let j = view.next_non_trivia(i + 1);
		// optional method receiver `(recv *R)` — promote names inside, then
		// advance past it.
		if (
			j >= 0 &&
			view.kind_of(j) === punctuation_id &&
			view.text_of(j).startsWith("(")
		) {
			j = promote_paren_list(j);
			j = view.next_non_trivia(j);
		}
		// optional function name.
		if (j >= 0 && view.kind_of(j) === identifier_id) {
			j = view.next_non_trivia(j + 1);
		}
		// parameter list.
		if (
			j >= 0 &&
			view.kind_of(j) === punctuation_id &&
			view.text_of(j).startsWith("(")
		) {
			j = promote_paren_list(j);
		}
		i = j - 1;
	}

	return { tokens, token_types };
};

export const reclassifiers: LanguagePipeline = [
	tag(promote_go_constants, ["constant"]),
	tag(promote_go_namespaces, ["namespace"]),
	tag(promote_go_parameters, ["parameter"]),
];
