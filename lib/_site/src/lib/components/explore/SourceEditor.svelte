<script lang="ts">
	import type { Snippet } from "svelte";
	import { view } from "$lib/explore/lab_state.svelte";
	import { FONTS } from "$lib/explore/themes";

	interface Props {
		value: string;
		error?: string | null;
		textarea?: HTMLTextAreaElement;
		actions?: Snippet;
		on_close: () => void;
	}

	let {
		value = $bindable(),
		error = null,
		textarea = $bindable(),
		actions,
		on_close,
	}: Props = $props();

	const font = $derived((FONTS.find((f) => f.label === view.font) ?? FONTS[0]).value);
</script>

<div class="source">
	<header class="source__head">
		<span class="source__prompt" aria-hidden="true">$</span>
		<span>source.buffer</span>
		{#if error}
			<span class="source__error" role="alert">{error}</span>
		{:else}
			<span class="source__hint">· edits update this page's link</span>
		{/if}
		<span class="source__actions">
			{@render actions?.()}
			<button class="source__btn" type="button" onclick={on_close}>close</button>
		</span>
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
