<script lang="ts">
	import { onMount } from 'svelte';

	import Seo from '$lib/components/Seo.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import PixelTitle from '$lib/docs/components/PixelTitle.svelte';
	import ComparePane from '$lib/twoslash/ComparePane.svelte';
	import { hydrate_mode } from '$lib/theme_mode.svelte';
	import type { PageData } from './$types';

	import '$lib/styles/docs.css';
	// token colours, then each package's own twoslash stylesheet. loading both
	// is the point of the page; ComparePane keeps them out of each other's pane.
	import '@twinkleplop/theme-github';
	import '@twinkleplop/twoslash/style.css';
	import '@shikijs/twoslash/style-rich.css';

	let { data }: { data: PageData } = $props();

	onMount(() => {
		hydrate_mode();
	});
</script>

<Seo
	title="twinkleplop · twoslash vs shiki"
	description="The same twoslash snippets rendered by @twinkleplop/twoslash and @shikijs/twoslash, side by side."
/>

<div class="ts-root">
	<SiteHeader />

	<main class="content">
		<header class="intro">
			<PixelTitle text="twoslash" />
			<p class="lede">
				The same snippets, rendered twice: once by <code>@twinkleplop/twoslash</code>, once by
				<code>@shikijs/twoslash</code> with its rich renderer. Hover a marked identifier in either pane.
			</p>
			<p>
				Both sides run the same twoslash — same compiler options, same vfs root, same custom tags —
				so the type information behind the two panes is identical and what differs is the markup and
				the stylesheet each package ships. Each pane is styled by its own package's CSS, unmodified
				apart from dark-mode popup colours for shiki, which <code>style-rich.css</code> leaves to the
				host. The light/dark switch in the header repaints both.
			</p>
			<ul class="diffs">
				<li>
					twinkleplop nests <code>.twoslash-popover</code> inside the hover target; shiki nests
					<code>.twoslash-popup-container</code>, and re-highlights the type string with the
					TypeScript grammar rather than tokenizing it directly.
				</li>
				<li>
					Queries are a block annotation after the line (<code>.twoslash-query</code>) against a
					popup pinned open (<code>.twoslash-query-persisted</code>).
				</li>
				<li>
					shiki's rich renderer draws icons for custom tags and completions; twinkleplop emits the
					tag name from CSS and no icons.
				</li>
				<li>
					Neither block scrolls here, because an <code>overflow</code> on an ancestor clips the popovers
					in both. On phones they scroll, and the popovers do get cut off.
				</li>
			</ul>
			<p class="jump">
				<span class="jump-label">jump</span>
				{#each data.ts_snippets as snippet, i (snippet.id)}
					{#if i > 0}<span class="sep">·</span>{/if}<a href="#{snippet.id}">{snippet.title}</a>
				{/each}
				<span class="sep">·</span><a href="#svelte">Svelte</a>
			</p>
		</header>

		{#each data.ts_snippets as snippet (snippet.id)}
			<section class="snippet" id={snippet.id}>
				<h2>{snippet.title}</h2>
				<p class="blurb">{snippet.blurb}</p>
				<div class="panes">
					<ComparePane
						variant="twinkleplop"
						label="twinkleplop"
						note="@twinkleplop/twoslash"
						html={snippet.twinkleplop.html}
						error={snippet.twinkleplop.error}
					/>
					<ComparePane
						variant="shiki"
						label="shiki"
						note="@shikijs/twoslash · rendererRich"
						html={snippet.shiki.html}
						error={snippet.shiki.error}
					/>
				</div>
			</section>
		{/each}

		<section class="snippet" id="svelte">
			<h2>Svelte</h2>
			<p class="blurb">
				<code>@twinkleplop/twoslash-svelte</code> runs components through
				<code>svelte2tsx</code>, hands the generated TSX to the same TypeScript language service,
				and maps hover, query and error positions back onto the original Svelte source. There is no
				shiki counterpart to put beside it, so these are one pane wide.
			</p>
		</section>

		{#each data.svelte_snippets as snippet (snippet.id)}
			<section class="snippet" id={snippet.id}>
				<h3>{snippet.title}</h3>
				<p class="blurb">{snippet.blurb}</p>
				<div class="panes panes--single">
					<ComparePane
						variant="twinkleplop"
						label="twinkleplop"
						note="@twinkleplop/twoslash-svelte"
						html={snippet.twinkleplop.html}
						error={snippet.twinkleplop.error}
					/>
				</div>
			</section>
		{/each}

		<footer class="outro">
			<p>
				<a href="/docs/twoslash">docs / twoslash</a> documents the API these panes exercise. For
				token-level highlighting against shiki — live, editable, timed — see
				<a href="/explore">explore</a>.
			</p>
		</footer>
	</main>
</div>

<style>
	/* the docs design system without the docs shell: this page scrolls the
	   document instead of an inner pane, so it does not use `.docs-root`. */
	.ts-root {
		--hdr-bg: var(--docs-bg);
		--hdr-bg-plain: var(--docs-bg);
		--hdr-bg-2: var(--docs-bg-2);
		--hdr-line: var(--docs-line);
		--hdr-line-2: var(--docs-line);
		--hdr-fg: var(--docs-fg);
		--hdr-fg-dim: var(--docs-fg-dim);
		--hdr-fg-ghost: var(--docs-fg-ghost);
		--hdr-accent: var(--docs-accent);

		min-height: 100svh;
		background: var(--docs-bg);
		color: var(--docs-fg);
		font-family: var(--docs-mono);
		font-size: var(--docs-fs-body);
		line-height: var(--docs-line-height);
		font-feature-settings:
			'calt' 1,
			'liga' 1;
		/* the panes do not scroll (see ComparePane), so a popover wider than
		   its pane would push the document sideways. clipping this axis alone
		   leaves `overflow-y` visible, so the header still sticks. */
		overflow-x: clip;
	}
	/* the ua stylesheet gives pre/code a bare `monospace` (courier on macos),
	   which beats inheritance */
	.ts-root :global(:where(pre, code, kbd, samp)) {
		font-family: inherit;
	}
	:global(html:not([data-mode='light'])) .ts-root {
		-webkit-font-smoothing: antialiased;
	}

	.content {
		max-width: 1320px;
		margin: 0 auto;
		padding: 30px 28px 120px;
	}

	.intro {
		max-width: 780px;
		margin-bottom: 44px;
	}
	.intro p {
		margin: 0 0 16px;
		color: var(--docs-fg-dim);
	}
	.lede {
		font-size: var(--docs-fs-body);
	}
	.diffs {
		margin: 0 0 18px;
		padding-left: 20px;
		color: var(--docs-fg-dim);
	}
	.diffs li + li {
		margin-top: 8px;
	}
	.diffs li::marker {
		color: var(--docs-fg-mute);
		content: '› ';
	}

	.jump {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px;
		font-size: var(--docs-fs-xs);
		letter-spacing: 0.4px;
	}
	.jump-label {
		color: var(--docs-fg-mute);
		text-transform: uppercase;
	}
	.sep {
		color: var(--docs-fg-ghost);
	}

	.snippet {
		margin-bottom: 40px;
		/* the site header is sticky and 56px tall, so a jump link would
		   otherwise land the heading underneath it */
		scroll-margin-top: 72px;
	}
	/* both completion lists are absolutely positioned and reserve no space,
	   so the section needs room beneath the block or they land on the next
	   one. twinkleplop's hangs lower than shiki's; this clears both. */
	.snippet#completions {
		margin-bottom: 104px;
	}
	.snippet h2 {
		font-size: 22px;
		font-weight: 500;
		margin: 0 0 6px;
		color: var(--docs-fg);
	}
	.snippet h3 {
		font-size: 17px;
		font-weight: 500;
		margin: 0 0 6px;
		color: var(--docs-fg);
	}
	.blurb {
		max-width: 780px;
		margin: 0 0 14px;
		color: var(--docs-fg-dim);
		font-size: var(--docs-fs-sm);
	}

	.panes {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		align-items: start;
	}
	.panes--single {
		grid-template-columns: minmax(0, 1fr);
		max-width: 780px;
	}

	.outro {
		max-width: 780px;
		padding-top: 24px;
		border-top: 1px solid var(--docs-line);
		color: var(--docs-fg-dim);
	}
	.outro p {
		margin: 0;
	}

	.ts-root :global(a) {
		color: var(--docs-accent);
		text-decoration: none;
	}
	.ts-root :global(a:hover) {
		text-shadow: 0 0 8px color-mix(in oklch, var(--docs-accent) 60%, transparent);
	}
	/* inline code in the prose only; the panes style their own. */
	.intro :global(code),
	.blurb :global(code),
	.outro :global(code) {
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line-2);
		padding: 1px 5px;
		border-radius: 2px;
		color: var(--docs-fg);
		font-size: 0.92em;
	}

	@media (max-width: 1000px) {
		.panes {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 760px) {
		.content {
			padding: 20px 16px 60px;
		}
	}
</style>
