<script lang="ts">
	import type { density_mode } from "$lib/explore/themes";

	interface Props {
		title: string;
		subtitle: string;
		pane_id: string;
		html: string;
		line_count: number;
		palette_style: string;
		density: density_mode;
		font: string;
		perf_ms: number;
		perf_token_count: number;
	}

	let {
		title,
		subtitle,
		pane_id,
		html,
		line_count,
		palette_style,
		density,
		font,
		perf_ms,
		perf_token_count,
	}: Props = $props();
</script>

<div class="pane" data-pane={pane_id} style={palette_style}>
	<header class="pane__head">
		<div class="pane__title-group">
			<div class="pane__title">{title}</div>
			<div class="pane__subtitle">{subtitle}</div>
		</div>
		<div class="pane__meta"></div>
	</header>

	<div class="pane__body" style:font-family={font} data-density={density}>
		{@html html}
	</div>

	<footer class="pane__foot">
		<div class="pane__foot-l">
			<span class="dot"></span>
			<span>{perf_token_count} tokens</span>
			<span class="sep">·</span>
			<span>{line_count} lines</span>
		</div>
		<div class="pane__foot-r">
			<span class="perf">
				<span class="perf__label">parse</span>
				<span class="perf__value">{perf_ms.toFixed(4)}ms</span>
			</span>
		</div>
	</footer>
</div>
