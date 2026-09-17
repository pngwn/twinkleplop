<script lang="ts">
	import { rainbow } from "./plop";

	let { text }: { text: string } = $props();

	const chars = $derived([...text]);
	const at = (i: number) => (chars.length > 1 ? i / (chars.length - 1) : 0);
</script>

<span class="rainbow"
	>{#each chars as ch, i}<span style:--rb-dark={rainbow(at(i))} style:--rb-light={rainbow(at(i), "light")}
			>{ch}</span
		>{/each}</span
>

<style>
	.rainbow > span {
		color: var(--rb-dark);
	}
	:global(:root[data-mode="light"]) .rainbow > span {
		color: var(--rb-light);
	}
</style>
