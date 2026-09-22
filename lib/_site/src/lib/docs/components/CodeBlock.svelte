<script lang="ts">
	import { twoslash_popovers } from "$lib/docs/twoslash_popover";

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

<div class="code" {@attach twoslash_popovers}>
	<div class="head">
		<span class="fname">{base}<span class="ext">{ext}</span></span>
		<span class="copy" aria-hidden="true">copy</span>
	</div>
	{@html html}
</div>

<style>
	.code {
		background: var(--docs-code-bg);
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
		color: var(--docs-fg-mute);
		user-select: none;
	}
	/* inline-block so indent guides span the full line height and join up */
	.code :global(pre .indent) {
		display: inline-block;
		box-shadow: inset 1px 0 0 color-mix(in oklab, var(--docs-fg-mute) 50%, transparent);
	}

	/* annotation overlays. line-mode classes attach to <span class="l ...">,
	   token-mode classes attach to <span class="tok ..."> emitted by the
	   renderer. tuned to read across themes via color-mix into the docs
	   palette. */
	.code :global(pre .l.emphasis) {
		background: color-mix(in oklab, var(--docs-accent) calc(18% * var(--docs-anno)), transparent);
		box-shadow: inset 3px 0 0 var(--docs-accent);
	}
	.code :global(pre .l.highlight) {
		background: color-mix(in oklab, var(--t-purple) calc(22% * var(--docs-anno)), transparent);
	}
	.code :global(pre .l.subdued),
	.code :global(pre.has-focus .l:not(.focus)) {
		opacity: 0.45;
	}
	.code :global(pre .l.diff-add) {
		background: color-mix(in oklab, #46c66f calc(22% * var(--docs-anno)), transparent);
		box-shadow: inset 3px 0 0 #46c66f;
	}
	.code :global(pre .l.diff-del) {
		background: color-mix(in oklab, #d8533c calc(22% * var(--docs-anno)), transparent);
		box-shadow: inset 3px 0 0 #d8533c;
	}
	.code :global(pre .l.diff-mod) {
		background: color-mix(in oklab, #c8a64b calc(20% * var(--docs-anno)), transparent);
		box-shadow: inset 3px 0 0 #c8a64b;
	}
	.code :global(pre .l.error) {
		background: color-mix(in oklab, #d8533c calc(18% * var(--docs-anno)), transparent);
		box-shadow: inset 3px 0 0 #d8533c;
	}
	.code :global(pre .l.warning) {
		background: color-mix(in oklab, #d4a13a calc(18% * var(--docs-anno)), transparent);
		box-shadow: inset 3px 0 0 #d4a13a;
	}
	.code :global(pre .l.info) {
		background: color-mix(in oklab, #4a90d9 calc(18% * var(--docs-anno)), transparent);
		box-shadow: inset 3px 0 0 #4a90d9;
	}

	.code :global(pre .tok.emphasis) {
		background: color-mix(in oklab, var(--docs-accent) calc(24% * var(--docs-anno)), transparent);
		border-radius: 1px;
	}
	.code :global(pre .tok.highlight) {
		background: color-mix(in oklab, var(--t-purple) calc(28% * var(--docs-anno)), transparent);
		border-radius: 1px;
	}
	.code :global(pre .tok.subdued) {
		opacity: 0.55;
	}
	.code :global(pre .tok.diff-add) {
		background: color-mix(in oklab, #46c66f calc(28% * var(--docs-anno)), transparent);
		border-radius: 1px;
	}
	.code :global(pre .tok.diff-del) {
		background: color-mix(in oklab, #d8533c calc(28% * var(--docs-anno)), transparent);
		border-radius: 1px;
	}
	.code :global(pre .tok.diff-mod) {
		background: color-mix(in oklab, #c8a64b calc(26% * var(--docs-anno)), transparent);
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

	/* twoslash. the renderer emits no line spans, so the block carries the
	   horizontal padding the .l spans would otherwise hold. */
	.code :global(pre.twoslash) {
		padding: 14px;
	}
	.code :global(pre.twoslash:hover .twoslash-target) {
		text-decoration: underline dotted color-mix(in oklab, var(--docs-fg-mute) 60%, transparent);
		text-underline-offset: 3px;
	}
	.code :global(pre.twoslash .twoslash-hover:hover > .twoslash-target) {
		text-decoration-color: var(--docs-accent);
	}
	/* hidden until twoslash_popover.ts lifts it into the top layer. it stays
	   a descendant of pre.twinkleplop, so theme token colors still apply. */
	.code :global(.twoslash-popover) {
		display: none;
	}
	.code :global(.twoslash-popover:popover-open) {
		display: block;
		position: fixed;
		inset: auto;
		margin: 0;
		max-width: min(72ch, calc(100vw - 16px));
		max-height: min(24rem, calc(100svh - 16px));
		overflow: auto;
		padding: 8px 10px;
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line);
		border-radius: 3px;
		box-shadow: 0 6px 20px rgb(0 0 0 / 0.35);
		color: var(--docs-fg);
		font-family: var(--docs-mono);
		font-size: var(--docs-fs-sm);
		line-height: 1.55;
		white-space: pre-wrap;
	}
	.code :global(.twoslash-popover-docs),
	.code :global(.twoslash-query-docs) {
		display: block;
		margin-top: 6px;
		padding-top: 6px;
		border-top: 1px solid var(--docs-line);
		color: var(--docs-fg-dim);
	}
	.code :global(.twoslash-popover-tags),
	.code :global(.twoslash-query-tags) {
		display: block;
		margin-top: 4px;
		color: var(--docs-fg-dim);
	}
	.code :global(.twoslash-popover-tag),
	.code :global(.twoslash-query-tag) {
		display: block;
	}
	.code :global(.twoslash-popover-tag)::before,
	.code :global(.twoslash-query-tag)::before {
		content: "@" attr(data-tag) " ";
		color: var(--docs-fg-mute);
	}
	.code :global(.twoslash-popover-tag-name),
	.code :global(.twoslash-query-tag-name) {
		color: var(--docs-fg);
	}

	/* line annotations render after the line they belong to. */
	.code :global(.twoslash-query),
	.code :global(.twoslash-error-line),
	.code :global(.twoslash-tag) {
		display: block;
		width: max-content;
		max-width: 100%;
		margin: 2px 0 4px;
		padding: 4px 10px;
		border-left: 2px solid var(--docs-line);
		background: var(--docs-bg-2);
		white-space: pre-wrap;
	}
	.code :global(.twoslash-query) {
		border-left-color: var(--docs-accent);
	}
	.code :global(.twoslash-error) {
		text-decoration: underline wavy #d8533c;
		text-underline-offset: 3px;
	}
	.code :global(.twoslash-error-line) {
		border-left-color: #d8533c;
		color: var(--docs-fg-dim);
	}
	.code :global(.twoslash-tag) {
		color: var(--docs-fg-dim);
	}
	.code :global(.twoslash-tag)::before {
		content: "@" attr(data-tag-name) " ";
		color: var(--docs-fg-mute);
	}
	.code :global(.twoslash-tag[data-tag-name="warn"]) {
		border-left-color: #d4a13a;
	}
	.code :global(.twoslash-tag[data-tag-name="error"]) {
		border-left-color: #d8533c;
	}
	.code :global(.twoslash-highlight) {
		background: color-mix(in oklab, var(--t-purple) calc(22% * var(--docs-anno)), transparent);
		border-radius: 1px;
	}
	.code :global(.twoslash-completions) {
		display: block;
		width: max-content;
		margin: 2px 0 4px;
		padding: 4px 10px;
		border-left: 2px solid var(--docs-accent);
		background: var(--docs-bg-2);
	}
	.code :global(.twoslash-completion-entry) {
		display: block;
	}
</style>
