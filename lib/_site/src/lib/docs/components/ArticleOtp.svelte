<script lang="ts">
	import PaneHeader from "./PaneHeader.svelte";
	import Keycap from "./Keycap.svelte";

	type section = { href: string; label: string; active?: boolean };
	type meta_row = { label: string; value: string };

	let {
		title,
		sections = [] as section[],
	}: {
		title: string;
		sections?: section[];

	} = $props();
</script>

<aside class="pane">
	<PaneHeader label="on this page" />
	<div class="otp-title">{title}</div>
	<ul class="otp-list">
		{#each sections as s}
			<li class:active={s.active}><a href={s.href}>{s.label}</a></li>
		{/each}
	</ul>

	<!-- {#if meta.length}
		<div class="otp-section">
			<div class="lbl">meta</div>
			<dl class="otp-meta">
				{#each meta as m}
					<dt>{m.label}</dt>
					<dd>{m.value}</dd>
				{/each}
			</dl>
		</div>
	{/if} -->

	<div class="otp-section">
		<div class="lbl">shortcuts</div>
		<div class="shortcuts">
			<div class="row">
				<span>open palette</span>
				<span class="kbd-row"><Keycap accent>⌘</Keycap><Keycap accent>K</Keycap></span>
			</div>
			<div class="row">
				<span>search</span>
				<span class="kbd-row"><Keycap>/</Keycap></span>
			</div>
			<div class="row">
				<span>next page</span>
				<span class="kbd-row"><Keycap>j</Keycap></span>
			</div>
			<div class="row">
				<span>prev page</span>
				<span class="kbd-row"><Keycap>k</Keycap></span>
			</div>
		</div>
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

	.otp-title {
		font-family: var(--docs-mono);
		font-size: 14px;
		color: var(--t-green);
		margin: 12px 14px 10px;
		letter-spacing: 0.3px;
	}
	.otp-list {
		list-style: none;
		padding: 0 14px 10px;
		margin: 0;
		font-size: var(--docs-fs-xs);
	}
	.otp-list li {
		padding: 3px 0;
		border-left: 1px dotted var(--docs-line);
		padding-left: 10px;
		margin-left: 4px;
	}
	.otp-list li::marker {
		content: "";
	}
	.otp-list a {
		color: var(--docs-fg-mute);
		text-decoration: none;
	}
	.otp-list a:hover {
		color: var(--docs-fg-dim);
	}
	.otp-list li.active {
		border-left-color: var(--docs-accent);
	}
	.otp-list li.active a {
		color: var(--docs-accent);
	}

	.otp-section {
		padding: 16px 14px 8px;
		border-top: 1px dotted var(--docs-line);
		margin-top: 6px;
	}
	.lbl {
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		text-transform: uppercase;
		letter-spacing: 0.8px;
		margin-bottom: 8px;
	}
	.otp-meta {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 10px;
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-dim);
		margin: 0;
	}
	.otp-meta dt {
		color: var(--docs-fg-mute);
	}
	.otp-meta dd {
		margin: 0;
		color: var(--docs-fg-dim);
	}
	.shortcuts {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 4px;
		color: var(--docs-fg-dim);
		font-size: var(--docs-fs-xs);
	}
	.shortcuts .row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.kbd-row {
		display: inline-flex;
		gap: 3px;
		align-items: center;
	}
</style>
