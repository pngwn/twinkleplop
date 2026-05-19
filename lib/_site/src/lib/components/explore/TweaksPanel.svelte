<script lang="ts">
	import {
		FONTS,
		type density_mode,
		type flavor_name,
		type theme_name,
		type tweak_state
	} from '$lib/explore/themes';
	import { theme_mode, set_mode, type theme_mode_value } from '$lib/theme_mode.svelte';

	const THEMES_LIST: { value: theme_name; label: string }[] = [
		{ value: 'github', label: 'GitHub' },
		{ value: 'atom-one', label: 'Atom One' }
	];

	const MODE_OPTIONS: theme_mode_value[] = ['system', 'light', 'dark'];

	interface Props {
		visible: boolean;
		state: tweak_state;
		on_update: (patch: Partial<tweak_state>) => void;
		on_close: () => void;
	}

	let { visible, state, on_update, on_close }: Props = $props();

	const DENSITIES: density_mode[] = ['compact', 'comfortable', 'relaxed'];
	const FLAVORS_LIST: flavor_name[] = ['phosphor', 'amber', 'paperwhite', 'synth', 'ember'];
</script>

{#if visible}
	<aside class="tweaks" aria-label="Tweaks">
		<header class="tweaks__head">
			<span class="tweaks__title">Tweaks</span>
			<button class="tweaks__close" type="button" onclick={on_close}>✕</button>
		</header>

		<section class="tweaks__sec">
			<div class="tweaks__label">Mode</div>
			<div class="tweaks__chips">
				{#each MODE_OPTIONS as m (m)}
					<button
						class="tweak-chip"
						class:is-on={theme_mode.value === m}
						type="button"
						onclick={() => set_mode(m)}
					>
						{m}
					</button>
				{/each}
			</div>
		</section>

		<section class="tweaks__sec">
			<div class="tweaks__label">Theme</div>
			<div class="tweaks__chips">
				{#each THEMES_LIST as t (t.value)}
					<button
						class="tweak-chip"
						class:is-on={state.theme === t.value}
						type="button"
						onclick={() => on_update({ theme: t.value })}
					>
						{t.label}
					</button>
				{/each}
			</div>
		</section>

		<section class="tweaks__sec">
			<div class="tweaks__label">Mono font</div>
			<div class="tweaks__chips">
				{#each FONTS as f (f.label)}
					<button
						class="tweak-chip"
						class:is-on={state.font === f.value}
						type="button"
						onclick={() => on_update({ font: f.value })}
					>
						{f.label}
					</button>
				{/each}
			</div>
		</section>

		<section class="tweaks__sec">
			<div class="tweaks__label">Density</div>
			<div class="tweaks__chips">
				{#each DENSITIES as d (d)}
					<button
						class="tweak-chip"
						class:is-on={state.density === d}
						type="button"
						onclick={() => on_update({ density: d })}
					>
						{d}
					</button>
				{/each}
			</div>
		</section>

		<section class="tweaks__sec">
			<div class="tweaks__label">Token inspector</div>
			<div class="tweaks__chips">
				<button
					class="tweak-chip"
					class:is-on={state.inspect}
					type="button"
					onclick={() => on_update({ inspect: !state.inspect })}
				>
					{state.inspect ? 'on' : 'off'}
				</button>
			</div>
		</section>

		<section class="tweaks__sec">
			<div class="tweaks__label">Annotation</div>
			<div class="tweaks__chips">
				<button
					class="tweak-chip"
					class:is-on={state.annotation}
					type="button"
					onclick={() => on_update({ annotation: !state.annotation })}
				>
					{state.annotation ? 'on' : 'off'}
				</button>
			</div>
		</section>

		<section class="tweaks__sec">
			<div class="tweaks__label">Terminal flavor</div>
			<div class="tweaks__chips">
				{#each FLAVORS_LIST as f (f)}
					<button
						class="tweak-chip"
						class:is-on={state.flavor === f}
						type="button"
						onclick={() => on_update({ flavor: f })}
					>
						{f}
					</button>
				{/each}
			</div>
		</section>
	</aside>
{/if}
