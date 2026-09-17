<script lang="ts">
	import { onMount } from "svelte";
	import { create_plop, type plop, type plop_target } from "$lib/splash/plop";
	import SplashHeader from "$lib/splash/SplashHeader.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import Wordmark from "$lib/splash/Wordmark.svelte";
	import Rainbow from "$lib/splash/Rainbow.svelte";
	import LiveCard from "$lib/splash/LiveCard.svelte";
	import { theme_mode } from "$lib/theme_mode.svelte";

	const INSTALL = "npm i @twinkleplop/typescript";
	const GITHUB = "https://github.com/pngwn/twinkleplop";
	// clearance for the sticky header when scrolling to the live section
	const SCROLL_OFFSET = 72;

	const quick_links = [
		{ title: "quick start", meta: "install and twinkle", href: "/docs/getting_started" },
		{ title: "themes", meta: "light and dark", href: "/docs/themes" },
		{ title: "customization", meta: "make it your own", href: "/docs/tokenization" },
		{ title: "faq", meta: "no-one actually asked", href: "/docs/faq" }
	];

	let wordmark: Wordmark | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	let live: HTMLElement | undefined = $state();

	let lit = $state(0);
	let total = $state(0);

	let engine: plop | undefined;
	// the card reports its tokens before the engine exists
	let targets: plop_target[] = [];

	function handle_targets(next: plop_target[], changed: number[]) {
		targets = next;
		if (engine) engine.set_targets(next, changed);
		else start();
	}

	function go_live(e: MouseEvent) {
		if (!engine || !live) return;
		e.preventDefault();
		engine.scroll_to(live, SCROLL_OFFSET);
	}

	let mounted = false;
	function start() {
		if (engine || !mounted || !wordmark || !canvas || !targets.length) return;
		engine = create_plop({
			mount: wordmark.element(),
			code: targets[0].el.closest("pre") ?? targets[0].el,
			canvas,
			pixels: wordmark.pixels(),
			cols: wordmark.cols(),
			on_progress: (n, of) => {
				lit = n;
				total = of;
			}
		});
		engine.set_targets(targets);
	}

	onMount(() => {
		mounted = true;
		start();
		return () => engine?.destroy();
	});

	$effect(() => {
		engine?.set_mode(theme_mode.resolved);
	});
</script>

<Seo
	title="twinkleplop — plop some twinkle in your code"
	description="A syntax highlighter and code authoring toolkit. Small, fast, customisable."
/>

