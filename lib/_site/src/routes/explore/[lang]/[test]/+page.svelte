<script lang="ts">
	import { goto } from "$app/navigation";

	import TopBar from "$lib/components/explore/TopBar.svelte";
	import SourceEditor from "$lib/components/explore/SourceEditor.svelte";
	import CodePane from "$lib/components/explore/CodePane.svelte";
	import ShikiPane from "$lib/components/explore/ShikiPane.svelte";
	import RaceBar from "$lib/components/explore/RaceBar.svelte";
	import TweaksPanel from "$lib/components/explore/TweaksPanel.svelte";

	import {
		DEFAULT_TWEAKS,
		PLOP_THEMES,
		type tweak_state,
	} from "$lib/explore/themes";
	import { to_html } from "@twinkleplop/core";

	// core ships no .d.ts yet so we redeclare the result shape locally.
	interface tokenize_result {
		tokens: Uint32Array;
		token_types: string[];
	}
	import { palette_to_vars } from "$lib/explore/palette_vars";
	import { measure } from "$lib/explore/measure";
	import {
		get_highlighter,
		shiki_lang_for,
	} from "$lib/explore/shiki_client";
	import type { Highlighter } from "shiki";
	import "$lib/styles/explore.css";

	let { data } = $props();

	// the underlying modules do not ship .d.ts, so the promise shape is
	// typed loosely here. `language` is resolved at runtime in load_grammar.
	const grammar_loaders: Record<string, () => Promise<unknown>> = {
		css: () => import("@twinkleplop/css"),
		whitespace: () => import("@twinkleplop/whitespace"),
		javascript: () => import("@twinkleplop/javascript"),
		html: () => import("@twinkleplop/html"),
		svelte: () => import("@twinkleplop/svelte"),
		rust: () => import("@twinkleplop/rust"),
		typescript: () => import("@twinkleplop/typescript"),
		tsx: () => import("@twinkleplop/tsx"),
		sql: () => import("@twinkleplop/sql"),
		yaml: () => import("@twinkleplop/yaml"),
		markdown: () => import("@twinkleplop/markdown"),
		toml: () => import("@twinkleplop/toml"),
		python: () => import("@twinkleplop/python"),
		bash: () => import("@twinkleplop/bash"),
		go: () => import("@twinkleplop/go"),
		diff: () => import("@twinkleplop/diff"),
		"diff-basic": () => import("@twinkleplop/diff-basic"),
	};

	const all_languages = Object.keys(grammar_loaders);
	const sample_options = $derived(data.css_files.map(([file]) => file));

	let grammar = $state<((src: string) => tokenize_result) | undefined>();

	async function load_grammar() {
		const loader = grammar_loaders[data.lang];
		if (!loader) return;
		const mod = (await loader()) as { language?: (src: string) => tokenize_result };
		grammar = mod.language;
	}

	$effect(() => {
		// track data.lang so grammar reloads on language change
		data.lang;
		load_grammar();
	});

	// source buffer: starts with the server-provided file, editable locally.
	let source = $state("");
	let source_key = $state("");
	$effect(() => {
		const next_key = `${data.lang}:${data.test}`;
		if (next_key === source_key) return;
		source_key = next_key;
		source = data.css_files.find(([file]) => file === data.test)?.[1] ?? "";
	});

	let tweaks = $state<tweak_state>({ ...DEFAULT_TWEAKS });
	function update_tweaks(patch: Partial<tweak_state>) {
		tweaks = { ...tweaks, ...patch };
	}

	let tweaks_visible = $state(false);
	let source_open = $state(false);

	// twinkleplop tokenization + real parse time. `measure` batches calls
	// to beat the 5-100us `performance.now()` clamp and takes the median
	// across samples to damp out jit/gc noise.
	let plop_tokens = $state<tokenize_result | undefined>();
	let plop_ms = $state(0);
	$effect(() => {
		if (!grammar || !source) {
			plop_tokens = undefined;
			plop_ms = 0;
			return;
		}
		const local_grammar = grammar;
		const { result, ms } = measure(() => local_grammar(source));
		plop_tokens = result;
		plop_ms = ms;
	});

	// shiki now runs client-side so we can time real tokenization against
	// twinkleplop on the same input. the highlighter is a session-wide
	// singleton; first render pays the oniguruma wasm load, subsequent
	// renders are synchronous.
	let highlighter = $state<Highlighter | undefined>();
	let shiki_loading = $state(true);
	let shiki_error = $state<string | null>(null);

	$effect(() => {
		let cancelled = false;
		get_highlighter()
			.then((h) => {
				if (cancelled) return;
				highlighter = h;
				shiki_loading = false;
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				shiki_error = err instanceof Error ? err.message : String(err);
				shiki_loading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	let shiki_html = $state<string | null>(null);
	let shiki_ms = $state(0);
	$effect(() => {
		const shiki_lang = shiki_lang_for(data.lang);
		if (!highlighter || !source || !shiki_lang) {
			shiki_html = null;
			shiki_ms = 0;
			return;
		}
		try {
			const local_highlighter = highlighter;
			const { result, ms } = measure(
				() =>
					local_highlighter.codeToHtml(source, {
						lang: shiki_lang,
						theme: tweaks.shiki_theme,
					}),
				// shiki is an order of magnitude heavier than twinkleplop;
				// trim the budget so edits still feel responsive.
				{ min_sample_ms: 5, budget_ms: 120 },
			);
			shiki_html = result;
			shiki_ms = ms;
		} catch (err) {
			shiki_error = err instanceof Error ? err.message : String(err);
			shiki_html = null;
			shiki_ms = 0;
		}
	});

	let shiki_token_count = $derived(
		(shiki_html?.match(/<span /g)?.length ?? 0) || 0,
	);

	// `crossOriginIsolated` flips true once the coop/coep response headers
	// from hooks.server.ts land. that's what lets `performance.now()`
	// report in 5us steps instead of 100us, so we surface it in the pane
	// subtitle to make the precision of the perf readout honest.
	let cross_origin_isolated = $state(false);
	$effect(() => {
		cross_origin_isolated =
			typeof globalThis !== "undefined" &&
			"crossOriginIsolated" in globalThis &&
			Boolean((globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated);
	});

	let plop_html = $derived(
		plop_tokens
			? to_html(source, plop_tokens, {
					class_name: "code",
					line_numbers: tweaks.show_line_numbers,
				})
			: "",
	);
	let plop_line_count = $derived(count_lines(source));
	let plop_token_count = $derived(
		plop_tokens ? plop_tokens.tokens.length / 3 : 0,
	);

	function count_lines(text: string) {
		if (!text) return 0;
		let count = 1;
		for (let i = 0; i < text.length; i++) {
			if (text.charCodeAt(i) === 10) count++;
		}
		return count;
	}

	let plop_palette_style = $derived(
		palette_to_vars(PLOP_THEMES[tweaks.plop_theme]),
	);

	function handle_lang(next: string) {
		if (next === data.lang) return;
		goto(`/explore/${next}/${data.test}`);
	}

	function handle_sample(next: string) {
		if (next === data.test) return;
		goto(`/explore/${data.lang}/${next}`);
	}
</script>

<div class="explore-app" data-flavor={tweaks.flavor}>
	<TopBar
		lang={data.lang}
		sample={data.test}
		languages={all_languages}
		samples={sample_options}
		show_line_numbers={tweaks.show_line_numbers}
		diff={tweaks.diff}
		edit_open={source_open}
		on_lang_change={handle_lang}
		on_sample_change={handle_sample}
		on_toggle_line_numbers={() =>
			update_tweaks({ show_line_numbers: !tweaks.show_line_numbers })}
		on_toggle_diff={() => update_tweaks({ diff: !tweaks.diff })}
		on_toggle_edit={() => (source_open = !source_open)}
		on_toggle_tweaks={() => (tweaks_visible = !tweaks_visible)}
	/>

	<SourceEditor
		value={source}
		visible={source_open}
		font={tweaks.font}
		density={tweaks.density}
		on_change={(next) => (source = next)}
		on_toggle_visible={() => (source_open = !source_open)}
	/>

	<div class="panes">
		<CodePane
			pane_id="plop"
			title="twinkleplop"
			subtitle={`theme: ${tweaks.plop_theme} · timer ${
				cross_origin_isolated ? "~5µs" : "~100µs"
			}`}
			html={plop_html}
			line_count={plop_line_count}
			palette_style={plop_palette_style}
			density={tweaks.density}
			font={tweaks.font}
			perf_ms={plop_ms}
			perf_token_count={plop_token_count}
		/>
		<div class="panes__gutter" aria-hidden="true">
			<div class="panes__trace"></div>
			<div class="panes__vs">vs</div>
		</div>
		<ShikiPane
			pane_id="shiki"
			title="shiki"
			subtitle={shiki_loading
				? "loading oniguruma..."
				: shiki_error
					? `error: ${shiki_error}`
					: `theme: ${tweaks.shiki_theme}`}
			{shiki_html}
			{source}
			font={tweaks.font}
			density={tweaks.density}
			show_line_numbers={tweaks.show_line_numbers}
			perf_ms={shiki_ms}
			perf_token_count={shiki_token_count}
		/>
	</div>

	<div class="bottombar">
		<div class="bottombar__l">
			<RaceBar twinkle_ms={plop_ms} {shiki_ms} />
		</div>
	</div>

	<TweaksPanel
		visible={tweaks_visible}
		state={tweaks}
		on_update={update_tweaks}
		on_close={() => (tweaks_visible = false)}
	/>
</div>
