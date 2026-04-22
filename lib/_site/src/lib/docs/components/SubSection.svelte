<script lang="ts">
	let {
		id,
		title,
		children,
	}: {
		id?: string;
		title: string;
		children?: import("svelte").Snippet;
	} = $props();
</script>

<h3 class="sub" {id}>{title}</h3>
{#if children}{@render children()}{/if}

<style>
	.sub {
		font-family: var(--docs-mono);
		font-size: 18px;
		margin: 28px 0 8px;
		color: var(--docs-fg-dim);
		font-weight: 500;
	}
	.sub::before {
		content: "§ ";
		color: var(--t-teal);
		font-family: var(--docs-mono);
		font-size: 14px;
	}

	@media (max-width: 760px) {
		.sub {
			font-size: 16px;
		}
	}
</style>
