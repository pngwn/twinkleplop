<script lang="ts">
	import type { edit_control, path_control } from "./TopBar.svelte";
	import { LANGUAGES } from "$lib/explore/grammars";
	import { view } from "$lib/explore/lab_state.svelte";
	import { format_ms, speedup } from "$lib/explore/measure";
	import { FONTS, THEME_NAMES, type theme_name } from "$lib/explore/themes";

	interface Props {
		path: path_control;
		edit: edit_control;
		plop_ms: number;
		shiki_ms: number;
		fidelity: { available: string[]; enabled: string[]; toggle: (tag: string) => void };
	}

	let { path, edit, plop_ms, shiki_ms, fidelity }: Props = $props();

	type sheet_name = "path" | "path:lang" | "menu" | "menu:theme" | "menu:font" | "menu:fid";
	let sheet = $state<sheet_name | null>(null);
	let bar = $state<HTMLElement>();

	const path_open = $derived(sheet?.startsWith("path") ?? false);
	const menu_open = $derived(sheet?.startsWith("menu") ?? false);
	const max = $derived(Math.max(plop_ms, shiki_ms, 0.01));
	const font_labels = FONTS.map((f) => f.label);

	$effect(() => {
		if (!sheet) return;
		function on_pointerdown(e: PointerEvent) {
			if (!bar?.contains(e.target as Node)) sheet = null;
		}
		function on_keydown(e: KeyboardEvent) {
			if (e.key === "Escape") sheet = null;
		}
		document.addEventListener("pointerdown", on_pointerdown);
		document.addEventListener("keydown", on_keydown);
		return () => {
			document.removeEventListener("pointerdown", on_pointerdown);
			document.removeEventListener("keydown", on_keydown);
		};
	});

	function pick_sample(name: string) {
		sheet = null;
		path.on_sample_change(name);
	}

	function pick_lang(next: string) {
		sheet = "path";
		path.on_lang_change(next);
	}
</script>

{#snippet choices(options: string[], current: string, pick: (next: string) => void)}
	<div class="sheet__scroll">
		{#each options as option (option)}
			<button
				class="sheet__item"
				class:is-on={option === current}
				type="button"
				aria-pressed={option === current}
				onclick={() => pick(option)}
			>
				<span class="sheet__mk" aria-hidden="true">{option === current ? "●" : "○"}</span>
				{option}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet back(to: sheet_name, label: string, title: string)}
	<div class="sheet__head">
		<button class="sheet__back" type="button" onclick={() => (sheet = to)}>‹ {label}</button>
		<span>{title}</span>
	</div>
{/snippet}

<nav class="mbar" bind:this={bar} aria-label="Lab controls">
	<div class="mbar__race">
		<span>twinkleplop <b>{format_ms(plop_ms)}</b></span>
		<span class="mbar__mini" aria-hidden="true">
			<i style:--w="{(plop_ms / max) * 100}%"></i>
			<i style:--w="{(shiki_ms / max) * 100}%"></i>
		</span>
		<span>
			shiki <b>{format_ms(shiki_ms)}</b> ·
			<span class="mbar__ratio">{speedup(plop_ms, shiki_ms)}</span>
		</span>
	</div>

	{#if sheet === "path"}
		<div class="sheet sheet--tall">
			<button class="sheet__item sheet__item--nav" type="button" onclick={() => (sheet = "path:lang")}>
				<span class="sheet__lbl">language</span>
				<span>{path.lang}</span>
				<span class="sheet__chev" aria-hidden="true">›</span>
			</button>
			{@render choices(path.samples, path.sample, pick_sample)}
		</div>
	{:else if sheet === "path:lang"}
		<div class="sheet sheet--tall">
			{@render back("path", path.sample, "language")}
			{@render choices(LANGUAGES, path.lang, pick_lang)}
		</div>
	{:else if sheet === "menu"}
		<div class="sheet">
			<button class="sheet__item sheet__item--nav" type="button" onclick={() => (sheet = "menu:theme")}>
				<span class="sheet__lbl">theme</span>
				<span>{view.theme}</span>
				<span class="sheet__chev" aria-hidden="true">›</span>
			</button>
			<button class="sheet__item sheet__item--nav" type="button" onclick={() => (sheet = "menu:font")}>
				<span class="sheet__lbl">font</span>
				<span>{view.font}</span>
				<span class="sheet__chev" aria-hidden="true">›</span>
			</button>
			{#if fidelity.available.length > 0}
				<button class="sheet__item sheet__item--nav" type="button" onclick={() => (sheet = "menu:fid")}>
					<span class="sheet__lbl">fidelity</span>
					<span>{fidelity.enabled.length}/{fidelity.available.length}</span>
					<span class="sheet__chev" aria-hidden="true">›</span>
				</button>
			{/if}
			<div class="sheet__row">
				<span class="sheet__lbl">view</span>
				<button
					class="toggle"
					class:is-on={view.show_line_numbers}
					type="button"
					aria-pressed={view.show_line_numbers}
					onclick={() => (view.show_line_numbers = !view.show_line_numbers)}
				>
					<span class="toggle__pip"></span>
					<span>lines</span>
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
			</div>
		</div>
	{:else if sheet === "menu:theme"}
		<div class="sheet">
			{@render back("menu", "menu", "theme")}
			{@render choices(THEME_NAMES, view.theme, (next) => {
				view.theme = next as theme_name;
				sheet = "menu";
			})}
		</div>
	{:else if sheet === "menu:font"}
		<div class="sheet">
			{@render back("menu", "menu", "font")}
			{@render choices(font_labels, view.font, (next) => {
				view.font = next;
				sheet = "menu";
			})}
		</div>
	{:else if sheet === "menu:fid"}
		<div class="sheet">
			{@render back("menu", "menu", "token categories")}
			<div class="sheet__scroll">
				{#each fidelity.available as tag (tag)}
					<label class="sheet__item fidelity__item">
						<input
							type="checkbox"
							checked={fidelity.enabled.includes(tag)}
							onchange={() => fidelity.toggle(tag)}
						/>
						<span class="fidelity__mark" aria-hidden="true"></span>
						<span>{tag}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}

	<div class="mbar__row">
		<button
			class="mbar__btn mbar__path"
			class:is-on={path_open}
			type="button"
			aria-expanded={path_open}
			aria-label="language {path.lang}, sample {path.sample}"
			onclick={() => (sheet = path_open ? null : "path")}
		>
			<span>{path.lang}</span><span class="slash" aria-hidden="true">/</span><span>{path.sample}</span>
		</button>
		{#if "href" in edit}
			<a class="mbar__btn mbar__edit" href={edit.href}>edit</a>
		{:else}
			<button
				class="mbar__btn mbar__edit"
				class:is-on={edit.on}
				type="button"
				aria-pressed={edit.on}
				onclick={() => {
					sheet = null;
					edit.toggle();
				}}>edit</button
			>
		{/if}
		<button
			class="mbar__btn mbar__menu"
			class:is-on={menu_open}
			type="button"
			aria-expanded={menu_open}
			aria-label="menu"
			onclick={() => (sheet = menu_open ? null : "menu")}>{menu_open ? "✕" : "≡"}</button
		>
	</div>
</nav>