<div class="splash">
	<SplashHeader install={INSTALL} github={GITHUB} />

	<main>
		<div class="hero">
			<h1 class="sr-only">twinkleplop</h1>
			<Wordmark bind:this={wordmark} text="twinkleplop" />
			<canvas class="sparks" bind:this={canvas} aria-hidden="true"></canvas>
			<p class="tagline">plop some <Rainbow text="twinkle" /> in your code</p>
			<p class="lede">
				A syntax highlighter and code authoring toolkit. <b>Small, fast, customisable.</b> plop it in
				and twinkle.
			</p>
			<div class="ctas">
				<a class="cta pri" href="#live" onclick={go_live}>
					twinkle some code <span class="ar">↓</span>
				</a>
				<a class="cta" href="/docs">learn more <small>docs / welcome.md</small></a>
			</div>
			<div class="hint">↓ scroll to plop the twinkle into the code</div>
		</div>

		<section id="live" bind:this={live}>
			<div class="sh">
				<h2>try it live</h2>
				<span class="n">§ 01</span>
			</div>
			<p class="sp">
				Edit the source and watch it re-twinkle in real-time. This is a scaled-down embed of
				<a href="/explore/typescript">the lab</a>.
			</p>
			<LiveCard {lit} {total} on_targets={handle_targets} />
		</section>

		<section>
			<div class="sh">
				<h2>quick links</h2>
				<span class="n">§ 02</span>
			</div>
			<div class="links">
				{#each quick_links as link, i (link.href)}
					<a class="q" href={link.href}>
						<span class="i">{String(i + 1).padStart(2, "0")} ›</span>
						<h3>{link.title}</h3>
						<p>{link.meta}</p>
					</a>
				{/each}
			</div>
		</section>
	</main>

	<footer>
		<span class="brand"><Rainbow text="twinkleplop" /></span>
		<span>© 2026 · plop it in and twinkle</span>
	</footer>
</div>

<style>
	.splash {
		--bg: #0a0a0a;
		--bg2: #0f0f0f;
		--bg3: #151515;
		--line: #222;
		--line2: #2c2c2c;
		/* text tiers on bg..bg3: ink ≥ 15:1, ink2 (body) ≥ 10.5:1,
		 * ink3 (hints, § labels) ≥ 7:1. unlit code tokens and the ghost
		 * wordmark are effects rather than reading text, so they sit lower
		 * (unlit still clears 4.5:1) to keep the twinkle visible. */
		--ink: #ededed;
		--ink2: #c5c5c5;
		--ink3: #a1a1a1;
		--unlit: #808080;
		--ghost: #555;
		--green: #5be08c;
		--red: #f0716c;
		--orange: #f2a25c;
		--yellow: #e6c07b;
		--blue: #7cb7ff;
		--purple: #c792ea;
		--pink: #f08ab8;
		--mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
		--header-bg: rgba(10, 10, 10, 0.88);
		--selection-ink: #041a0c;

		--mode-height: 34px;
		--mode-font-size: 12px;
		--mode-line: var(--line2);
		--mode-bg: var(--bg);
		--mode-fg: var(--ink2);
		--mode-fg-on: var(--green);
		--mode-bg-on: color-mix(in oklab, var(--green) 12%, transparent);
		--mode-focus: var(--green);

		flex: 1;
		background: var(--bg);
		color: var(--ink);
		font-family: var(--mono);
		font-size: 14px;
		line-height: 1.6;
		/* pixels arc a little way past the wordmark in flight. clip, not
		 * hidden: a scroll container here would break the sticky header. */
		overflow-x: clip;
	}
	/* light mode: a token swap, same tiers as dark. colour tokens clear
	 * 4.5:1 on bg, bg2 and bg3 (green, the tightest, is 4.5:1 on bg3) */
	:global(:root[data-mode="light"]) .splash {
		--bg: #fbfbf9;
		--bg2: #f4f4f1;
		--bg3: #ebebe7;
		--line: #dcdcd6;
		--line2: #c4c4bd;
		--ink: #171715;
		--ink2: #33332f;
		--ink3: #4e4e48;
		--unlit: #66665f;
		--ghost: #66665f;
		--green: #0f7a3f;
		--red: #b8321f;
		--orange: #a4520a;
		--yellow: #7a5c00;
		--blue: #1b5fc4;
		--purple: #7b3fb8;
		--pink: #b8256b;
		--header-bg: rgba(251, 251, 249, 0.88);
		--selection-ink: #fff;
		--mode-bg-on: color-mix(in oklab, var(--green) 8%, transparent);
	}
	/* grayscale antialiasing thins glyphs; keep it for light-on-dark only */
	:global(:root:not([data-mode="light"])) .splash {
		-webkit-font-smoothing: antialiased;
	}
	.splash :global(::selection) {
		background: var(--green);
		color: var(--selection-ink);
	}
	p,
	h2,
	h3 {
		margin: 0;
	}

	main {
		position: relative;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	/* the wordmark sits about a third of the way down the viewport, and the
	 * hero always fills it, so the live section starts below the fold
	 * whatever the screen */
	.hero {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		text-align: center;
		gap: 28px;
		min-height: calc(100vh - 56px);
		padding: calc(30vh - 28px) 24px 10vh;
	}
	.sparks {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 30;
	}
	.tagline {
		font-size: clamp(26px, 4.2vw, 44px);
		font-weight: 500;
		letter-spacing: -0.01em;
		line-height: 1.25;
		color: var(--ink);
		text-wrap: balance;
	}
	.lede {
		max-width: 560px;
		color: var(--ink2);
		font-size: 14px;
		text-wrap: pretty;
	}
	.lede b {
		font-weight: 400;
		color: var(--ink);
	}

	.ctas {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		justify-content: center;
	}
	.cta {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		border: 1px solid var(--line2);
		background: var(--bg2);
		padding: 12px 18px;
		font-size: 13px;
		color: var(--ink);
		transition: border-color 0.2s;
	}
	.cta:hover {
		color: var(--ink);
		border-color: var(--green);
	}
	.cta small {
		color: var(--ink3);
		font-size: 11px;
	}
	.cta .ar {
		color: var(--green);
	}
	.cta.pri,
	.cta.pri:hover {
		border-color: var(--green);
		color: var(--green);
	}

	.hint {
		position: absolute;
		bottom: 28px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 12px;
		color: var(--ink3);
		white-space: nowrap;
	}

	section {
		max-width: 1040px;
		margin: 0 auto;
		padding: 72px 24px;
	}
	#live {
		padding-top: 0;
	}
	.sh {
		display: flex;
		align-items: baseline;
		gap: 14px;
		margin-bottom: 14px;
	}
	.sh h2 {
		font-size: 26px;
		font-weight: 500;
		letter-spacing: -0.01em;
		line-height: 1.6;
		color: var(--ink);
	}
	.sh h2::before {
		content: "# ";
		color: var(--green);
	}
	.sh .n {
		color: var(--ink3);
		font-size: 13px;
	}
	.sp {
		color: var(--ink2);
		max-width: 640px;
		margin-bottom: 24px;
		text-wrap: pretty;
	}
	.sp a {
		color: var(--green);
	}
	.sp a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.links {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 14px;
	}
	.q {
		display: block;
		border: 1px solid var(--line);
		background: var(--bg2);
		padding: 18px 20px 20px;
		color: var(--ink);
		transition: border-color 0.2s;
	}
	.q:hover {
		color: var(--ink);
		border-color: var(--line2);
	}
	.q .i {
		display: block;
		font-size: 12px;
		color: var(--ink3);
		margin-bottom: 22px;
	}
	.q h3 {
		font-size: 17px;
		font-weight: 500;
		line-height: 1.6;
		color: var(--ink);
		margin-bottom: 4px;
	}
	.q p {
		font-size: 12.5px;
		color: var(--green);
	}

	footer {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 16px;
		max-width: 1088px;
		margin: 0 auto;
		padding: 26px 24px 90px;
		border-top: 1px solid var(--line);
		font-size: 12px;
		color: var(--ink3);
	}
	footer .brand {
		font-weight: 700;
	}
</style>
