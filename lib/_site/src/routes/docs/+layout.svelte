<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import '$lib/styles/docs.css';
	import { FLAT, find_by_id } from '$lib/docs/nav';
	import { chrome, close_nav } from '$lib/docs/chrome.svelte';
	import { hydrate_mode } from '$lib/theme_mode.svelte';

	import TopBar from '$lib/docs/components/TopBar.svelte';
	import NavPane from '$lib/docs/components/NavPane.svelte';
	import BottomBar from '$lib/docs/components/BottomBar.svelte';
	import CrtOverlay from '$lib/docs/components/CrtOverlay.svelte';
	import MobileScrim from '$lib/docs/components/MobileScrim.svelte';
	import "@twinkleplop/theme-github";
	let { children } = $props();

	const active_id = $derived.by(() => {
		const path = page.url.pathname.replace(/\/$/, '');
		const entry = FLAT.find((e) => e.path.replace(/\/$/, '') === path);
		return entry?.id ?? 'home';
	});

	const active_entry = $derived(find_by_id(active_id));

	$effect(() => {
		active_id;
		close_nav();
	});

	onMount(() => {
		hydrate_mode();
	});
</script>

<svelte:head>
	<title>{active_entry ? `${active_entry.title} · twinkleplop docs` : 'twinkleplop · docs'}</title>
</svelte:head>

<div class="docs-root" data-nav-open={chrome.nav_open ? '1' : undefined}>
	<TopBar />
	<MobileScrim />

	<div class="shell">
		<NavPane {active_id} />
		{@render children()}
	</div>

	<CrtOverlay />
	<BottomBar />
</div>

<style>
	.shell {
		display: grid;
		grid-template-columns: 240px 1fr;
		flex: 1;
		min-height: 0;
		border-bottom: 1px solid var(--docs-line);
	}
	.shell :global(> .pane + .pane) {
		border-left: 1px dashed var(--docs-line);
	}


	@media (max-width: 760px) {
		.shell {
			display: block;
			flex: none;
			min-height: 0;
			border-bottom: 0;
		}
		.shell :global(> .pane + .pane) {
			border-left: 0;
		}
		.shell :global(> .pane:nth-child(1)) {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 52px;
			width: auto;
			max-width: none;
			background: var(--docs-bg);
			border-right: 0;
			border-top: 1px solid var(--docs-line);
			transform: translateY(100%);
			transition: transform 0.22s ease;
			z-index: 50;
			overflow-y: auto;
		}
		:global(.docs-root[data-nav-open='1']) .shell :global(> .pane:nth-child(1)) {
			transform: translateY(0);
		}
		.shell :global(> .pane:nth-child(2)) {
			height: auto;
			overflow: visible;
			padding-bottom: 20px;
		}
	}
</style>
