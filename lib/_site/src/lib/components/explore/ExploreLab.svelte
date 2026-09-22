<script lang="ts">
	import CodePane from '$lib/components/explore/CodePane.svelte';
	import ShikiPane from '$lib/components/explore/ShikiPane.svelte';
	import RaceBar from '$lib/components/explore/RaceBar.svelte';

	import { FONTS, resolve_theme } from '$lib/explore/themes';
	import { GRAMMAR_LOADERS } from '$lib/explore/grammars';
	import { fidelity_by_lang, view } from '$lib/explore/lab_state.svelte';
	import { theme_mode, hydrate_mode } from '$lib/theme_mode.svelte';
	import { onMount } from 'svelte';
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
		lang: string;
		source: string;
	}

	let { lang, source }: Props = $props();

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

	// token inspector tooltip. when view.inspect is on, hovering a span in
	// either pane reveals the classification the highlighter assigned. for
	// the plop pane we read the second class on a `.tok` span (the first is
	// always `tok`); for the shiki pane we read the `data-scopes` attribute
	// attached by the second-pass annotation effect below. holding shift
	// while hovering a shiki span unfolds the rest of the textmate scope
	// chain beneath the leaf.
	let inspect_label = $state<string | null>(null);
	let inspect_chain = $state<string[] | null>(null);
	let inspect_theme_scope = $state<string | null>(null);
	let inspect_x = $state(0);
	let inspect_y = $state(0);
	let shift_held = $state(false);

	function on_inspect_move(e: PointerEvent) {
		if (!view.inspect) return;
		const target = e.target as Element | null;
		const plop_tok = target?.closest?.('[data-pane="plop"] .tok') as HTMLElement | null;
		if (plop_tok) {
			// the `to_html` markup is `<span class="tok TYPE">`. token types
			// are emitted as bare strings (no spaces), so the second class is
			// the full type name.
			inspect_label = plop_tok.classList[1] ?? null;
			inspect_chain = null;
			inspect_theme_scope = null;
			inspect_x = e.clientX;
			inspect_y = e.clientY;
			return;
		}
		const shiki_tok = target?.closest?.(
			'[data-pane="shiki"] span[data-scopes]'
		) as HTMLElement | null;
		if (shiki_tok) {
			// `data-scopes` is a `|`-joined chain ordered root-first; the
			// leaf (most-specific) scope is the last entry. `data-theme-scope`
			// is the literal scope pattern of the theme rule that won the
			// color contest for this token (e.g. `keyword.operator` even when
			// the grammar leaf is `keyword.operator.assignment.js`).
			const raw = shiki_tok.dataset.scopes ?? '';
			const chain = raw ? raw.split('|') : [];
			inspect_chain = chain.length ? chain : null;
			inspect_label = chain.length ? chain[chain.length - 1] : null;
			inspect_theme_scope = shiki_tok.dataset.themeScope ?? null;
			inspect_x = e.clientX;
			inspect_y = e.clientY;
			return;
		}
		inspect_label = null;
		inspect_chain = null;
		inspect_theme_scope = null;
	}

	function on_inspect_leave() {
		inspect_label = null;
		inspect_chain = null;
		inspect_theme_scope = null;
	}

	$effect(() => {
		if (!view.inspect) {
			inspect_label = null;
			inspect_chain = null;
			inspect_theme_scope = null;
			return;
		}
		function on_keydown(e: KeyboardEvent) {
			if (e.key === 'Shift') shift_held = true;
		}
		function on_keyup(e: KeyboardEvent) {
			if (e.key === 'Shift') shift_held = false;
		}
		function on_blur() {
			shift_held = false;
		}
		window.addEventListener('keydown', on_keydown);
		window.addEventListener('keyup', on_keyup);
		window.addEventListener('blur', on_blur);
		return () => {
			window.removeEventListener('keydown', on_keydown);
			window.removeEventListener('keyup', on_keyup);
			window.removeEventListener('blur', on_blur);
			shift_held = false;
		};
	});

	// chain entries to surface beneath the leaf when shift is held, ordered
	// most-specific-first (the leaf itself sits at the top of the tooltip,
	// so the unfold begins with the leaf's parent).
	let inspect_extra = $derived(
		shift_held && inspect_chain && inspect_chain.length > 1
			? inspect_chain.slice(0, -1).reverse()
			: null
	);

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
	// used to populate `data-scopes` on the rendered shiki spans below.
	let shiki_body_el = $state<HTMLElement | null>(null);
	let shiki_explained = $state<ThemedToken[][] | null>(null);
	$effect(() => {
		const shiki_lang = shiki_lang_for(lang);
		// always invalidate first so the annotation effect doesn't run with
		// stale tokens against fresh dom while the microtask is in flight.
		shiki_explained = null;
		if (!view.inspect || !highlighter || !source || !shiki_lang || !shiki_html) return;
		const local_highlighter = highlighter;
		const local_source = source;
		const local_lang = shiki_lang;
		const local_theme = resolve_theme(view.theme, theme_mode.resolved).shiki_id;
		let cancelled = false;
		// `codeToTokens` is sync but can be heavy; defer it so it doesn't
		// block the same microtask that just rendered shiki_html.
		queueMicrotask(() => {
			if (cancelled) return;
			if (local_source !== source) return;
			try {
				shiki_explained = tokenize_with_scopes(
					local_highlighter,
					local_source,
					local_lang,
					local_theme
				);
			} catch (err) {
				console.warn('shiki explained-tokens pass failed', err);
				shiki_explained = null;
			}
		});
		return () => {
			cancelled = true;
		};
	});

	// returns true when textmate selector `sel` matches the dot-segmented
	// scope `target`. selectors match when their segments are a prefix of
	// the target's segments (e.g. `keyword.operator` matches
	// `keyword.operator.assignment.js`, but `keyword.assignment` does not).
	function selector_matches(sel: string, target: string): boolean {
		return target === sel || target.startsWith(sel + '.');
	}

	// resolves which theme rule actually colored a sub-token, given the
	// rendered color of its parent themedtoken. walks the sub-token's
	// scopes and finds the themematch whose `settings.foreground` equals
	// the parent color. when a matching rule has an array `scope` (theme
	// json shorthand for "all these selectors share these settings"), we
	// narrow to the single selector that actually matched this scope:
	// listing siblings would point at unrelated tokens that happen to
	// share the rule.
	type SubScope = { scopeName: string; themeMatches?: ThemedTokenScopeMatch[] };
	type ThemedTokenScopeMatch = {
		scope?: string | string[];
		settings?: { foreground?: string };
	};
	function resolve_rule(scopes: SubScope[], parent_color: string): string | null {
		if (!parent_color) return null;
		for (const scope of scopes) {
			for (const match of scope.themeMatches ?? []) {
				const fg = match.settings?.foreground?.toLowerCase();
				if (!fg || fg !== parent_color) continue;
				const s = match.scope;
				if (typeof s === 'string') return s;
				if (Array.isArray(s)) {
					let best: string | null = null;
					for (const sel of s) {
						if (typeof sel !== 'string') continue;
						if (selector_matches(sel, scope.scopeName)) {
							if (!best || sel.length > best.length) best = sel;
						}
					}
					if (best) return best;
					for (const sel of s) {
						if (typeof sel === 'string') return sel;
					}
				}
				return null;
			}
		}
		return null;
	}

	// dom annotation: walks the rendered shiki output and tags each token
	// span with `data-scopes` (the grammar chain) and `data-theme-scope`
	// (the theme rule that earned the color). shiki coalesces tokens at
	// *two* layers and we have to undo both:
	//
	// 1. `codeToHtml` merges adjacent same-color spans for the rendered
	//    output, so a single dom span often contains several themedtokens.
	// 2. inside a themedtoken, the tokenizer can also coalesce neighboring
	//    same-color atoms: `");"` arrives as one themedtoken whose
	//    `explanation` array carries two entries (`)` with `meta.brace
	//    .round` and `;` with `punctuation.terminator.statement`). so the
	//    real atomic unit is the explanation entry, not the themedtoken.
	//
	// we flatten the line into per-explanation sub-tokens, walk dom spans
	// in lockstep by character length, and split any span that ends up
	// containing more than one sub-token into per-sub-token spans. cloning
	// the original span's style preserves the rendered color so splitting
	// is visually invisible, but each sub-span is now its own hover
	// target with its own accurate scope/rule annotation.
	//
	// we restore shiki_html into the body before walking so previous
	// annotation passes (which mutated the dom by splitting) don't throw
	// off the per-character walk. svelte's {@html} only re-renders when
	// the html string itself changes, so toggling inspect off/on for the
	// same source would otherwise re-walk a stale, already-split dom.
	// `shiki_html` is shiki's own escaped output and is already trusted
	// here: the parent template renders it via {@html} in shikipane.
	$effect(() => {
		if (!shiki_body_el || !shiki_explained || !shiki_html) return;
		Reflect.set(shiki_body_el, 'innerHTML', shiki_html);
		const lines = shiki_body_el.querySelectorAll('.line');
		const explained = shiki_explained;
		for (let line_idx = 0; line_idx < lines.length; line_idx++) {
			const line = lines[line_idx];
			const tokens = explained[line_idx];
			if (!tokens || tokens.length === 0) continue;
			type Sub = { content: string; scopes: string[]; theme_scope: string | null };
			const flat: Sub[] = [];
			for (const tok of tokens) {
				const color = (tok.color ?? '').toLowerCase();
				const exps = tok.explanation ?? [];
				if (exps.length === 0) {
					flat.push({ content: tok.content, scopes: [], theme_scope: null });
					continue;
				}
				for (const exp of exps) {
					const scopes_arr = exp.scopes ?? [];
					const names = scopes_arr.map((s) => s.scopeName);
					const theme_scope = resolve_rule(scopes_arr as SubScope[], color);
					flat.push({ content: exp.content, scopes: names, theme_scope });
				}
			}
			const original_spans = Array.from(line.querySelectorAll(':scope > span'));
			let sub_idx = 0;
			for (const span of original_spans) {
				const span_len = span.textContent?.length ?? 0;
				const contained: Sub[] = [];
				let consumed = 0;
				while (sub_idx < flat.length && consumed < span_len) {
					contained.push(flat[sub_idx]);
					consumed += flat[sub_idx].content.length;
					sub_idx++;
				}
				apply_subtokens(span as HTMLElement, contained);
			}
		}
	});

	function apply_subtokens(
		span: HTMLElement,
		subs: { content: string; scopes: string[]; theme_scope: string | null }[]
	) {
		if (subs.length === 0) return;
		if (subs.length === 1) {
			annotate_span(span, subs[0].scopes, subs[0].theme_scope);
			return;
		}
		const style = span.getAttribute('style') ?? '';
		const cls = span.getAttribute('class') ?? '';
		const fragment = document.createDocumentFragment();
		for (const s of subs) {
			const new_span = document.createElement('span');
			if (style) new_span.setAttribute('style', style);
			if (cls) new_span.setAttribute('class', cls);
			new_span.textContent = s.content;
			annotate_span(new_span, s.scopes, s.theme_scope);
			fragment.appendChild(new_span);
		}
		span.replaceWith(fragment);
	}

	function annotate_span(span: HTMLElement, scopes: string[], theme_scope: string | null) {
		if (scopes.length > 0) {
			span.dataset.scopes = scopes.join('|');
		} else {
			delete span.dataset.scopes;
		}
		if (theme_scope) {
			span.dataset.themeScope = theme_scope;
		} else {
			delete span.dataset.themeScope;
		}
	}

	// `crossOriginIsolated` flips true once the coop/coep response headers
	// from hooks.server.ts land. that's what lets `performance.now()`
	// report in 5us steps instead of 100us, so we surface it in the pane
	// subtitle to make the precision of the perf readout honest.
	let cross_origin_isolated = $state(false);
	$effect(() => {
		cross_origin_isolated =
			typeof globalThis !== 'undefined' &&
			'crossOriginIsolated' in globalThis &&
			Boolean((globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated);
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

</script>

<svelte:head>
	{#if theme_style_css}
		{@html `<style>${theme_style_css}</style>`}
	{/if}
</svelte:head>

{#snippet fidelity_meta()}
	{#if available_tags.length > 0}
		<details bind:this={fidelity_el} bind:open={fidelity_open} class="fidelity">
			<summary class="fidelity__trigger">
				<span class="fidelity__label">fidelity</span>
				<span class="fidelity__count">
					[{enabled_tags.length}/{available_tags.length}]
				</span>
			</summary>
			<div class="fidelity__menu" role="group" aria-label="Fidelity tags">
				<div class="fidelity__head">token categories</div>
				{#each available_tags as tag (tag)}
					<label class="fidelity__item">
						<input
							type="checkbox"
							checked={enabled_tags.includes(tag)}
							onchange={() => toggle_tag(tag)}
						/>
						<span class="fidelity__mark" aria-hidden="true"></span>
						<span class="fidelity__name">{tag}</span>
					</label>
				{/each}
			</div>
		</details>
	{/if}
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="panes"
	class:is-inspect={view.inspect}
	style={palette_style}
	onpointermove={on_inspect_move}
	onpointerleave={on_inspect_leave}
>
	<CodePane
		pane_id="plop"
		title="twinkleplop"
		subtitle={`theme: ${view.theme}-${theme_mode.resolved} · timer ${
			cross_origin_isolated ? '~5µs' : '~100µs'
		}`}
		html={plop_html}
		line_count={plop_line_count}
		font={font.value}
		show_line_numbers={view.show_line_numbers}
		perf_ms={plop_ms}
		perf_token_count={plop_token_count}
		meta={fidelity_meta}
	/>
	<ShikiPane
		pane_id="shiki"
		title="shiki"
		subtitle={shiki_loading
			? 'loading oniguruma...'
			: shiki_error
				? `error: ${shiki_error}`
				: `theme: ${resolve_theme(view.theme, theme_mode.resolved).shiki_id}`}
		{shiki_html}
		{source}
		font={font.value}
		show_line_numbers={view.show_line_numbers}
		perf_ms={shiki_ms}
		perf_token_count={shiki_token_count}
		bind:body_el={shiki_body_el}
	/>
</div>

<div class="bottombar">
	<div class="bottombar__l">
		<RaceBar twinkle_ms={plop_ms} {shiki_ms} />
	</div>
</div>

{#if view.inspect && inspect_label}
	<div
		class="inspect-tip"
		class:inspect-tip--stack={inspect_extra || inspect_theme_scope}
		style="left: {inspect_x}px; top: {inspect_y}px;"
	>
		<span class="inspect-tip__value">{inspect_label}</span>
		{#if inspect_theme_scope}
			<span class="inspect-tip__themed">
				<span class="inspect-tip__themed-label">themed by</span>
				<span class="inspect-tip__themed-scope">{inspect_theme_scope}</span>
			</span>
		{/if}
		{#if inspect_extra}
			<ul class="inspect-tip__chain">
				{#each inspect_extra as scope (scope)}
					<li class="inspect-tip__scope">{scope}</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.fidelity {
		position: relative;
	}
	.fidelity__trigger {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--bg-pane);
		border: 1px solid var(--border);
		color: var(--fg-dim);
		padding: 3px 8px;
		font: inherit;
		font-size: 11px;
		letter-spacing: 0.04em;
		cursor: pointer;
		user-select: none;
		list-style: none;
		text-transform: lowercase;
		transition:
			border-color 0.15s,
			color 0.15s,
			background 0.15s;
	}
	.fidelity__trigger::-webkit-details-marker {
		display: none;
	}
	.fidelity__trigger::marker {
		content: '';
	}
	.fidelity__trigger:hover {
		color: var(--fg);
		border-color: var(--border-bright);
	}
	.fidelity[open] .fidelity__trigger {
		color: var(--accent);
		border-color: var(--accent);
		background: color-mix(in oklab, var(--accent) 14%, var(--bg-pane));
	}
	.fidelity__count {
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.fidelity:not([open]) .fidelity__menu {
		display: none;
	}
	.fidelity__menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		min-width: 220px;
		max-height: 320px;
		overflow: auto;
		background: var(--bg-elev);
		border: 1px solid var(--border-bright);
		box-shadow:
			0 12px 40px rgba(0, 0, 0, 0.6),
			var(--glow);
		padding: 6px;
		z-index: 100;
	}
	.fidelity__head {
		padding: 4px 8px 6px;
		color: var(--fg-muted);
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		border-bottom: 1px dashed var(--border);
		margin-bottom: 4px;
	}
	.fidelity__item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 8px;
		color: var(--fg-dim);
		font-size: 12px;
		cursor: pointer;
		user-select: none;
	}
	.fidelity__item:hover {
		background: color-mix(in oklab, var(--fg) 5%, transparent);
		color: var(--fg);
	}
	.fidelity__item:has(input:checked) {
		color: var(--fg);
	}
	.fidelity__item input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}
	.fidelity__mark {
		display: inline-block;
		min-width: 22px;
		color: var(--fg-muted);
		white-space: pre;
		font-variant-numeric: tabular-nums;
	}
	/* the nbsp keeps the space between [ and ] from collapsing so the
	   unchecked and checked glyphs occupy the same width. */
	.fidelity__mark::before {
		content: '[\00a0]';
	}
	.fidelity__item:has(input:checked) .fidelity__mark {
		color: var(--accent);
		text-shadow: var(--glow);
	}
	.fidelity__item:has(input:checked) .fidelity__mark::before {
		content: '[x]';
	}
	.fidelity__name {
		flex: 1;
	}
</style>
