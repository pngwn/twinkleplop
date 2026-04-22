<script lang="ts">
	let {
		variant = "default",
		mark = "▸",
		children,
	}: {
		variant?: "default" | "warn" | "tip";
		mark?: string;
		children: import("svelte").Snippet;
	} = $props();
</script>

<div class="callout" class:warn={variant === "warn"} class:tip={variant === "tip"}>
	<span class="mark">{mark}</span>
	<div class="body">{@render children()}</div>
</div>

<style>
	.callout {
		display: grid;
		grid-template-columns: 32px 1fr;
		gap: 12px;
		padding: 12px 16px;
		border: 1px solid var(--docs-line);
		border-left: 2px solid var(--docs-accent);
		background: color-mix(in oklch, var(--docs-bg-1) 80%, var(--docs-bg));
		margin: 18px 0;
		font-size: var(--docs-fs-body);
	}
	.mark {
		color: var(--docs-accent);
		font-family: var(--docs-mono);
		font-size: 18px;
		line-height: 1;
	}
	.callout.warn {
		border-left-color: var(--t-yellow);
	}
	.callout.warn .mark {
		color: var(--t-yellow);
	}
	.callout.tip {
		border-left-color: var(--t-teal);
	}
	.callout.tip .mark {
		color: var(--t-teal);
	}
	.body :global(strong) {
		color: var(--docs-fg);
	}
	.body :global(code) {
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line-2);
		padding: 1px 5px;
		border-radius: 2px;
		color: var(--docs-fg);
		font-size: 0.92em;
		font-family: var(--docs-mono);
	}
</style>
