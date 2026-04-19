import { TokenizeResult } from "./types";

const ESCAPE_TABLE = new Array(128);
for (let i = 0; i < 128; i++) {
	ESCAPE_TABLE[i] = String.fromCharCode(i);
}
ESCAPE_TABLE[38] = "&amp;";
ESCAPE_TABLE[60] = "&lt;";
ESCAPE_TABLE[62] = "&gt;";
ESCAPE_TABLE[34] = "&quot;";
ESCAPE_TABLE[39] = "&#39;";

export function to_html(
	input: string,
	token_result: TokenizeResult,
	options: { class_name?: string; line_numbers?: boolean } = {}
) {
	const { tokens, token_types } = token_result;
	const { class_name = "twinkleplop", line_numbers = false } = options;

	const out: string[] = [];
	out.push(`<pre class="${class_name}"><code>`);

	let line_no = 1;
	let open_class: string | null = null;

	out.push(open_line(line_no, line_numbers));

	function close_span() {
		if (open_class !== null) {
			out.push("</span>");
			open_class = null;
		}
	}

	function ensure_span(cls: string | null) {
		if (cls === open_class) return;
		close_span();
		if (cls !== null) {
			out.push(`<span class="tok ${cls}">`);
			open_class = cls;
		}
	}

	function emit_range(start: number, end: number, cls: string | null) {
		if (start >= end) return;
		let chunk_start = start;
		for (let i = start; i < end; i++) {
			if (input.charCodeAt(i) !== 10) continue; // '\n'
			if (i > chunk_start) {
				ensure_span(cls);
				out.push(escape_substring_optimized(input, chunk_start, i));
			}
			close_span();
			out.push("</span>\n");
			line_no++;
			out.push(open_line(line_no, line_numbers));
			chunk_start = i + 1;
		}
		if (end > chunk_start) {
			ensure_span(cls);
			out.push(escape_substring_optimized(input, chunk_start, end));
		}
	}

	let last_end = 0;
	for (let i = 0; i < tokens.length; i += 3) {
		const cls = token_types[tokens[i]];
		const start = tokens[i + 1];
		const end = tokens[i + 2];

		if (start > last_end) emit_range(last_end, start, null);
		emit_range(start, end, cls);
		last_end = end;
	}

	if (last_end < input.length) emit_range(last_end, input.length, null);

	close_span();
	out.push("</span>");
	out.push("</code></pre>");

	return out.join("");
}

function open_line(n: number, line_numbers: boolean) {
	if (line_numbers) return `<span class="l"><span class="ln">${n}</span>`;
	return `<span class="l">`;
}

function escape_substring_optimized(input: string, start: number, end: number) {
	let needs_escape = false;
	for (let i = start; i < end; i++) {
		const code = input.charCodeAt(i);
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

	if (!needs_escape) return input.substring(start, end);

	let result = "";
	let chunk_start = start;
	for (let i = start; i < end; i++) {
		const code = input.charCodeAt(i);
		if (
			code === 38 ||
			code === 60 ||
			code === 62 ||
			code === 34 ||
			code === 39
		) {
			if (i > chunk_start) result += input.substring(chunk_start, i);
			result += ESCAPE_TABLE[code];
			chunk_start = i + 1;
		}
	}
	if (end > chunk_start) result += input.substring(chunk_start, end);
	return result;
}

export function escape_html(text: string) {
	const len = text.length;

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

	if (!needs_escape) return text;

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
			if (i > chunk_start) result += text.substring(chunk_start, i);
			result += ESCAPE_TABLE[code];
			chunk_start = i + 1;
		}
	}
	if (len > chunk_start) result += text.substring(chunk_start, len);
	return result;
}
