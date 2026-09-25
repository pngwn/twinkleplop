<script lang="ts">
	import type { Mode, VersionChange } from "../../../routes/docs/benchmarks/+page.server";

	let {
		languages,
		mode,
		before_label,
		after_label,
		title,
	}: {
		languages: VersionChange[];
		mode: Mode;
		before_label: string;
		after_label: string;
		title: string;
	} = $props();

	const PLOT_HEIGHT = 150;

	const max = $derived(
		Math.max(...languages.flatMap((l) => [l.before[mode] ?? 0, l.after[mode] ?? 0]), 1),
	);

	function height(mbps: number | null): number {
		return Math.max(((mbps ?? 0) / max) * PLOT_HEIGHT, 1);
	}

	function format_mbps(mbps: number | null): string {
		if (mbps === null) return "";
		return `${mbps >= 100 ? mbps.toFixed(0) : mbps.toFixed(1)} MB/s`;
	}

	function format_change(ratio: number | null): string {
		if (ratio === null) return "";
		const pct = (ratio - 1) * 100;
		return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
	}

	// moves this small repeat run to run on the same box
	function tone(ratio: number | null): string {
		if (ratio === null || Math.abs(ratio - 1) < 0.02) return "flat";
		return ratio > 1 ? "up" : "down";
	}
</script>

<div class="chart">
	<div class="head">
		<span class="dot"></span>
		<span class="lbl">{title}</span>
		<span class="legend">
			<span class="key before">{before_label}</span>
			<span class="key after">{after_label}</span>
		</span>
		<span class="meta">MB/s</span>
	</div>

	<div class="scroll">
		<ul class="cols" style:--plot="{PLOT_HEIGHT}px">
			{#each languages as l (l.lang)}
				<li class="col">
					<div class="plot">
						<div
							class="fill before"
							style:height="{height(l.before[mode])}px"
							title="{l.lang} {before_label} {format_mbps(l.before[mode])}"
						></div>
						<div
							class="fill after"
							style:height="{height(l.after[mode])}px"
							title="{l.lang} {after_label} {format_mbps(l.after[mode])}"
						></div>
					</div>
					<span class="lang">{l.lang}</span>
					<span class="num {tone(l[mode])}">{format_change(l[mode])}</span>
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
	.key.before::before {
		background: var(--docs-fg-mute);
		opacity: 0.5;
	}
	.key.after::before {
		background: var(--docs-accent);
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
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 2px;
		width: 100%;
		height: var(--plot);
		margin-bottom: 6px;
		border-bottom: 1px solid var(--docs-line-2);
	}
	.fill {
		width: 12px;
		border-radius: 1px 1px 0 0;
		transition: height 0.3s ease;
	}
	.fill.before {
		background: var(--docs-fg-mute);
		opacity: 0.5;
	}
	.fill.after {
		background: var(--docs-accent);
		opacity: 0.85;
	}
	.lang {
		color: var(--docs-fg-dim);
		white-space: nowrap;
	}
	.num {
		white-space: nowrap;
	}
	.num.up {
		color: var(--docs-accent);
	}
	.num.down {
		color: var(--t-yellow);
	}
	.num.flat {
		color: var(--docs-fg-mute);
	}
</style>
