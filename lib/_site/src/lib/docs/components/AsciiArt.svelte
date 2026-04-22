<script lang="ts">
	let {
		content,
		html,
		compact = false,
	}: {
		content?: string;
		html?: string;
		compact?: boolean;
	} = $props();
</script>

<div class="ascii" class:compact>
	{#if html}{@html html}{:else}{content}{/if}
</div>

<style>
	.ascii {
		background: var(--docs-bg-1);
		border: 1px solid var(--docs-line);
		padding: 14px 18px;
		font-family: var(--docs-mono);
		font-size: 11.5px;
		line-height: 1.35;
		color: var(--docs-fg-dim);
		overflow-x: auto;
		margin: 18px 0;
		white-space: pre;
		border-radius: 2px;
	}
	.ascii.compact {
		padding: 16px 20px;
	}
	.ascii :global(.hi) {
		color: var(--docs-accent);
	}
	.ascii :global(.dim) {
		color: var(--docs-fg-mute);
	}
	.ascii :global(.rd) {
		color: var(--t-red);
	}
	.ascii :global(.yl) {
		color: var(--t-yellow);
	}
	.ascii :global(.bl) {
		color: var(--t-blue);
	}
	.ascii :global(.pp) {
		color: var(--t-purple);
	}

	@media (max-width: 760px) {
		.ascii {
			font-size: 10px;
			padding: 10px 12px;
		}
	}
</style>
