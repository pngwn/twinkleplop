import { TokenizeResult } from "./types";

// pre-escaped lookup table for common characters
const ESCAPE_TABLE = new Array(128);
for (let i = 0; i < 128; i++) {
	ESCAPE_TABLE[i] = String.fromCharCode(i);
}
ESCAPE_TABLE[38] = "&amp;"; // &
ESCAPE_TABLE[60] = "&lt;"; // <
ESCAPE_TABLE[62] = "&gt;"; // >
ESCAPE_TABLE[34] = "&quot;"; // "
ESCAPE_TABLE[39] = "&#39;"; // '

// pre-create escape check lookup for faster checking (minor improvement)
const NEEDS_ESCAPE = new Uint8Array(128);
NEEDS_ESCAPE[38] = 1;
NEEDS_ESCAPE[60] = 1;
NEEDS_ESCAPE[62] = 1;
NEEDS_ESCAPE[34] = 1;
NEEDS_ESCAPE[39] = 1;

// optimized html generator with selective improvements
export function to_html(
	input: string,
	token_result: TokenizeResult,
	options: { class_name?: string; line_numbers?: boolean } = {}
) {
	const { tokens, token_types } = token_result;
	const { class_name = "highlight", line_numbers = false } = options;

	// estimate output size and use chunked building for large inputs
	const token_count = tokens.length / 3;
	const use_chunking = input.length > 10000; // use chunking for files > 10KB

	if (use_chunking) {
		return to_html_chunked(input, token_result, options);
	}

	// for smaller files, use pre-sized array approach
	// pre-size array based on rough estimation (4 elements per token + overhead)
	const estimated_chunks = token_count * 4 + 10;
	const chunks = new Array(estimated_chunks);
	let chunk_count = 0;

	chunks[chunk_count++] = `<pre class="${class_name}"><code>`;

	let last_end = 0;
	let prev_token_type = null;
	let span_open = false;

	// process tokens with coalescing
	for (let i = 0; i < tokens.length; i += 3) {
		const token_type = token_types[tokens[i]];
		const start = tokens[i + 1];
		const end = tokens[i + 2];

		// handle untokenized content
		if (start > last_end) {
			if (span_open) {
				chunks[chunk_count++] = "</span>";
				span_open = false;
			}
			chunks[chunk_count++] = escape_substring_optimized(input, last_end, start);
			prev_token_type = null;
		}

		// coalesce adjacent tokens of the same type
		if (token_type !== prev_token_type) {
			if (span_open) {
				chunks[chunk_count++] = "</span>";
			}
			chunks[chunk_count++] = `<span class="${token_type}">`;
			span_open = true;
			prev_token_type = token_type;
		}

		// add token content
		chunks[chunk_count++] = escape_substring_optimized(input, start, end);
		last_end = end;
	}

	// close any open span
	if (span_open) {
		chunks[chunk_count++] = "</span>";
	}

	// handle remaining content
	if (last_end < input.length) {
		chunks[chunk_count++] = escape_substring_optimized(
			input,
			last_end,
			input.length
		);
	}

	chunks[chunk_count++] = "</code></pre>";

	return chunks.slice(0, chunk_count).join("");
}

