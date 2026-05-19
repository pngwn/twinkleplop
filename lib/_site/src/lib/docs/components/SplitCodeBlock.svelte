<script lang="ts">
	import CodeBlock from "./CodeBlock.svelte";

	let {
		lang,
		left_html,
		right_html,
		left_label = "input",
		right_label = "output",
	}: {
		lang: string;
		left_html: string;
		right_html: string;
		left_label?: string;
		right_label?: string;
	} = $props();

	// map the docs `lang` token to the conventional file extension so the
	// pane headers read like `input.ts` / `output.ts` rather than the
	// default fname-noisy form.
	const ext_map: Record<string, string> = {
		typescript: "ts",
		javascript: "js",
		bash: "sh",
		html: "html",
		css: "css",
	};
	const ext = $derived(ext_map[lang] ?? lang);
</script>

<div class="split_container">
	<div class="split">
		<CodeBlock fname="{left_label}.{ext}" html={left_html} />
		<CodeBlock fname="{right_label}.{ext}" html={right_html} />
	</div>
</div>

<style>
	/* container query host: snap to stacked layout based on this component's
	   own inline size, not the viewport. an embed in a narrow sidebar should
	   stack even on a wide screen, and a wide article column should stay
	   side-by-side even at narrow viewports. */
	.split_container {
		container-type: inline-size;
		margin: 14px 0 22px;
	}
	.split {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
	/* the two children sit flush as one unified pane: shared inner border,
	   only the outer corners are rounded. */
	.split :global(.code) {
		margin: 0;
		border-radius: 0;
	}
	.split :global(.code:first-child) {
		border-top-left-radius: 3px;
		border-bottom-left-radius: 3px;
	}
	.split :global(.code:last-child) {
		border-top-right-radius: 3px;
		border-bottom-right-radius: 3px;
		/* drop the duplicated inner border so the two panes share one. */
		border-left: 0;
	}
	/* the snippets are intentionally short, so we keep side-by-side until
	   the container itself drops below 450px. */
	@container (max-width: 450px) {
		.split {
			grid-template-columns: 1fr;
		}
		.split :global(.code) {
			border-radius: 0;
		}
		.split :global(.code:first-child) {
			border-top-left-radius: 3px;
			border-top-right-radius: 3px;
		}
		.split :global(.code:last-child) {
			border-top: 0;
			border-left: 1px solid var(--docs-line);
			border-bottom-left-radius: 3px;
			border-bottom-right-radius: 3px;
		}
	}
</style>
