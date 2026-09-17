<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import SubSection from "$lib/docs/components/SubSection.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import AsciiArt from "$lib/docs/components/AsciiArt.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { bash } from "$lib/docs/highlighters";
	import { twoslash } from "$lib/docs/twoslash";

	const pipeline = `   ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
   │  tokenize    │ ──▶ │   reclassify     │ ──▶ │   to_html    │
   │              │     │                  │     │              │
   │ chars        │     │ enrich, embed    │     │ one-pass     │
   │ → tokens     │     │ → tokens         │     │ → string     │
   └──────────────┘     └──────────────────┘     └──────────────┘
    stack machine        pure transforms          no tree`;

	const tokens_diagram = `  input:   const x = 42;

  tokens:  [type, start, end] triplets in one Uint32Array

           keyword      0   5
           identifier   6   7
           operator     8   9
           number      10  12
           punctuation 12  13`;

	const result_code = twoslash`import { tokenize } from "@twinkleplop/typescript";
// ---cut---
const code = "const x = 42;";
const result = tokenize()(code);

result.tokens;       // Uint32Array — [type, start, end] triplets
result.token_types;  // string[] — index by the type integer

for (let i = 0; i < result.tokens.length; i += 3) {
  const name = result.token_types[result.tokens[i]];
  const text = code.slice(result.tokens[i + 1], result.tokens[i + 2]);
}`;

	const debug = twoslash`import { tokenize } from "@twinkleplop/core/debug";`;

	const introspect = twoslash`import { tokenize } from "@twinkleplop/core";
import { grammar as compiled_grammar } from "@twinkleplop/javascript";
declare const input: string;
// ---cut---
import { TokenizerIntrospector } from "@twinkleplop/core/introspector";

const introspector = new TokenizerIntrospector({
  log: null,               // or console.log, or your own (type, data) => void
  collect_history: true,
  max_history_size: 10000,
});

const result = tokenize(input, compiled_grammar, introspector);

introspector.tokens;
introspector.state_transitions;
introspector.rule_matches;
introspector.probe_history;

introspector.get_token_at_position(30);
introspector.get_state_at_position(30);
introspector.get_probe_events();
introspector.generate_report();
introspector.generate_token_trace(5);`;

	const mapper = twoslash`import { raw_grammar, grammar as compiled } from "@twinkleplop/javascript";
// ---cut---
import { GrammarMapper } from "@twinkleplop/core/grammar-mapper";
import { TokenizerIntrospector } from "@twinkleplop/core/introspector";

const mapper = new GrammarMapper(raw_grammar, compiled);

const introspector = mapper.create_enhanced_introspector(TokenizerIntrospector, {
  enhanced_logging: true,
});

mapper.get_state_name(0);    // "main" instead of state 0
mapper.get_rule_name(0, 2);  // the rule description instead of rule 2
mapper.generate_report(introspector);`;

	const build_src = `pnpm --filter @twinkleplop/core build`;
	const build = bash(build_src);
</script>

<ArticleMain
	pane_path="docs / technical / tokenization"
	title="how tokenization works"
	subtitle="From the first character of your source to the last span in the output."
