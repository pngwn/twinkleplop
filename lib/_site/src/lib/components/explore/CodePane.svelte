<script lang="ts">
	import type { Snippet } from "svelte";
	interface Props {
		title: string;
		subtitle: string;
		pane_id: string;
		html: string;
		line_count: number;
		font: string;
		show_line_numbers: boolean;
		perf_ms: number;
		perf_token_count: number;
		meta?: Snippet;
	}

	let {
		title,
		subtitle,
		pane_id,
		html,
		line_count,
		font,
		show_line_numbers,
		perf_ms,
		perf_token_count,
		meta,
	}: Props = $props();
</script>

<div class="pane" data-pane={pane_id}>
	<header class="pane__head">
		<div class="pane__title-group">
			<div class="pane__title">{title}</div>
			<div class="pane__subtitle">{subtitle}</div>
		</div>
		<div class="pane__meta">{@render meta?.()}</div>
	</header>

	<div class="pane__body" class:show-line-numbers={show_line_numbers} style:font-family={font}>
		{@html html}
	</div>

	<footer class="pane__foot">
		<div class="pane__foot-l">
			<span class="dot"></span>
			<span>{perf_token_count} tokens</span>
			<span class="sep" aria-hidden="true">·</span>
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
