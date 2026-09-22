<script lang="ts">
	import PaneHeader from "./PaneHeader.svelte";
	import Breadcrumbs from "./Breadcrumbs.svelte";
	import PixelTitle from "./PixelTitle.svelte";
	import PrevNext from "./PrevNext.svelte";
	import {page} from "$app/state";
	import {DOCS} from '../nav';

	let current_page = $derived(page.url.pathname)


	const flat_docs = Object.values(DOCS).flatMap(v => {
		return v.items
	})

	let current_item = $derived(flat_docs.findIndex(item => item.path === current_page))
	$inspect(current_item);
	let prev = $derived(flat_docs?.[current_item - 1] ? { dir: "← prev", label: flat_docs[current_item - 1].title, href: flat_docs[current_item - 1].path } : null)
	let next = $derived(flat_docs?.[current_item + 1] ? { dir: "→ next", label: flat_docs[current_item + 1].title, href: flat_docs[current_item + 1].path } : null)


	let {
		pane_path,
		title,
		subtitle,
		children,
	}: {
		pane_path: string;
		title?: string;
		subtitle?: string;
		children: import("svelte").Snippet;
	} = $props();
</script>

<main class="pane">
	<PaneHeader label={pane_path}   path />
	<div class="content">

		{#if title}
			<div class="title-block">

				<PixelTitle text={title} />
				{#if subtitle}
					<p class="subtitle">{@html subtitle}<span class="cursor-block" aria-hidden="true"></span></p>
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
		margin: 0 0 20px;
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
		margin: 0 0 20px;
		padding-left: 20px;
		color: var(--docs-fg-dim);
	}
	.content :global(li + li) {
		margin-top: 10px;
	}
	.content :global(ul li::marker) {
		color: var(--docs-fg-mute);
		content: "› ";
	}
	.content :global(a) {
		color: var(--docs-accent);
	}
	.content :global(a:hover) {
		text-shadow: 0 0 8px color-mix(in oklch, var(--docs-accent) 60%, transparent);
	}
	.content :global(blockquote) {
		margin: 0 0 20px;
		padding-left: 16px;
		border-left: 2px solid var(--docs-line);
		font-style: italic;
	}
	.content :global(blockquote p) {
		margin: 0;
	}

	.content :global(table) {
		display: block;
		overflow-x: auto;
		max-width: 100%;
		border-collapse: collapse;
		font-size: var(--docs-fs-sm);
		margin: 8px 0 18px;
		color: var(--docs-fg-dim);
	}
	.content :global(thead) {
		border-bottom: 1px solid var(--docs-line);
	}
	.content :global(th),
	.content :global(td) {
		text-align: left;
		padding: 7px 10px;
		border-bottom: 1px dotted var(--docs-line);
		vertical-align: top;
	}
	.content :global(th) {
		color: var(--docs-fg-mute);
		font-weight: 400;
		font-size: var(--docs-fs-xs);
		text-transform: uppercase;
		letter-spacing: 0.6px;
		background: var(--docs-bg-1);
	}
	.content :global(tbody tr:last-child td) {
		border-bottom: 0;
	}
	.content :global(tbody tr:hover) {
		background: color-mix(in oklch, var(--docs-bg-1) 60%, transparent);
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
