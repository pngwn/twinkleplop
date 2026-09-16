<script lang="ts">
  import { Greeter } from "./greeter.js";
  let count = $state(0);
  let active = $state(true);
  let doubled = $derived(count * 2);
  const re = /^[a-z]+$/i;
  const g = new Greeter("hello");
  const tpl = `greeting=${g.prefix}`;
  function inc() { count += 1; }
</script>

<style>
  :root { --fg: #1f2328; }
  button.primary { color: var(--fg); padding: 0.5rem 1rem; }
</style>

<!-- interactive counter -->
<main class="root" use:tooltip>
  <h1>Count: {count} (x2 = {doubled})</h1>
  <button class="primary" onclick={inc}>click me</button>

  {#if count > 0 && active}
    <p>non-zero</p>
  {:else}
    <p>zero</p>
  {/if}

  {#each [1, 2, 3] as n (n)}
    <span>{n}</span>
  {/each}
</main>

<script lang="ts">
	interface Props {
		source: string | undefined;
		position: number;
		analysis: any;
		on_position_change: (position: number) => void;
	}

	let { source, position, analysis, on_position_change }: Props = $props();

	let r: Range;
	let hl: Highlight;
	if (typeof window !== 'undefined') {
		hl = new Highlight();
		CSS.highlights.set('position', hl);
		r = new Range();
		hl.add(r);
	}

	function handle_scrub(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const new_position = +event.currentTarget.value;
		on_position_change(new_position);
	}
</script>

<div class="bottom-panel">
	<div class="inspector-controls">
		<div class="slider-section">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="slider-label">Position</label>
			<button onclick={() => on_position_change(position - 1)}>-</button>
			<input
				type="range"
				min="0"
				max={source?.length ?? 1 - 1}
				value={position}
				oninput={handle_scrub}
				class="position-slider"
			/>
			<button onclick={() => on_position_change(position + 1)}>+</button>
			<span class="position-value">{position}/{source?.length ?? 1 - 1}</span>
		</div>

		<div class="inspector-stats">
			<div class="stat-item">
				<span class="stat-label">Character:</span>
				<span class="stat-value">'{source?.[position] || 'EOF'}'</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">State:</span>
				<span class="stat-value">{analysis?.current_state}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Depth:</span>
				<span class="stat-value">{analysis?.depth}</span>
			</div>
		</div>
	</div>

	<div class="state-path-display">
		<span class="path-label">State Path:</span>
		<span class="path-value">{analysis?.state_path}</span>
	</div>
</div>

<style>
	.bottom-panel {
		background: var(--bg-secondary);
		border-top: 1px solid var(--border);
		padding: 1rem 2rem;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.inspector-controls {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.slider-section {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.slider-label {
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		min-width: 60px;
	}

	.position-slider {
		flex: 1;
		margin: 0;
	}

	.position-value {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		min-width: 80px;
	}

	.inspector-stats {
		display: flex;
		gap: 1.5rem;
		flex-shrink: 0;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.stat-label {
		color: var(--text-secondary);
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.stat-value {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 500;
		min-width: 100px;
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.state-path-display {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
	}

	.path-label {
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.path-value {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		flex: 1;
	}

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-track {
		background: var(--bg-tertiary);
		height: 6px;
		border: 1px solid var(--border);
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		background: var(--accent);
		height: 16px;
		width: 16px;
		margin-top: -5px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		transition: all 0.2s ease;
	}

	input[type='range']::-webkit-slider-thumb:hover {
		background: var(--accent-hover);
		transform: scale(1.1);
	}
</style>

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

		// markdown emits compound token types like `"bold italic"` that
		// carry multiple active-style classes in one string. split on
		// whitespace and register the range with each individual highlight
		// so `::highlight(bold)` and `::highlight(italic)` both target it.
		// non-compound types (the common case for every other language)
		// split into a single-element array — unchanged behaviour.
		const highlights: Record<string, Highlight> = {};
		const ensure_highlight = (name: string): Highlight => {
			let h = highlights[name];
			if (!h) {
				h = new Highlight();
				highlights[name] = h;
				CSS.highlights.set(name, h);
			}
			return h;
		};

		for (let i = 0; i < tokens.tokens.length; i += 3) {
			const token_code = tokens.tokens[i];
			const token_type = tokens.token_types[token_code];
			console.log({token_type})
			const start = tokens.tokens[i + 1];
			const end = tokens.tokens[i + 2];

			const r = new Range();
			r.setStart(text_node, start);
			r.setEnd(text_node, end);
			token_ranges.push(r);

			for (const name of token_type.split(/\s+/)) {
				if (name) ensure_highlight(name).add(r);
			}
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

<script lang="ts">
  import { Greeter } from "./greeter.js";
  let count = $state(0);
  let active = $state(true);
  let doubled = $derived(count * 2);
  const re = /^[a-z]+$/i;
  const g = new Greeter("hello");
  const tpl = `greeting=${g.prefix}`;
  function inc() { count += 1; }
</script>

<style>
  :root { --fg: #1f2328; }
  button.primary { color: var(--fg); padding: 0.5rem 1rem; }
</style>

<!-- interactive counter -->
<main class="root" use:tooltip>
  <h1>Count: {count} (x2 = {doubled})</h1>
  <button class="primary" onclick={inc}>click me</button>

  {#if count > 0 && active}
    <p>non-zero</p>
  {:else}
    <p>zero</p>
  {/if}

  {#each [1, 2, 3] as n (n)}
    <span>{n}</span>
  {/each}
</main>
