<script lang="ts">
	import { language as ts_language } from "@twinkleplop/typescript";
	import "@twinkleplop/theme-github/dark";
	import { onMount } from "svelte";
	import { measure } from "$lib/explore/measure";


	type tokenize_result = { tokens: Uint32Array; token_types: string[] };
	type language_factory = () => (src: string) => tokenize_result;

	const tokenize = (ts_language as unknown as language_factory)({
	 fidelity: 'high'
	});

	let {
		initial = `function greet(name: string) {
	return \`hello, \${name}!\`;
}

const msg = greet("world");
console.log(msg);`,
		theme_label = "github-dark · typescript",
	}: {
		initial?: string;
		theme_label?: string;
	} = $props();

	let pad: HTMLPreElement | undefined = $state();
	let token_count = $state(0);
	let line_count = $state(0);
	let parse_ms = $state(0);
	let highlight_supported = $state(true);

	// prefix avoids clashing with site-wide `::highlight(keyword)` rules in
	// highlight-styles.css. only one MiniLab should be mounted per page; if
	// that ever changes, switch to per-instance names plus adoptedStyleSheets.
	function hl_name(token_type: string) {
		return `mini_${token_type}`;
	}

	function flatten_to_text(el: HTMLElement): string {
		return el.innerText.replace(/\r\n?/g, "\n");
	}

	function get_caret_offset(el: HTMLElement): number {
		const sel = document.getSelection();
		if (!sel || sel.rangeCount === 0) return 0;
		const range = sel.getRangeAt(0).cloneRange();
		const pre = document.createRange();
		pre.selectNodeContents(el);
		pre.setEnd(range.endContainer, range.endOffset);
		return pre.toString().length;
	}

	function set_caret_offset(el: HTMLElement, offset: number) {
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		let node = walker.nextNode() as Text | null;
		let remaining = offset;
		while (node) {
			const len = node.data.length;
			if (remaining <= len) {
				const r = document.createRange();
				r.setStart(node, remaining);
				r.collapse(true);
				const sel = document.getSelection();
				sel?.removeAllRanges();
				sel?.addRange(r);
				return;
			}
			remaining -= len;
			node = walker.nextNode() as Text | null;
		}
		if (el.lastChild instanceof Text) {
			const r = document.createRange();
			r.setStart(el.lastChild, el.lastChild.data.length);
			r.collapse(true);
			const sel = document.getSelection();
			sel?.removeAllRanges();
			sel?.addRange(r);
		}
	}

	function repaint(el: HTMLPreElement) {
		const text = el.textContent ?? "";
		const t0 = performance.now();
		const { result, ms } = measure(() => tokenize(text), {
		samples: 10
		});
		parse_ms = ms;

		token_count = (result.tokens.length / 3) | 0;
		line_count = text.length === 0 ? 1 : text.split("\n").length;

		if (!highlight_supported) return;

		const first_text = el.firstChild instanceof Text ? (el.firstChild as Text) : null;
		if (!first_text) return;

		const by_type: Map<string, Range[]> = new Map();
		const names = result.token_types;
		const tokens = result.tokens;
		for (let i = 0; i < token_count; i++) {
			const base = i * 3;
			const type_id = tokens[base];
			const start = tokens[base + 1];
			const end = tokens[base + 2];
			if (start === end) continue;
			const type_name = names[type_id];
			if (!type_name) continue;
			const r = document.createRange();
			r.setStart(first_text, start);
			r.setEnd(first_text, end);
			let arr = by_type.get(type_name);
			if (!arr) {
				arr = [];
				by_type.set(type_name, arr);
			}
			arr.push(r);
		}

		for (const [type_name, ranges] of by_type) {
		console.log(type_name)
			CSS.highlights.set(hl_name(type_name), new Highlight(...ranges));
		}

		for (const known of seen_types) {
			if (!by_type.has(known)) CSS.highlights.delete(hl_name(known));
		}
		seen_types = new Set(by_type.keys());
	}

	let seen_types = new Set<string>();

	function handle_input(e: Event) {
		if (!pad) return;
		const caret = get_caret_offset(pad);
		const flat = flatten_to_text(pad);
		if (pad.textContent !== flat || pad.childNodes.length !== 1) {
			pad.textContent = flat;
			set_caret_offset(pad, Math.min(caret, flat.length));
		}
		repaint(pad);
	}

	function handle_paste(e: ClipboardEvent) {
		e.preventDefault();
		const text = e.clipboardData?.getData("text/plain") ?? "";
		document.execCommand("insertText", false, text);
	}

	onMount(() => {
		highlight_supported = typeof CSS !== "undefined" && "highlights" in CSS;
		if (pad) {
			pad.textContent = initial;
			repaint(pad);
		}
	});
