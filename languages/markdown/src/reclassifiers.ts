// markdown reclassifier — composition via style stack.
//
// the grammar emits distinct open/close marker tokens for every composing
// inline construct (bold, italic, strike, code, link-text, autolink). this
// reclassifier walks the token stream maintaining a stack of active styles
// and rewrites every token's type to include the active stack as
// space-separated class names. the renderer already splits type strings
// on whitespace when writing `<span class="...">`, so multi-class output
// falls out at zero runtime cost.
//
// algorithm per token:
//   - if the token is a `*-open` marker:    push the style onto the stack,
//                                           emit with the post-push stack
//   - if the token is a `*-close` marker:   emit with the pre-pop stack,
//                                           then pop
//   - otherwise (content or non-style):     emit with the current stack
//                                           plus the token's base type
//
// duplicate classes are removed so a body-state fallback emitting `bold`
// while the stack is `[bold]` produces just `"bold"`, not `"bold bold"`.
// dedup preserves insertion order.
//
// tokens outside any style keep their original type unchanged.

import type { Reclassifier, TokenizeResult } from "@twinkleplop/core";

const STYLE_OPEN: Record<string, string> = {
	"bold-open": "bold",
	"italic-open": "italic",
	"strike-open": "strike",
	"code-open": "code",
	"link-text-open": "link-text",
	"autolink-open": "autolink",
};

const STYLE_CLOSE: Record<string, string> = {
	"bold-close": "bold",
	"italic-close": "italic",
	"strike-close": "strike",
	"code-close": "code",
	"link-text-close": "link-text",
	"autolink-close": "autolink",
};

function compose_type(stack: string[], base: string): string {
	if (stack.length === 0) return base;
	// dedup: if base is already one of the active styles, just use the stack.
	if (stack.indexOf(base) !== -1) return stack.join(" ");
	return `${stack.join(" ")} ${base}`;
}

export const compound_styles: Reclassifier = (
	input: string,
	result: TokenizeResult,
): TokenizeResult => {
	const { tokens, token_types } = result;
	const new_token_types = token_types.slice();
	const type_index = new Map<string, number>();
	for (let i = 0; i < new_token_types.length; i++) {
		type_index.set(new_token_types[i], i);
	}

	const intern = (type_name: string): number => {
		let id = type_index.get(type_name);
		if (id === undefined) {
			id = new_token_types.length;
			new_token_types.push(type_name);
			type_index.set(type_name, id);
		}
		return id;
	};

	const new_tokens = new Uint32Array(tokens.length);
	const stack: string[] = [];
	let last_end = 0;

	for (let i = 0; i < tokens.length; i += 3) {
		const old_type_id = tokens[i];
		const old_type = token_types[old_type_id];
		const start = tokens[i + 1];
		const end = tokens[i + 2];

		// flush the stack if a `\n` appears in the untokenized gap since
		// the previous token. the grammar drops back to block_start on
		// newlines inside inline body states without emitting a close
		// marker, leaking stack frames; this check resets composition
		// state at line boundaries so the next line starts clean.
		if (
			stack.length > 0 &&
			input.indexOf("\n", last_end) !== -1 &&
			input.indexOf("\n", last_end) < start
		) {
			stack.length = 0;
		}

		let new_type: string;
		const open_style = STYLE_OPEN[old_type];
		const close_style = STYLE_CLOSE[old_type];

		if (open_style !== undefined) {
			// if the style is already active, the grammar has leaked a
			// frame somewhere (typically through the link_after_close
			// goto back to inline_content) and this "open" is really
			// meant as a close. pop down to and including the existing
			// entry rather than pushing a duplicate.
			const existing_idx = stack.lastIndexOf(open_style);
			if (existing_idx !== -1) {
				new_type = stack.join(" ");
				stack.length = existing_idx;
			} else {
				stack.push(open_style);
				new_type = stack.join(" ");
			}
		} else if (close_style !== undefined) {
			new_type = stack.join(" ");
			// close the nearest matching open — if the top doesn't match
			// but a further-down entry does, pop everything above it too.
			const idx = stack.lastIndexOf(close_style);
			if (idx !== -1) stack.length = idx;
		} else {
			new_type = compose_type(stack, old_type);
		}

		new_tokens[i] = intern(new_type);
		new_tokens[i + 1] = start;
		new_tokens[i + 2] = end;
		last_end = end;
	}

	return {
		tokens: new_tokens,
		token_types: new_token_types,
	};
};

export const reclassifiers: Reclassifier[] = [compound_styles];
