<script lang="ts">
	import { onMount } from "svelte";

	let {
		text,
		size = "md",
	}: {
		text: string;
		size?: "md" | "xl";
	} = $props();

	const TWINKLE_COLORS = [
		"t-red",
		"t-orange",
		"t-yellow",
		"t-green",
		"t-teal",
		"t-blue",
		"t-purple",
		"t-pink",
	];

	let twinkle = $state(false);
	onMount(() => {
		twinkle = true;
	});
</script>

<h1 class="pixel-title" class:size-xl={size === "xl"}>
	{#if twinkle}
		{#each text.split("") as ch, i}
			{#if ch === " "}
				{" "}
			{:else}
				<span
					class="rl a"
					style:color="var(--{TWINKLE_COLORS[i % TWINKLE_COLORS.length]})"
					style:animation-delay="{i * 55}ms">{ch}</span
				>
			{/if}
		{/each}
	{:else}
		{text}
	{/if}
</h1>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Doto:wght@100..900&family=Sixtyfour:BLED,SCAN@0..100,-53..100&display=swap');
	.pixel-title {
		/*font-family: var(--font-mono);*/
		font-family: 'Doto';
		font-weight: 1000;
		font-variation-settings: "wght" 500;

		font-size: 50px;
		font-weight: 600;
		letter-spacing: 0;
		margin: 0 0 10px;
		line-height: 1.05;
		color: var(--docs-fg);
		white-space: normal;
		word-break: normal;
		overflow-wrap: normal;
	}
	.pixel-title.size-xl {
		/*font-size: 54px;*/
		line-height: 1;
		margin: 0 0 16px;
	}
	.rl {
		display: inline;
		vertical-align: baseline;
		white-space: pre;
	}
	.rl.a {
		animation: twinkle-in 1.2s ease-out both;
	}
	@keyframes twinkle-in {
		0% {
			opacity: 0;
			transform: translateY(3px);
			filter: brightness(2);
		}
		60% {
			opacity: 1;
			filter: brightness(1.3);
		}
		100% {
			opacity: 1;
			transform: none;
			filter: none;
		}
	}

	@media (max-width: 760px) {
		.pixel-title {
			font-size: 32px;
		}
		.pixel-title.size-xl {
			font-size: 38px;
		}
	}
</style>
