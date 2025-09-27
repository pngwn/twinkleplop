<script lang="ts">
	import { tokenize, type TokenizeResult, type CompiledGrammar } from '@twinkleplop/core';
	import { grammar } from '@twinkleplop/css';

	const languages: Record<string, { label: string; grammar: CompiledGrammar }> = {
		css: {
			label: 'CSS',
			grammar: grammar
		}
	};

	let { language, code, id } = $props();

	let codeElement = $state<HTMLElement>();
	let pre_element = $state<HTMLElement>();
	const tokens = tokenize(code, languages[language].grammar as CompiledGrammar);

	function pause(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	let line_positions: number[] = $state([]);

	async function syntaxHighlight(element?: HTMLElement, tokens?: TokenizeResult) {
		if (!tokens || !element || !pre_element) return;
		const tokenRanges: Range[] = [];

		// const textNode = element.textContent;

		const textNode = Array.from(element.childNodes).find(
			(node) => node.nodeType === Node.TEXT_NODE
		);

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
			await pause(10);
		}
	}

	let line_height = $state<number>(0);

	async function make_line_positions(element?: HTMLElement, pre_element?: HTMLElement) {
		if (!element || !pre_element) return;

		const container_offset = pre_element.getBoundingClientRect().top;
		const textNode = Array.from(element.childNodes).find(
			(node) => node.nodeType === Node.TEXT_NODE
		);

		if (!textNode || !textNode.textContent) return;

		const new_lines = textNode.textContent.split('').reduce((acc, char, i) => {
			if (char === '\n') {
				acc.push(i);
			}
			return acc;
		}, [] as number[]);

		new_lines.push(textNode.textContent?.length - 1);

		for (let i = 0; i < new_lines.length; i++) {
			const r = new Range();
			r.setStart(textNode, new_lines[i]);
			r.setEnd(textNode, new_lines[i] + 1);
			// await pause(30);
			const rect = r.getBoundingClientRect();
			line_positions.push(rect.bottom - container_offset - rect.height);
			line_height = rect.height;
		}
	}

	let line_highlight = $state<number>(-1);

	function handleLineClick(index: number) {
		if (line_highlight === index) {
			line_highlight = -1;
			return;
		}
		line_highlight = index;
		console.log(index);
	}

	let once = $state(false);

	$effect(() => {
		if (!once) {
			make_line_positions(codeElement, pre_element);
		}
		once = true;
	});
</script>

<div class="highlight" {id}>
	<span class="lang-label">{languages[language].label}</span>
	<div class="hl">
		<div
			class="line-highlight"
			style="top: {line_positions[line_highlight]}px; opacity: {line_highlight === -1 ? 0 : 1};"
		></div>
		<div class="line-numbers">
			{#each line_positions as position, index}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="line-number"
					style="top: {position}px; opacity: {line_highlight === index ? 1 : 0.5}"
					onclick={() => handleLineClick(index)}
				>
					{index + 1}
				</div>{/each}
		</div>
		<button onclick={() => syntaxHighlight(codeElement, tokens)}
			><span class="button-text">*twinkle</span></button
		>
		<pre bind:this={pre_element}><code class="language-css" bind:this={codeElement}
				>{@html code}</code
			></pre>
	</div>
</div>

<style>
	.highlight {
		height: 100vh;
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
	button {
		position: absolute;
		top: 0;
		right: 0;
		/* background: var(--bg-code); */
		color: var(--text-primary);
		border: none;
		padding: 0.25rem 0.5rem;
		cursor: pointer;

		border-left: 1px solid var(--accent);
		border-bottom: 1px solid var(--accent);
		z-index: 100;
		background: #111;
		/* background: #111; */
	}

	.button-text {
		font-family: var(--font-pixel);
		font-size: 1.5rem;

		font-family: var(--font-grid);
		font-weight: 700;
		background: var(--rainbow-gradient);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-variation-settings:
			'BACK' 00,
			'ELSH' 3,
			'RECT' 0,
			'wght' 800;
	}

	.hl {
		background: var(--bg-code);
		color: var(--text-primary);
		font-family: 'Pixel Code';
		font-size: 0.875rem;
		line-height: 1.6;

		font-size: 0.875rem;
		line-height: 1.6;
		border: 1px solid var(--accent);
		box-shadow: var(--shadow-md);
		position: relative;
		width: 600px;
		margin: 6rem auto;
	}

	.line-numbers {
		position: absolute;
		left: 0;
		top: -2px;
		bottom: 0;
		width: 2em;
		font-family: var(--font-mono);
		font-size: 0.9rem;
		line-height: 1.6;
		tab-size: 2;
		font-weight: 300;
		user-select: none;
		/* pointer-events: none; */
		text-align: right;
		color: var(--text-secondary);
		z-index: 3;
		cursor: pointer;
		transform: translateY(-0.5px);
	}

	.line-numbers .line-number {
		position: absolute;
		/* top: 0; */
		left: 0;

		width: 100%;
		text-align: right;
		animation: fly-in 0.5s ease-in-out;
	}

	@keyframes fly-in {
		from {
			opacity: 0;
			transform: translateX(-10px);
		}
		to {
			opacity: 0.5;
			transform: translateX(0);
		}
	}

	.line-highlight {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 1.4rem;
		background: #1e5759;
		opacity: 1;
		transform: translateY(-2px);
		z-index: 1;
	}

	@media (max-width: 480px) {
		.hl {
			width: 90%;
		}
	}

	.hl pre {
		padding: 1rem;
		border-radius: 6px;
		overflow-x: auto;
		position: relative;
		padding-left: 3em;
		z-index: 2;
	}

	.hl code {
		font-family: var(--font-mono);
		font-size: 0.9rem;
		line-height: 1.6;
		tab-size: 2;
		font-weight: 300;
	}

	/* .hl :global(.line-number) {
		display: inline-block;
		width: 2em;
		text-align: right;
		padding-right: 1em;
		color: var(--text-tertiary);
		user-select: none;
	} */

	.hl :global(.line-content) {
		display: inline-block;
		white-space: pre;
	}

	.lang-label {
		font-family: var(--font-grid);
		font-size: 3rem;
		line-height: 1.6;
		color: var(--accent);
		text-transform: uppercase;
		position: absolute;
		top: 50px;

		font-variation-settings:
			'BACK' 0,
			'ELSH' 3,
			'RECT' 00,
			'wght' 950;
	}
</style>
