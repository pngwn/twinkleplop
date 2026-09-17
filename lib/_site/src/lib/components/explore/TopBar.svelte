<script lang="ts">
	import CommandChip from "./CommandChip.svelte";
	import ModeSwitch from "$lib/components/ModeSwitch.svelte";

	interface Props {
		lang: string;
		sample: string;
		languages: string[];
		samples: string[];
		theme: string;
		themes: string[];
		font: string;
		fonts: string[];
		show_line_numbers: boolean;
		inspect: boolean;
		edit_open: boolean;
		on_lang_change: (next: string) => void;
		on_sample_change: (next: string) => void;
		on_theme_change: (next: string) => void;
		on_font_change: (next: string) => void;
		on_toggle_line_numbers: () => void;
		on_toggle_inspect: () => void;
		on_toggle_edit: () => void;
	}

	let {
		lang,
		sample,
		languages,
		samples,
		theme,
		themes,
		font,
		fonts,
		show_line_numbers,
		inspect,
		edit_open,
		on_lang_change,
		on_sample_change,
		on_theme_change,
		on_font_change,
		on_toggle_line_numbers,
		on_toggle_inspect,
		on_toggle_edit,
	}: Props = $props();
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
				options={languages}
				on_change={on_lang_change}
			/>
			<span class="crumb__sep" aria-hidden="true">/</span>
			<CommandChip
				label="sample"
				value={sample}
				options={samples}
				on_change={on_sample_change}
			/>
		</nav>
	</div>
	<div class="topbar__r">
		<div class="topbar__group" role="group" aria-label="Code view">
			<CommandChip
				label="theme"
				value={theme}
				options={themes}
				show_label
				align="right"
				on_change={on_theme_change}
			/>
			<CommandChip
				label="font"
				value={font}
				options={fonts}
				show_label
				align="right"
				on_change={on_font_change}
			/>
		</div>
		<div class="topbar__divider"></div>
		<button
			class="toggle"
			class:is-on={show_line_numbers}
			type="button"
			aria-pressed={show_line_numbers}
			title="line numbers"
			onclick={on_toggle_line_numbers}
		>
			<span class="toggle__pip"></span>
			<span>ln</span>
		</button>
		<button
			class="toggle"
			class:is-on={inspect}
			type="button"
			aria-pressed={inspect}
			onclick={on_toggle_inspect}
		>
			<span class="toggle__pip"></span>
			<span>inspect tokens</span>
		</button>
		<button
			class="toggle"
			class:is-on={edit_open}
			type="button"
			aria-pressed={edit_open}
			onclick={on_toggle_edit}
		>
			<span class="toggle__pip"></span>
			<span>edit</span>
		</button>
		<div class="topbar__divider"></div>
		<ModeSwitch />
	</div>
</header>
