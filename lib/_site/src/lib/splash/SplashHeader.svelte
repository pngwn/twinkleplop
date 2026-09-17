<script lang="ts">
	import Rainbow from "./Rainbow.svelte";

	let { install, github }: { install: string; github: string } = $props();

	let copied = $state(false);
	let reset: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(install);
		} catch {
			/* clipboard blocked: the command is still on screen to select */
		}
		copied = true;
		clearTimeout(reset);
		reset = setTimeout(() => (copied = false), 1200);
	}
</script>

<header>
	<div class="brand">
		<a class="wordmark" href="/"><Rainbow text="twinkleplop" /></a>
		<nav>
			<a href="/explore/svelte">lab</a><i>/</i>
			<a href="/docs/benchmarks">compare</a><i>/</i>
			<a class="on" href="/docs">docs</a><i>/</i>
			<a href="#changelog">changelog</a>
		</nav>
	</div>
	<div class="tools">
		<div class="cmd">
			<b>$</b>
			<span class="t">{install}</span>
			<button type="button" onclick={copy}>{copied ? "copied" : "copy"}</button>
		</div>
		<a class="ghost" href={github}>github</a>
	</div>
</header>

<style>
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 0 24px;
		height: 56px;
		border-bottom: 1px solid var(--line);
		position: sticky;
		top: 0;
		background: rgba(10, 10, 10, 0.88);
		backdrop-filter: blur(8px);
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
		color: var(--ink2);
		padding: 4px 8px;
	}
	nav a:hover {
		color: var(--ink);
	}
	nav a.on {
		color: var(--green);
	}
	nav i {
		color: var(--ink3);
		font-style: normal;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.cmd {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		border: 1px solid var(--line2);
		background: var(--bg2);
		padding: 6px 12px;
		font-size: 13px;
		color: var(--ink2);
	}
	.cmd b {
		font-weight: 400;
		color: var(--green);
	}
	.cmd .t {
		color: var(--ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cmd button {
		flex: none;
		font: inherit;
		background: none;
		color: var(--ink2);
		border: 1px solid var(--line2);
		padding: 0 6px;
		font-size: 11px;
		line-height: 18px;
		transition: none;
	}
	.cmd button:hover {
		color: var(--ink);
		border-color: var(--ink3);
	}

	.ghost {
		border: 1px solid var(--line2);
		padding: 6px 12px;
		font-size: 13px;
		color: var(--ink);
	}
	.ghost:hover {
		border-color: var(--ink3);
	}

	@media (max-width: 760px) {
		nav,
		.ghost {
			display: none;
		}
	}
</style>
