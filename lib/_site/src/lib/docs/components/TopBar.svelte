<script lang="ts">
	import Keycap from "./Keycap.svelte";
	import { open_palette } from "../chrome.svelte";

	const BRAND = "twinkleplop";
	const TWINKLE_COLORS = [
		"t-red",
		"t-orange",
		"t-yellow",
		"t-green",
		"t-teal",
		"t-blue",
		"t-purple",
		"t-pink",
		"t-red",
		"t-yellow",
	];
</script>

<header class="topbar">
	<a class="brand" href="/docs">
		{#each BRAND.split("") as ch, i}
			<span class="rainbow-letter" style:color="var(--{TWINKLE_COLORS[i]})">{ch}</span>
		{/each}
	</a>
	<nav class="nav-links">
		<a href="/explore">lab</a><span class="sep">/</span>
		<a href="/benchmarks">compare</a><span class="sep">/</span>
		<a class="active" href="/docs">docs</a><span class="sep">/</span>
		<a href="#changelog">changelog</a>
	</nav>
	<button class="top-search" title="Press / or ⌘K" onclick={open_palette}>
		<span class="prompt">$</span>
		<span class="placeholder">search docs…</span>
		<span class="kbd-row">
			<Keycap>⌘</Keycap>
			<Keycap>K</Keycap>
		</span>
	</button>
</header>

<style>
	.topbar {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 24px;
		height: 44px;
		padding: 0 20px;
		border-bottom: 1px solid var(--docs-line);
		background: var(--docs-bg);
		position: relative;
		z-index: 10;
		flex-shrink: 0;
	}
	.brand {
		font-family: var(--docs-pixel);
		font-size: 20px;
		letter-spacing: 0.5px;
		color: var(--docs-fg);
		display: inline-flex;
		align-items: baseline;
		text-decoration: none;
	}
	.brand:hover {
		text-shadow: 0 0 4px color-mix(in oklch, currentColor 50%, transparent);
	}

	.nav-links {
		display: flex;
		gap: 4px;
		font-size: var(--docs-fs-sm);
		color: var(--docs-fg-mute);
	}
	.nav-links .sep {
		color: var(--docs-fg-ghost);
		padding: 0 2px;
	}
	.nav-links a {
		color: var(--docs-fg-dim);
		padding: 2px 6px;
		border-radius: 2px;
		text-decoration: none;
	}
	.nav-links a:hover {
		color: var(--docs-fg);
		background: var(--docs-bg-2);
	}
	.nav-links a.active {
		color: var(--docs-accent);
	}

	.top-search {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 26px;
		padding: 0 10px;
		border: 1px solid var(--docs-line);
		border-radius: 2px;
		background: var(--docs-bg-1);
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-sm);
		min-width: 260px;
		cursor: text;
		font-family: inherit;
	}
	.top-search:hover {
		border-color: var(--docs-accent-dim);
		color: var(--docs-fg-dim);
	}
	.top-search .prompt {
		color: var(--docs-accent);
	}
	.top-search .placeholder {
		flex: 1;
		color: var(--docs-fg-mute);
		text-align: left;
	}
	.top-search .kbd-row {
		margin-left: auto;
		display: inline-flex;
		gap: 3px;
	}

	@media (max-width: 760px) {
		.topbar {
			display: none;
		}
	}
</style>
