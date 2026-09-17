<script lang="ts">
	import PaneHeader from "./PaneHeader.svelte";
	import { DOCS } from "../nav";
	import { close_nav } from "../chrome.svelte";

	let { active_id }: { active_id: string } = $props();

	function slugify(s: string) {
		return s.toLowerCase().replace(/\s+/g, "-");
	}
</script>

<aside class="pane">
	<div class="manpage-nav">
		{#each DOCS as group, gi}
			<div class="mp-group-label">
				<span class="sec">§{gi + 1}</span> &nbsp;{group.group}
			</div>
			{#each group.items as item, ii}
				<a
					class="mp-entry"
					class:active={item.id === active_id}
					href={item.path}
					onclick={close_nav}
				>

					<span>{item.title}</span>
				</a>
			{/each}
		{/each}
	</div>
</aside>

<style>
	.pane {
		overflow: auto;
		padding: 0;
		position: relative;
		min-width: 0;
	}
	.pane::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}
	.pane::-webkit-scrollbar-track {
		background: var(--docs-bg);
	}
	.pane::-webkit-scrollbar-thumb {
		background: var(--docs-line);
		border-radius: 4px;
	}
	.pane::-webkit-scrollbar-thumb:hover {
		background: var(--docs-fg-ghost);
	}



	.manpage-nav {
		padding: 8px 0;
		font-size: var(--docs-fs-sm);
		display: flex;
		flex-direction: column;
	}

	.mp-entry {
		/*display: grid;
		grid-template-columns: 28px 1fr;
		gap: 8px;*/
		padding: 2px 14px 2px calc(2rem + 17px);
		color: var(--docs-fg-dim);
		text-decoration: none;
	}

	.mp-entry:hover {
		color: var(--docs-fg);
	}
	.mp-entry.active {
		color: var(--docs-accent);
	}

	.mp-group-label {
		padding: 14px 14px 4px;
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-sm);
		letter-spacing: 0.6px;
		text-transform: uppercase;

	}
	.mp-group-label .sec {
		color: var(--t-yellow);
		width: 1rem;
		display: inline-block;
	}


</style>
