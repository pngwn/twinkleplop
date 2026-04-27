<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import '$lib/styles/docs.css';
	import { FLAT, find_by_id } from '$lib/docs/nav';
	import {
		chrome,
		hydrate_from_storage,
		open_palette,
		close_nav,
		close_tweaks
	} from '$lib/docs/chrome.svelte';
	import { theme_mode, hydrate_mode } from '$lib/theme_mode.svelte';

	import TopBar from '$lib/docs/components/TopBar.svelte';
	import NavPane from '$lib/docs/components/NavPane.svelte';
	import StatusLine from '$lib/docs/components/StatusLine.svelte';
	import BottomBar from '$lib/docs/components/BottomBar.svelte';
	import CommandPalette from '$lib/docs/components/CommandPalette.svelte';
	import TweaksPanel from '$lib/docs/components/TweaksPanel.svelte';
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
	const status_path = $derived(active_entry ? `${active_entry.crumb}.md` : 'docs / welcome.md');

	$effect(() => {
		active_id;
		close_nav();
	});

	function handle_keydown(e: KeyboardEvent) {
		if (chrome.palette_open) return;
		if (e.key === 'Escape' && chrome.tweaks_open) {
			e.preventDefault();
			close_tweaks();
			return;
		}
		const is_mac = navigator.platform.includes('Mac');
		const meta = is_mac ? e.metaKey : e.ctrlKey;
		if (meta && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			open_palette();
			return;
		}
		const tag = (document.activeElement?.tagName ?? '').toUpperCase();
		if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
			e.preventDefault();
			open_palette();
		}
	}

	onMount(() => {
		hydrate_from_storage();
		hydrate_mode();
		window.addEventListener('keydown', handle_keydown);
		return () => window.removeEventListener('keydown', handle_keydown);
	});
</script>

<svelte:head>
	<title>{active_entry ? `${active_entry.title} · twinkleplop docs` : 'twinkleplop · docs'}</title>
</svelte:head>

<div
	class="docs-root {theme_mode.resolved}"
	data-docs-mode={theme_mode.resolved}
	data-docs-density={chrome.tweaks.density}
	data-docs-nav={chrome.tweaks.nav}
	data-docs-crt={chrome.tweaks.crt}
	data-nav-open={chrome.nav_open ? '1' : undefined}
>
	<TopBar />
	<MobileScrim />

	<div class="shell">
		<NavPane {active_id} />
		{@render children()}
	</div>

	<!-- <StatusLine path={status_path} /> -->
	<CrtOverlay />
	<CommandPalette />
	<TweaksPanel />
	<BottomBar />
</div>

<style>
	.shell {
		display: grid;
		grid-template-columns: 240px 1fr 220px;
		flex: 1;
		min-height: 0;
		border-bottom: 1px solid var(--docs-line);
	}
	.shell :global(> .pane + .pane) {
		border-left: 1px dashed var(--docs-line);
	}

	@media (max-width: 1100px) {
		.shell {
			grid-template-columns: 220px 1fr;
		}
		.shell :global(> .pane:nth-child(3)) {
			display: none;
		}
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
		.shell :global(> .pane:nth-child(3)) {
			display: none;
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
