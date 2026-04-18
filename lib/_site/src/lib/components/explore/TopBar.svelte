<script lang="ts">
	import CommandChip from "./CommandChip.svelte";

	interface Props {
		lang: string;
		sample: string;
		languages: string[];
		samples: string[];
		show_line_numbers: boolean;
		diff: boolean;
		edit_open: boolean;
		on_lang_change: (next: string) => void;
		on_sample_change: (next: string) => void;
		on_toggle_line_numbers: () => void;
		on_toggle_diff: () => void;
		on_toggle_edit: () => void;
		on_toggle_tweaks: () => void;
	}

	let {
		lang,
		sample,
		languages,
		samples,
		show_line_numbers,
		diff,
		edit_open,
		on_lang_change,
		on_sample_change,
		on_toggle_line_numbers,
		on_toggle_diff,
		on_toggle_edit,
		on_toggle_tweaks,
	}: Props = $props();
</script>

<header class="topbar">
	<div class="topbar__l">
		<a class="brand" href="/">
			<!-- <div class="brand__mark" aria-hidden="true">
				<span class="brand__pip brand__pip--1"></span>
				<span class="brand__pip brand__pip--2"></span>
				<span class="brand__pip brand__pip--3"></span>
			</div> -->
			<div class="brand__name">
				<span class="brand__glyph">twinkleplop</span>
				<!-- <span class="brand__tag">syntax highlighter · explore</span> -->
			</div>
		</a>
		<div class="divider"></div>
		<nav class="crumbs" aria-label="Breadcrumb">
			<span class="crumb">lab</span>
			<span class="crumb__sep">/</span>
			<span class="crumb">compare</span>
			<span class="crumb__sep">/</span>
			<CommandChip
				label="lang"
				value={lang}
				options={languages}
				hint="↑↓ navigate · ↵ select"
				on_change={on_lang_change}
			/>
			<span class="crumb__sep">/</span>
			<CommandChip
				label="sample"
				value={sample}
				options={samples}
				hint="files in /samples"
				on_change={on_sample_change}
			/>
		</nav>
	</div>
	<div class="topbar__r">
		<button
			class="toggle"
			class:is-on={show_line_numbers}
			type="button"
			onclick={on_toggle_line_numbers}
		>
			<span class="toggle__pip"></span>
			<span>ln</span>
		</button>
		<button class="toggle" class:is-on={diff} type="button" onclick={on_toggle_diff}>
			<span class="toggle__pip"></span>
			<span>diff</span>
		</button>
		<button
			class="toggle"
			class:is-on={edit_open}
			type="button"
			onclick={on_toggle_edit}
		>
			<span class="toggle__pip"></span>
			<span>edit</span>
		</button>
		<div class="topbar__divider"></div>
		<button class="topbar__btn" type="button" onclick={on_toggle_tweaks}>
			<span class="topbar__btn-kbd">T</span>
			<span>tweaks</span>
		</button>
	</div>
</header>
