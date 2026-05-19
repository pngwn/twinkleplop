<script lang="ts">
	let {
		fname,
		html,
	}: {
		fname: string;
		html: string;
	} = $props();

	// split fname on the last `.` so the extension can be highlighted in
	// the lang accent color. files without an extension fall through with
	// an empty ext span (rendered nothing).
	const dot = $derived(fname.lastIndexOf("."));
	const base = $derived(dot < 0 ? fname : fname.slice(0, dot));
	const ext = $derived(dot < 0 ? "" : fname.slice(dot));
</script>

<div class="code">
	<div class="head">
		<span class="fname">{base}<span class="ext">{ext}</span></span>
		<span class="copy">copy</span>
	</div>
	{@html html}
</div>

<style>
	.code {
		background: var(--docs-bg-1);
		border: 1px solid var(--docs-line);
		border-radius: 3px;
		font-family: var(--docs-mono);
		font-size: 12.5px;
		line-height: 1.6;
		margin: 14px 0 22px;
		overflow: hidden;
		position: relative;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--docs-line);
		background: var(--docs-bg-2);
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		letter-spacing: 0.4px;
	}
	.fname {
		color: var(--docs-fg-dim);
	}
	.ext {
		color: var(--t-purple);
	}
	.copy {
		margin-left: auto;
		cursor: pointer;
		color: var(--docs-fg-mute);
		padding: 2px 6px;
		border: 1px solid var(--docs-line);
		border-radius: 2px;
	}
	.copy:hover {
		color: var(--docs-accent);
		border-color: var(--docs-accent-dim);
	}
	.code  :global(pre) {
		margin: 0;
		/* horizontal padding lives on the line spans so annotation line-mode
		   overlays (.l.emphasis, .l.diff-add, ...) reach to the edges of the
		   block instead of stopping at the inner padding. */
		padding: 14px 0;
		color: var(--docs-fg);
		overflow-x: auto;
	}
	.code  :global(pre code)  {
		display: block;
		/* every line stretches to the longest line's width, so a line-mode
		   highlight strip extends consistently across the visible code area
		   even when the snippet overflows horizontally. */
		min-width: max-content;
	}
	.code  :global(pre .l) {
		display: inline-block;
		width: 100%;
		padding: 0 14px;
	}
	.code  :global(pre .ln) {
		display: inline-block;
		width: 28px;
		margin-right: 16px;
		text-align: right;
		color: var(--docs-fg-ghost);
		user-select: none;
	}

	/* annotation overlays. line-mode classes attach to <span class="l ...">,
	   token-mode classes attach to <span class="tok ..."> emitted by the
	   renderer. tuned to read across themes via color-mix into the docs
	   palette. */
	.code :global(pre .l.emphasis) {
		background: color-mix(in oklab, var(--docs-accent) 18%, transparent);
		box-shadow: inset 3px 0 0 var(--docs-accent);
	}
	.code :global(pre .l.highlight) {
		background: color-mix(in oklab, var(--t-purple) 22%, transparent);
	}
	.code :global(pre .l.subdued) {
		opacity: 0.45;
	}
	.code :global(pre .l.diff-add) {
		background: color-mix(in oklab, #46c66f 22%, transparent);
		box-shadow: inset 3px 0 0 #46c66f;
	}
	.code :global(pre .l.diff-del) {
		background: color-mix(in oklab, #d8533c 22%, transparent);
		box-shadow: inset 3px 0 0 #d8533c;
	}
	.code :global(pre .l.diff-mod) {
		background: color-mix(in oklab, #c8a64b 20%, transparent);
		box-shadow: inset 3px 0 0 #c8a64b;
	}
	.code :global(pre .l.error) {
		background: color-mix(in oklab, #d8533c 18%, transparent);
		box-shadow: inset 3px 0 0 #d8533c;
	}
	.code :global(pre .l.warning) {
		background: color-mix(in oklab, #d4a13a 18%, transparent);
		box-shadow: inset 3px 0 0 #d4a13a;
	}
	.code :global(pre .l.info) {
		background: color-mix(in oklab, #4a90d9 18%, transparent);
		box-shadow: inset 3px 0 0 #4a90d9;
	}

	.code :global(pre .tok.emphasis) {
		background: color-mix(in oklab, var(--docs-accent) 24%, transparent);
		border-radius: 1px;
	}
	.code :global(pre .tok.highlight) {
		background: color-mix(in oklab, var(--t-purple) 28%, transparent);
		border-radius: 1px;
	}
	.code :global(pre .tok.subdued) {
		opacity: 0.55;
	}
	.code :global(pre .tok.diff-add) {
		background: color-mix(in oklab, #46c66f 28%, transparent);
		border-radius: 1px;
	}
	.code :global(pre .tok.diff-del) {
		background: color-mix(in oklab, #d8533c 28%, transparent);
		border-radius: 1px;
	}
	.code :global(pre .tok.diff-mod) {
		background: color-mix(in oklab, #c8a64b 26%, transparent);
		border-radius: 1px;
	}
	.code :global(pre .tok.error) {
		text-decoration: underline wavy #d8533c;
		text-underline-offset: 3px;
	}
	.code :global(pre .tok.warning) {
		text-decoration: underline wavy #d4a13a;
		text-underline-offset: 3px;
	}
	.code :global(pre .tok.info) {
		text-decoration: underline wavy #4a90d9;
		text-underline-offset: 3px;
	}
</style>
