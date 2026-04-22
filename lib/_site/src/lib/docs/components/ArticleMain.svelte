<script lang="ts">
	import PaneHeader from "./PaneHeader.svelte";
	import Breadcrumbs from "./Breadcrumbs.svelte";
	import PixelTitle from "./PixelTitle.svelte";
	import PrevNext from "./PrevNext.svelte";

	type crumb = { label: string; href?: string };
	type direction = { dir: string; label: string; href: string } | null;

	let {
		pane_path,
		last_edit = "",
		breadcrumb = [] as crumb[],
		tagline,
		title,
		subtitle,
		prev = null as direction,
		next = null as direction,
		children,
	}: {
		pane_path: string;
		last_edit?: string;
		breadcrumb?: crumb[];
		tagline?: string;
		title?: string;
		subtitle?: string;
		prev?: direction;
		next?: direction;
		children: import("svelte").Snippet;
	} = $props();
</script>

<main class="pane">
	<PaneHeader label={pane_path} mode="— you are here" right={last_edit} path />
	<div class="content">
		<!-- <Breadcrumbs crumbs={breadcrumb} /> -->

		{#if title}
			<div class="title-block">
				{#if tagline}
					<span class="tagline">{tagline}</span>
				{/if}
				<PixelTitle text={title} />
				{#if subtitle}
					<p class="subtitle">{@html subtitle}<span class="cursor-block"></span></p>
				{/if}
			</div>
		{/if}

		{@render children()}

		<PrevNext {prev} {next} />
	</div>
</main>

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

	.content {
		max-width: 760px;
		margin: 0 auto;
		padding: 30px 36px 120px;
	}
	.content :global(p) {
		margin: 0 0 12px;
		color: var(--docs-fg-dim);
	}
	.content :global(p strong),
	.content :global(li strong) {
		color: var(--docs-fg);
		font-weight: 600;
	}
	.content :global(p code),
	.content :global(li code),
	.content :global(td code) {
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line-2);
		padding: 1px 5px;
		border-radius: 2px;
		color: var(--docs-fg);
		font-size: 0.92em;
		font-family: var(--docs-mono);
	}
	.content :global(ul) {
		padding-left: 20px;
		color: var(--docs-fg-dim);
	}
	.content :global(ul li::marker) {
		color: var(--docs-fg-ghost);
		content: "› ";
	}
	.content :global(a) {
		color: var(--docs-accent);
		text-decoration: none;
	}
	.content :global(a:hover) {
		text-shadow: 0 0 8px color-mix(in oklch, var(--docs-accent) 60%, transparent);
	}

	.title-block {
		margin-bottom: 26px;
	}
	.tagline {
		display: inline-block;
		padding: 2px 8px;
		border: 1px dashed var(--docs-line);
		border-radius: 2px;
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		letter-spacing: 0.5px;
		margin-bottom: 10px;
	}
	.subtitle {
		color: var(--docs-fg-dim);
		font-size: var(--docs-fs-body);
		margin: 0;
	}
	.subtitle :global(code) {
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line-2);
		padding: 1px 5px;
		border-radius: 2px;
		color: var(--docs-fg);
		font-size: 0.92em;
		font-family: var(--docs-mono);
	}
	.subtitle :global(.kbd) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		font-family: var(--docs-mono);
		font-size: 10px;
		color: var(--docs-fg-dim);
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line);
		border-bottom-width: 2px;
		border-radius: 2px;
		line-height: 1;
		letter-spacing: 0.5px;
	}

	.cursor-block {
		display: inline-block;
		width: 0.55em;
		height: 1em;
		background: var(--docs-accent);
		vertical-align: -2px;
		animation: docs-blink 1.05s steps(1) infinite;
		margin-left: 2px;
	}

	@media (max-width: 760px) {
		.content {
			padding: 20px 16px 40px;
		}
	}
</style>
