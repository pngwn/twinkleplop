<script lang="ts">
	let {
		question,
		answer,
		open = false,
		onclick,
	}: {
		question: string;
		answer: import("svelte").Snippet;
		open?: boolean;
		onclick: () => void;
	} = $props();
</script>

<div class="row" class:open>
	<button type="button" class="q" aria-expanded={open} {onclick}>
		<span class="glyph">?</span>
		<span class="text">{question}</span>
		<span class="chev" aria-hidden="true">›</span>
	</button>
	<div class="a-wrap" aria-hidden={!open}>
		<div class="a">
			<div class="a-inner">
				{@render answer()}
			</div>
		</div>
	</div>
</div>

<style>
	.row {
		border-bottom: 1px solid var(--docs-line);
	}
	.q {
		width: 100%;
		background: transparent;
		border: 0;
		padding: 16px 4px 16px 0;
		font: inherit;
		color: var(--docs-fg);
		text-align: left;
		cursor: pointer;
		display: grid;
		grid-template-columns: 28px 1fr 22px;
		gap: 10px;
		align-items: baseline;
		transition: color 0.15s ease;
		font-family: var(--docs-mono);
	}
	.q:hover .glyph {
		color: var(--docs-accent);
	}
	.q:focus-visible {
		outline: 2px solid var(--docs-accent);
		outline-offset: 4px;
		border-radius: 2px;
	}
	.glyph {
		color: var(--docs-fg-mute);
		font-weight: 600;
		transition: color 0.15s ease;
	}
	.q[aria-expanded='true'] .glyph {
		color: var(--docs-accent);
	}
	.text {
		font-weight: 500;
		line-height: 1.55;
		text-wrap: pretty;
	}
	.chev {
		justify-self: end;
		color: var(--docs-fg-mute);
		font-size: 11px;
		transition:
			transform 0.25s ease,
			color 0.15s ease;
		transform-origin: center;
		user-select: none;
	}
	.q[aria-expanded='true'] .chev {
		transform: rotate(90deg);
		color: var(--docs-fg-dim);
	}

	.a-wrap {
		overflow: hidden;
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.28s ease;
	}
	.row.open .a-wrap {
		grid-template-rows: 1fr;
	}
	.a {
		min-height: 0;
	}
	.a-inner {
		padding: 4px 0 24px 38px;
		color: var(--docs-fg-dim);
		font-size: var(--docs-fs-body);
		line-height: var(--docs-line-height);
	}
	.a-inner :global(p) {
		margin: 0 0 12px;
	}
	.a-inner :global(p:last-child) {
		margin-bottom: 0;
	}
	.a-inner :global(ul) {
		margin: 0 0 12px;
		padding: 0;
		list-style: none;
	}
	.a-inner :global(ul li) {
		padding-left: 18px;
		position: relative;
		margin-bottom: 4px;
	}
	.a-inner :global(ul li::before) {
		content: '—';
		position: absolute;
		left: 0;
		color: var(--docs-fg-mute);
	}
	.a-inner :global(code:not(pre code)) {
		background: var(--docs-bg-2);
		padding: 1px 5px;
		border-radius: 2px;
		font-size: 0.92em;
		color: var(--docs-fg);
		border: 1px solid var(--docs-line-2);
		font-family: var(--docs-mono);
	}
	.a-inner :global(a) {
		color: var(--docs-fg);
		text-decoration: underline;
		text-decoration-color: var(--docs-accent);
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
	}
	.a-inner :global(a:hover) {
		color: var(--docs-accent);
	}

	@media (max-width: 760px) {
		.q {
			grid-template-columns: 22px 1fr 18px;
			padding: 14px 2px 14px 0;
		}
		.a-inner {
			padding-left: 28px;
		}
	}
</style>
