<script>
	import CssHighlight from './css_highlight.svelte';
	import { fly } from 'svelte/transition';
	import { Spring } from 'svelte/motion';
	import { css } from './css_code';
	import AnimatedLogo from '../lib/components/AnimatedLogo.svelte';

	let springConfig = {
		damping: 0.4,
		mass: 1,
		stiffness: 0.2
	};

	let spring = new Spring(-250, springConfig);

	$effect(() => {
		setTimeout(() => {
			spring.set(0);
		}, 500);
	});

	let min_header = $state(false);

	function handle_scroll() {
		if (window.scrollY > 100) {
			min_header = true;
		} else {
			min_header = false;
		}
	}
</script>

<svelte:window onscroll={handle_scroll} />

<div class="home-page">
	<div class="hero">
		<!-- <h1 class="hero-title" class:min_header>
			<span class="pixel-brand" data-text="TWINKLEPLOP"
				>t<span class="brand-ext">winkleplop</span></span
			>
		</h1> -->
		<AnimatedLogo />
		<div class="pixel-tagline">
			<div>
				<span class="pixel-tagline-plop" style="transform: translateY({spring.current}px)"
					>plop</span
				>
				<span class="pixel-tagline-regular">some</span>
			</div>
			<div>
				<span class="pixel-tagline-twinkle">twinkle</span>
			</div>

			<div>
				<span class="pixel-tagline-regular">in your</span>

				<span class="pixel-tagline-code">code</span>
			</div>
		</div>
		<div class="hero-footer">
			<a href="/docs" class="docs-link">learn more</a>
			<p>or</p>
			<a href="#css-highlight-1" class="hero-footer-link"
				>↓ <span class="twinkle">twinkle</span> some code ↓</a
			>
		</div>
	</div>
</div>
<CssHighlight language="css" code={css} id="css-highlight-1" />
<CssHighlight language="css" code={css} id="css-highlight-2" />

