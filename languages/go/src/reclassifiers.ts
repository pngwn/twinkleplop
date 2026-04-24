// Go reclassifier pipeline.
//
// The Go grammar emits richer token types directly (predeclared types as
// `keyword`, predeclared builtins as `function`), so most highlighting work
// is done at lex time. this pipeline layers on identifier-level distinctions
// that a text predicate can resolve cheaply after tokenization.
//
// idiomatic Go prefers MixedCaps (`MaxSize`) over UPPER_SNAKE_CASE for
// constants, but `const MAX_BYTES = 1024` is still common. the UPPER_SNAKE
// promoter handles the latter. pascal_case promotion is deliberately omitted:
// exported names in Go are PascalCase regardless of whether they're types,
// functions, variables, or constants, so a blind case-based promotion overfits.

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

// Function promotion:
//   - declaration names: `func f(...)`, `func F[T any](...)`
//   - call sites: `f(...)`, `pkg.F(...)`, `F[T](...)`
// Go's square-bracket generic call syntax is lexically indistinguishable from
// indexing followed by a call (`table[key](x)`), so the bracket+paren branch
// intentionally favors useful highlighting over parser-level precision.
export const promote_go_functions: Reclassifier = (input, result) => {
	const { tokens, token_types } = result;
	const identifier_id = token_types.indexOf("identifier");
	const punctuation_id = token_types.indexOf("punctuation");
	if (identifier_id < 0 || punctuation_id < 0) return result;
	let function_id = token_types.indexOf("function");
	if (function_id < 0) {
		function_id = token_types.length;
		token_types.push("function");
	}
	const view = make_token_view(input, tokens, token_types);
	const n = view.count;

	const matching_close = (
		start_idx: number,
		open: string,
		close: string,
	): { idx: number; offset: number } | null => {
		if (start_idx < 0 || view.kind_of(start_idx) !== punctuation_id) {
			return null;
		}
		const first = view.text_of(start_idx);
		if (first[0] !== open) return null;
		let depth = 0;
		for (let k = start_idx; k < n; k++) {
			if (view.is_trivia(k)) continue;
			if (view.kind_of(k) !== punctuation_id) continue;
			const text = view.text_of(k);
			for (let offset = 0; offset < text.length; offset++) {
				const ch = text[offset];
				if (ch === open) depth++;
				else if (ch === close) {
					depth--;
					if (depth === 0) return { idx: k, offset: offset + 1 };
				}
			}
		}
		return null;
	};

	const has_open_paren_after = (pos: {
		idx: number;
		offset: number;
	}): boolean => {
		const text = view.text_of(pos.idx);
		if (pos.offset < text.length) return text[pos.offset] === "(";
		const next = view.next_non_trivia(pos.idx + 1);
		return (
			next >= 0 &&
			view.kind_of(next) === punctuation_id &&
			view.text_of(next).startsWith("(")
		);
	};

	const is_function_position = (idx: number): boolean => {
		const next = view.next_non_trivia(idx + 1);
		if (next < 0 || view.kind_of(next) !== punctuation_id) return false;
		const text = view.text_of(next);
		if (text.startsWith("(")) return true;
		if (!text.startsWith("[")) return false;
		const close = matching_close(next, "[", "]");
		return close != null && has_open_paren_after(close);
	};

	for (let i = 0; i < n; i++) {
		if (view.kind_of(i) !== identifier_id) continue;
		if (is_function_position(i)) tokens[i * 3] = function_id;
	}

	return { tokens, token_types };
};

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

