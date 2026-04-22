<script lang="ts">
	import { chrome, close_nav } from "../chrome.svelte";
</script>

<div
	class="scrim"
	class:visible={chrome.nav_open}
	onclick={close_nav}
	role="presentation"
	aria-hidden={!chrome.nav_open}
></div>

<style>
	.scrim {
		display: none;
		position: fixed;
		inset: 0 0 52px 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(1px);
		z-index: 45;
	}
	@media (max-width: 760px) {
		.scrim.visible {
			display: block;
		}
	}
</style>
