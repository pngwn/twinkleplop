<script lang="ts">
	let {
		icon,
		title,
		description,
		more_href,
		more_label = "read →",
	}: {
		icon?: string;
		title: string;
		description?: string;
		more_href?: string;
		more_label?: string;
	} = $props();
</script>

<div class="card">
	<div class="h">
		{#if icon}<span class="ico">{icon}</span>{/if}
		<span class="t">{title}</span>
	</div>
	{#if description}<div class="d">{@html description}</div>{/if}
	{#if more_href}
		<a class="more" href={more_href}>{more_label}</a>
	{/if}
</div>

<style>
	.card {
		border: 1px solid var(--docs-line);
		background: var(--docs-bg-1);
		padding: 14px 16px;
		border-radius: 3px;
		transition:
			border-color 0.15s,
			transform 0.15s;
	}
	.card:hover {
		border-color: var(--docs-accent-dim);
	}
	.h {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}
	.h .ico {
		color: var(--t-yellow);
	}
	.h .t {
		font-family: var(--docs-mono);
		font-size: 15px;
		color: var(--docs-fg);
	}
	.d {
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-sm);
	}
	.d :global(code) {
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line-2);
		padding: 1px 5px;
		border-radius: 2px;
		color: var(--docs-fg);
		font-size: 0.92em;
		font-family: var(--docs-mono);
	}
	a.more {
		display: inline-block;
		margin-top: 8px;
		font-size: var(--docs-fs-xs);
		color: var(--docs-accent);
	}
</style>
