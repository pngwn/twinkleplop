<script lang="ts">
	import PixelTitle from "./PixelTitle.svelte";

	type cta = { label: string; href: string; primary?: boolean };

	let {
		tagline,
		title,
		lead,
		ctas = [] as cta[],
	}: {
		tagline?: string;
		title: string;
		lead: string;
		ctas?: cta[];
	} = $props();
</script>

<div class="hero">
	{#if tagline}
		<span class="tagline">{tagline}</span>
	{/if}
	<PixelTitle text={title} size="xl" />
	<p class="lead">{@html lead}<span class="cursor-block"></span></p>
	{#if ctas.length}
		<div class="ctas">
			{#each ctas as c}
				<a class="btn" class:primary={c.primary} href={c.href}>{c.label}</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.hero {
		padding: 36px 0 28px;
		border-bottom: 1px dotted var(--docs-line);
		margin-bottom: 32px;
	}
	.tagline {
		display: inline-block;
		padding: 2px 8px;
		border: 1px dashed var(--docs-line);
		border-radius: 2px;
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		letter-spacing: 0.5px;
		margin-bottom: 14px;
	}
	.lead {
		color: var(--docs-fg-dim);
		max-width: 560px;
		font-size: 14px;
		margin: 0;
	}
	.lead :global(strong) {
		color: var(--docs-fg);
		font-weight: 600;
	}
	.ctas {
		display: flex;
		gap: 8px;
		margin-top: 20px;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border: 1px solid var(--docs-line);
		color: var(--docs-fg-dim);
		text-decoration: none;
		border-radius: 2px;
		font-size: var(--docs-fs-sm);
	}
	.btn.primary {
		border-color: var(--docs-accent-dim);
		color: var(--docs-accent);
		background: color-mix(in oklch, var(--docs-accent) 8%, transparent);
	}
	.btn:hover {
		color: var(--docs-fg);
		border-color: var(--docs-fg-mute);
	}
	.btn.primary:hover {
		color: var(--docs-accent);
		border-color: var(--docs-accent);
		text-shadow: 0 0 8px color-mix(in oklch, var(--docs-accent) 50%, transparent);
	}

	@media (max-width: 760px) {
		.lead {
			font-size: 13px;
		}
		.ctas {
			flex-wrap: wrap;
		}
	}
</style>
