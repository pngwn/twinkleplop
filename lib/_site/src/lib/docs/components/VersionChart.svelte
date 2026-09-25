<script lang="ts">
	import type { Mode, VersionStep } from "../../../routes/docs/benchmarks/+page.server";

	let {
		steps,
		mode,
		title,
	}: {
		steps: VersionStep[];
		mode: Mode;
		title: string;
	} = $props();

	const max = $derived(Math.max(...steps.map((s) => s.mb_per_sec[mode] ?? 0)));

	function format_mbps(mbps: number | null): string {
		if (mbps === null) return "";
		return `${mbps >= 100 ? mbps.toFixed(0) : mbps.toFixed(1)} MB/s`;
	}

	function format_change(ratio: number | null): string {
		if (ratio === null) return "";
		const pct = (ratio - 1) * 100;
		return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
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
		<span class="meta">throughput across every chart</span>
	</div>

	<ul class="bars">
		{#each steps as step, i (step.commit)}
			{@const pct = Math.max(((step.mb_per_sec[mode] ?? 0) / max) * 100, 0.75)}
			{@const change = step[mode]}
			<li class="bar" class:latest={i === 0}>
				<span class="name">
					<span class="version">{step.version ?? "?"}</span>
					<a href="https://github.com/pngwn/twinkleplop/commit/{step.commit}"
						>{step.commit.slice(0, 7)}</a
					>
				</span>
				<div class="track" title="measured {step.date}, node {step.node}">
					<div class="fill" style:width="{pct}%"></div>
					<span class="value">{format_mbps(step.mb_per_sec[mode])}</span>
				</div>
				{#if step.previous}
					<span
						class="ratio {tone(change)}"
						title="other libraries moved {format_change(step.reference)} between the same two runs"
						>{format_change(change)}</span
					>
				{:else}
					<span class="ratio flat">first run</span>
				{/if}
			</li>
		{/each}
	</ul>
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
		color: var(--docs-fg-dim);
	}
	.name .version {
		color: var(--docs-fg);
	}
	.latest .name .version {
		color: var(--docs-accent);
	}
	.name a {
		color: var(--docs-fg-mute);
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
		background: var(--docs-accent);
		opacity: 0.4;
		transition: width 0.3s ease;
	}
	.latest .fill {
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
		white-space: nowrap;
	}
	.ratio.up {
		color: var(--docs-accent);
	}
	.ratio.down {
		color: var(--t-yellow);
	}
	.ratio.flat {
		color: var(--docs-fg-mute);
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
