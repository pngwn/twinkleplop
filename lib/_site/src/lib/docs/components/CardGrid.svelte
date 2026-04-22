<script lang="ts">
	let {
		cols = 2,
		children,
	}: {
		cols?: 2 | 3;
		children: import("svelte").Snippet;
	} = $props();
</script>

<div class="grid" class:cols-3={cols === 3}>
	{@render children()}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	.grid.cols-3 {
		grid-template-columns: 1fr 1fr 1fr;
		gap: 14px;
	}

	@media (max-width: 760px) {
		.grid,
		.grid.cols-3 {
			grid-template-columns: 1fr;
			gap: 10px;
		}
	}
</style>
