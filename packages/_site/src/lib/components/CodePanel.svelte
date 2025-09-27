<script lang="ts">
	import { Spring } from 'svelte/motion';
	import type { TokenizeResult } from '@twinkleplop/core';

	interface Props {
		source: string | undefined;
		tokens: TokenizeResult | undefined;
		onTokenClick: (tokenIndex: number) => void;
	}

	let { source, tokens, onTokenClick }: Props = $props();

	let htmlContainer = $state<HTMLSpanElement>();
	let tokenRanges: Range[] = [];

	const springConfig = {
		damping: 1,
		mass: 1,
		stiffness: 0.6
	};

	let highlightTop = new Spring(0, springConfig);
	let highlightLeft = new Spring(0, springConfig);
	let highlightWidth = new Spring(0, springConfig);
	let highlightHeight = new Spring(0, springConfig);

	export function highlightToken(i: number) {
		const parent = htmlContainer?.parentElement;
		if (!parent) return;
		const parentBox = parent.getBoundingClientRect();

		const selectedRange = tokenRanges[i];
		if (!selectedRange) return;

		const box = selectedRange.getBoundingClientRect();

		// Get the scroll position of the code container
		const containerScrollTop = parent.scrollTop;
		const containerScrollLeft = parent.scrollLeft;

		// Calculate position relative to the scrollable container
		highlightTop.set(box.top - parentBox.top + containerScrollTop - 1);
		highlightLeft.set(box.left - parentBox.left + containerScrollLeft - 1);
		highlightWidth.set(box.width + 1);
		highlightHeight.set(box.height + 1);
	}

	function syntaxHighlight() {
		if (!tokens || !htmlContainer) return;
		tokenRanges.length = 0;

		const textNode = htmlContainer.firstChild;
		if (!textNode) return;

		let highlights: Record<string, Highlight> = {};
		for (let i = 0; i < tokens.tokenTypes.length; i++) {
			const tokenType = tokens.tokenTypes[i];
			highlights[tokenType] = new Highlight();
			CSS.highlights.set(tokenType, highlights[tokenType]);
		}

		for (let i = 0; i < tokens.tokens.length; i += 3) {
			const tokenCode = tokens.tokens[i];
			const tokenType = tokens.tokenTypes[tokenCode];
			const start = tokens.tokens[i + 1];
			const end = tokens.tokens[i + 2];

			const r = new Range();
			r.setStart(textNode, start);
			r.setEnd(textNode, end);
			highlights[tokenType].add(r);
			tokenRanges.push(r);
		}
	}

	function handleTokenClick(e: MouseEvent) {
		const x = e.clientX;
		const y = e.clientY;

		const tokenIndex = tokenRanges.findIndex((range) => {
			const box = range.getBoundingClientRect();
			return x > box.left && x < box.right && y > box.top && y < box.bottom;
		});

		if (tokenIndex !== -1) {
			onTokenClick(tokenIndex);
		}
	}

	$effect(() => {
		syntaxHighlight();
	});
</script>

<div class="code-panel">
	<h3 class="panel-title">Code</h3>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<pre class="highlight" onclick={handleTokenClick}><div
			class="highlight-container"
			style="
				--top: {highlightTop.current}px; 
				--left: {highlightLeft.current}px; 
				--width: {highlightWidth.current}px; 
				--height: {highlightHeight.current}px;"></div><span class="code-inner" bind:this={htmlContainer}
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