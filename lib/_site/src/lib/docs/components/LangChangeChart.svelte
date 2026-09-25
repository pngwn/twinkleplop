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

	// languages differ in throughput by more than their changes do, so a
	// shared scale would flatten every column next to the fastest one
	function height(l: VersionChange, mbps: number | null): number {
		const max = Math.max(l.before[mode] ?? 0, l.after[mode] ?? 0);
		if (!max || mbps === null) return 1;
		return Math.max((mbps / max) * PLOT_HEIGHT, 1);
	}

	function format_delta(l: VersionChange): string {
		const before = l.before[mode];
		const after = l.after[mode];
		if (before === null || after === null) return "";
		const delta = after - before;
		return `${delta >= 0 ? "+" : ""}${Math.abs(delta) >= 100 ? delta.toFixed(0) : delta.toFixed(1)} MB/s`;
	}

	let active = $state<{ lang: string; x: number; y: number } | null>(null);
	const active_lang = $derived(
		active ? (languages.find((l) => l.lang === active!.lang) ?? null) : null,
	);

	function show(lang: string, target: EventTarget | null) {
		const rect = (target as HTMLElement).getBoundingClientRect();
		active = { lang, x: rect.left + rect.width / 2, y: rect.top };
	}

	function hide() {
		active = null;
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
		<span class="meta">MB/s, each language on its own scale</span>
	</div>

	<div class="scroll" onscroll={hide}>
		<ul class="cols" style:--plot="{PLOT_HEIGHT}px">
			{#each languages as l (l.lang)}
				<li class="col">
					<button
						type="button"
						class="hit"
						aria-label="{l.lang}, {before_label} {format_mbps(l.before[mode])}, {after_label} {format_mbps(
							l.after[mode],
						)}, {format_delta(l)}"
						onpointerenter={(e) => show(l.lang, e.currentTarget)}
						onpointerleave={hide}
						onfocus={(e) => show(l.lang, e.currentTarget)}
						onblur={hide}
					>
						<span class="plot">
							<span class="fill before" style:height="{height(l, l.before[mode])}px"></span>
							<span class="fill after" style:height="{height(l, l.after[mode])}px"></span>
						</span>
						<span class="lang">{l.lang}</span>
						<span class="num {tone(l[mode])}">{format_change(l[mode])}</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
</div>

<svelte:window onscroll={hide} />

{#if active && active_lang}
	<div class="tip" role="tooltip" style:left="{active.x}px" style:top="{active.y}px">
		<span class="tip-lang">{active_lang.lang}</span>
		<span class="tip-row"
			><span class="key before">{before_label}</span> {format_mbps(active_lang.before[mode])}</span
		>
		<span class="tip-row"
			><span class="key after">{after_label}</span> {format_mbps(active_lang.after[mode])}</span
		>
		<span class="tip-delta {tone(active_lang[mode])}"
			>{format_delta(active_lang)} ({format_change(active_lang[mode])})</span
		>
	</div>
{/if}

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
		width: max-content;
		min-width: 100%;
		box-sizing: border-box;
	}
	.cols .col {
		flex: 1 0 58px;
		margin: 0;
		display: flex;
	}
	.hit {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		margin: 0 3px;
		padding: 0 2px;
		border: 0;
		border-radius: 2px;
		background: none;
		font: inherit;
		font-size: var(--docs-fs-xs);
		color: inherit;
		cursor: default;
	}
	.cols .col + .col {
		border-left: 1px dotted var(--docs-fg-ghost);
	}
	.hit:hover,
	.hit:focus-visible {
		background: var(--docs-bg-2);
		outline: none;
	}
	.hit:focus-visible {
		box-shadow: inset 0 0 0 1px var(--docs-accent-dim);
	}
	.plot {
		box-sizing: border-box;
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
		display: block;
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

	.tip {
		position: fixed;
		z-index: 50;
		transform: translate(-50%, calc(-100% - 8px));
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px 9px;
		border: 1px solid var(--docs-line-2);
		border-radius: 3px;
		background: var(--docs-bg-2);
		box-shadow: 0 4px 14px rgb(0 0 0 / 0.25);
		font-family: var(--docs-mono);
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg);
		white-space: nowrap;
		pointer-events: none;
	}
	.tip-lang {
		color: var(--docs-fg-dim);
	}
	.tip-delta.up {
		color: var(--docs-accent);
	}
	.tip-delta.down {
		color: var(--t-yellow);
	}
	.tip-delta.flat {
		color: var(--docs-fg-mute);
	}
</style>
