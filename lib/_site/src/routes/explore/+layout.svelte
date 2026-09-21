<script lang="ts">
	import "../../app.css";
	import Seo from "$lib/components/Seo.svelte";
	import { page } from "$app/state";

	let { children } = $props();

	const lang = $derived(page.params.lang);
</script>

<Seo
	title={lang ? `${lang} · twinkleplop explore` : "twinkleplop · explore"}
	description="Try twinkleplop in the browser: pick a language, theme and font, edit the source and inspect the tokens."
/>

{@render children?.()}

<style>
	/* stylesheets outlive client-side navigation, so lock scrolling only
	 * while the lab is actually on the page */
	:global(html:has(.explore-app)),
	:global(html:has(.explore-app) body) {
		height: 100%;
		overflow: hidden;
	}
</style>
