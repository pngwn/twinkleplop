<script lang="ts">
	import "../../app.css";
	import "../../highlight-styles.css";

	let { children } = $props();
</script>

{@render children?.()}

<style>
	:global(html),
	:global(body) {
		height: 100%;
		overflow: hidden;
	}
</style>
