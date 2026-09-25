<script lang="ts">
	import type { VersionChange } from "../../../routes/docs/benchmarks/+page.server";

	let {
		languages,
		title,
		subtitle,
	}: {
		languages: VersionChange[];
		title: string;
		subtitle: string;
	} = $props();

	const PLOT_HEIGHT = 140;

	const pcts = $derived(
		languages.flatMap((l) => [l.tokenize, l.html]).filter((r) => r !== null).map((r) => (r - 1) * 100),
	);
	const top = $derived(Math.max(0, ...pcts));
	const bottom = $derived(Math.max(0, ...pcts.map((p) => -p)));
	const span = $derived(top + bottom || 1);
	const zero = $derived((top / span) * PLOT_HEIGHT);

	function bar(ratio: number | null): { y: number; h: number } {
		if (ratio === null) return { y: zero, h: 0 };
		const h = (Math.abs(ratio - 1) * 100 * PLOT_HEIGHT) / span;
		return ratio >= 1 ? { y: zero - h, h } : { y: zero, h };
	}

	function format_change(ratio: number | null): string {
		if (ratio === null) return "";
		const pct = (ratio - 1) * 100;
		return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
	}
</script>

<div class="chart">
	<div class="head">
		<span class="dot"></span>
		<span class="lbl">{title}</span>
		<span class="legend">
			<span class="key tokenize">tokenise</span>
			<span class="key html">tokenise + render</span>
		</span>
		<span class="meta">{subtitle}</span>
	</div>

	<div class="scroll">
		<ul class="cols" style:--plot="{PLOT_HEIGHT}px">
			{#each languages as l (l.lang)}
				{@const t = bar(l.tokenize)}
				{@const h = bar(l.html)}
				<li class="col">
					<div class="plot">
						<div class="zero" style:top="{zero}px"></div>
						<div
							class="fill tokenize"
							class:neg={l.tokenize !== null && l.tokenize < 1}
							style:top="{t.y}px"
							style:height="{Math.max(t.h, 1)}px"
							title="{l.lang} tokenise {format_change(l.tokenize)}"
						></div>
						<div
							class="fill html"
							class:neg={l.html !== null && l.html < 1}
							style:top="{h.y}px"
							style:height="{Math.max(h.h, 1)}px"
							title="{l.lang} tokenise + render {format_change(l.html)}"
						></div>
					</div>
					<span class="lang">{l.lang}</span>
					<span class="num tokenize">{format_change(l.tokenize)}</span>
					<span class="num html">{format_change(l.html)}</span>
				</li>
			{/each}
		</ul>
	</div>
</div>

<style>
	.chart {
		margin: 0 0 14px;
		border: 1px solid var(--docs-line);
		background: var(--docs-bg-1);
		border-radius: 3px;
		font-family: var(--docs-mono);
		overflow: hidden;
	}
	.head {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px 10px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--docs-line);
		background: var(--docs-bg-2);
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
		letter-spacing: 0.4px;
	}
	.head .dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--docs-accent);
		box-shadow: 0 0 6px var(--docs-accent);
	}
	.head .lbl {
		color: var(--docs-fg-dim);
	}
	.legend {
		display: flex;
		gap: 12px;
	}
	.key::before {
		content: "";
		display: inline-block;
		width: 8px;
		height: 8px;
		margin-right: 5px;
		border-radius: 1px;
		vertical-align: -1px;
	}
	.key.tokenize::before {
		background: var(--docs-accent);
	}
	.key.html::before {
		background: var(--t-blue);
	}
	.head .meta {
		margin-left: auto;
		white-space: nowrap;
	}

	.scroll {
		overflow-x: auto;
		overscroll-behavior-x: contain;
	}
	.cols {
		list-style: none;
		margin: 0;
		padding: 14px 12px 10px;
		display: flex;
		gap: 6px;
		width: max-content;
		min-width: 100%;
		box-sizing: border-box;
	}
	.cols .col {
		flex: 1 0 52px;
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		font-size: var(--docs-fs-xs);
	}
	.plot {
		position: relative;
		width: 100%;
		height: var(--plot);
		margin-bottom: 6px;
	}
	.zero {
		position: absolute;
		left: -3px;
		right: -3px;
		height: 1px;
		background: var(--docs-line-2);
	}
	.fill {
		position: absolute;
		width: 12px;
		border-radius: 1px;
		opacity: 0.8;
		transition:
			top 0.3s ease,
			height 0.3s ease;
	}
	.fill.tokenize {
		right: calc(50% + 1px);
		background: var(--docs-accent);
	}
	.fill.html {
		left: calc(50% + 1px);
		background: var(--t-blue);
	}
	.fill.neg {
		background: var(--t-yellow);
	}
	.lang {
		color: var(--docs-fg-dim);
		white-space: nowrap;
	}
	.num {
		white-space: nowrap;
		font-size: 10px;
	}
	.num.tokenize {
		color: var(--docs-accent);
	}
	.num.html {
		color: var(--t-blue);
	}
</style>
