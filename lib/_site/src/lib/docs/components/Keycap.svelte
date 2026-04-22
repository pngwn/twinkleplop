<script lang="ts">
	let {
		accent = false,
		children,
	}: {
		accent?: boolean;
		children: import("svelte").Snippet;
	} = $props();
</script>

<span class="kbd" class:accent>{@render children()}</span>

<style>
	.kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		font-family: var(--docs-mono);
		font-size: 10px;
		color: var(--docs-fg-dim);
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line);
		border-bottom-width: 2px;
		border-radius: 2px;
		line-height: 1;
		letter-spacing: 0.5px;
	}
	.kbd.accent {
		color: var(--docs-accent);
		border-color: var(--docs-accent-dim);
	}
</style>
