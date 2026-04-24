<script lang="ts">
	import {
		FONTS,
		type density_mode,
		type flavor_name,
		type theme_name,
		type tweak_state,
	} from "$lib/explore/themes";

	const THEME_GROUPS: { label: string; themes: theme_name[] }[] = [
		{ label: "GitHub", themes: ["github-light", "github-dark"] },
		{ label: "Atom One", themes: ["atom-one-light", "atom-one-dark"] },
	];

	interface Props {
		visible: boolean;
		state: tweak_state;
		on_update: (patch: Partial<tweak_state>) => void;
		on_close: () => void;
	}

	let { visible, state, on_update, on_close }: Props = $props();

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
			<div class="tweaks__groups">
				{#each THEME_GROUPS as group (group.label)}
					<div class="tweak-group">
						<div class="tweak-group__label">{group.label}</div>
						<div class="tweaks__chips">
							{#each group.themes as t (t)}
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
					</div>
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
