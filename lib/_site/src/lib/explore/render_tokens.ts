// mirrors `@twinkleplop/core`'s TokenizeResult; declared locally because the
// package ships no .d.ts and the named type re-export fails to resolve.
export interface tokenize_result {
	tokens: Uint32Array;
	token_types: string[];
}

const AMP = 38;
const LT = 60;
const GT = 62;
const QUOT = 34;
const APOS = 39;

function needs_escape(code: number): boolean {
	return code === AMP || code === LT || code === GT || code === QUOT || code === APOS;
}

function escape_char(code: number): string {
	if (code === AMP) return "&amp;";
	if (code === LT) return "&lt;";
	if (code === GT) return "&gt;";
	if (code === QUOT) return "&quot;";
	return "&#39;";
}

function escape_range(input: string, start: number, end: number): string {
	let saw_special = false;
	for (let i = start; i < end; i++) {
		if (needs_escape(input.charCodeAt(i))) {
			saw_special = true;
			break;
		}
	}
	if (!saw_special) return input.substring(start, end);

	let out = "";
	let chunk_start = start;
	for (let i = start; i < end; i++) {
		const code = input.charCodeAt(i);
		if (needs_escape(code)) {
			if (i > chunk_start) out += input.substring(chunk_start, i);
			out += escape_char(code);
			chunk_start = i + 1;
		}
	}
	if (end > chunk_start) out += input.substring(chunk_start, end);
	return out;
}

// walks the packed token triplets plus untokenized gaps in the source,
// emitting one html string per source line. mirrors `to_html`'s
// span-coalescing and gap handling so no whitespace is dropped. each line
// returned is ready to be inserted with `{@html ...}`.
export function to_lines_html(
	source: string,
	result: tokenize_result | undefined,
): string[] {
	if (!source) return [""];
	if (!result) {
		// fall back to plain escaped source split by newline.
		return source.split("\n").map((l) => escape_range(l, 0, l.length));
	}

	const tokens = result.tokens;
	const types = result.token_types;
	const lines: string[][] = [[]];

	let open_class: string | null = null;

	function push_to_current(html: string) {
		lines[lines.length - 1].push(html);
	}

	function close_span_if_open() {
		if (open_class !== null) {
			push_to_current("</span>");
			open_class = null;
		}
	}

	function ensure_span(cls: string) {
		if (open_class === cls) return;
		close_span_if_open();
		push_to_current(`<span class="tok tok--${cls}">`);
		open_class = cls;
	}

	// emits a run of source (start..end] into the current line buffer,
	// wrapping any newlines by closing the open span, starting a new line,
	// and reopening the span on that line so classes never bleed across.
	function emit_range(start: number, end: number, cls: string | null) {
		if (start >= end) return;
		if (cls === null) close_span_if_open();
		else ensure_span(cls);

		let chunk_start = start;
		for (let i = start; i < end; i++) {
			if (source.charCodeAt(i) !== 10) continue; // '\n'
			if (i > chunk_start) {
				push_to_current(escape_range(source, chunk_start, i));
			}
			close_span_if_open();
			lines.push([]);
			if (cls !== null) ensure_span(cls);
			chunk_start = i + 1;
		}
		if (end > chunk_start) {
			push_to_current(escape_range(source, chunk_start, end));
		}
	}

	let last_end = 0;
	for (let i = 0; i < tokens.length; i += 3) {
		const type = types[tokens[i]] ?? "text";
		const start = tokens[i + 1];
		const end = tokens[i + 2];

		if (start > last_end) {
			emit_range(last_end, start, null);
		}
		emit_range(start, end, type);
		last_end = end;
	}

	if (last_end < source.length) {
		emit_range(last_end, source.length, null);
	}

	close_span_if_open();

	return lines.map((parts) => parts.join(""));
}
