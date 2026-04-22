<script lang="ts">
	import Keycap from "./Keycap.svelte";

	let { path }: { path: string } = $props();

	const parts = $derived(path.split(" / "));
</script>

<footer class="statusline">
	<span class="mode-chip">DOCS</span>
	<span class="path">
		{#each parts as part, i}
			{#if i > 0}<span class="sep">/</span>{/if}
			{part}
		{/each}
	</span>
	<span class="spacer"></span>
	<div class="hints">
		<span class="h"><Keycap>⌘</Keycap><Keycap>K</Keycap> palette</span>
		<span class="h"><Keycap>t</Keycap> tweaks</span>
		<span class="h"><Keycap>j</Keycap><Keycap>k</Keycap> navigate</span>
		<span class="h live">● live</span>
	</div>
</footer>

<style>
	.statusline {
		display: flex;
		align-items: center;
		gap: 16px;
		height: 24px;
		padding: 0 16px;
		background: var(--docs-bg);
		border-top: 1px solid var(--docs-line);
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		letter-spacing: 0.3px;
		z-index: 30;
		flex-shrink: 0;
	}
	.mode-chip {
		color: var(--docs-bg);
		background: var(--docs-accent);
		padding: 1px 6px;
		font-weight: 600;
		letter-spacing: 0.5px;
	}
	.path {
		color: var(--docs-fg-dim);
	}
	.path .sep {
		color: var(--docs-fg-ghost);
	}
	.spacer {
		flex: 1;
	}
	.hints {
		display: flex;
		gap: 12px;
	}
	.h {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.live {
		color: var(--docs-accent);
	}

	@media (max-width: 760px) {
		.statusline {
			position: fixed;
			bottom: 52px;
			left: 0;
			right: 0;
			height: 22px;
			padding: 0 10px;
			font-size: 9.5px;
			gap: 8px;
		}
		.hints {
			display: none;
		}
		.path {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
	}
</style>
