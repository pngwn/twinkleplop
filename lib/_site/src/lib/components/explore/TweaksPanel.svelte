<script lang="ts">
	import {
		FONTS,
		THEMES,
		type density_mode,
		type flavor_name,
		type theme_name,
		type tweak_state,
	} from "$lib/explore/themes";

	interface Props {
		visible: boolean;
		state: tweak_state;
		on_update: (patch: Partial<tweak_state>) => void;
		on_close: () => void;
	}

	let { visible, state, on_update, on_close }: Props = $props();

	const THEMES_LIST = Object.keys(THEMES) as theme_name[];
	const DENSITIES: density_mode[] = ["compact", "comfortable", "relaxed"];
	const FLAVORS_LIST: flavor_name[] = [
		"phosphor",
		"amber",
		"paperwhite",
		"synth",
		"ember",
	];
</script>

{#if visible}
	<aside class="tweaks" aria-label="Tweaks">
		<header class="tweaks__head">
			<span class="tweaks__title">Tweaks</span>
			<button class="tweaks__close" type="button" onclick={on_close}>✕</button>
		</header>

		<section class="tweaks__sec">
			<div class="tweaks__label">Theme</div>
			<div class="tweaks__chips">
				{#each THEMES_LIST as t (t)}
					<button
						class="tweak-chip"
						class:is-on={state.theme === t}
						type="button"
						onclick={() => on_update({ theme: t })}
					>
						{t}
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
			<div class="tweaks__label">Diff overlay</div>
			<div class="tweaks__chips">
				<button
					class="tweak-chip"
					class:is-on={state.diff}
					type="button"
					onclick={() => on_update({ diff: !state.diff })}
				>
					{state.diff ? "on" : "off"}
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
