<script lang="ts">
	import type { density_mode } from "$lib/explore/themes";

	interface Props {
		value: string;
		visible: boolean;
		font: string;
		density: density_mode;
		on_change: (next: string) => void;
		on_toggle_visible: () => void;
	}

	let { value, visible, font, density, on_change, on_toggle_visible }: Props = $props();

	let ta: HTMLTextAreaElement | undefined = $state();

	$effect(() => {
		if (visible && ta) ta.focus();
	});

	function handle_input(e: Event & { currentTarget: HTMLTextAreaElement }) {
		on_change(e.currentTarget.value);
	}
</script>

<div class="source" class:is-open={visible}>
	<header class="source__head">
		<div class="source__title">
			<span class="source__prompt">$</span>
			<span>source.buffer</span>
			<span class="source__hint">— editable · your changes stream into both panes</span>
		</div>
		<button class="source__toggle" type="button" onclick={on_toggle_visible}>
			{visible ? "collapse ▲" : "edit ▼"}
		</button>
	</header>
	{#if visible}
		<textarea
			bind:this={ta}
			class="source__ta"
			{value}
			spellcheck="false"
			style:font-family={font}
			data-density={density}
			oninput={handle_input}
		></textarea>
	{/if}
</div>
