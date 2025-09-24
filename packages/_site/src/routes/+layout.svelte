<script lang="ts">
	import '../app.css';
	import '../highlight-styles.css';

	let { children } = $props();
</script>

<div class="app">
	<header class="header">
		<div class="header-content">
			<div class="logo">
				<a href="/">
					<span class="logo-text">twinkleplop</span>
					<span class="cursor">_</span>
				</a>
			</div>
			<nav class="nav">
				<a href="/css" class="nav-link">CSS</a>
				<a href="/javascript" class="nav-link">JavaScript</a>
				<a href="/typescript" class="nav-link">TypeScript</a>
			</nav>
		</div>
	</header>

	<main class="main">
		<div class="container">
			{@render children?.()}
		</div>
	</main>
</div>

<style>
	.app {
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(10, 10, 10, 0.8);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid var(--border);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.logo a {
		display: flex;
		align-items: center;
		color: var(--text-primary);
		transition: color 0.2s ease;
	}

	.logo a:hover {
		color: var(--accent);
	}

	.logo-text {
		background: linear-gradient(135deg, var(--accent) 0%, #00ff94 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.cursor {
		animation: blink 1.2s infinite;
		color: var(--accent);
		font-weight: 300;
		margin-left: 2px;
	}

	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0;
		}
	}

	.nav {
		display: flex;
		gap: 2rem;
		align-items: center;
	}

	.nav-link {
		position: relative;
		color: var(--text-secondary);
		font-size: 0.875rem;
		transition: color 0.2s ease;
		padding: 0.25rem 0;
	}

	.nav-link:hover {
		color: var(--text-primary);
	}

	.nav-link::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: -2px;
		width: 0;
		height: 2px;
		background: var(--accent);
		transition: width 0.3s ease;
	}

	.nav-link:hover::after {
		width: 100%;
	}

	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 0;
	}

	.container {
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
		padding: 1rem 2rem;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