>
	<p>
		Three stages, in order. Each is a pure function of the one before it, and you
		can stop after any of them.
	</p>
	<AsciiArt content={pipeline} />

	<Section id="tokenize" title="1 · tokenize" num="§ 01">
		<p>
			The tokenizer is a finite state machine augmented with a state stack — a
			pushdown automaton, which is what lets it handle nested constructs like
			template literals with interpolations. It processes the input in linear
			time, one character at a time.
		</p>
		<p>
			There is no regex anywhere in the hot path. Characters are read with
			<code>charCodeAt()</code>, classified through dense
			<code>Uint8Array</code> lookup tables for ASCII, and dispatched through a
			flat transition table indexed by computed integers rather than string keys.
			Once inside a known construct — a string body, a comment, a number — a
			tight inner loop consumes it without going back through the transition
			machinery.
		</p>

		<SubSection id="output" title="the output">
			<p>
				Tokens are stored as a flat <code>Uint32Array</code> of
				<code>[type, start, end]</code> triplets. No objects, no allocation per
				token.
			</p>
			<AsciiArt content={tokens_diagram} />
			<CodeBlock fname="tokens.ts" html={result_code} />
			<p>
				Token types are integers into a parallel <code>token_types</code> array,
				so comparisons in the hot loop are integer comparisons and the renderer
				can precompute class names by index.
			</p>
		</SubSection>
	</Section>

	<Section id="reclassify" title="2 · reclassify" num="§ 02">
		<p>
			The raw stream is lexically correct but deliberately plain. The
			reclassifier pipeline enriches it — promoting identifiers to functions at
			call sites, resolving type positions, and handing embedded content to other
			languages.
		</p>
		<p>
			This stage sits <strong>outside</strong> the hot-path tokenizer by design.
			The tokenizer stays focused on one language and knows nothing about
			embedding or enrichment; consumers who only want raw tokens pay nothing for
			either. See <a href="/docs/reclassifier">reclassifiers</a> for the detail,
			and <a href="/docs/fidelity">fidelity</a> for choosing how much of it runs.
		</p>
	</Section>

	<Section id="render" title="3 · to_html" num="§ 03">
		<p>
			The generator walks the token stream once and appends to a string. There is
			no intermediate document model — no HAST, no DOM, no tree of any kind.
			Every byte of source and every attribute value is escaped on the way out.
		</p>
		<p>
			Because the output is built in one pass, extension points are the
			<a href="/docs/render_options">line and token hooks</a> and overlays rather
			than tree transformations.
		</p>
	</Section>

	<Section id="debugging" title="debugging a grammar" num="§ 04">
		<p>
			When tokenization misbehaves — an infinite loop, an unexpected token, a
			probe that will not resolve — copy
			<code>lib/core/debug-grammar-template.js</code> into the affected package,
			edit the config block at the top, and run it with <code>node</code>. It
			auto-detects infinite loops and writes a full trace log.
		</p>
		<p>
			For finer detail, introspection is compiled out of the production build
			entirely and available from the debug entry point.
		</p>
		<CodeBlock fname="debug.ts" html={debug} />
		<CodeBlock fname="terminal" html={build} />
		<Callout mark="▸">
			The production build has zero introspection overhead because the code is
			removed at build time, not branched around at runtime.
		</Callout>
	</Section>

	<Section id="introspector" title="the introspector" num="§ 05">
		<CodeBlock fname="introspect.ts" html={introspect} />
		<p>
			Beyond the queries above there are route helpers —
			<code>get_latest_route_to_position</code>,
			<code>get_complete_route_to_position</code>,
			<code>get_full_route_to_position</code> and
			<code>format_full_route</code> — for reconstructing how the machine reached
			a given offset.
		</p>
		<p>
			Events carry a <code>type</code> string:
			<code>START</code>, <code>BEFORE_CHAR</code>, <code>MATCHED_RULE</code>,
			<code>EMITTED_TOKEN</code>, <code>EXTENDED_TOKEN</code>,
			<code>PUSHED_STATE</code>, <code>POPPED_STATE</code>,
			<code>TRANSITIONED_STATE</code>, <code>ENTER_PROBE</code>,
			<code>EXIT_PROBE</code>, <code>PROBE_FAILED</code>,
			<code>FALLBACK_MATCH</code>, <code>NON_ASCII_MATCH</code>,
			<code>NO_MATCH</code> and <code>COMPLETE</code>.
		</p>
	</Section>

	<Section id="mapper" title="the grammar mapper" num="§ 06">
		<p>
			Compiled grammars deal in integers. The mapper turns those back into the
			names you wrote, which makes introspector output readable.
		</p>
		<CodeBlock fname="mapper.ts" html={mapper} />
	</Section>
</ArticleMain>

<ArticleOtp
	title="how tokenization works"
	sections={[
		{ href: "#tokenize", label: "§01 — tokenize", active: true },
		{ href: "#reclassify", label: "§02 — reclassify" },
		{ href: "#render", label: "§03 — to_html" },
		{ href: "#debugging", label: "§04 — debugging a grammar" },
		{ href: "#introspector", label: "§05 — the introspector" },
		{ href: "#mapper", label: "§06 — the grammar mapper" },
	]}
/>
