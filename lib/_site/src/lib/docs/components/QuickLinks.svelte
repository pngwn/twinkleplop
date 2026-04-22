<script lang="ts">
	type link = { num: string; title: string; meta: string; href: string };

	let { items = [] as link[] }: { items?: link[] } = $props();
</script>

<div class="quicklinks">
	{#each items as item}
		<a class="ql" href={item.href}>
			<span class="num">{item.num}</span>
			<span class="t">{item.title}</span>
			{item.meta}
		</a>
	{/each}
</div>

<style>
	.quicklinks {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
		margin: 20px 0 34px;
	}
	.ql {
		border: 1px solid var(--docs-line);
		padding: 10px 12px;
		color: var(--docs-fg-dim);
		text-decoration: none;
		font-size: var(--docs-fs-sm);
		border-radius: 2px;
		background: var(--docs-bg-1);
	}
	.ql:hover {
		border-color: var(--docs-accent-dim);
		color: var(--docs-fg);
	}
	.num {
		color: var(--docs-fg-ghost);
		font-size: var(--docs-fs-xs);
	}
	.t {
		display: block;
		color: var(--docs-fg);
		font-family: var(--docs-mono);
		font-size: 14px;
		margin-top: 4px;
	}

	@media (max-width: 960px) {
		.quicklinks {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
