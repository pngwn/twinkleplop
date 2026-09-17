<script lang="ts">
	import { tokenize as ts_tokenize } from "@twinkleplop/typescript";
	import { measure } from "$lib/explore/measure";
	import type { plop_target } from "./plop";

	const tokenize = ts_tokenize({ fidelity: "high" });

	const INITIAL = `function greet(name: string) {
  return \`hello, \${name}!\`;
}

const msg = greet("world");
console.log(msg);`;

	let {
		lit,
		total,
		on_targets
	}: {
		// how many tokens the splash effect has lit so far
		lit: number;
		total: number;
		on_targets: (targets: plop_target[], changed: number[]) => void;
	} = $props();

	interface segment {
		text: string;
		// null for the whitespace between tokens
		type: string | null;
		line: number;
	}

	let source = $state(INITIAL);
	let parse_ms = $state(0);
	let pre: HTMLPreElement | undefined = $state();

	const segments = $derived(build_segments(source));
	const tokens = $derived(segments.filter((s) => s.type !== null));
	const line_count = $derived(source.split("\n").length);

	function build_segments(text: string): segment[] {
		const { tokens, token_types } = tokenize(text);
		const out: segment[] = [];
		// `${` and its closing `}` have no token type of their own. track the
		// brace depth each interpolation opened at so they can be picked out.
		const interpolations: number[] = [];
		let depth = 0;
		let pos = 0;
		let line = 0;

		function push(chunk: string, type: string | null) {
			out.push({ text: chunk, type, line });
			for (const ch of chunk) if (ch === "\n") line++;
		}

		for (let i = 0; i < tokens.length; i += 3) {
			const start = tokens[i + 1];
			const end = tokens[i + 2];
			if (start === end) continue;
			if (start > pos) push(text.slice(pos, start), null);
			const chunk = text.slice(start, end);
			let type: string | null = token_types[tokens[i]] ?? "identifier";

			if (!/\S/.test(chunk)) {
				type = null;
			} else if (type === "punctuation") {
				if (chunk === "${") {
					interpolations.push(depth);
					type = "interpolation";
				} else if (chunk === "{") {
					depth++;
				} else if (chunk === "}") {
					if (interpolations.at(-1) === depth) {
						interpolations.pop();
						type = "interpolation";
					} else {
						depth--;
					}
				}
			}
			push(chunk, type);
			pos = end;
		}
		if (pos < text.length) push(text.slice(pos), null);

		// the effect staggers by line, counting only lines that hold a token
		const occupied = [...new Set(out.filter((s) => s.type !== null).map((s) => s.line))];
		for (const s of out) s.line = Math.max(0, occupied.indexOf(s.line));
		return out;
	}

	// tokens that differ from the last render, found from both ends so an
	// insertion doesn't mark everything after it
	let previous: segment[] = [];
	function diff(next: segment[]): number[] {
		const same = (a: segment, b: segment) => a.type === b.type && a.text === b.text;
		const prev = previous;
		previous = next;
		if (!prev.length) return [];
		let head = 0;
		while (head < prev.length && head < next.length && same(prev[head], next[head])) head++;
		let tail = 0;
		while (
			tail < prev.length - head &&
			tail < next.length - head &&
			same(prev[prev.length - 1 - tail], next[next.length - 1 - tail])
		)
			tail++;
		const changed: number[] = [];
		for (let k = head; k < next.length - tail; k++) changed.push(k);
		return changed;
	}

	$effect(() => {
		const changed = diff(tokens);
		if (!pre) return;
		const spans = pre.querySelectorAll<HTMLElement>(".tok");
		const targets = tokens.map((token, k) => ({ el: spans[k], line: token.line }));
		// with nothing to aim at, the pixels fall into the empty block
		on_targets(targets.length ? targets : [{ el: pre, line: 0 }], changed);
	});

	// timing a microsecond-scale call means running it for a few ms, so keep
	// it off the keystroke and out of hydration
	$effect(() => {
		const text = source;
		const id = setTimeout(() => {
			parse_ms = measure(() => tokenize(text), { samples: 10 }).ms;
		}, 150);
		return () => clearTimeout(id);
	});
