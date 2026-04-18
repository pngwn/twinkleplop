<script lang="ts">
	import type { density_mode } from "$lib/explore/themes";

	interface Props {
		title: string;
		subtitle: string;
		pane_id: string;
		lines: string[];
		palette_style: string;
		show_line_numbers: boolean;
		density: density_mode;
		font: string;
		perf_ms: number;
		perf_token_count: number;
	}

	let {
		title,
		subtitle,
		pane_id,
		lines,
		palette_style,
		show_line_numbers,
		density,
		font,
		perf_ms,
		perf_token_count,
	}: Props = $props();

	function pad_ln(n: number): string {
		return String(n).padStart(3, " ");
	}
</script>

<div class="pane" data-pane={pane_id} style={palette_style}>
	<header class="pane__head">
		<div class="pane__title-group">
			<div class="pane__title">{title}</div>
			<div class="pane__subtitle">{subtitle}</div>
		</div>
		<div class="pane__meta"></div>
	</header>

	<div class="pane__body" style:font-family={font}>
		<pre class="code" data-density={density}>{#each lines as line, li (li)}<div
					class="code__line"
				>{#if show_line_numbers}<span class="code__ln">{pad_ln(li + 1)}</span>{/if}<span
						class="code__content"
					>{#if line.length === 0}<span class="code__empty"> </span>{:else}{@html line}{/if}</span
					></div>{/each}</pre>
	</div>

	<footer class="pane__foot">
		<div class="pane__foot-l">
			<span class="dot"></span>
			<span>{perf_token_count} tokens</span>
			<span class="sep">·</span>
			<span>{lines.length} lines</span>
		</div>
		<div class="pane__foot-r">
			<span class="perf">
				<span class="perf__label">parse</span>
				<span class="perf__value">{perf_ms.toFixed(4)}ms</span>
			</span>
		</div>
	</footer>
</div>
