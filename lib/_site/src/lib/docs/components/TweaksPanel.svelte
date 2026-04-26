<script lang="ts">
	import { chrome, set_tweak } from '../chrome.svelte';
	import { theme_mode, set_mode, type theme_mode_value } from '$lib/theme_mode.svelte';

	const MODE_OPTIONS: theme_mode_value[] = ['system', 'light', 'dark'];
	const DENSITY_OPTIONS = ['compact', 'cozy', 'comfortable'] as const;
	const NAV_OPTIONS = ['tree', 'grouped', 'manpage'] as const;
	const CRT_OPTIONS = ['on', 'off'] as const;
</script>

<div class="tweaks" class:open={chrome.tweaks_open}>
	<h4>tweaks</h4>
	<div class="group">
		<div class="lbl">mode</div>
		<div class="pills">
			{#each MODE_OPTIONS as m (m)}
				<button class="pill" class:on={theme_mode.value === m} onclick={() => set_mode(m)}
					>{m}</button
				>
			{/each}
		</div>
	</div>
	<div class="group">
		<div class="lbl">density</div>
		<div class="pills">
			{#each DENSITY_OPTIONS as d (d)}
				<button
					class="pill"
					class:on={chrome.tweaks.density === d}
					onclick={() => set_tweak('density', d)}>{d === 'comfortable' ? 'comfy' : d}</button
				>
			{/each}
		</div>
	</div>
	<div class="group">
		<div class="lbl">nav style</div>
		<div class="pills">
			{#each NAV_OPTIONS as n (n)}
				<button class="pill" class:on={chrome.tweaks.nav === n} onclick={() => set_tweak('nav', n)}
					>{n}</button
				>
			{/each}
		</div>
	</div>
	<div class="group">
		<div class="lbl">crt scanlines</div>
		<div class="pills">
			{#each CRT_OPTIONS as c (c)}
				<button class="pill" class:on={chrome.tweaks.crt === c} onclick={() => set_tweak('crt', c)}
					>{c}</button
				>
			{/each}
		</div>
	</div>
</div>

<style>
	.tweaks {
		position: fixed;
		right: 16px;
		bottom: 40px;
		width: 240px;
		background: var(--docs-bg-1);
		border: 1px solid var(--docs-line);
		border-radius: 3px;
		padding: 12px 14px;
		font-size: var(--docs-fs-xs);
		z-index: 150;
		display: none;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
	}
	.tweaks.open {
		display: block;
	}
	h4 {
		margin: 0 0 10px;
		font-family: var(--docs-pixel);
		font-size: 14px;
		color: var(--t-green);
		letter-spacing: 0.3px;
		font-weight: 500;
	}
	.group {
		margin-bottom: 12px;
	}
	.lbl {
		color: var(--docs-fg-mute);
		text-transform: uppercase;
		letter-spacing: 0.6px;
		margin-bottom: 5px;
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
		padding: 3px 8px;
		font-size: var(--docs-fs-xs);
		font-family: var(--docs-mono);
		cursor: pointer;
		border-radius: 2px;
	}
	.pill:hover {
		color: var(--docs-fg);
	}
	.pill.on {
		color: var(--docs-accent);
		border-color: var(--docs-accent-dim);
		background: color-mix(in oklch, var(--docs-accent) 10%, transparent);
	}

	@media (max-width: 760px) {
		.tweaks {
			right: 8px;
			left: 8px;
			bottom: 64px;
			width: auto;
		}
	}
</style>
