<script lang="ts">
	// One side of the /twoslash comparison. Each pane is styled by its own
	// package's shipped stylesheet, both of which the page imports, so what
	// shows up is what a consumer of either package gets out of the box.

	let {
		label,
		note,
		variant,
		html,
		error
	}: {
		label: string;
		note: string;
		variant: 'twinkleplop' | 'shiki';
		html: string | null;
		error: string | null;
	} = $props();
</script>

<section class="pane" class:is-twp={variant === 'twinkleplop'} class:is-shiki={variant === 'shiki'}>
	<header class="head">
		<span class="label">{label}</span>
		<span class="note">{note}</span>
	</header>
	{#if error === null}
		<div class="body">{@html html}</div>
	{:else}
		<pre class="failure">{error.trim()}</pre>
	{/if}
</section>

<style>
	.pane {
		display: flex;
		flex-direction: column;
		min-width: 0;
		border: 1px solid var(--docs-line);
		border-radius: 3px;
		background: var(--docs-bg-1);
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--docs-line);
		background: var(--docs-bg-2);
		font-size: var(--docs-fs-xs);
		letter-spacing: 0.4px;
	}
	.label {
		color: var(--docs-fg);
	}
	.note {
		margin-left: auto;
		color: var(--docs-fg-mute);
	}

	.body {
		font-family: var(--docs-mono);
		font-size: var(--docs-fs-sm);
		line-height: 1.6;
	}
	.body :global(pre) {
		margin: 0;
		padding: 14px;
		/* popovers are absolutely positioned inside the block, so an `overflow`
		   of any kind here clips them. snippets are cut narrow enough to fit
		   instead; on phones the block scrolls and they do get clipped. */
		overflow: visible;
	}
	@media (max-width: 760px) {
		.body :global(pre) {
			overflow-x: auto;
		}
	}

	.failure {
		margin: 0;
		padding: 14px;
		color: var(--t-red);
		font-family: var(--docs-mono);
		font-size: var(--docs-fs-sm);
		line-height: 1.55;
		white-space: pre-wrap;
	}

	/* `--twp-twoslash-surface` defaults to `Canvas` and is declared on
	   `.twoslash` itself, so an ancestor cannot redirect it. */
	.is-twp .body :global(pre.twinkleplop) {
		background: var(--twp-background);
		--twp-twoslash-surface: var(--twp-background);
	}

	/* only elements that actually declare `--shiki-light` are recoloured: a
	   blanket `span` rule would also repaint the popup's doc text, which
	   shiki colours itself. */
	.is-shiki .body :global([style*='--shiki-light']) {
		color: var(--shiki-light);
	}
	.is-shiki .body :global(pre.shiki) {
		background-color: var(--shiki-light-bg);
	}
	:global(html[data-mode='dark']) .is-shiki .body :global([style*='--shiki-light']) {
		color: var(--shiki-dark);
	}
	:global(html[data-mode='dark']) .is-shiki .body :global(pre.shiki) {
		background-color: var(--shiki-dark-bg);
	}
	/* the popup paints its own surface; the <pre> nested inside it must not
	   paint the editor background back over it. */
	.is-shiki .body :global(.twoslash-popup-container pre.shiki) {
		background-color: transparent;
	}

	/* style-rich.css ships light-only defaults, so dark needs the popup
	   surface moved or hover type renders near-white on near-white. */
	:global(html[data-mode='dark']) .is-shiki {
		--twoslash-popup-bg: #161b22;
		--twoslash-popup-color: #e6edf3;
		--twoslash-popup-shadow: rgb(1 4 9 / 0.85) 0 8px 24px;
		--twoslash-border-color: #30363d;
		--twoslash-docs-color: #8b949e;
		--twoslash-unmatched-color: #8b949e;
		--twoslash-cursor-color: #6e7681;
	}

	/* both packages namespace their markup `.twoslash-*`. shiki scopes its
	   rules under `.twoslash`, a class twinkleplop's <pre> also carries, and
	   twinkleplop's rules are unscoped, so `-hover`, `-error` and
	   `-error-line` land in both panes. every other name differs. the rules
	   below hand each of the three back to the pane that owns it. */
	.is-twp .body :global(.twoslash-hover) {
		border-bottom: 0;
		transition: none;
	}
	.is-twp .body :global(.twoslash-error) {
		background: none;
		padding-bottom: 0;
	}
	.is-twp .body :global(.twoslash-error-line) {
		min-width: 0;
		margin: 2px 0 4px;
		padding: 4px 10px;
		background: none;
		color: inherit;
		border-left: 2px solid var(--twp-twoslash-error, #d8533c);
	}
	.is-shiki .body :global(.twoslash-error) {
		text-decoration: none;
	}
	.is-shiki .body :global(.twoslash-error-line) {
		max-width: none;
	}
</style>
