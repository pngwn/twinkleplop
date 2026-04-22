<script lang="ts">
	type direction = { dir: string; label: string; href: string } | null;

	let { prev = null, next = null }: { prev?: direction; next?: direction } = $props();
</script>

{#if prev || next}
	<div class="prev-next">
		{#if prev}
			<a class="prev" href={prev.href}>
				<div class="dir">{prev.dir}</div>
				<div>{prev.label}</div>
			</a>
		{:else}
			<span></span>
		{/if}
		{#if next}
			<a class="next" href={next.href}>
				<div class="dir">{next.dir}</div>
				<div>{next.label}</div>
			</a>
		{:else}
			<span></span>
		{/if}
	</div>
{/if}

<style>
	.prev-next {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 48px;
		padding-top: 22px;
		border-top: 1px dotted var(--docs-line);
	}
	a {
		display: block;
		padding: 12px 16px;
		border: 1px solid var(--docs-line);
		border-radius: 3px;
		color: var(--docs-fg-dim);
		text-decoration: none;
	}
	a:hover {
		border-color: var(--docs-accent-dim);
		color: var(--docs-fg);
	}
	.dir {
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
		letter-spacing: 0.4px;
		margin-bottom: 3px;
	}
	a.next {
		text-align: right;
	}

	@media (max-width: 760px) {
		.prev-next {
			grid-template-columns: 1fr;
		}
		a.next {
			text-align: left;
		}
	}
</style>
