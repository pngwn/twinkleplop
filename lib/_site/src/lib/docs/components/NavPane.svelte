<script lang="ts">
	import PaneHeader from "./PaneHeader.svelte";
	import { DOCS } from "../nav";
	import { chrome, set_tweak, close_nav } from "../chrome.svelte";

	let { active_id }: { active_id: string } = $props();

	const NAV_OPTIONS = ["tree", "grouped", "manpage"] as const;

	function slugify(s: string) {
		return s.toLowerCase().replace(/\s+/g, "-");
	}
</script>

<aside class="pane">
	<!-- <PaneHeader label="nav" mode="— pick a view" >
	<div class="mode-switch">
		{#each NAV_OPTIONS as mode}
			<button
				class:active={chrome.tweaks.nav === mode}
				onclick={() => set_tweak("nav", mode)}>{mode}</button
			>
		{/each}
	</div>

	</PaneHeader> -->


	<!-- <div class="tree">
		<div class="tree-folder">
			<span class="chev">▾</span><span class="ico">▣</span><span>docs</span>
		</div>
		<div class="tree-children">
			{#each DOCS as group}
				<div class="tree-folder">
					<span class="chev">▾</span><span class="ico">▣</span><span>{slugify(group.group)}</span>
				</div>
				<div class="tree-children">
					{#each group.items as item}
						<a
							class="tree-item"
							class:active={item.id === active_id}
							href={item.path}
							onclick={close_nav}
						>
							<span>{slugify(item.title)}</span><span class="ext">.md</span>
						</a>
					{/each}
				</div>
			{/each}
		</div>
	</div> -->

	<!-- <div class="grouped-nav">
		{#each DOCS as group}
			<div class="g-section">{group.group}</div>
			{#each group.items as item}
				<a
					class="g-link"
					class:active={item.id === active_id}
					href={item.path}
					onclick={close_nav}>{item.title}</a
				>
			{/each}
		{/each}
	</div> -->

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
					<span class="idx">{String(ii + 1).padStart(2, "0")}</span>
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

	.mode-switch {
		display: flex;
		gap: 2px;
		padding: 10px 12px;
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
		border-bottom: 1px dotted var(--docs-line);
	}
	.mode-switch button {
		background: transparent;
		border: none;
		color: var(--docs-fg-mute);
		font-family: var(--docs-mono);
		font-size: var(--docs-fs-xs);
		padding: 2px 6px;
		cursor: pointer;
		border-radius: 2px;
	}
	.mode-switch button:hover {
		color: var(--docs-fg-dim);
		background: var(--docs-bg-2);
	}
	.mode-switch button.active {
		color: var(--docs-accent);
		font-weight: bold;
		/*border-color: var(--docs-accent-dim);*/
		/*background: color-mix(in oklch, var(--docs-accent) 10%, transparent);*/
	}

	.tree {
		padding: 8px 0;
		font-size: var(--docs-fs-sm);
	}
	.tree-folder {
		padding: 2px 14px;
		color: var(--docs-fg-dim);
		user-select: none;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.tree-folder:hover {
		color: var(--docs-fg);
	}
	.tree-folder .chev {
		color: var(--docs-fg-ghost);
		width: 10px;
		display: inline-block;
	}
	.tree-folder .ico {
		color: var(--t-yellow);
	}
	.tree-children {
		padding-left: 22px;
		border-left: 1px dotted var(--docs-line);
		margin-left: 18px;
	}
	.tree-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 2px 14px 2px 0;
		color: var(--docs-fg-dim);
		text-decoration: none;
		position: relative;
	}
	.tree-item:hover {
		color: var(--docs-fg);
	}
	.tree-item .ext {
		color: var(--docs-fg-ghost);
	}
	.tree-item.active {
		color: var(--docs-accent);
	}
	.tree-item.active::before {
		content: "";
		position: absolute;
		left: -18px;
		top: 50%;
		width: 7px;
		height: 11px;
		transform: translateY(-50%);
		background: var(--docs-accent);
		animation: docs-blink 1.05s steps(1) infinite;
		box-shadow: 0 0 6px var(--docs-accent);
	}

	.grouped-nav {
		display: none;
		padding: 8px 0;
		font-size: var(--docs-fs-sm);
	}
	:global([data-docs-nav="grouped"]) .tree {
		display: none;
	}
	:global([data-docs-nav="grouped"]) .grouped-nav {
		display: block;
	}
	:global([data-docs-nav="grouped"]) .mode-switch {
		border-bottom-style: solid;
	}
	.g-section {
		padding: 14px 16px 4px;
		color: var(--t-green);
		font-family: var(--docs-pixel);
		font-size: 13px;
		letter-spacing: 0.5px;
	}
	.g-link {
		display: block;
		padding: 3px 16px;
		color: var(--docs-fg-dim);
		text-decoration: none;
	}
	.g-link:hover {
		color: var(--docs-fg);
	}
	.g-link.active {
		color: var(--docs-accent);
		background: color-mix(in oklch, var(--docs-accent) 8%, transparent);
	}

	.manpage-nav {
		/*display: none;*/
		padding: 8px 0;
		font-size: var(--docs-fs-sm);
	}
	:global([data-docs-nav="manpage"]) .tree,
	:global([data-docs-nav="manpage"]) .grouped-nav {
		display: none;
	}
	:global([data-docs-nav="manpage"]) .manpage-nav {
		display: block;
	}
	.mp-entry {
		display: grid;
		grid-template-columns: 28px 1fr;
		gap: 8px;
		padding: 2px 14px;
		color: var(--docs-fg-dim);
		text-decoration: none;
	}
	.mp-entry .idx {
		color: var(--docs-fg-ghost);
		text-align: right;
	}
	.mp-entry:hover {
		color: var(--docs-fg);
	}
	.mp-entry.active {
		color: var(--docs-accent);
	}
	.mp-entry.active .idx {
		color: var(--docs-accent-dim);
	}
	.mp-group-label {
		padding: 14px 14px 4px;
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		letter-spacing: 0.6px;
	}
	.mp-group-label .sec {
		color: var(--t-yellow);
	}

	@media (max-width: 760px) {
		.mode-switch {
			flex-wrap: wrap;
		}
	}
</style>
