<script lang="ts">
	import { page } from '$app/state';
	import Rainbow from '$lib/splash/Rainbow.svelte';
	import ModeSwitch from '$lib/components/ModeSwitch.svelte';
	import { INSTALL, GITHUB } from '$lib/site';

	// the docs shell swaps in its own bottom bar on phones
	let { hide_on_mobile = false }: { hide_on_mobile?: boolean } = $props();

	const current = (href: string) => (page.url.pathname.startsWith(href) ? 'page' : undefined);

	let copied = $state(false);
	let reset: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(INSTALL);
		} catch {
			/* clipboard blocked: the command is still on screen to select */
		}
		copied = true;
		clearTimeout(reset);
		reset = setTimeout(() => (copied = false), 1200);
	}
</script>

<header class:hide-on-mobile={hide_on_mobile}>
	<div class="brand">
		<a class="wordmark" href="/"><Rainbow text="twinkleplop" /></a>
		<nav>
			<a href="/explore" aria-current={current('/explore')}>explore</a><i aria-hidden="true">/</i>
			<a href="/docs" aria-current={current('/docs')}>docs</a>
		</nav>
	</div>
	<div class="tools">
		<div class="cmd">
			<b>$</b>
			<span class="t">{INSTALL}</span>
			<button type="button" onclick={copy}>{copied ? 'copied' : 'copy'}</button>
		</div>
		<a class="ghost" href={GITHUB}>github</a>
		<span class="mode-full"><ModeSwitch /></span>
		<span class="mode-compact"><ModeSwitch compact /></span>
	</div>
</header>

<style>
	/* hosts theme this through --hdr-* custom properties, the same way the
	 * mode switch works, so the chrome is identical on every page. */
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 0 24px;
		height: 56px;
		font-family: var(--font-chrome);
		font-size: 14px;
		line-height: 1.6;
		border-bottom: 1px solid var(--hdr-line, currentColor);
		position: sticky;
		top: 0;
		background: var(--hdr-bg, transparent);
		color: var(--hdr-fg, inherit);
		backdrop-filter: blur(8px);
		flex: none;
		z-index: 20;
	}
	a:hover {
		text-decoration: none;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 40px;
	}
	.wordmark {
		font-weight: 700;
		font-size: 16px;
		letter-spacing: 0.02em;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	nav a {
		color: var(--hdr-fg-dim, inherit);
		padding: 4px 8px;
	}
	nav a:hover {
		color: var(--hdr-fg, inherit);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 5px;
	}
	nav a[aria-current='page'] {
		color: var(--hdr-accent, inherit);
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 5px;
	}
	nav i {
		color: var(--hdr-fg-ghost, inherit);
		font-style: normal;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		--mode-height: 30px;
		--mode-font-size: 12px;
		--mode-line: var(--hdr-line-2, currentColor);
		--mode-bg: var(--hdr-bg-plain, transparent);
		--mode-fg: var(--hdr-fg-dim, inherit);
		--mode-fg-on: var(--hdr-accent, inherit);
		--mode-bg-on: color-mix(in oklab, var(--hdr-accent, currentColor) 12%, transparent);
		--mode-focus: var(--hdr-accent, currentColor);
	}
	.cmd {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		border: 1px solid var(--hdr-line-2, currentColor);
		background: var(--hdr-bg-2, transparent);
		padding: 6px 12px;
		font-size: 13px;
		color: var(--hdr-fg-dim, inherit);
	}
	.cmd b {
		font-weight: 400;
		color: var(--hdr-accent, inherit);
	}
	.cmd .t {
		color: var(--hdr-fg, inherit);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cmd button {
		flex: none;
		font: inherit;
		background: none;
		color: var(--hdr-fg-dim, inherit);
		border: 1px solid var(--hdr-line-2, currentColor);
		padding: 0 6px;
		font-size: 11px;
		line-height: 18px;
		transition: none;
	}
	.cmd button:hover {
		color: var(--hdr-fg, inherit);
		border-color: var(--hdr-fg-ghost, currentColor);
	}

	.ghost {
		border: 1px solid var(--hdr-line-2, currentColor);
		padding: 6px 12px;
		font-size: 13px;
		color: var(--hdr-fg, inherit);
	}
	.ghost:hover {
		border-color: var(--hdr-fg-ghost, currentColor);
	}

	.mode-full,
	.mode-compact {
		display: contents;
	}
	.mode-compact {
		display: none;
	}

	/* the command ellipsises to nothing useful below this */
	@media (max-width: 600px) {
		.cmd {
			display: none;
		}
	}

	@media (max-width: 760px) {
		header.hide-on-mobile {
			display: none;
		}
		nav,
		.ghost,
		.mode-full {
			display: none;
		}
		.mode-compact {
			display: contents;
		}
	}
</style>
