<script lang="ts" module>
	export interface readout {
		index: number;
		type: string;
		text: string;
		note?: string;
		// the full scope chain, shown on hover
		detail?: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from "svelte";
	import { format_ms } from "$lib/explore/measure";

	interface Props {
		pane_id: string;
		title: string;
		// loading or error text beside the title
		status?: string | null;
		font: string;
		show_line_numbers: boolean;
		token_count: number;
		line_count: number;
		ms: number;
		readout?: readout | null;
		// shown until the highlighted html arrives
		plain?: string;
		meta?: Snippet;
		// the lab writes the highlighted html here itself, see ExploreLab
		code_el?: HTMLElement;
	}

	let {
		pane_id,
		title,
		status = null,
		font,
		show_line_numbers,
		token_count,
		line_count,
		ms,
		readout = null,
		plain,
		meta,
		code_el = $bindable(),
	}: Props = $props();
</script>

<section class="pane" data-pane={pane_id} id="pane-{pane_id}" aria-label={title}>
	<header class="pane__head">
		<h2 class="pane__title">{title}</h2>
		{#if status}<span class="pane__status">{status}</span>{/if}
		{@render meta?.()}
	</header>

	<div class="pane__body" class:show-line-numbers={show_line_numbers} style:font-family={font}>
		<div bind:this={code_el}></div>
		{#if plain}<pre class="code code--plain"><code>{plain}</code></pre>{/if}
	</div>

	<footer class="pane__foot">
		{#if readout}
			<span class="pane__readout" title={readout.detail}>
				#{readout.index} <span class="pane__type">{readout.type}</span>
				{JSON.stringify(readout.text)}
				{#if readout.note}<span class="pane__note">· {readout.note}</span>{/if}
			</span>
		{:else}
			<span class="dot" aria-hidden="true"></span>
			<span>{token_count} tokens · {line_count} lines</span>
		{/if}
		<span class="pane__ms">{format_ms(ms)}</span>
	</footer>
</section>
