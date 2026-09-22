<script lang="ts" module>
	// a link to /explore/edit on the sample pages, the editor toggle there
	export type edit_control = { href: string } | { on: boolean; toggle: () => void };

	export interface path_control {
		lang: string;
		on_lang_change: (next: string) => void;
		sample: string;
		samples: string[];
		on_sample_change: (next: string) => void;
	}
</script>

<script lang="ts">
	import CommandChip from "./CommandChip.svelte";
	import ModeSwitch from "$lib/components/ModeSwitch.svelte";
	import { LANGUAGES } from "$lib/explore/grammars";
	import { view } from "$lib/explore/lab_state.svelte";
	import { FONTS, THEME_NAMES, type theme_name } from "$lib/explore/themes";

	let { path, edit }: { path: path_control; edit: edit_control } = $props();

	const font_labels = FONTS.map((f) => f.label);
</script>

<header class="topbar">
	<a class="brand" href="/">twinkleplop</a>
	<nav class="site-links" aria-label="Site">
		<a class="site-link" aria-current="page" href="/explore">explore</a>
		<span class="slash" aria-hidden="true">/</span>
		<a class="site-link" href="/docs">docs</a>
	</nav>
	<span class="topbar__sep" aria-hidden="true"></span>
	<nav class="topbar__path" aria-label="Sample">
		<CommandChip label="language" value={path.lang} options={LANGUAGES} on_change={path.on_lang_change} />
		<span class="slash" aria-hidden="true">/</span>
		<CommandChip
			label="sample"
			value={path.sample}
			options={path.samples}
			on_change={path.on_sample_change}
		/>
	</nav>
	<div class="topbar__view" role="group" aria-label="Code view">
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
		<span class="topbar__sep" aria-hidden="true"></span>
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
			<span>inspect</span>
		</button>
		{#if "href" in edit}
			<a class="toggle" href={edit.href}>
				<span>edit</span>
				<span aria-hidden="true">→</span>
			</a>
		{:else}
			<button
				class="toggle"
				class:is-on={edit.on}
				type="button"
				aria-pressed={edit.on}
				onclick={edit.toggle}>edit</button
			>
		{/if}
		<span class="topbar__sep" aria-hidden="true"></span>
		<ModeSwitch bare />
	</div>
</header>
