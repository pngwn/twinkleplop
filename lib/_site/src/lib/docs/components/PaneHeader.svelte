<script lang="ts">
	let {
		label,
		mode,
		right,
		path = false,
		children
	}: {
		label?: string;
		mode?: string;
		right?: string;
		path?: boolean;
	} = $props();
</script>

<div class="pane-header">
    {#if children}
        {@render children?.()}
    {:else}
	<span class="dot"></span>
	{#if label}
		<span class:path>{label}</span>
	{/if}
	{#if mode}
		<span class="mode">{mode}</span>
	{/if}
	<span class="spacer"></span>
	{#if right}
		<span class="right">{right}</span>
	{/if}
	{/if}


</div>

<style>
	.pane-header {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 26px;
		padding: 0 14px;
		border-bottom: 1px solid var(--docs-line);
		background: var(--docs-bg-1);
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		letter-spacing: 0.4px;
		position: sticky;
		top: 0;
		z-index: 5;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--docs-accent);
		box-shadow: 0 0 6px var(--docs-accent);
	}
	.mode {
		color: var(--docs-fg-dim);
	}
	.path {
		color: var(--docs-fg-dim);
	}
	.spacer {
		flex: 1;
	}
	.right {
		color: var(--docs-fg-mute);
	}

	@media (max-width: 760px) {
		.pane-header {
			font-size: 10px;
			padding: 0 12px;
			height: 24px;
		}
		.pane-header .mode,
		.pane-header .right {
			display: none;
		}
	}
</style>
