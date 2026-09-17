<script lang="ts">
	import type { Chart } from "../../../routes/docs/benchmarks/+page.server";

	let {
		chart,
		title,
		subtitle,
	}: {
		chart: Chart;
		title: string;
		subtitle: string;
	} = $props();

	const LIBRARY_COLORS: Record<string, string> = {
		twinkleplop: "var(--docs-accent)",
		"shiki-wasm": "var(--t-teal)",
		"shiki-js": "var(--t-blue)",
		prism: "var(--t-yellow)",
		"sugar-high": "var(--t-pink)",
	};
	const DEFAULT_COLOR = "var(--t-purple)";
	const color_for = (id: string) => LIBRARY_COLORS[id] ?? DEFAULT_COLOR;

	function format_hz(hz: number): string {
		if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(2)}M`;
		if (hz >= 1_000) return `${(hz / 1_000).toFixed(1)}k`;
		if (hz >= 100) return hz.toFixed(0);
		return hz.toFixed(1);
	}

	function format_ratio(ratio: number): string {
		if (ratio >= 10) return `${ratio.toFixed(0)}x slower`;
		return `${ratio.toFixed(1)}x slower`;
	}

	function format_tokens(n: number): string {
		return n.toLocaleString("en-US");
	}

	const with_tokens = $derived(chart.bars.filter((b) => b.tokens !== null));
</script>

<div class="chart">
	<div class="head">
		<span class="dot"></span>
		<span class="lbl">{title}</span>
		<span class="meta">{subtitle}</span>
	</div>

	<ul class="bars">
		{#each chart.bars as b (b.id)}
			{@const pct = Math.max((1 / b.ratio) * 100, 0.75)}
			<li class="bar" class:ours={b.id === "twinkleplop"}>
				<span class="name" style:color={color_for(b.id)}>{b.label}</span>
				<div class="track" title="{b.mb_per_sec.toFixed(1)} MB/s">
					<div class="fill" style:width="{pct}%" style:background={color_for(b.id)}></div>
					<span class="value">{format_hz(b.ops_per_sec)} ops/s</span>
				</div>
				<span class="ratio" class:fastest={b.ratio <= 1.005}>
					{b.ratio <= 1.005 ? "fastest" : format_ratio(b.ratio)}
				</span>
			</li>
		{/each}
	</ul>

	{#if with_tokens.length}
		<div class="foot">
			<span class="foot-lbl">tokens emitted</span>
			{#each with_tokens as b (b.id)}
				<span class="tok"
					><span style:color={color_for(b.id)}>{b.label}</span> {format_tokens(b.tokens ?? 0)}</span
				>
			{/each}
		</div>
	{/if}
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
		gap: 10px;
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
	.head .meta {
		margin-left: auto;
		white-space: nowrap;
	}

	.bars {
		list-style: none;
		margin: 0;
		padding: 14px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.bar {
		display: grid;
		grid-template-columns: 128px 1fr 80px;
		align-items: center;
		gap: 10px;
	}
	.name {
		font-size: var(--docs-fs-xs);
		letter-spacing: 0.3px;
		text-align: right;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.track {
		position: relative;
		height: 22px;
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line-2);
		border-radius: 2px;
		overflow: hidden;
	}
	.fill {
		position: absolute;
		inset: 0 auto 0 0;
		opacity: 0.55;
		transition: width 0.3s ease;
	}
	.ours .fill {
		opacity: 0.85;
	}
	.value {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		height: 100%;
		padding: 0 8px;
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg);
		white-space: nowrap;
	}
	.ratio {
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
		white-space: nowrap;
	}
	.ratio.fastest {
		color: var(--docs-accent);
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 14px;
		padding: 6px 12px;
		border-top: 1px solid var(--docs-line);
		background: var(--docs-bg-2);
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-dim);
	}
	.foot-lbl {
		color: var(--docs-fg-mute);
		text-transform: uppercase;
		letter-spacing: 0.6px;
	}
	.tok {
		white-space: nowrap;
	}

	@media (max-width: 760px) {
		.bar {
			grid-template-columns: 1fr auto;
			grid-template-areas:
				"name ratio"
				"track track";
			gap: 3px 10px;
		}
		.name {
			grid-area: name;
			text-align: left;
		}
		.track {
			grid-area: track;
		}
		.ratio {
			grid-area: ratio;
		}
		.head .meta {
			display: none;
		}
	}
</style>
