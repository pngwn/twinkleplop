// Merge twinkleplop tokens with twoslash nodes into a single HTML string.
//
// The algorithm is a break-point segment walk:
//
//   1. Partition twoslash nodes into `wrappers` (hover/error/highlight/
//      completion — these decorate a range of text) and `lineAnnotations`
//      (query/tag/error — these render as sibling spans after a line ends).
//   2. Build a sorted set of break points from every token boundary, every
//      wrapper boundary, every newline, and 0 / input.length. Every
//      adjacent pair (segStart, segEnd) is a segment that lies entirely
//      inside at most one token and at most one copy of each wrapper type,
//      so tag nesting is unambiguous.
//   3. Walk segments left-to-right, diffing the active wrapper+token
//      "stack" against the previously-open stack and emitting open/close
//      tags for the difference.
//   4. After any segment whose last char is `\n`, temporarily unwind the
//      stack, emit queued line annotations for the line we just ended,
//      then restore the stack for the next segment.
//
// Output is wrapped in <pre class="highlight twoslash"><code>…</code></pre>
// (className configurable). No CSS is shipped — consumers style the
// twoslash-* classes themselves to turn the popover spans into tooltips
// and the query/error spans into block-level callouts.

import { language } from "./language.js";
import type { Wrapper, LineAnnotation, HighlightOptions } from "./types.js";

import { TwoslashOptions, type TwoslashReturn, type NodeError } from "twoslash";
import type { TokenizeResult } from "@twinkleplop/core";


// Inlined HTML escape — avoids a rebuild of @twinkleplop/core just to
// re-export the identical helper from packages/core/src/generator.ts.
function escape_html(text: string): string {
	let result = "";
	let last_flush = 0;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		let entity: string | null = null;
		if (code === 38) entity = "&amp;";
		else if (code === 60) entity = "&lt;";
		else if (code === 62) entity = "&gt;";
		else if (code === 34) entity = "&quot;";
		else if (code === 39) entity = "&#39;";
		if (entity !== null) {
			if (i > last_flush) result += text.substring(last_flush, i);
			result += entity;
			last_flush = i + 1;
		}
	}
	if (last_flush < text.length) result += text.substring(last_flush);
	return result;
}

/**
 * Tokenize a short TypeScript fragment (a hover's type string, a query's
 * type readout, …) and return raw `<span class="type">…</span>` HTML with
 * no `<pre><code>` wrapper. Used to syntax-highlight tooltip / query
 * payloads the same way the main snippet is highlighted.
 *
 * Twoslash's type strings are valid TypeScript fragments (e.g.
 * `const x: { a: number; b: string }`), so running them through the same
 * `language` function gives consistent colors across code and tooltips.
 */
function highlight_fragment(text: string): string {
	if (!text) return "";
	const { tokens, token_types } = language(text);
	let out = "";
	let last_end = 0;
	for (let i = 0; i < tokens.length; i += 3) {
		const type_id = tokens[i];
		const start = tokens[i + 1];
		const end = tokens[i + 2];
		if (start > last_end) {
			out += escape_html(text.substring(last_end, start));
		}
		out += `<span class="${token_types[type_id]}">${escape_html(
			text.substring(start, end),
		)}</span>`;
		last_end = end;
	}
	if (last_end < text.length) {
		out += escape_html(text.substring(last_end));
	}
	return out;
}

function add_line_annotation(map: Map<number, LineAnnotation[]>, line: number, ann: LineAnnotation) {
	let arr = map.get(line);
	if (!arr) {
		arr = [];
		map.set(line, arr);
	}
	arr.push(ann);
}

/**
 * Line-starts array: lineStarts[n] = offset of the first char of line n.
 * Used to map a char offset back to a 0-indexed line number.
 */
function build_line_starts(input: string): number[] {
	const starts = [0];
	for (let i = 0; i < input.length; i++) {
		if (input.charCodeAt(i) === 10) starts.push(i + 1);
	}
	return starts;
}

function line_for_offset(line_starts: number[], offset: number): number {
	// find the largest index n where line_starts[n] <= offset.
	let lo = 0;
	let hi = line_starts.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (line_starts[mid] <= offset) lo = mid;
		else hi = mid - 1;
	}
	return lo;
}

/**
 * Translate a wrapper descriptor into its `open` / `close` HTML strings.
 * For hovers the close string also carries the popover payload so the
 * whole tooltip structure is baked into a single close event.
 */