// chunked version for very large files
function to_html_chunked(
	input: string,
	token_result: TokenizeResult,
	options: { class_name?: string } = {}
) {
	const { tokens, token_types } = token_result;
	const { class_name = "highlight" } = options;

	const chunks = [];
	const max_chunk_size = 65536; // 64KB chunks
	let current_chunk = [];
	let chunk_size = 0;

	current_chunk.push(`<pre class="${class_name}"><code>`);
	chunk_size += current_chunk[0].length;

	let last_end = 0;
	let prev_token_type = null;
	let span_open = false;

	// process tokens with batching
	for (let i = 0; i < tokens.length; i += 3) {
		const token_type = token_types[tokens[i]];
		const start = tokens[i + 1];
		const end = tokens[i + 2];

		// skip tiny tokens (like single spaces) if same type as previous
		const token_length = end - start;
		if (token_length === 1 && token_type === prev_token_type) {
			const char = input[start];
			const code = char.charCodeAt(0);
			const escaped =
				code < 128 && ESCAPE_TABLE[code] !== char ? ESCAPE_TABLE[code] : char;
			current_chunk.push(escaped);
			chunk_size += escaped.length;
			last_end = end;

			// flush chunk if too large
			if (chunk_size > max_chunk_size) {
				chunks.push(current_chunk.join(""));
				current_chunk = [];
				chunk_size = 0;
			}
			continue;
		}

		// handle untokenized content
		if (start > last_end) {
			if (span_open) {
				current_chunk.push("</span>");
				chunk_size += 7;
				span_open = false;
			}
			const escaped = escape_substring_optimized(input, last_end, start);
			current_chunk.push(escaped);
			chunk_size += escaped.length;
			prev_token_type = null;
		}

		// change token type if needed
		if (token_type !== prev_token_type) {
			if (span_open) {
				current_chunk.push("</span>");
				chunk_size += 7;
			}
			const open_tag = `<span class="${token_type}">`;
			current_chunk.push(open_tag);
			chunk_size += open_tag.length;
			span_open = true;
			prev_token_type = token_type;
		}

		// add token content
		const escaped = escape_substring_optimized(input, start, end);
		current_chunk.push(escaped);
		chunk_size += escaped.length;
		last_end = end;

		// flush chunk if too large
		if (chunk_size > max_chunk_size) {
			chunks.push(current_chunk.join(""));
			current_chunk = [];
			chunk_size = 0;
		}
	}

	// close any open span
	if (span_open) {
		current_chunk.push("</span>");
	}

	// handle remaining content
	if (last_end < input.length) {
		current_chunk.push(escape_substring_optimized(input, last_end, input.length));
	}

	current_chunk.push("</code></pre>");

	// final flush
	if (current_chunk.length > 0) {
		chunks.push(current_chunk.join(""));
	}

	return chunks.join("");
}

// optimized escape function with early exit for no-escape case
function escape_substring_optimized(input: string, start: number, end: number) {
	// fast path: scan for any characters that need escaping
	let needs_escape = false;
	for (let i = start; i < end; i++) {
		const code = input.charCodeAt(i);
		// keep original OR conditions as they're fastest
		if (
			code === 38 ||
			code === 60 ||
			code === 62 ||
			code === 34 ||
			code === 39
		) {
			needs_escape = true;
			break;
		}
	}

	// if no escaping needed, return substring directly
	if (!needs_escape) {
		return input.substring(start, end);
	}

	// slow path: build escaped string
	let result = "";
	let chunk_start = start;

	for (let i = start; i < end; i++) {
		const code = input.charCodeAt(i);

		// fast path: check if escaping needed
		if (
			code === 38 ||
			code === 60 ||
			code === 62 ||
			code === 34 ||
			code === 39
		) {
			// need escaping: flush previous chunk
			if (i > chunk_start) {
				result += input.substring(chunk_start, i);
			}
			result += ESCAPE_TABLE[code];
			chunk_start = i + 1;
		}
	}

	// add remaining chunk
	if (end > chunk_start) {
		result += input.substring(chunk_start, end);
	}

	return result;
}

// optimized standalone escape_html with early exit
export function escape_html(text: string) {
	const len = text.length;

	// fast path: check if escaping is needed
	let needs_escape = false;
	for (let i = 0; i < len; i++) {
		const code = text.charCodeAt(i);
		if (
			code === 38 ||
			code === 60 ||
			code === 62 ||
			code === 34 ||
			code === 39
		) {
			needs_escape = true;
			break;
		}
	}

	// early exit if no escaping needed
	if (!needs_escape) {
		return text;
	}

	// slow path: build escaped string
	let result = "";
	let chunk_start = 0;

	for (let i = 0; i < len; i++) {
		const code = text.charCodeAt(i);

		if (
			code === 38 ||
			code === 60 ||
			code === 62 ||
			code === 34 ||
			code === 39
		) {
			// need escaping
			if (i > chunk_start) {
				result += text.substring(chunk_start, i);
			}
			result += ESCAPE_TABLE[code];
			chunk_start = i + 1;
		}
	}

	// add remaining
	if (len > chunk_start) {
		result += text.substring(chunk_start, len);
	}

	return result;
}