</script>

<div class="lab">
	<div class="head">
		<span class="dot"></span>
		<span class="lbl">mini-lab · editable</span>
		<span class="theme">{theme_label}</span>
	</div>
	<pre
		bind:this={pad}
		class="pad twinkleplop"
		contenteditable="plaintext-only"
		spellcheck="false"
		oninput={handle_input}

		aria-label="editable typescript source"
	></pre>
	<div class="foot">
		<span>twinkled in <span class="ok">{parse_ms.toFixed(3)}ms</span></span>
		<span>{token_count} tokens · {line_count} lines</span>
	</div>
	{#if !highlight_supported}
		<div class="fallback-note">
			CSS Custom Highlight API unavailable — tokens counted, colors off.
		</div>
	{/if}
</div>

<style>
	.lab {
		border: 1px solid var(--docs-line);
		background: var(--twp-background, var(--docs-bg-1));
		border-radius: 3px;
		margin: 18px 0 24px;
		font-family: var(--docs-mono);
		font-size: 12px;
		overflow: hidden;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--docs-line);
		background: var(--docs-bg-2);
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
	}
	.head .dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--docs-accent);
		box-shadow: 0 0 6px var(--docs-accent);
	}
	.lbl {
		color: var(--docs-fg-dim);
	}
	.theme {
		margin-left: auto;
		color: var(--docs-fg-mute);
	}

	.pad {
		margin: 0;
		padding: 14px 16px;
		min-height: 140px;
		font-family: var(--docs-mono);
		font-size: 12.5px;
		line-height: 1.6;
		white-space: pre-wrap;
		tab-size: 2;
		outline: none;
		caret-color: var(--docs-accent);
		color: var(--twp-identifier, var(--docs-fg));
		background: var(--twp-background, var(--docs-bg-1));
		overflow-x: auto;
	}
	.pad:focus-visible {
		box-shadow: inset 0 0 0 1px var(--docs-accent-dim);
	}

	.foot {
		display: flex;
		justify-content: space-between;
		padding: 6px 12px;
		border-top: 1px solid var(--docs-line);
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
	}
	.ok {
		color: var(--docs-accent);
	}

	.fallback-note {
		padding: 6px 12px;
		border-top: 1px dotted var(--docs-line);
		font-size: var(--docs-fs-xs);
		color: var(--t-yellow);
	}

	/* github-theme colors wired onto the CSS Custom Highlight API.
	 * highlight names are namespaced per-instance (see hl_name) so concurrent
	 * mini-labs or other components using the same token names don't clash.
	 * the global part of the selector is an attribute match on the instance id. */
	:global(::highlight(mini_keyword)) { color: var(--twp-keyword); }
	:global(::highlight(mini_string)) { color: var(--twp-string); }
	:global(::highlight(mini_template)) { color: var(--twp-template); }
	:global(::highlight(mini_regex)) { color: var(--twp-regex); }
	:global(::highlight(mini_number)) { color: var(--twp-number); }
	:global(::highlight(mini_boolean)) { color: var(--twp-boolean); }
	:global(::highlight(mini_null)) { color: var(--twp-null); }
	:global(::highlight(mini_comment)) { color: var(--twp-comment); font-style: italic; }
	:global(::highlight(mini_operator)) { color: var(--twp-operator); }
	:global(::highlight(mini_punctuation)) { color: var(--twp-punctuation); }
	:global(::highlight(mini_identifier)) { color: var(--twp-identifier); }
	:global(::highlight(mini_variable)) { color: var(--twp-variable); }
	:global(::highlight(mini_function)) { color: var(--twp-function); }
	:global(::highlight(mini_type)) { color: var(--twp-type); }
	:global(::highlight(mini_class_name)) { color: var(--twp-class_name); }
	:global(::highlight(mini_property)) { color: var(--twp-property); }
	:global(::highlight(mini_builtin)) { color: var(--twp-builtin); }
	:global(::highlight(mini_decorator)) { color: var(--twp-decorator); }
	:global(::highlight(mini_string_escape)) { color: var(--twp-string_escape); }
	:global(::highlight(mini_attribute)) { color: var(--twp-attribute); }
	:global(::highlight(mini_parameter)) { color: var(--twp-parameter); }

	@media (max-width: 760px) {
		.pad {
			font-size: 11.5px;
			padding: 12px 14px;
		}
	}
</style>
