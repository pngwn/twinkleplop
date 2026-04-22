<script lang="ts">
	let { html }: { html: string } = $props();
</script>

<div class="sig">{@html html}</div>

<style>
	.sig {
		border: 1px solid var(--docs-line);
		background: var(--docs-bg-1);
		padding: 12px 14px;
		border-radius: 3px;
		font-family: var(--docs-mono);
		font-size: 13px;
		line-height: 1.7;
		margin: 8px 0 14px;
		border-left: 2px solid var(--t-blue);
		white-space: pre;
		overflow-x: auto;
	}
	.sig :global(.name) {
		color: var(--t-blue);
		font-weight: 600;
	}
	.sig :global(.param) {
		color: var(--t-purple);
	}
	.sig :global(.type) {
		color: var(--t-teal);
	}
	.sig :global(.punct) {
		color: var(--docs-fg-dim);
	}
	.sig :global(.kw) {
		color: var(--t-red);
	}
	.sig :global(.lit) {
		color: var(--t-yellow);
	}
</style>
