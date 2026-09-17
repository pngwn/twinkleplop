<script lang="ts">
	interface Props {
		twinkle_ms: number;
		shiki_ms: number;
	}

	let { twinkle_ms, shiki_ms }: Props = $props();

	let max = $derived(Math.max(twinkle_ms, shiki_ms, 0.01));
	let twinkle_w = $derived((twinkle_ms / max) * 100);
	let shiki_w = $derived((shiki_ms / max) * 100);
	let plop_faster = $derived(twinkle_ms < shiki_ms);
	let delta_ms = $derived(Math.abs(shiki_ms - twinkle_ms));
	let ratio = $derived(
		Math.max(twinkle_ms, shiki_ms) /
			Math.max(0.001, Math.min(twinkle_ms, shiki_ms)),
	);
	let ratio_txt = $derived(`×${ratio.toFixed(2)}`);
</script>

<div class="racebar">
	<div class="racebar__row">
		<span class="racebar__who">twinkleplop</span>
		<div class="racebar__track">
			<div
				class="racebar__fill racebar__fill--plop"
				style:width="{twinkle_w}%"
			></div>
			{#if plop_faster}
				<span class="racebar__delta racebar__delta--win">
					<span class="racebar__delta-sign">−</span>
					<span>{delta_ms.toFixed(4)}ms</span>
					<span class="racebar__delta-sep" aria-hidden="true">·</span>
					<span>{ratio_txt} faster</span>
				</span>
			{/if}
		</div>
		<span class="racebar__t">{twinkle_ms.toFixed(4)}ms</span>
	</div>
	<div class="racebar__row">
		<span class="racebar__who">shiki</span>
		<div class="racebar__track">
			<div
				class="racebar__fill racebar__fill--shiki"
				style:width="{shiki_w}%"
			></div>
			{#if !plop_faster}
				<span class="racebar__delta racebar__delta--win">
					<span class="racebar__delta-sign">−</span>
					<span>{delta_ms.toFixed(4)}ms</span>
					<span class="racebar__delta-sep" aria-hidden="true">·</span>
					<span>{ratio_txt} faster</span>
				</span>
			{/if}
		</div>
		<span class="racebar__t">{shiki_ms.toFixed(4)}ms</span>
	</div>
</div>