// Parameter promotion: after `func name(...)`, `func name[T any](...)`, or
// `func (recv *R) name(...)`, tag declared parameter names. Go permits
// unnamed parameters (`func(T) U`) and shared types (`x, y int`), so this is
// chunk-based rather than "first identifier after every comma".
export const promote_go_parameters: Reclassifier = (input, result) => {
	const { tokens, token_types } = result;
	const identifier_id = token_types.indexOf("identifier");
	const function_id = token_types.indexOf("function");
	const keyword_id = token_types.indexOf("keyword");
	const punctuation_id = token_types.indexOf("punctuation");
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

	const is_name_like = (idx: number): boolean =>
		view.kind_of(idx) === identifier_id ||
		(function_id >= 0 && view.kind_of(idx) === function_id);

	const find_open_paren = (
		from: number,
	): { idx: number; offset: number } | null => {
		if (from < 0) return null;
		let bracket_depth = 0;
		let brace_depth = 0;
		for (let k = from; k < n; k++) {
			if (view.is_trivia(k)) continue;
			if (view.kind_of(k) !== punctuation_id) continue;
			const text = view.text_of(k);
			for (let offset = 0; offset < text.length; offset++) {
				const ch = text[offset];
				if (ch === "[") bracket_depth++;
				else if (ch === "]") bracket_depth = Math.max(0, bracket_depth - 1);
				else if (ch === "{") brace_depth++;
				else if (ch === "}") brace_depth = Math.max(0, brace_depth - 1);
				else if (ch === "(" && bracket_depth === 0 && brace_depth === 0) {
					return { idx: k, offset };
				}
			}
		}
		return null;
	};

	const find_param_open_after_name = (
		name_idx: number,
	): { idx: number; offset: number } | null => {
		const after = view.next_non_trivia(name_idx + 1);
		if (after < 0 || view.kind_of(after) !== punctuation_id) return null;
		return find_open_paren(after);
	};

	const square_has_trailing_type = (
		chunk: number[],
		start_pos: number,
	): boolean => {
		let depth = 0;
		let seen_open = false;
		for (let pos = start_pos; pos < chunk.length; pos++) {
			const idx = chunk[pos];
			if (view.kind_of(idx) !== punctuation_id) continue;
			const text = view.text_of(idx);
			for (let offset = 0; offset < text.length; offset++) {
				const ch = text[offset];
				if (ch === "[") {
					depth++;
					seen_open = true;
				} else if (ch === "]" && depth > 0) {
					depth--;
					if (seen_open && depth === 0) {
						for (let rest = offset + 1; rest < text.length; rest++) {
							const trailing = text[rest];
							if (trailing !== ")" && trailing !== ",") return true;
						}
						return pos < chunk.length - 1;
					}
				}
			}
		}
		return true;
	};

	const has_type_after_first = (chunk: number[]): boolean => {
		if (chunk.length < 2) return false;
		const second = chunk[1];
		if (view.kind_of(second) === punctuation_id) {
			const text = view.text_of(second);
			if (text.startsWith(".")) return false;
			if (text.startsWith("[")) return square_has_trailing_type(chunk, 1);
		}
		return true;
	};

	const promote_parameter_chunks = (chunks: number[][]): void => {
		let pending_names: number[] = [];
		for (const chunk of chunks) {
			if (chunk.length === 0) continue;
			const first = chunk[0];
			if (!is_name_like(first)) {
				pending_names = [];
				continue;
			}
			if (has_type_after_first(chunk)) {
				for (const idx of pending_names) tokens[idx * 3] = parameter_id;
				tokens[first * 3] = parameter_id;
				pending_names = [];
				continue;
			}
			if (chunk.length === 1) {
				pending_names.push(first);
			} else {
				pending_names = [];
			}
		}
	};

	const promote_paren_list = (open: {
		idx: number;
		offset: number;
	}): number => {
		let paren_depth = 1;
		let bracket_depth = 0;
		let brace_depth = 0;
		const chunks: number[][] = [];
		let current: number[] = [];
		let k = open.idx;
		let offset = open.offset + 1;

		while (k < n && paren_depth > 0) {
			if (view.is_trivia(k)) {
				k++;
				offset = 0;
				continue;
			}
			const kind = view.kind_of(k);
			if (kind !== punctuation_id) {
				current.push(k);
				k++;
				offset = 0;
				continue;
			}

			const text = view.text_of(k);
			let include_punctuation = false;
			for (; offset < text.length; offset++) {
				const ch = text[offset];
				if (
					ch === "," &&
					paren_depth === 1 &&
					bracket_depth === 0 &&
					brace_depth === 0
				) {
					if (include_punctuation) current.push(k);
					chunks.push(current);
					current = [];
					include_punctuation = false;
					continue;
				}
				if (ch === "(") {
					paren_depth++;
					include_punctuation = true;
				} else if (ch === ")") {
					paren_depth--;
					if (paren_depth === 0) break;
					include_punctuation = true;
				} else if (ch === "[") {
					bracket_depth++;
					include_punctuation = true;
				} else if (ch === "]") {
					bracket_depth = Math.max(0, bracket_depth - 1);
					include_punctuation = true;
				} else if (ch === "{") {
					brace_depth++;
					include_punctuation = true;
				} else if (ch === "}") {
					brace_depth = Math.max(0, brace_depth - 1);
					include_punctuation = true;
				} else {
					include_punctuation = true;
				}
			}
			if (include_punctuation) current.push(k);
			k++;
			offset = 0;
		}
		if (current.length > 0) chunks.push(current);
		promote_parameter_chunks(chunks);
		return k;
	};

	for (let i = 0; i < n; i++) {
		if (view.is_trivia(i)) continue;
		if (view.kind_of(i) !== keyword_id) continue;
		if (view.text_of(i) !== "func") continue;

		let j = view.next_non_trivia(i + 1);
		if (j < 0) continue;

		if (is_name_like(j)) {
			const param_open = find_param_open_after_name(j);
			if (param_open != null) {
				j = promote_paren_list(param_open);
				i = j - 1;
			}
			continue;
		}

		const first_open = find_open_paren(j);
		if (first_open == null) continue;
		j = promote_paren_list(first_open);

		// If the list is followed by a name and another paren list, the first
		// list was a method receiver and the second list holds real params.
		j = view.next_non_trivia(j);
		if (j >= 0 && is_name_like(j)) {
			const param_open = find_param_open_after_name(j);
			if (param_open != null) {
				j = promote_paren_list(param_open);
			}
		}
		if (j > i) i = j - 1;
	}

	return { tokens, token_types };
};

export const reclassifiers: LanguagePipeline = [
	tag(promote_go_namespaces, ["namespace"]),
	tag(promote_go_parameters, ["parameter"]),
	tag(promote_go_functions, ["function"]),
	tag(promote_go_constants, ["constant"]),
];
