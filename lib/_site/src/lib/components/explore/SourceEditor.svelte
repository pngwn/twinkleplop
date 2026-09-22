<script lang="ts">
	import { view } from "$lib/explore/lab_state.svelte";
	import { FONTS } from "$lib/explore/themes";

	interface Props {
		value: string;
		error?: string | null;
		textarea?: HTMLTextAreaElement;
	}

	let { value = $bindable(), error = null, textarea = $bindable() }: Props = $props();

	const font = $derived((FONTS.find((f) => f.label === view.font) ?? FONTS[0]).value);
</script>

<div class="source">
	<header class="source__head">
		<div class="source__title">
			<span class="source__prompt" aria-hidden="true">$</span>
			<span>source.buffer</span>
			{#if error}
				<span class="source__error" role="alert">{error}</span>
			{:else}
				<span class="source__hint">edits rewrite this page's link, so it always shares what you see</span>
			{/if}
		</div>
	</header>
	<textarea
		bind:this={textarea}
		bind:value
		class="source__ta"
		aria-label="source code"
		placeholder="paste or type some code"
		spellcheck="false"
		style:font-family={font}
	></textarea>
</div>
