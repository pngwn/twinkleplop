<script lang="ts">
	import "../../app.css";
	import "../../highlight-styles.css";

	let { children } = $props();
</script>

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
