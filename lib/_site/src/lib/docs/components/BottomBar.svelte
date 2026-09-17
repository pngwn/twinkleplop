<script lang="ts">
	import ModeSwitch from '$lib/components/ModeSwitch.svelte';
	import { chrome, toggle_nav } from '../chrome.svelte';
</script>

<nav class="botbar" role="navigation" aria-label="Mobile nav">
	<a class="brand" href="/">t</a>
	<nav class="links" aria-label="Site">
		<a href="/explore">explore</a>
		<a aria-current="page" href="/docs">docs</a>
	</nav>
	<ModeSwitch compact />
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
		--mode-height: 32px;
		--mode-line: var(--docs-line);
		--mode-bg: var(--docs-bg);
		--mode-fg: var(--docs-fg-dim);
		--mode-fg-on: var(--docs-accent);
		--mode-bg-on: color-mix(in oklch, var(--docs-accent) 12%, transparent);
		--mode-focus: var(--docs-accent);
	}
	.links {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12px;
	}
	.links a {
		color: var(--docs-fg-dim);
		text-decoration: none;
		padding: 4px 2px;
	}
	.links a:hover {
		color: var(--docs-fg);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 5px;
	}
	.links a[aria-current='page'] {
		color: var(--docs-accent);
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 5px;
	}
	.brand {
		text-decoration: none;
		font-family: var(--docs-pixel);
		font-size: 22px;
		color: var(--docs-fg);
		padding: 0 8px;
		letter-spacing: 0.5px;
		line-height: 1;
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
