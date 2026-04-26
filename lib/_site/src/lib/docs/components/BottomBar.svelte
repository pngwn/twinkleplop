<script lang="ts">
	import { chrome, open_palette, toggle_nav, toggle_tweaks } from '../chrome.svelte';
</script>

<nav class="botbar" role="navigation" aria-label="Mobile nav">
	<span class="brand">t</span>
	<button class="search" aria-label="Open search" onclick={open_palette}>
		<span class="prompt">$</span>
		<span class="placeholder">search docs…</span>
		<span class="kb">⌘K</span>
	</button>
	<button
		class="menu"
		aria-label="Toggle tweaks"
		aria-expanded={chrome.tweaks_open}
		onclick={toggle_tweaks}>⚙</button
	>
	<button
		class="menu"
		aria-label="Toggle navigation"
		aria-expanded={chrome.nav_open}
		onclick={toggle_nav}>☰</button
	>
</nav>

<style>
	.botbar {
		display: none;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 52px;
		background: var(--docs-bg);
		border-top: 1px solid var(--docs-line);
		z-index: 55;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: 8px;
		padding: 0 10px;
	}
	.brand {
		font-family: var(--docs-pixel);
		font-size: 22px;
		color: var(--docs-fg);
		padding: 0 8px;
		letter-spacing: 0.5px;
		line-height: 1;
	}
	.search {
		height: 32px;
		border: 1px solid var(--docs-line);
		border-radius: 3px;
		background: var(--docs-bg-1);
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 10px;
		color: var(--docs-fg-dim);
		font-family: var(--docs-mono);
		font-size: 11px;
		cursor: pointer;
		overflow: hidden;
	}
	.search .prompt {
		color: var(--docs-accent);
		font-weight: 600;
	}
	.search .placeholder {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.search .kb {
		margin-left: auto;
		color: var(--docs-fg-mute);
		font-size: 10px;
	}
	.menu {
		width: 42px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid var(--docs-line);
		border-radius: 3px;
		color: var(--docs-fg);
		font-family: var(--docs-mono);
		font-size: 18px;
		cursor: pointer;
		line-height: 1;
	}
	.menu:active {
		background: var(--docs-bg-2);
	}
	.menu[aria-expanded='true'] {
		border-color: var(--docs-accent-dim);
		color: var(--docs-accent);
	}

	@media (max-width: 760px) {
		.botbar {
			display: grid;
		}
	}
</style>