</script>

<div class="card">
	<div class="bar">
		<span><i class="dot"></i>mini-lab · editable</span>
		<span>github-dark · typescript</span>
	</div>
	<div class="editor">
		<textarea
			bind:value={source}
			spellcheck="false"
			autocapitalize="off"
			autocomplete="off"
			aria-label="editable typescript source"
		></textarea>
		<!-- whitespace in here is rendered. the trailing line break gives a final
		     empty line its height, keeping the pre in step with the textarea. -->
		<!-- prettier-ignore -->
		<pre class="code" bind:this={pre} aria-hidden="true">{#each segments as segment}{#if segment.type}<span class="tok" style:--tc="var(--tok-{segment.type}, var(--ink))">{segment.text}</span>{:else}{segment.text}{/if}{/each}{"\n"}</pre>
	</div>
	<div class="bar foot">
		<span>
			{#if lit === 0}
				waiting for twinkle… <b>scroll ↓</b>
			{:else if lit >= total}
				twinkled in <b>{parse_ms.toFixed(3)}ms</b>
			{:else}
				twinkling · <b>{lit}/{total}</b> tokens
			{/if}
		</span>
		<span>{tokens.length} tokens · {line_count} lines</span>
	</div>
</div>

<style>
	.card {
		border: 1px solid var(--line);
		background: var(--bg2);
		position: relative;
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 16px;
		font-size: 12px;
		color: var(--ink2);
		border-bottom: 1px solid var(--line);
		background: var(--bg3);
	}
	.bar.foot {
		border-bottom: 0;
		border-top: 1px solid var(--line);
	}
	.bar b {
		font-weight: 400;
		color: var(--green);
	}
	.dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--green);
		margin-right: 10px;
		vertical-align: middle;
	}

	/* the textarea takes the input; the pre, laid exactly over it, shows
	 * the tokens. native editing, real spans to animate. */
	.editor {
		position: relative;
		font-size: 15px;
		line-height: 1.85;

		--tok-keyword: var(--red);
		--tok-function: var(--yellow);
		--tok-parameter: var(--orange);
		--tok-type: var(--blue);
		--tok-class_name: var(--blue);
		--tok-constant: var(--blue);
		--tok-variable: var(--blue);
		--tok-property: var(--blue);
		--tok-builtin: var(--blue);
		--tok-string: var(--green);
		--tok-template: var(--green);
		--tok-regex: var(--green);
		--tok-string_escape: var(--purple);
		--tok-interpolation: var(--purple);
		--tok-decorator: var(--purple);
		--tok-number: var(--pink);
		--tok-boolean: var(--pink);
		--tok-null: var(--pink);
		--tok-punctuation: var(--ink2);
		--tok-operator: var(--ink2);
		--tok-comment: var(--ink2);
		--tok-identifier: var(--ink);
	}
	.code,
	textarea {
		display: block;
		margin: 0;
		padding: 22px 24px;
		border: 0;
		font: inherit;
		letter-spacing: 0;
		white-space: pre-wrap;
		overflow-wrap: break-word;
		tab-size: 2;
	}
	.code {
		position: relative;
		min-height: 230px;
		overflow: hidden;
		pointer-events: none;
	}
	textarea {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		resize: none;
		overflow: hidden;
		outline: none;
		background: transparent;
		color: transparent;
		caret-color: var(--green);
	}
	.editor textarea::selection {
		background: color-mix(in srgb, var(--green) 28%, transparent);
		color: transparent;
	}

	.tok {
		color: var(--ink3);
		transition:
			color 0.35s,
			text-shadow 0.35s;
	}
	.tok:global([data-lit]) {
		color: var(--tc);
	}

	@media (prefers-reduced-motion: reduce) {
		.tok {
			color: var(--tc);
		}
	}
	@media (max-width: 760px) {
		.editor {
			font-size: 13px;
		}
	}
</style>
