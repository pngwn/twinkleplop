<script lang="ts">
	import { format_ms, speedup } from "$lib/explore/measure";

	interface Props {
		twinkle_ms: number;
		shiki_ms: number;
	}

	let { twinkle_ms, shiki_ms }: Props = $props();

	let max = $derived(Math.max(twinkle_ms, shiki_ms, 0.01));
	let rows = $derived([
		{ who: "twinkleplop", kind: "plop", ms: twinkle_ms, wins: twinkle_ms < shiki_ms },
		{ who: "shiki", kind: "shiki", ms: shiki_ms, wins: twinkle_ms >= shiki_ms },
	]);
	let lead = $derived(
		`−${format_ms(Math.abs(shiki_ms - twinkle_ms))} · ${speedup(twinkle_ms, shiki_ms)} faster`,
	);
</script>

<div class="racebar">
	{#each rows as row (row.who)}
		<span class="racebar__who">{row.who}</span>
		<div class="racebar__track">
			<div class="racebar__fill racebar__fill--{row.kind}" style:width="{(row.ms / max) * 100}%"></div>
			{#if row.wins}<span class="racebar__lead">{lead}</span>{/if}
		</div>
		<span class="racebar__t">{format_ms(row.ms)}</span>
	{/each}
</div>
