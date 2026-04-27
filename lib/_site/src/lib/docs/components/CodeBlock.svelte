<script lang="ts">
	let {
		fname,
		lang,
		html,
	}: {
		fname: string;
		lang: string;
		html: string;
	} = $props();
</script>

<div class="code">
	<div class="head">
		<span class="fname">{fname}</span>
		<span class="lang">{lang}</span>
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
	.lang {
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
		padding: 14px 14px 14px 14px;
		color: var(--docs-fg);
		overflow-x: auto;
	}
	.code  :global(pre code)  {
		display: block;
	}
	.code  :global(pre .ln) {
		display: inline-block;
		width: 40px;
		text-align: right;
		color: var(--docs-fg-ghost);
		padding-right: 16px;
		user-select: none;
	}

	/*@media (max-width: 760px) {
		pre {
			font-size: 11px;
			line-height: 1.55;
		}
		pre :global(.ln) {
			width: 28px;
			padding-right: 10px;
		}
	}*/
</style>
