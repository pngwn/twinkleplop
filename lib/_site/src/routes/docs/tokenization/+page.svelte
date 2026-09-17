<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import SubSection from "$lib/docs/components/SubSection.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import AsciiArt from "$lib/docs/components/AsciiArt.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, bash } from "$lib/docs/snippets";

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

	const build = bash`pnpm --filter @twinkleplop/core build`;
</script>

<ArticleMain
	pane_path="docs / technical / tokenization"
	title="how tokenization works"
	subtitle="How source code is tokenized, reclassified and rendered."
>
	<p>
		Highlighting has three stages. Each takes the result of the previous stage, and each can be used
		separately.
	</p>
	<AsciiArt content={pipeline} />

	<Section id="tokenize" title="1 · tokenize" num="§ 01">
		<p>
			The tokenizer scans the source using a state machine. A stack tracks nested constructs, such
			as template literals with interpolations.
		</p>
		<p>
			The tokenizer reads characters with <code>charCodeAt()</code>. It classifies ASCII characters
			using <code>Uint8Array</code> lookup tables and looks up rules in a transition table. Dedicated
			loops scan string bodies, comments and numbers.
		</p>

		<SubSection id="output" title="token format">
			<p>
				Tokens are stored as a flat <code>Uint32Array</code> of
				<code>[type, start, end]</code> triplets. This avoids allocating an object for each token.
			</p>
			<AsciiArt content={tokens_diagram} />
			<CodeBlock fname="tokens.ts" html={result_code} />
			<p>
				Token types are integers into a parallel <code>token_types</code> array, so comparisons in the
				hot loop are integer comparisons and the renderer can precompute class names by index.
			</p>
		</SubSection>
	</Section>

	<Section id="reclassify" title="2 · reclassify" num="§ 02">
		<p>
			The reclassifier pipeline assigns more specific token types. It identifies functions at call
			sites, resolves type positions and highlights embedded languages.
		</p>
		<p>
			You can use the tokenizer directly if you only need the grammar's tokens. See <a
				href="/docs/reclassifier">reclassifiers</a
			>
			for details, and <a href="/docs/fidelity">fidelity</a> to configure which passes run.
		</p>
	</Section>

	<Section id="render" title="3 · to_html" num="§ 03">
		<p>
			The renderer builds an HTML string from the token stream in one pass. Source text and
			attribute values are HTML-escaped.
		</p>
		<p>
			Use <a href="/docs/render_options">line and token hooks</a> and overlays to add classes and attributes
			to the output.
		</p>
	</Section>

	<Section id="debugging" title="debugging a grammar" num="§ 04">
		<p>
			To debug an infinite loop, unexpected token or unresolved probe, copy
			<code>lib/core/debug-grammar-template.js</code> into the affected package, edit the config
			block at the top, and run it with <code>node</code>. It auto-detects infinite loops and writes
			a full trace log.
		</p>
		<p>Use the debug entry point to inspect individual tokenizer events.</p>
		<CodeBlock fname="debug.ts" html={debug} />
		<CodeBlock fname="terminal" html={build} />
		<Callout mark="▸">Debugging code is removed from production builds.</Callout>
	</Section>

	<Section id="introspector" title="introspector" num="§ 05">
		<CodeBlock fname="introspect.ts" html={introspect} />
		<p>
			Beyond the queries above there are route helpers —
			<code>get_latest_route_to_position</code>,
			<code>get_complete_route_to_position</code>,
			<code>get_full_route_to_position</code> and
			<code>format_full_route</code> — for reconstructing how the machine reached a given offset.
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

	<Section id="mapper" title="grammar mapper" num="§ 06">
		<p>
			The grammar mapper converts numeric indexes in compiled grammars back to their state and rule
			names.
		</p>
		<CodeBlock fname="mapper.ts" html={mapper} />
	</Section>
</ArticleMain>
