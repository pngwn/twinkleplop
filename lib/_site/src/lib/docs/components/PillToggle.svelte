<script lang="ts" generics="T extends string">
	type option = { id: T; label: string; title?: string; disabled?: boolean };

	let {
		label,
		options,
		value,
		onchange,
	}: {
		label: string;
		options: option[];
		value: T;
		onchange: (id: T) => void;
	} = $props();
</script>

<div class="toggle" role="group" aria-label={label}>
	<span class="lbl">{label}</span>
	<div class="pills">
		{#each options as o (o.id)}
			<button
				type="button"
				class="pill"
				class:on={o.id === value}
				aria-pressed={o.id === value}
				disabled={o.disabled}
				title={o.title}
				onclick={() => onchange(o.id)}>{o.label}</button
			>
		{/each}
	</div>
</div>

<style>
	.toggle {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}
	.lbl {
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		text-transform: uppercase;
		letter-spacing: 0.6px;
		width: 72px;
		flex-shrink: 0;
	}
	.pills {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}
	.pill {
		background: transparent;
		border: 1px solid var(--docs-line);
		color: var(--docs-fg-dim);
		padding: 3px 9px;
		font-size: var(--docs-fs-xs);
		font-family: var(--docs-mono);
		cursor: pointer;
		border-radius: 2px;
		letter-spacing: 0.3px;
	}
	.pill:hover:not(:disabled) {
		color: var(--docs-fg);
	}
	.pill.on {
		color: var(--docs-accent);
		border-color: var(--docs-accent-dim);
		background: color-mix(in oklch, var(--docs-accent) 10%, transparent);
	}
	.pill:disabled {
		color: var(--docs-fg-ghost);
		border-style: dotted;
		cursor: not-allowed;
	}
	.pill:focus-visible {
		outline: 1px solid var(--docs-accent);
		outline-offset: 1px;
	}
</style>
