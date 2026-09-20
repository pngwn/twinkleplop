<script lang="ts">
	import { onMount } from "svelte";
	import { create_plop, type plop } from "$lib/splash/plop";
	import SiteHeader from "$lib/components/SiteHeader.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import Wordmark from "$lib/splash/Wordmark.svelte";
	import Rainbow from "$lib/splash/Rainbow.svelte";
	import LiveCard from "$lib/splash/LiveCard.svelte";
	import { theme_mode } from "$lib/theme_mode.svelte";

	let wordmark: Wordmark | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();

	let lit = $state(0);
	let total = $state(0);

	let engine: plop | undefined;
	// the card reports its tokens before the engine exists
	let targets: HTMLElement[] = [];

	function handle_targets(next: HTMLElement[]) {
		targets = next;
		if (engine) engine.set_targets(next);
		else start();
	}

	function handle_cast(x: number, y: number) {
		engine?.cast(x, y);
	}

	let mounted = false;
	function start() {
		if (engine || !mounted || !wordmark || !canvas || !targets.length) return;
		engine = create_plop({
			mount: wordmark.element(),
			code: targets[0].closest("pre") ?? targets[0],
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
	<SiteHeader />

	<main>
		<div class="hero">
			<h1 class="sr-only">twinkleplop</h1>
			<Wordmark bind:this={wordmark} text="twinkleplop" />
			<canvas class="sparks" bind:this={canvas} aria-hidden="true"></canvas>
			<p class="tagline">plop some <Rainbow text="twinkle" /> in your code</p>
			<div class="lab">
				<LiveCard {lit} {total} on_targets={handle_targets} on_cast={handle_cast} />
			</div>
			<a class="cta" href="/docs">learn more <small>docs / welcome.md</small></a>
		</div>

	</main>
</div>

<style>
	.splash {
		--bg: #0a0a0a;
		--bg2: #0f0f0f;
		--bg3: #151515;
		--line: #222;
		--line2: #2c2c2c;
		/* text tiers on bg..bg3: ink ≥ 15:1, ink2 (body) ≥ 10.5:1,
		 * ink3 (hints, § labels) ≥ 7:1. unlit code tokens are an effect
		 * rather than reading text, so they sit lower (still clearing 4.5:1)
		 * to keep the twinkle visible. */
		--ink: #ededed;
		--ink2: #c5c5c5;
		--ink3: #a1a1a1;
		--unlit: #808080;
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

		--hdr-bg: var(--header-bg);
		--hdr-bg-plain: var(--bg);
		--hdr-bg-2: var(--bg2);
		--hdr-line: var(--line);
		--hdr-line-2: var(--line2);
		--hdr-fg: var(--ink);
		--hdr-fg-dim: var(--ink2);
		--hdr-fg-ghost: var(--ink3);
		--hdr-accent: var(--green);

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
		--green: #0f7a3f;
		--red: #b8321f;
		--orange: #a4520a;
		--yellow: #7a5c00;
		--blue: #1b5fc4;
		--purple: #7b3fb8;
		--pink: #b8256b;
		--header-bg: rgba(251, 251, 249, 0.88);
		--selection-ink: #fff;
	}
	/* grayscale antialiasing thins glyphs; keep it for light-on-dark only */
	:global(:root:not([data-mode="light"])) .splash {
		-webkit-font-smoothing: antialiased;
	}
	.splash :global(::selection) {
		background: var(--green);
		color: var(--selection-ink);
	}
	p {
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

	/* wordmark, tagline, live card and docs link all sit above the fold, centred
	 * in the viewport under the header. the gap above the card gives way
	 * first on short screens, then the rest of the spacing, down to an
	 * iphone se. */
	.hero {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: clamp(18px, 3.6vh, 28px);
		min-height: calc(100svh - 56px);
		padding: clamp(8px, 2vh, 24px) 24px;
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
		font-size: clamp(24px, 3.4vw, 34px);
		font-weight: 500;
		letter-spacing: -0.01em;
		line-height: 1.25;
		color: var(--ink);
		text-wrap: balance;
	}
	.lab {
		width: 100%;
		max-width: 680px;
		margin-top: clamp(0px, 18vh - 100px, 72px);
		text-align: left;
	}

	.cta {
		margin-top: clamp(0px, 3vh, 28px);
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


</style>