function wrapper_tags(w: Wrapper): { open: string; close: string } {
	switch (w.kind) {
		case "hover": {
			const open = `<span class="twoslash-hover"><span class="twoslash-target">`;
			let popover = `<span class="twoslash-popover-type">${highlight_fragment(
				w.text ?? "",
			)}</span>`;
			if (w.docs) {
				popover += `<span class="twoslash-popover-docs">${escape_html(
					w.docs,
				)}</span>`;
			}
			const close = `</span><span class="twoslash-popover">${popover}</span></span>`;
			return { open, close };
		}
		case "error": {
			let attrs = "";
			if (w.code != null) attrs += ` data-error-code="${escape_html(String(w.code))}"`;
			if (w.level) attrs += ` data-error-level="${escape_html(w.level)}"`;
			return {
				open: `<span class="twoslash-error"${attrs}>`,
				close: `</span>`,
			};
		}
		case "highlight": {
			const attr = w.text
				? ` data-highlight-text="${escape_html(w.text)}"`
				: "";
			return {
				open: `<span class="twoslash-highlight"${attr}>`,
				close: `</span>`,
			};
		}
		case "completion": {
			const prefix_attr = w.prefix
				? ` data-prefix="${escape_html(w.prefix)}"`
				: "";
			let inner = "";
			if (Array.isArray(w.completions) && w.completions.length > 0) {
				inner =
					`<span class="twoslash-completions">` +
					w.completions
						.map(
							(c) =>
								`<span class="twoslash-completion-entry"${
									c.kind ? ` data-kind="${escape_html(c.kind)}"` : ""
								}>${escape_html(c.name)}</span>`,
						)
						.join("") +
					`</span>`;
			}
			return {
				open: `<span class="twoslash-completion"${prefix_attr}>`,
				close: `${inner}</span>`,
			};
		}
	}
	return { open: "", close: "" };
}

function render_line_annotation(ann: LineAnnotation) {
	switch (ann.kind) {
		case "query": {
			let out = `<span class="twoslash-query"><span class="twoslash-query-type">${highlight_fragment(
				ann.text ?? "",
			)}</span>`;
			if (ann.docs) {
				out += `<span class="twoslash-query-docs">${escape_html(ann.docs)}</span>`;
			}
			out += `</span>`;
			return out;
		}
		case "error-line": {
			let attrs = "";
			if (ann.code != null)
				attrs += ` data-error-code="${escape_html(String(ann.code))}"`;
			if (ann.level) attrs += ` data-error-level="${escape_html(ann.level)}"`;
			return `<span class="twoslash-error-line"${attrs}>${escape_html(
				ann.text ?? "",
			)}</span>`;
		}
		case "tag": {
			return `<span class="twoslash-tag" data-tag-name="${escape_html(
				ann.name,
			)}">${escape_html(ann.text ?? "")}</span>`;
		}
	}
	return "";
}


