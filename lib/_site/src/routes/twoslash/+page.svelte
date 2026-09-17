<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>twinkleplop · twoslash demo</title>
</svelte:head>

<div class="page">
	<header class="hero">
		<h1>twinkleplop × twoslash</h1>
		<p>
			TypeScript snippets below are rendered at build time by
			<code>@twinkleplop/twoslash</code>: twoslash collects hover types,
			queries and errors from the TypeScript language service, and
			twinkleplop does the syntax highlighting. Hover an identifier to
			see its inferred type.
		</p>
	</header>

	<h2 class="group-heading">TypeScript</h2>
	{#each data.ts_snippets as snippet (snippet.id)}
		<section class="snippet" id={snippet.id}>
			<h2>{snippet.title}</h2>
			<p class="blurb">{snippet.blurb}</p>
			<div class="code-wrap">
				{@html snippet.html}
			</div>
		</section>
	{/each}

	<h2 class="group-heading">Svelte</h2>
	<p class="group-blurb">
		<code>@twinkleplop/twoslash-svelte</code> runs Svelte components through
		<code>svelte2tsx</code>, hands the generated TSX to the same TypeScript
		language service, and maps hover / query / error positions back onto the
		original Svelte source. Runes like <code>$state</code> resolve against
		Svelte's own type declarations.
	</p>
	{#each data.svelte_snippets as snippet (snippet.id)}
		<section class="snippet" id={snippet.id}>
			<h2>{snippet.title}</h2>
			<p class="blurb">{snippet.blurb}</p>
			<div class="code-wrap">
				{@html snippet.html}
			</div>
		</section>
	{/each}
</div>

<style>
	.page {
		max-width: 960px;
		margin: 0 auto;
		padding: 3rem 2rem 6rem;
		font-family: var(--font-mono);
		color: #e4e4e7;
	}

	.hero {
		margin-bottom: 3rem;
		border-bottom: 2px solid #333;
		padding-bottom: 2rem;
	}

	.hero h1 {
		font-family: var(--font-grid, 'VT323', monospace);
		font-size: 3rem;
		margin: 0 0 1rem;
		background: linear-gradient(
			90deg,
			#ff6b6b 0%,
			#ffb86b 14%,
			#ffeb6b 28%,
			#6bffb8 42%,
			#6bebff 57%,
			#6b8eff 71%,
			#b86bff 85%,
			#ff6beb 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero p {
		font-size: 1rem;
		line-height: 1.5;
		color: #bfbdb6;
	}

	.hero code {
		background: #0d0d0d;
		border: 1px solid #333;
		padding: 0.1rem 0.4rem;
		color: #ffb86b;
		font-size: 1rem;
	}

	.group-heading {
		font-family: var(--font-grid, 'VT323', monospace);
		font-size: 2rem;
		margin: 3rem 0 0.5rem;
		padding-top: 2rem;
		border-top: 2px solid #333;
		color: #6bebff;
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.group-blurb {
		font-size: 1.1rem;
		line-height: 1.5;
		color: #bfbdb6;
		margin: 0 0 2rem;
	}

	.group-blurb code {
		background: #0d0d0d;
		border: 1px solid #333;
		padding: 0.1rem 0.4rem;
		color: #ffb86b;
		font-size: 0.95rem;
	}

	.snippet {
		margin-bottom: 3rem;
	}

	.snippet h2 {
		font-family: var(--font-pixel, 'Silkscreen', monospace);
		font-size: 1rem;
		letter-spacing: 1px;
		text-transform: uppercase;
		color: #ffb86b;
		margin: 0 0 0.5rem;
	}

	.blurb {
		font-size: 1.1rem;
		line-height: 1.5;
		color: #bfbdb6;
		margin: 0 0 1rem;
	}

	.code-wrap {
		position: relative;
	}

	/* --- rendered highlight ----------------------------------------- */
	/*
	 * The twoslash package emits a single <pre class="twinkleplop twoslash">
	 * with nested <span class="keyword">…</span> etc. tokens. The default
	 * highlight-styles.css in the site uses the CSS Custom Highlight API
	 * (::highlight(keyword)) which only applies to ranges registered by
	 * JS — it has no effect on real <span> elements. So this page ships
	 * its own span-based palette.
	 */
	.code-wrap :global(pre.twinkleplop.twoslash) {
		background: #0d0d0d;
		border: 2px solid #333;
		padding: 1.25rem 1.5rem;
		/*overflow-x: auto;*/
		font-family: var(--font-mono);
		font-size: 1.15rem;
		line-height: 1.6;
		box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
	}

	.code-wrap :global(pre.twinkleplop.twoslash code) {
		background: none;
		border: none;
		padding: 0;
		font-family: inherit;
		font-size: inherit;
		color: #e4e4e7;
	}

	.code-wrap :global(.keyword) { color: #ff7733; }
	.code-wrap :global(.operator) { color: #f29668; }
	.code-wrap :global(.string) { color: #b8cc52; }
	.code-wrap :global(.number) { color: #d2a6ff; }
	.code-wrap :global(.comment) { color: #5c6773; font-style: italic; }
	/* Svelte-specific tokens from @twinkleplop/svelte grammar */
	.code-wrap :global(.tag_name) { color: #6bebff; }
	.code-wrap :global(.attr_name) { color: #ffb86b; }
	.code-wrap :global(.template) { color: #b8cc52; }
	.code-wrap :global(.boolean) { color: #d2a6ff; }
	.code-wrap :global(.svelte_block) { color: #ff6beb; }
	.code-wrap :global(.svelte_directive) { color: #b86bff; }
	.code-wrap :global(.punctuation) { color: #888; }
	.code-wrap :global(.function) { color: #22d3ee; }
	.code-wrap :global(.identifier) { color: #bfbdb6; }
	.code-wrap :global(.regex) { color: #95e6cb; }
	.code-wrap :global(.selector_class) { color: #22d3ee; }
	.code-wrap :global(.builtin) { color: #c084fc; }

	/* --- twoslash hover tooltips ------------------------------------ */
	/*
	 * The hover wrapper is:
	 *   <span class="twoslash-hover">
	 *     <span class="twoslash-target">…code…</span>
	 *     <span class="twoslash-popover">
	 *       <span class="twoslash-popover-type">…</span>
	 *     </span>
	 *   </span>
	 *
	 * The popover is hidden by default and revealed on hover. Absolute
	 * positioning means it floats above surrounding code. CSS-only.
	 */
	.code-wrap :global(.twoslash-hover) {
		position: relative;
		border-bottom: 1px dotted #555;
	}

	.code-wrap :global(.twoslash-hover:hover) {
		border-bottom-color: #ffb86b;
	}

	.code-wrap :global(.twoslash-popover) {
		display: none;
		position: absolute;

		top: 100%;
		left: 0;
		margin-top: 0.35rem;
		padding: 0.5rem 0.75rem;
		background: #1a1a1a;
		border: 1px solid #ffb86b;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
		color: #e4e4e7;
		font-family: var(--font-mono);
		font-size: 1rem;
		white-space: pre;
		z-index: 20;
		max-width: min(80ch, 90vw);
	}

	.code-wrap :global(.twoslash-hover:hover .twoslash-popover) {
		display: block;
	}

	.code-wrap :global(.twoslash-popover-type) {
		color: #ffeb6b;
	}

	.code-wrap :global(.twoslash-popover-docs) {
		display: block;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid #333;
		color: #bfbdb6;
		white-space: pre-wrap;
	}

	/* --- query (^?) annotation -------------------------------------- */
	.code-wrap :global(.twoslash-query) {
		display: block;
		margin: 0.25rem 0 0.25rem 0;
		padding: 0.5rem 0.75rem;
		border-left: 3px solid #6bebff;
		background: rgba(107, 235, 255, 0.06);
		color: #6bebff;
		white-space: pre;
	}

	.code-wrap :global(.twoslash-query-type) {
		color: #6bebff;
	}

	.code-wrap :global(.twoslash-query-docs) {
		display: block;
		margin-top: 0.25rem;
		color: #bfbdb6;
	}

	/* --- error decoration + message --------------------------------- */
	.code-wrap :global(.twoslash-error) {
		border-bottom: 2px dotted #ff6b6b;
		background: rgba(255, 107, 107, 0.1);
	}

	.code-wrap :global(.twoslash-error-line) {
		display: block;
		margin: 0.25rem 0;
		padding: 0.5rem 0.75rem;
		border-left: 3px solid #ff6b6b;
		background: rgba(255, 107, 107, 0.08);
		color: #ff9b9b;
		white-space: pre-wrap;
	}

	/* --- highlight / tag / completion (minimal) --------------------- */
	.code-wrap :global(.twoslash-highlight) {
		background: rgba(255, 235, 107, 0.15);
		border-bottom: 1px solid #ffeb6b;
	}

	.code-wrap :global(.twoslash-tag) {
		display: block;
		margin: 0.25rem 0;
		padding: 0.35rem 0.6rem;
		border-left: 3px solid #b86bff;
		background: rgba(184, 107, 255, 0.08);
		color: #d2a6ff;
	}

	.code-wrap :global(.twoslash-completion) {
		border-bottom: 1px dashed #6bffb8;
	}

	.code-wrap :global(.twoslash-completions) {
		display: block;
		margin: 0.25rem 0;
		padding: 0.5rem 0.75rem;
		border-left: 3px solid #6bffb8;
		background: rgba(107, 255, 184, 0.06);
		color: #6bffb8;
	}

	.code-wrap :global(.twoslash-completion-entry) {
		display: block;
	}
</style>
