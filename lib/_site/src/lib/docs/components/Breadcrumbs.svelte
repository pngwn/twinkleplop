<script lang="ts">
	type crumb = { label: string; href?: string };

	let { crumbs = [] as crumb[] }: { crumbs?: crumb[] } = $props();
</script>

{#if crumbs.length}
	<div class="breadcrumbs">
		{#each crumbs as part, i}
			{#if i > 0}<span class="sep">/</span>{/if}
			{#if part.href}
				<a href={part.href}>{part.label}</a>
			{:else}
				<span class="here">{part.label}</span>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.breadcrumbs {
		font-size: var(--docs-fs-sm);
		color: var(--docs-fg-mute);
		margin-bottom: 22px;
		letter-spacing: 0.4px;
	}
	.sep {
		color: var(--docs-fg-ghost);
		padding: 0 6px;
	}
	a {
		color: var(--docs-fg-dim);
	}
	.here {
		color: var(--docs-accent);
	}
</style>
