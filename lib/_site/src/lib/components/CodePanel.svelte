<script lang="ts">
	import { Spring } from 'svelte/motion';
	import type { TokenizeResult } from '@twinkleplop/core';

	interface Props {
		source: string | undefined;
		tokens: TokenizeResult | undefined;
		on_token_click: (token_index: number) => void;
	}

	let { source, tokens, on_token_click }: Props = $props();

	let html_container = $state<HTMLSpanElement>();
	let token_ranges: Range[] = [];

	const spring_config = {
		damping: 1,
		mass: 1,
		stiffness: 0.6
	};

	let highlight_top = new Spring(0, spring_config);
	let highlight_left = new Spring(0, spring_config);
	let highlight_width = new Spring(0, spring_config);
	let highlight_height = new Spring(0, spring_config);

	export function highlight_token(i: number) {
		const parent = html_container?.parentElement;
		if (!parent) return;
		const parent_box = parent.getBoundingClientRect();

		const selected_range = token_ranges[i];
		if (!selected_range) return;

		const box = selected_range.getBoundingClientRect();

		// get the scroll position of the code container
		const container_scroll_top = parent.scrollTop;
		const container_scroll_left = parent.scrollLeft;

		// calculate position relative to the scrollable container
		highlight_top.set(box.top - parent_box.top + container_scroll_top - 1);
		highlight_left.set(box.left - parent_box.left + container_scroll_left - 1);
		highlight_width.set(box.width + 1);
		highlight_height.set(box.height + 1);
	}

	function syntax_highlight() {
		if (!tokens || !html_container) return;
		token_ranges.length = 0;

		const text_node = html_container.firstChild;
		if (!text_node) return;

		let highlights: Record<string, Highlight> = {};
		for (let i = 0; i < tokens.token_types.length; i++) {
			const token_type = tokens.token_types[i];
			highlights[token_type] = new Highlight();
			CSS.highlights.set(token_type, highlights[token_type]);
		}

		for (let i = 0; i < tokens.tokens.length; i += 3) {
			const token_code = tokens.tokens[i];
			const token_type = tokens.token_types[token_code];
			const start = tokens.tokens[i + 1];
			const end = tokens.tokens[i + 2];

			const r = new Range();
			r.setStart(text_node, start);
			r.setEnd(text_node, end);
			highlights[token_type].add(r);
			token_ranges.push(r);
		}
	}

	function handle_token_click(e: MouseEvent) {
		const x = e.clientX;
		const y = e.clientY;

		const token_index = token_ranges.findIndex((range) => {
			const box = range.getBoundingClientRect();
			return x > box.left && x < box.right && y > box.top && y < box.bottom;
		});

		if (token_index !== -1) {
			on_token_click(token_index);
		}
	}

	$effect(() => {
		syntax_highlight();
	});
</script>

<div class="code-panel">
	<h3 class="panel-title">Code</h3>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<pre class="highlight" onclick={handle_token_click}><div
			class="highlight-container"
			style="
				--top: {highlight_top.current}px;
				--left: {highlight_left.current}px;
				--width: {highlight_width.current}px;
				--height: {highlight_height.current}px;"></div><span class="code-inner" bind:this={html_container}
			>{source}</span
		></pre>
</div>

<style>
	.code-panel {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.highlight-container {
		position: absolute;
		top: var(--top);
		left: var(--left);
		width: var(--width);
		height: var(--height);
		box-sizing: border-box;
		box-shadow:
			0 0 0 1px var(--accent),
			0 0 0 2px var(--bg-tertiary),
			0 0 20px var(--accent-dim);
		border-radius: 1px;
		z-index: 4;
	}

	.highlight {
		flex: 1;
		position: relative;
		overflow: auto;
		margin: 0;
		max-height: 100%;
	}

	.code-inner {
		position: relative;
		z-index: 3;
	}

	:highlight {
		background-color: #eee;
	}

	::highlight(position) {
		text-decoration: underline;
		text-decoration-color: rgba(255, 255, 255, 1);
		text-decoration-thickness: 2px;
		text-underline-offset: 2px;
		text-decoration-skip-ink: none;
	}
</style>