<script lang="ts">
	import ModeSwitch from '$lib/components/ModeSwitch.svelte';

	const BRAND = 'twinkleplop';
	const TWINKLE_COLORS = [
		't-red',
		't-orange',
		't-yellow',
		't-green',
		't-teal',
		't-blue',
		't-purple',
		't-pink',
		't-red',
		't-yellow'
	];
</script>

<header class="topbar">
	<a class="brand" href="/">
		{#each BRAND.split('') as ch, i (i)}
			<span class="rainbow-letter" style:color="var(--{TWINKLE_COLORS[i]})">{ch}</span>
		{/each}
	</a>
	<nav class="nav-links">
		<a href="/explore">explore</a><span class="sep" aria-hidden="true">/</span>
		<a class="active" href="/docs">docs</a>
	</nav>
	<div class="top-right">
		<ModeSwitch />
	</div>
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
		font-family: var(--docs-mono);
		font-size: 16px;
		letter-spacing: 0.5px;
		color: var(--docs-fg);
		display: inline-flex;
		align-items: baseline;
		text-decoration: none;
		font-weight: bold;
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

	.top-right {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		--mode-height: 26px;
		--mode-font-size: var(--docs-fs-sm);
		--mode-line: var(--docs-line);
		--mode-fg: var(--docs-fg-dim);
		--mode-fg-on: var(--docs-accent);
		--mode-bg-on: color-mix(in oklch, var(--docs-accent) 12%, transparent);
		--mode-focus: var(--docs-accent);
	}

	@media (max-width: 760px) {
		.topbar {
			display: none;
		}
	}
</style>
