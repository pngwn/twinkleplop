<script lang="ts">
	import type { swatch } from "../themes_data";

	let { theme }: { theme: swatch } = $props();
</script>

<div class="swatch">
	<div class="split">
		<div class="half dark" style="background:{theme.dark.bg}; color:{theme.dark.fg}">
			<span class="variant-tag" style="color:{theme.dark.fg}">◐ dark</span>
			<div class="sample"><span style="color:{theme.dark.com}">// a small twinkle</span>
<span style="color:{theme.dark.kw}">const</span> <span style="color:{theme.dark.fg}">planet</span> <span style="color:{theme.dark.fg}">=</span> <span style="color:{theme.dark.str}">'mars'</span>;
<span style="color:{theme.dark.kw}">function</span> <span style="color:{theme.dark.fn}">orbit</span>(<span style="color:{theme.dark.param}">n</span>: <span style="color:{theme.dark.type}">number</span>) &#123;
  <span style="color:{theme.dark.kw}">return</span> <span style="color:{theme.dark.fg}">n</span> <span style="color:{theme.dark.fg}">*</span> <span style="color:{theme.dark.num}">2</span>;
&#125;</div>
		</div>
		<div class="half light" style="background:{theme.light.bg}; color:{theme.light.fg}">
			<span class="variant-tag" style="color:{theme.light.fg}">◑ light</span>
			<div class="sample"><span style="color:{theme.light.com}">// a small twinkle</span>
<span style="color:{theme.light.kw}">const</span> <span style="color:{theme.light.fg}">planet</span> <span style="color:{theme.light.fg}">=</span> <span style="color:{theme.light.str}">'mars'</span>;
<span style="color:{theme.light.kw}">function</span> <span style="color:{theme.light.fn}">orbit</span>(<span style="color:{theme.light.param}">n</span>: <span style="color:{theme.light.type}">number</span>) &#123;
  <span style="color:{theme.light.kw}">return</span> <span style="color:{theme.light.fg}">n</span> <span style="color:{theme.light.fg}">*</span> <span style="color:{theme.light.num}">2</span>;
&#125;</div>
		</div>
	</div>
	<div class="meta">
		<span class="name">{theme.name}</span>
		<span class="pair-label">light + dark</span>
		<div class="chips">
			{#each theme.chips as c}
				<span class="chip" style="background:{c}"></span>
			{/each}
		</div>
	</div>
</div>

<style>
	.swatch {
		border: 1px solid var(--docs-line);
		border-radius: 3px;
		overflow: hidden;
		background: var(--docs-bg-1);
		cursor: pointer;
		transition:
			transform 0.15s,
			border-color 0.15s;
		position: relative;
	}
	.swatch:hover {
		border-color: var(--docs-accent-dim);
		transform: translateY(-1px);
	}
	.split {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		min-height: 146px;
	}
	.half {
		font-family: var(--docs-mono);
		font-size: 10.5px;
		line-height: 1.55;
		padding: 12px 12px;
		overflow: hidden;
		position: relative;
	}
	.half.dark {
		clip-path: polygon(0 0, 100% 0, calc(100% - 20px) 100%, 0 100%);
		padding-right: 22px;
	}
	.half.light {
		clip-path: polygon(20px 0, 100% 0, 100% 100%, 0 100%);
		padding-left: 22px;
	}
	.sample {
		margin-top: 14px;
		white-space: pre;
	}
	.variant-tag {
		position: absolute;
		top: 6px;
		font-family: var(--docs-mono);
		font-size: 9px;
		letter-spacing: 0.8px;
		text-transform: uppercase;
		opacity: 0.5;
	}
	.half.dark .variant-tag {
		left: 10px;
	}
	.half.light .variant-tag {
		right: 10px;
	}
	.meta {
		padding: 8px 12px;
		border-top: 1px solid var(--docs-line);
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
		background: var(--docs-bg-2);
	}
	.name {
		color: var(--docs-fg);
		font-family: var(--docs-pixel);
		font-size: 13px;
	}
	.pair-label {
		color: var(--docs-fg-mute);
		font-size: 9.5px;
		letter-spacing: 0.6px;
		text-transform: uppercase;
	}
	.chips {
		display: flex;
		gap: 3px;
	}
	.chip {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	@media (max-width: 760px) {
		.split {
			min-height: 120px;
		}
		.half {
			font-size: 9.5px;
			padding: 10px;
		}
	}
</style>
