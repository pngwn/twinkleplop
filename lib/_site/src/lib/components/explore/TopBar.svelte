<script lang="ts">
	import type { Snippet } from "svelte";
	import CommandChip from "./CommandChip.svelte";
	import ModeSwitch from "$lib/components/ModeSwitch.svelte";
	import { LANGUAGES } from "$lib/explore/grammars";
	import { view } from "$lib/explore/lab_state.svelte";
	import { FONTS, THEME_NAMES, type theme_name } from "$lib/explore/themes";

	interface Props {
		lang: string;
		on_lang_change: (next: string) => void;
		sample?: { value: string; options: string[]; on_change: (next: string) => void };
		actions?: Snippet;
	}

	let { lang, on_lang_change, sample, actions }: Props = $props();

	const font_labels = FONTS.map((f) => f.label);
</script>

<header class="topbar">
	<div class="topbar__l">
		<a class="brand" href="/">
			<div class="brand__name">
				<span class="brand__glyph">twinkleplop</span>
			</div>
		</a>
		<div class="divider"></div>
		<nav class="site-links" aria-label="Site">
			<a class="site-link" aria-current="page" href="/explore">explore</a>
			<span class="crumb__sep" aria-hidden="true">/</span>
			<a class="site-link" href="/docs">docs</a>
		</nav>
		<div class="divider"></div>
		<nav class="crumbs" aria-label="Breadcrumb">
			<CommandChip
				label="lang"
				value={lang}
				options={LANGUAGES}
				on_change={on_lang_change}
			/>
			{#if sample}
				<span class="crumb__sep" aria-hidden="true">/</span>
				<CommandChip
					label="sample"
					value={sample.value}
					options={sample.options}
					on_change={sample.on_change}
				/>
			{/if}
		</nav>
	</div>
	<div class="topbar__r">
		<div class="topbar__group" role="group" aria-label="Code view">
			<CommandChip
				label="theme"
				value={view.theme}
				options={THEME_NAMES}
				show_label
				align="right"
				on_change={(next) => (view.theme = next as theme_name)}
			/>
			<CommandChip
				label="font"
				value={view.font}
				options={font_labels}
				show_label
				align="right"
				on_change={(next) => (view.font = next)}
			/>
		</div>
		<div class="topbar__divider"></div>
		<button
			class="toggle"
			class:is-on={view.show_line_numbers}
			type="button"
			aria-pressed={view.show_line_numbers}
			title="line numbers"
			onclick={() => (view.show_line_numbers = !view.show_line_numbers)}
		>
			<span class="toggle__pip"></span>
			<span>ln</span>
		</button>
		<button
			class="toggle"
			class:is-on={view.inspect}
			type="button"
			aria-pressed={view.inspect}
			onclick={() => (view.inspect = !view.inspect)}
		>
			<span class="toggle__pip"></span>
			<span>inspect tokens</span>
		</button>
		{@render actions?.()}
		<div class="topbar__divider"></div>
		<ModeSwitch />
	</div>
</header>