export function render(input: string, token_result: TokenizeResult, twoslash_result: TwoslashReturn, options: HighlightOptions = {}) {
	const { class_name = "highlight twoslash" } = options;
	const { tokens, token_types } = token_result;
	const nodes = twoslash_result.nodes ?? [];

	// -- Partition nodes --------------------------------------------------
	const wrappers: Wrapper[] = [];
	const line_annotations: Map<number, LineAnnotation[]> = new Map();

	for (const node of nodes) {
		const start = node.start;
		const end = node.start + node.length;
		switch (node.type) {
			case "hover":
				wrappers.push({
					start,
					end,
					kind: "hover",
					text: node.text,
					docs: node.docs,
				});
        break;
			case "error":
				wrappers.push({
					start,
					end,
					kind: "error",
					code: node.code,
					level: node.level,
				});
				add_line_annotation(line_annotations, node.line, {
					kind: "error-line",
					text: node.text,
					code: node.code,
					level: node.level,
				});
				break;
			case "highlight":
				wrappers.push({
					start,
					end,
					kind: "highlight",
					text: node.text,
				});
				break;
			case "completion":
				wrappers.push({
					start,
					end,
					kind: "completion",
					prefix: node.completionsPrefix,
					completions: node.completions,
				});
				break;
			case "query":
				add_line_annotation(line_annotations, node.line, {
					kind: "query",
					text: node.text,
					docs: node.docs,
				});
				break;
			case "tag":
				add_line_annotation(line_annotations, node.line, {
					kind: "tag",
					name: node.name,
					text: node.text,
				});
				break;
		}
	}

	// Sort wrappers: start asc, then length desc (so wider containers become
	// outer when nesting). This order is the stable outer-to-inner order
	// used throughout the walk.
	wrappers.sort((a, b) => a.start - b.start || b.end - a.end);

	// -- Break points -----------------------------------------------------
	const break_set = new Set<number>();
	break_set.add(0);
	break_set.add(input.length);
	for (let i = 0; i < tokens.length; i += 3) {
		break_set.add(tokens[i + 1]);
		break_set.add(tokens[i + 2]);
	}
	for (const w of wrappers) {
		break_set.add(w.start);
		break_set.add(w.end);
	}
	for (let i = 0; i < input.length; i++) {
		if (input.charCodeAt(i) === 10) break_set.add(i + 1);
	}
	const breaks = [...break_set].sort((a, b) => a - b);

	const line_starts = build_line_starts(input);

	// -- Walk segments ----------------------------------------------------
	const out: string[] = [];
	out.push(`<pre class="${escape_html(class_name)}"><code>`);


	let stack: { ref: Wrapper; close: string }[] = [];
	let current_token_type: string | null = null;
	let token_cursor = 0;

	for (let bi = 0; bi < breaks.length - 1; bi++) {
		const seg_start = breaks[bi];
		const seg_end = breaks[bi + 1];
		if (seg_start === seg_end) continue;

		// Advance token cursor past any tokens that end at/before segStart.
		while (
			token_cursor < tokens.length &&
			tokens[token_cursor + 2] <= seg_start
		) {
			token_cursor += 3;
		}
		let seg_token_type: string | null = null;
		if (
			token_cursor < tokens.length &&
			tokens[token_cursor + 1] <= seg_start &&
			tokens[token_cursor + 2] >= seg_end
		) {
			seg_token_type = token_types[tokens[token_cursor]];
		}

		// Active wrappers: those whose range fully contains [segStart, segEnd).
		const active_wrappers: Wrapper[] = [];
		for (const w of wrappers) {
			if (w.start > seg_start) break;
			if (w.start <= seg_start && w.end >= seg_end) active_wrappers.push(w);
		}

		// Longest common prefix between current stack and target stack.
		let common = 0;
		while (
			common < stack.length &&
			common < active_wrappers.length &&
			stack[common].ref === active_wrappers[common]
		) {
			common++;
		}

		// Close innermost token span first (it nests inside all wrappers).
		if (
			current_token_type !== null &&
			(common < stack.length || seg_token_type !== current_token_type)
		) {
			out.push("</span>");
			current_token_type = null;
		}

		// Close wrappers above the common prefix.
    while (stack.length > common) out.push(stack.pop()!.close);


		// Open new wrappers after the common prefix.
		while (stack.length < active_wrappers.length) {
			const w = active_wrappers[stack.length];
			const { open, close } = wrapper_tags(w);
			out.push(open);
			stack.push({ ref: w, close });
		}

		// Open the token span (if we don't already have one of the same type).
		if (seg_token_type !== null && current_token_type !== seg_token_type) {
			out.push(`<span class="${seg_token_type}">`);
			current_token_type = seg_token_type;
		}

		// Emit the escaped segment text.
		out.push(escape_html(input.substring(seg_start, seg_end)));

		// After a newline, flush line annotations for the line we just ended.
		if (input.charCodeAt(seg_end - 1) === 10) {
			const ended_line = line_for_offset(line_starts, seg_end - 1);
			const anns = line_annotations.get(ended_line);
			if (anns && anns.length > 0) {
				// Unwind the stack temporarily so annotations sit at root level.
				if (current_token_type !== null) {
					out.push("</span>");
					current_token_type = null;
				}
				const saved = stack.slice();
				while (stack.length) out.push(stack.pop()!.close);

				for (const ann of anns) out.push(render_line_annotation(ann));
				// Restore the stack for subsequent segments.
				for (const entry of saved) {
					const { open, close } = wrapper_tags(entry.ref);
					out.push(open);
					stack.push({ ref: entry.ref, close });
				}
			}
		}
	}

	// -- Drain ------------------------------------------------------------
	if (current_token_type !== null) out.push("</span>");
	while (stack.length) out.push(stack.pop()!.close);

	out.push(`</code></pre>`);

	return out.join("");
}
