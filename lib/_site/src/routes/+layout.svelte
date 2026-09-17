<script>
	import '../app.css';
	import { page } from '$app/stores';

	// Determine which theme to use based on the current route
	$: is_explore = $page.url.pathname.startsWith('/explore');
	$: theme_class = is_explore ? 'tech-theme' : 'pixel-theme';
</script>

<div class="app-container {theme_class}">
	<!-- <nav class="main-nav">
		<a href="/" class="nav-logo">
			{#if !is_explore}
				<span class="pixel-logo">twinkleplop</span>
			{:else}
				<span class="tech-logo">twinkleplop</span>
			{/if}
		</a>
		<div class="nav-links">
			<a href="/">Home</a>
			<a href="/docs">Docs</a>
			<a href="/explore">Explore</a>
		</div>
	</nav> -->

		<slot />

</div>

<style>
	/* Theme Variables */
	.pixel-theme {
		/* Pixel fonts */
		--font-grid: gridlite-pe-variable;
		--font-retro: 'VT323', monospace;
		--font-pixel: 'Silkscreen', monospace;

		/* Clean rainbow palette */
		--pixel-red: #ff6b6b;
		--pixel-orange: #ffb86b;
		--pixel-yellow: #ffeb6b;
		--pixel-green: #6bffb8;
		--pixel-cyan: #6bebff;
		--pixel-blue: #6b8eff;
		--pixel-purple: #b86bff;
		--pixel-pink: #ff6beb;

		/* Backgrounds */
		--bg-primary: #111;
		--bg-secondary: #1a1a1a;
		--bg-tertiary: #222;
		--bg-code: #0d0d0d;

		/* Text */
		--text-primary: #fff;
		--text-secondary: #aaa;
		--text-tertiary: #666;

		/* Borders and shadows */
		--border: #333;
		--border-width: 2px;
		--shadow-sm: 2px 2px 0px rgba(0, 0, 0, 0.3);
		--shadow-md: 4px 4px 0px rgba(0, 0, 0, 0.3);

		/* Rainbow gradient */
		--rainbow-gradient: linear-gradient(
			90deg,
			#ff6b6b 0%,
			#ffb86b 14.28%,
			#ffeb6b 28.57%,
			#6bffb8 42.86%,
			#6bebff 57.14%,
			#6b8eff 71.43%,
			#b86bff 85.71%,
			#ff6beb 100%
		);
	}

	.pixel-theme {
		background: var(--bg-primary);
		color: var(--text-primary);
		font-family: var(--font-retro);
	}

	/* Global pixel theme styles */
	/*.pixel-theme ::-webkit-scrollbar {
		width: 12px;
		height: 12px;
	}

	.pixel-theme ::-webkit-scrollbar-track {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
	}

	.pixel-theme ::-webkit-scrollbar-thumb {
		background: var(--pixel-purple);
		border: 1px solid var(--border);
	}

	.pixel-theme ::-webkit-scrollbar-thumb:hover {
		background: var(--pixel-pink);
	}

	.pixel-theme ::selection {
		background: var(--pixel-purple);
		color: white;
	}

	.pixel-theme code {
		font-family: var(--font-retro);
		background: var(--bg-code);
		border: 1px solid var(--border);
		padding: 2px 6px;
		font-size: 1.25rem;
	}

	.pixel-theme a {
		color: var(--pixel-purple);
		text-decoration: none;
		transition: color 0.1s;
	}

	.pixel-theme a:hover {
		color: var(--pixel-pink);
	}*/

	.app-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		transition: background 0.3s ease;
	}

	.main-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		border-bottom: var(--border-width) solid var(--border);
		background: var(--bg-secondary);
		position: sticky;
		top: 0;
		z-index: 100;
		backdrop-filter: blur(10px);
	}

	.nav-logo {
		font-size: 1.25rem;
		font-weight: 700;
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pixel-logo {
		font-family: var(--font-grid);
		background: var(--rainbow-gradient);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: 2px;
		font-variation-settings:
			'BACK' 150,
			'ELSH' 3,
			'RECT' 200,
			'wght' 700;
	}

	.tech-logo {
		color: var(--accent);
	}

	.nav-links {
		display: flex;
		gap: 2rem;
		align-items: center;
	}

	/*.nav-links a {
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.2s ease;
		padding: 0.5rem 1rem;
		border-radius: 8px;
	}

	.nav-links a:hover {
		background: var(--bg-tertiary);
	}

	.pixel-theme .nav-links a {
		border: var(--border-width) solid transparent;
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: var(--text-secondary);
	}

	.pixel-theme .nav-links a:hover {
		background: var(--bg-secondary);
		border-color: var(--pixel-purple);
		color: var(--text-primary);
		transform: translateY(-2px);
		box-shadow: var(--shadow-sm);
	}*/


</style>
