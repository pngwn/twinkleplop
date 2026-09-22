<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount, untrack } from 'svelte';

	import TopBar, { type edit_control, type path_control } from './TopBar.svelte';
	import MobileBar from './MobileBar.svelte';
	import Pane, { type readout } from './Pane.svelte';
	import RaceBar from './RaceBar.svelte';
	import ModeSwitch from '$lib/components/ModeSwitch.svelte';

	import { FONTS, resolve_theme } from '$lib/explore/themes';
	import { GRAMMAR_LOADERS } from '$lib/explore/grammars';
	import { fidelity_by_lang, view } from '$lib/explore/lab_state.svelte';
	import { locate, token_in, token_index, type text_position } from '$lib/explore/inspect';
	import { annotate_shiki } from '$lib/explore/shiki_annotate';
	import { theme_mode, hydrate_mode } from '$lib/theme_mode.svelte';
	import { GRAMMAR_EXTENSION_CATEGORIES, to_html } from '@twinkleplop/core';
	import { add, del, dim, em, err, hl, info, mod, warn } from '@twinkleplop/annotation';

	// core ships no .d.ts yet so we redeclare the result shape locally.
	interface tokenize_result {
		tokens: Uint32Array;
		token_types: string[];
	}

	// annotation plugins are always on in the lab. defining the array once
	// keeps the factory call cheap (no new array every reactive update).
	const annotation_plugins = [em, hl, dim, add, del, mod, err, warn, info];
	import { palette_to_vars, styles_to_css } from '$lib/explore/palette_vars';
	import { measure } from '$lib/explore/measure';
	import {
		get_highlighter,
		shiki_lang_for,
		tokenize_with_scopes
	} from '$lib/explore/shiki_client';
	import type { Highlighter, ThemedToken } from 'shiki';
	import '$lib/styles/explore.css';

	interface Props {
		path: path_control;
		edit: edit_control;
		source: string;
		// the source editor, shown between the top bar and the panes
		editor?: Snippet;
	}

	let { path, edit, source, editor }: Props = $props();

	const lang = $derived(path.lang);

	// the factory reference is kept separately from the resolved grammar so
	// flipping a fidelity tag just re-runs the derivation below without
	// re-importing the language module.
	let make_language = $state<((opts?: unknown) => (src: string) => tokenize_result) | undefined>();
	let available_tags = $state.raw<string[]>([]);

	// shared so a page can put the picks in a link, tags the grammar lacks are dropped
	const enabled_tags = $derived.by(() => {
		const picked = fidelity_by_lang[lang];
		return picked ? available_tags.filter((tag) => picked.includes(tag)) : available_tags;
	});

	async function load_grammar(next: string) {
		const loader = GRAMMAR_LOADERS[next];
		if (!loader) {
			make_language = undefined;
			available_tags = [];
			return;
		}
		const mod = (await loader()) as {
			tokenize?: (options?: unknown) => (src: string) => tokenize_result;
			grammar?: { token_types?: string[] };
			reclassifiers?: Array<
				((...a: unknown[]) => unknown) | { reclassifier: unknown; produces: string[] }
			>;
		};
		const tags: string[] = [];
		const seen = new Set<string>();
		// grammar-baked categories (boolean, function, decorator) come first
		// so the UI presents them alongside reclassifier-driven categories.
		// only categories whose token type actually appears in the compiled
		// grammar are surfaced, so there are no toggles for categories the
		// language never emits. these downgrade via the core's
		// GRAMMAR_EXTENSION_DOWNGRADES table when unchecked.
		const grammar_types = new Set(mod.grammar?.token_types ?? []);
		for (const cat of GRAMMAR_EXTENSION_CATEGORIES) {
			if (grammar_types.has(cat) && !seen.has(cat)) {
				seen.add(cat);
				tags.push(cat);
			}
		}
		for (const entry of mod.reclassifiers ?? []) {
			if (typeof entry === 'function') continue;
			for (const p of entry.produces) {
				if (!seen.has(p)) {
					seen.add(p);
					tags.push(p);
				}
			}
		}
		// a later language may have been picked while this one loaded
		if (next !== lang) return;
		available_tags = tags;
		make_language = mod.tokenize;
	}

	$effect(() => {
		load_grammar(lang);
	});

	let grammar = $derived.by(() => {
		if (!make_language) return undefined;
		const fidelity =
			enabled_tags.length === 0
				? 'low'
				: enabled_tags.length === available_tags.length
					? 'high'
					: enabled_tags;
		return make_language({ fidelity, annotation: { plugins: annotation_plugins } });
	});

	function toggle_tag(tag: string) {
		const next = enabled_tags.includes(tag)
			? enabled_tags.filter((t) => t !== tag)
			: available_tags.filter((t) => t === tag || enabled_tags.includes(t));
		fidelity_by_lang[lang] = next.length === available_tags.length ? null : next;
	}

	const font = $derived(FONTS.find((f) => f.label === view.font) ?? FONTS[0]);

	// only jetbrains mono ships with the site; the other fonts are pulled
	// from google fonts the first time they're picked
	$effect(() => {
		if (!font.google) return;
		const id = `lab-font-${font.google}`;
		if (document.getElementById(id)) return;
		const link = document.createElement('link');
		link.id = id;
		link.rel = 'stylesheet';
		link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
		document.head.append(link);
	});

	// fidelity popout: bind:open makes the native disclosure reactive, and
	// the effect closes it on clicks outside the <details> element.
	let fidelity_open = $state(false);
	let fidelity_el = $state<HTMLDetailsElement>();

	$effect(() => {
		if (!fidelity_open) return;
		function on_pointerdown(e: PointerEvent) {
			if (!fidelity_el?.contains(e.target as Node)) {
				fidelity_open = false;
			}
		}
		document.addEventListener('pointerdown', on_pointerdown);
		return () => document.removeEventListener('pointerdown', on_pointerdown);
	});

	onMount(() => {
		hydrate_mode();
	});

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
		const shiki_lang = shiki_lang_for(lang);
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
						theme: resolve_theme(view.theme, theme_mode.resolved).shiki_id
					}),
				// shiki is an order of magnitude heavier than twinkleplop;
				// trim the budget so edits still feel responsive.
				{ min_sample_ms: 5, budget_ms: 50 }
			);
			shiki_html = result;
			shiki_ms = ms;
		} catch (err) {
			shiki_error = err instanceof Error ? err.message : String(err);
			shiki_html = null;
			shiki_ms = 0;
		}
	});

	let shiki_token_count = $derived((shiki_html?.match(/<span /g)?.length ?? 0) || 0);

	// second, untimed pass: only runs when the inspector is on. shiki's
	// `includeExplanation` materially slows tokenization, so keeping it out
	// of the timed `codeToHtml` path lets the perf readout in the shiki pane
	// stay honest. the result is the per-line, per-token explanation tree
	// used to populate `data-scopes` on the rendered shiki spans.
	let shiki_explained = $state<{ html: string; tokens: ThemedToken[][] } | null>(null);
	$effect(() => {
		const shiki_lang = shiki_lang_for(lang);
		shiki_explained = null;
		if (!view.inspect || !highlighter || !source || !shiki_lang || !shiki_html) return;
		const local_highlighter = highlighter;
		const local_source = source;
		const local_html = shiki_html;
		const local_lang = shiki_lang;
		const local_theme = resolve_theme(view.theme, theme_mode.resolved).shiki_id;
		let cancelled = false;
		// `codeToTokens` is sync but can be heavy; defer it so it doesn't
		// block the same microtask that just rendered shiki_html.
		queueMicrotask(() => {
			if (cancelled) return;
			try {
				const tokens = tokenize_with_scopes(
					local_highlighter,
					local_source,
					local_lang,
					local_theme
				);
				shiki_explained = { html: local_html, tokens };
			} catch (err) {
				console.warn('shiki explained-tokens pass failed', err);
			}
		});
		return () => {
			cancelled = true;
		};
	});

	let plop_html = $derived(
		plop_tokens
			? to_html(source, plop_tokens, {
					class_name: 'code',
					line_numbers: view.show_line_numbers
				})
			: ''
	);
	let plop_line_count = $derived(count_lines(source));
	let plop_token_count = $derived(plop_tokens ? plop_tokens.tokens.length / 3 : 0);

	function count_lines(text: string) {
		if (!text) return 0;
		let count = 1;
		for (let i = 0; i < text.length; i++) {
			if (text.charCodeAt(i) === 10) count++;
		}
		return count;
	}

	// written here rather than with {@html}, which cannot survive the scope
	// annotation rewriting the shiki dom, both are escaped highlighter output
	let plop_code_el = $state<HTMLElement>();
	let shiki_code_el = $state<HTMLElement>();
	// bumped whenever either pane dom is rebuilt
	let dom_version = $state(0);

	$effect(() => {
		if (!plop_code_el) return;
		plop_code_el.innerHTML = plop_html;
		untrack(() => dom_version++);
	});

	$effect(() => {
		if (!shiki_code_el) return;
		shiki_code_el.innerHTML = shiki_html ?? '';
		if (shiki_html && shiki_explained?.html === shiki_html) {
			annotate_shiki(shiki_code_el, shiki_explained.tokens);
		}
		untrack(() => dom_version++);
	});

	// the inspected token, under the pointer or pinned by a click, lights up
	// in both panes and each footer names it
	let panes_el = $state<HTMLElement>();
	let hot = $state<text_position | null>(null);
	let pinned = $state(false);
	let plop_readout = $state<readout | null>(null);
	let shiki_readout = $state<readout | null>(null);

	const line_starts = $derived.by(() => {
		const starts = [0];
		for (let i = 0; i < source.length; i++) {
			if (source.charCodeAt(i) === 10) starts.push(i + 1);
		}
		return starts;
	});

	function same(a: text_position | null, b: text_position | null) {
		return a?.line === b?.line && a?.col === b?.col;
	}

	function on_pointerover(e: PointerEvent) {
		if (!view.inspect || pinned) return;
		const at = locate(e.target);
		if (!same(at, hot)) hot = at;
	}

	function on_pointerleave() {
		if (!pinned) hot = null;
	}

	function on_click(e: MouseEvent) {
		if (!view.inspect) return;
		const at = locate(e.target);
		if (at && !(pinned && same(at, hot))) {
			hot = at;
			pinned = true;
		} else {
			hot = null;
			pinned = false;
		}
	}

	$effect(() => {
		if (view.inspect) return;
		hot = null;
		pinned = false;
	});

	// the plop readout comes from the token stream, so its index is the real
	// token index rather than a count of spans
	function plop_token_at(offset: number): readout | null {
		if (!plop_tokens) return null;
		const t = plop_tokens.tokens;
		let lo = 0;
		let hi = t.length / 3 - 1;
		let found = -1;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			if (t[mid * 3 + 1] <= offset) {
				found = mid;
				lo = mid + 1;
			} else {
				hi = mid - 1;
			}
		}
		if (found < 0 || t[found * 3 + 2] <= offset) return null;
		return {
			index: found,
			type: plop_tokens.token_types[t[found * 3]],
			text: source.slice(t[found * 3 + 1], t[found * 3 + 2])
		};
	}

	function shiki_token_readout(pane: Element, token: HTMLElement): readout {
		const chain = token.dataset.scopes?.split('|') ?? [];
		return {
			index: token_index(pane, token),
			type: chain.at(-1) ?? 'text',
			text: token.textContent ?? '',
			note: token.dataset.themeScope && `themed by ${token.dataset.themeScope}`,
			detail: chain.toReversed().join('\n') || undefined
		};
	}

	$effect(() => {
		dom_version;
		const at = hot;
		const lit: HTMLElement[] = [];
		plop_readout = null;
		shiki_readout = null;
		if (at && panes_el) {
			for (const pane of panes_el.querySelectorAll<HTMLElement>('[data-pane]')) {
				const token = token_in(pane, at);
				if (!token) continue;
				token.classList.add('is-hot');
				lit.push(token);
				if (pane.dataset.pane === 'shiki') shiki_readout = shiki_token_readout(pane, token);
			}
			plop_readout = plop_token_at((line_starts[at.line] ?? 0) + at.col);
		}
		return () => {
			for (const token of lit) token.classList.remove('is-hot');
		};
	});

	// phones show one pane at a time in a horizontal scroller
	let active_pane = $state(0);

	function on_panes_scroll() {
		if (panes_el?.clientWidth) {
			active_pane = Math.round(panes_el.scrollLeft / panes_el.clientWidth);
		}
	}

	function show_pane(index: number) {
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		panes_el?.scrollTo({
			left: index * panes_el.clientWidth,
			behavior: reduce ? 'auto' : 'smooth'
		});
	}

	// palette_style drives the plop pane's token colours AND the shared
	// `--twp-background` so both panes paint against the theme's editor
	// background. it lives on the .panes wrapper so the shiki pane (which
	// ignores the token vars) still inherits --twp-background.
	let palette_style = $derived(
		palette_to_vars(resolve_theme(view.theme, theme_mode.resolved).palette)
	);

	let theme_style_css = $derived(
		styles_to_css(
			resolve_theme(view.theme, theme_mode.resolved).styles,
			'.explore-app [data-pane="plop"]'
		)
	);

	const fidelity_count = $derived(`${enabled_tags.length}/${available_tags.length}`);
