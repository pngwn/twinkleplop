<script lang="ts">
	let {
		id,
		title,
		num,
		children,
	}: {
		id: string;
		title: string;
		num: string;
		children: import("svelte").Snippet;
	} = $props();
</script>

<h2 class="sec" {id}>
	<span class="hash">#</span>
	<span>{title}</span>
	<span class="num">{num}</span>
</h2>
{@render children()}

<style>
	.sec {
		font-family: var(--docs-mono);
		font-size: 26px;
		margin: 48px 0 14px;
		color: var(--docs-fg);
		font-weight: 500;
		display: flex;
		align-items: baseline;
		gap: 12px;
		flex-wrap: wrap;
	}
	.sec > span {
		white-space: nowrap;
	}
	.hash {
		color: var(--t-green);
	}
	.num {
		color: var(--docs-fg-mute);
		font-size: 14px;
		font-family: var(--docs-mono);
		letter-spacing: 1px;
	}

	@media (max-width: 760px) {
		.sec {
			font-size: 21px;
			margin: 32px 0 10px;
			gap: 8px;
		}
		.num {
			font-size: 11px;
		}
	}
</style>
