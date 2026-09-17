<script lang="ts">
	import { rainbow } from "./plop";

	let { text }: { text: string } = $props();

	const chars = $derived([...text]);
</script>

<span class="rainbow"
	>{#each chars as ch, i}<span style:color={rainbow(chars.length > 1 ? i / (chars.length - 1) : 0)}
			>{ch}</span
		>{/each}</span
>
