<script lang="ts">
	import type { density_mode } from "$lib/explore/themes";

	interface Props {
		title: string;
		subtitle: string;
		pane_id: string;
		shiki_html: string | null;
		source: string;
		font: string;
		density: density_mode;
		show_line_numbers: boolean;
		perf_ms: number;
		perf_token_count: number;
	}

	let {
		title,
		subtitle,
		pane_id,
		shiki_html,
		source,
		font,
		density,
		show_line_numbers,
		perf_ms,
		perf_token_count,
	}: Props = $props();

	let line_count = $derived(source ? source.split("\n").length : 0);
</script>

<div class="pane" data-pane={pane_id}>
	<header class="pane__head">
		<div class="pane__title-group">
			<div class="pane__title">{title}</div>
			<div class="pane__subtitle">{subtitle}</div>
		</div>
		<div class="pane__meta"></div>
	</header>

	<div
		class="pane__body"
		class:show-line-numbers={show_line_numbers}
		data-density={density}
		style:font-family={font}
	>
		{#if shiki_html}
			<!-- shiki renders a styled <pre>; the explore stylesheet strips its
				 own background so our pane chrome shows through. -->
			{@html shiki_html}
		{:else}
			<pre class="code" data-density={density}><code>{source}</code></pre>
		{/if}
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