<style>
	.home-page {
		height: 100vh;
		display: flex;
		flex-direction: column;
		--bright-gradient: linear-gradient(
			90deg,
			rgba(255, 0, 0, 1) 0%,
			rgba(255, 154, 0, 1) 10%,
			rgba(208, 222, 33, 1) 20%,
			rgba(79, 220, 74, 1) 30%,
			rgba(63, 218, 216, 1) 40%,
			rgba(47, 201, 226, 1) 50%,
			rgba(28, 127, 238, 1) 60%,
			rgba(95, 21, 242, 1) 70%,
			rgba(186, 12, 248, 1) 80%,
			rgba(251, 7, 217, 1) 90%,
			rgba(255, 0, 0, 1) 100%
		);
		/* overflow: auto; */
	}
	.hero {
		/* padding: 4rem 0; */
		text-align: center;
		/* border-bottom: 2px solid var(--border); */
		flex-shrink: 0;
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		height: 100%;
	}

	.brand-ext {
		display: inline-block;
		/* position: relative; */
		/* transform: scaleX(1); */
		transition: all 1.3s ease;
	}

	.min_header .brand-ext {
		width: 0;
		transition: all 1.3s ease;
	}

	.hero-title {
		margin-bottom: 1rem;
		line-height: 1;
		text-align: center;
		margin-top: 1rem;
		position: sticky;
		top: 0;
	}

	.pixel-brand {
		display: inline-block;
		margin-top: 2rem;
		font-family: var(--font-grid);
		font-size: 6rem;
		font-weight: 700;
		background: var(--rainbow-gradient);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		letter-spacing: 2px;
		position: relative;
		font-variation-settings:
			'BACK' 00,
			'ELSH' 3,
			'RECT' 0,
			'wght' 700;
	}

	@media (max-width: 768px) {
		.pixel-brand {
			font-size: 3rem;
		}
	}

	.pixel-brand::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;

		background: radial-gradient(
			ellipse at center,
			rgba(255, 255, 255, 0) 70%,
			/* transparent center */ #111 100% /* fade to white edges */
		);
	}

	.pixel-brand::after {
		content: '*';
		position: absolute;
		width: 100px;
		height: 100px;
		/* top: -20px; */
		/* left: -40px; */
		/* right: 0; */
		font-family: var(--font-grid);
		/* font-size: 6rem; */
		text-align: left;
		background: var(--rainbow-gradient);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		/* letter-spacing: 2px; */
		background-size: 200% 200%;
		font-variation-settings:
			'BACK' 0,
			'ELSH' 3,
			'RECT' 0,
			'wght' 700;
		/* background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0) 70%, #111 100%); */
		/* background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0) 70%, #111 100%); */
		animation: pixel-sparkle 4s infinite;
	}

	.pixel-tagline {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		gap: 1.25rem;
		/* margin-top: 18rem; */
		font-family: var(--font-grid);
		font-size: 1.5rem;
		line-height: 1;

		text-align: center;
	}

	@media (max-width: 480px) {
		.pixel-tagline {
			gap: 0.75rem;
		}
	}

	.pixel-tagline-plop {
		color: rgb(183, 88, 88);
		font-size: 4rem;
		text-transform: uppercase;

		font-variation-settings:
			'BACK' 0,
			'ELSH' 2,
			'RECT' 0,
			'wght' 1000;

		font-family: 'Pixel Code';
		font-weight: 700;
		letter-spacing: 0.1rem;
		/* word-spacing: -0.5rem; */
		animation: drop-in 0.3s ease-in-out 0.5s forwards;
		display: inline-block;
		opacity: 0;
		/* transform: translateY(-250px); */
	}

	.pixel-tagline-regular {
		color: #eee;
		font-size: 1.5rem;
		font-variant: small-caps;
		font-variation-settings:
			'BACK' 0,
			'ELSH' 3,
			'RECT' 0,
			'wght' 10000;
		margin-top: 0.1rem;
		font-family: 'Pixel Code';
		font-weight: 600;
		letter-spacing: 0.1rem;
		word-spacing: -0.5rem;
	}

	.pixel-tagline-twinkle {
		background: var(--rainbow-gradient);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: pixel-sparkle 4s infinite;
		font-weight: 700;
		font-size: 8rem;
		position: relative;
		background-size: 200% 200%;
		font-variation-settings:
			'BACK' 0,
			'ELSH' 1,
			'RECT' 100,
			'wght' 500;
		/* margin-left: -0.5rem; */
	}

	.pixel-tagline-twinkle::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		background: #111;
		transform-origin: right;
		transform: scaleX(1);
		animation: scale-in 0.3s ease-in-out 0.7s forwards;
	}

	.pixel-tagline-code {
		color: var(--pixel-green);
		font-family: var(--font-grid);
		font-weight: 700;
		text-transform: uppercase;
		text-shadow: var(--shadow-sm);
		font-size: 4rem;
		text-align: right;
		/* margin-left: 30.75rem; */
		display: inline-block;
		position: relative;
		font-variation-settings:
			'BACK' 0,
			'ELSH' 2,
			'RECT' 0,
			'wght' 1000;
		font-family: 'Pixel Code';
		font-weight: 400;
		/* letter-spacing: 0.1rem; */
		/* word-spacing: -0.5rem; */
		/* transform: translateY(-10px); */
	}

	.pixel-tagline-code::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		background: #111;
		transform-origin: right;
		transform: scaleX(1);
		animation: scale-in 0.5s steps(4) 1s forwards;
	}

	.pixel-tagline div:nth-child(3) {
		display: flex;
		justify-content: flex-start;
		gap: 1rem;
	}

	@media (max-width: 480px) {
		.pixel-tagline-code {
			font-size: 3rem;
		}
		.pixel-tagline-twinkle {
			font-size: 6rem;
		}
		.pixel-tagline-plop {
			font-size: 3rem;
		}
		.pixel-tagline-regular {
			font-size: 1.25rem;
		}
	}
	.hero-footer {
		font-size: 3.5rem;
		font-family: var(--font-grid);
		text-transform: lowercase;
		font-variation-settings:
			'BACK' 00,
			'ELSH' 3,
			'RECT' 0,
			'wght' 800;
		margin-bottom: 2rem;
	}

	.hero-footer p {
		font-size: 1.5rem;
		font-family: var(--font-mono);
		text-transform: uppercase;
	}

	.hero-footer .docs-link {
		font-size: 2.5rem;
		font-family: var(--font-grid);
		/* font-weight: 900; */
		text-transform: uppercase;
		font-variation-settings:
			'BACK' 00,
			'ELSH' 3,
			'RECT' 0,
			'wght' 1000;
	}

	.hero-footer .twinkle {
		font-size: 3.5rem;

		font-family: var(--font-grid);
		font-weight: 700;
		background: var(--rainbow-gradient);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-variation-settings:
			'BACK' 00,
			'ELSH' 3,
			'RECT' 0,
			'wght' 800;
	}

	@keyframes pixel-sparkle {
		0% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0% 50%;
		}
	}

	@keyframes drop-in {
		0% {
			/* transform: translateY(-250px); */
			opacity: 0;
		}

		100% {
			/* transform: translateY(0); */
			opacity: 1;
		}
	}

	@keyframes scale-in {
		0% {
			transform: scaleX(1);
		}
		100% {
			transform: scaleX(0);
		}
	}
</style>