</script>

<svelte:head>
	{#if theme_style_css}
		{@html `<style>${theme_style_css}</style>`}
	{/if}
</svelte:head>

<div class="explore-app">
	<TopBar {path} {edit} />

	<header class="mtop">
		<a class="mtop__back" href="/docs">← docs</a>
		<ModeSwitch bare />
	</header>

	{@render editor?.()}

	<div class="tabs" role="tablist" aria-label="Highlighter">
		<button
			class="tabs__tab"
			class:is-on={active_pane === 0}
			type="button"
			role="tab"
			aria-selected={active_pane === 0}
			aria-controls="pane-plop"
			onclick={() => show_pane(0)}
		>
			twinkleplop
			{#if available_tags.length > 0}<span class="tabs__fid">{fidelity_count}</span>{/if}
		</button>
		<button
			class="tabs__tab"
			class:is-on={active_pane === 1}
			type="button"
			role="tab"
			aria-selected={active_pane === 1}
			aria-controls="pane-shiki"
			onclick={() => show_pane(1)}
		>
			shiki
		</button>
	</div>

	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		bind:this={panes_el}
		class="panes"
		class:is-inspect={view.inspect}
		style={palette_style}
		onscroll={on_panes_scroll}
		onpointerover={on_pointerover}
		onpointerleave={on_pointerleave}
		onclick={on_click}
	>
		<Pane
			pane_id="plop"
			title="twinkleplop"
			font={font.value}
			show_line_numbers={view.show_line_numbers}
			token_count={plop_token_count}
			line_count={plop_line_count}
			ms={plop_ms}
			readout={plop_readout}
			bind:code_el={plop_code_el}
		>
			{#snippet meta()}
				{#if available_tags.length > 0}
					<details bind:this={fidelity_el} bind:open={fidelity_open} class="fidelity">
						<summary
							class="fidelity__trigger"
							class:is-full={enabled_tags.length === available_tags.length}
						>
							fidelity {fidelity_count}
						</summary>
						<div class="fidelity__menu" role="group" aria-label="Token categories">
							<div class="fidelity__head">token categories</div>
							{#each available_tags as tag (tag)}
								<label class="fidelity__item">
									<input
										type="checkbox"
										checked={enabled_tags.includes(tag)}
										onchange={() => toggle_tag(tag)}
									/>
									<span class="fidelity__mark" aria-hidden="true"></span>
									<span>{tag}</span>
								</label>
							{/each}
						</div>
					</details>
				{/if}
			{/snippet}
		</Pane>
		<Pane
			pane_id="shiki"
			title="shiki"
			status={shiki_loading ? 'loading oniguruma' : shiki_error && `error: ${shiki_error}`}
			font={font.value}
			show_line_numbers={view.show_line_numbers}
			token_count={shiki_token_count}
			line_count={plop_line_count}
			ms={shiki_ms}
			readout={shiki_readout}
			plain={shiki_html ? undefined : source}
			bind:code_el={shiki_code_el}
		/>
	</div>

	<div class="race">
		<RaceBar twinkle_ms={plop_ms} {shiki_ms} />
	</div>

	<MobileBar
		{path}
		{edit}
		{plop_ms}
		{shiki_ms}
		fidelity={{ available: available_tags, enabled: enabled_tags, toggle: toggle_tag }}
	/>
</div>
