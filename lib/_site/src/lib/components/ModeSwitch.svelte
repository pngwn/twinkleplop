<script lang="ts">
	import { onMount } from 'svelte';
	import { theme_mode, set_mode, type theme_mode_value } from '$lib/theme_mode.svelte';

	// hosts theme it through --mode-* custom properties so the same control
	// sits in the docs, lab and splash chrome without knowing their palettes.
	// bare drops the boxes and marks the current mode with a dot
	let { compact = false, bare = false }: { compact?: boolean; bare?: boolean } = $props();
	const icons = $derived(compact || bare);

	const OPTIONS: theme_mode_value[] = ['system', 'light', 'dark'];
	const uid = $props.id();
	const name = `mode-${uid}`;

	// prerendered html can't know the stored mode, so nothing is checked
	// until the client has read it.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<fieldset class="mode" class:compact={icons} class:bare>
	<legend class="sr-only">Colour mode</legend>
	{#each OPTIONS as value (value)}
		<label class="opt" title={icons ? `${value} mode` : undefined}>
			<input
				type="radio"
				{name}
				{value}
				checked={mounted && theme_mode.value === value}
				onchange={() => set_mode(value)}
			/>
			{#if icons}
				<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
					{#if value === 'system'}
						<circle cx="8" cy="8" r="5.5" />
						<path d="M8 2.5a5.5 5.5 0 0 1 0 11z" class="fill" />
					{:else if value === 'light'}
						<circle cx="8" cy="8" r="3" />
						<path
							d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3"
						/>
					{:else}
						<path d="M13 9.8A5.5 5.5 0 1 1 6.2 3a4.4 4.4 0 0 0 6.8 6.8z" />
					{/if}
				</svg>
				<span class="sr-only">{value}</span>
			{:else}
				{value}
			{/if}
		</label>
	{/each}
</fieldset>

<style>
	.mode {
		display: inline-flex;
		align-items: stretch;
		height: var(--mode-height, 26px);
		margin: 0;
		padding: 0;
		min-inline-size: 0;
		border: 1px solid var(--mode-line, currentColor);
		border-radius: 2px;
		font-family: inherit;
		font-size: var(--mode-font-size, inherit);
		flex: none;
	}
	.opt {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 9px;
		color: var(--mode-fg, inherit);
		cursor: pointer;
		user-select: none;
		letter-spacing: 0.3px;
	}
	.compact .opt {
		width: var(--mode-height, 26px);
		padding: 0;
	}
	.opt + .opt {
		border-left: 1px solid var(--mode-line, currentColor);
	}
	.opt:hover {
		color: var(--mode-fg-on, inherit);
		background: var(--mode-bg-on, transparent);
	}
	/* the selected mode is inverted, not just tinted: colour alone is not a
	   strong enough cue for which mode is on. */
	.opt:has(input:checked) {
		color: var(--mode-bg, Canvas);
		background: var(--mode-fg-on, currentColor);
	}
	.opt:has(input:focus-visible) {
		outline: 2px solid var(--mode-focus, currentColor);
		outline-offset: -2px;
		z-index: 1;
	}
	/* an accent ring would vanish on the inverted plate */
	.opt:has(input:checked):has(input:focus-visible) {
		outline-color: currentColor;
	}
	.bare {
		height: auto;
		border: 0;
	}
	.bare .opt {
		width: var(--mode-bare-size, 28px);
		height: var(--mode-bare-height, 32px);
	}
	.bare .opt + .opt {
		border-left: 0;
	}
	.bare .opt:hover,
	.bare .opt:has(input:checked) {
		color: var(--mode-fg-on, inherit);
		background: none;
	}
	.bare .opt:has(input:checked)::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: 5px;
		width: 4px;
		height: 4px;
		margin-left: -2px;
		border-radius: 50%;
		background: var(--mode-focus, currentColor);
	}
	.bare svg {
		width: var(--mode-bare-icon, 15px);
		height: var(--mode-bare-icon, 15px);
	}
	input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}
	svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	svg .fill {
		fill: currentColor;
		stroke: none;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
</style>
