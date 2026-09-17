<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import SubSection from "$lib/docs/components/SubSection.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Signature from "$lib/docs/components/Signature.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { ts } from "$lib/docs/highlighters";

	const language_sig = `<span class="kw">function</span> <span class="name">language</span><span class="punct">(</span><span class="param">options</span><span class="punct">?:</span> <span class="type">LanguageOptions</span><span class="punct">)</span><span class="punct">:</span> <span class="punct">(</span><span class="param">code</span><span class="punct">:</span> <span class="type">string</span><span class="punct">,</span> <span class="param">render</span><span class="punct">?:</span> <span class="type">RenderOptions</span><span class="punct">)</span> <span class="punct">=&gt;</span> <span class="type">string</span>`;

	const tokenize_sig = `<span class="kw">function</span> <span class="name">tokenize</span><span class="punct">(</span><span class="param">options</span><span class="punct">?:</span> <span class="type">LanguageOptions</span><span class="punct">)</span><span class="punct">:</span> <span class="punct">(</span><span class="param">code</span><span class="punct">:</span> <span class="type">string</span><span class="punct">)</span> <span class="punct">=&gt;</span> <span class="type">TokenizeResult</span>`;

	const to_html_sig = `<span class="kw">function</span> <span class="name">to_html</span><span class="punct">(</span>
  <span class="param">input</span><span class="punct">:</span> <span class="type">string</span><span class="punct">,</span>
  <span class="param">result</span><span class="punct">:</span> <span class="type">TokenizeResult</span><span class="punct">,</span>
  <span class="param">options</span><span class="punct">?:</span> <span class="type">RenderOptions</span>
<span class="punct">)</span><span class="punct">:</span> <span class="type">string</span>`;

	const create_language_sig = `<span class="kw">function</span> <span class="name">create_language</span><span class="punct">(</span>
  <span class="param">grammar</span><span class="punct">:</span> <span class="type">CompiledGrammar</span><span class="punct">,</span>
  <span class="param">pipeline</span><span class="punct">?:</span> <span class="type">LanguagePipeline</span>
<span class="punct">)</span><span class="punct">:</span> <span class="type">LanguageFactory</span>`;

	const language_code = `import { language } from "@twinkleplop/typescript";

const ts = language();
const html = ts("const x = 1;");

// with configuration and per-call render options
const low = language({ fidelity: "low" });
const numbered = low("const x = 1;", { line_numbers: true });`;
	const language_example = ts(language_code);

	const tokenize_code = `import { tokenize } from "@twinkleplop/typescript";

const code = "const x = 1;";
const result = tokenize()(code);

result.tokens;       // Uint32Array of [type, start, end] triplets
result.token_types;  // string[] — index by the type integer
result.overlays;     // present only when annotation extraction ran
result.frames;       // present only when a frame_track stage ran`;
	const tokenize_example = ts(tokenize_code);

	const to_html_code = `import { to_html } from "@twinkleplop/core";
import { tokenize } from "@twinkleplop/typescript";

const code = "const x = 1;";
const result = tokenize()(code);
const html = to_html(code, result, { line_numbers: true });`;
	const to_html_example = ts(to_html_code);

	const create_language_code = `import { create_language, tag } from "@twinkleplop/core";
import { grammar, reclassifiers } from "@twinkleplop/javascript";

const my_tokenize = create_language(grammar, [
  ...reclassifiers,
  tag(my_pass, ["type"]),
]);

const result = my_tokenize()(code);`;
	const create_language_example = ts(create_language_code);

	const overlays_code = `import { overlays } from "@twinkleplop/core";

const result = overlays(source, [
  { start: 0, end: 12, class: "highlight" },
  { line: 3, class: "diff-add" },
]);`;
	const overlays_example = ts(overlays_code);

	const language_options_rows = [
		[
			{ kind: "name" as const, value: "fidelity" },
			{ kind: "type" as const, value: `"high" | "low" | string[]` },
			{ kind: "def" as const, value: `"high"` },
			{
				kind: "desc" as const,
				value: `How much of the reclassifier pipeline runs. See <a href="/docs/fidelity">fidelity</a>.`,
			},
		],
		[
			{ kind: "name" as const, value: "annotation" },
			{ kind: "type" as const, value: "AnnotationConfig" },
			{ kind: "def" as const, value: "—" },
			{
				kind: "desc" as const,
				value: `Marker plugins to run over comments. See <a href="/docs/directives">directives</a>.`,
			},
		],
	];

	const render_options_rows = [
		[
			{ kind: "name" as const, value: "class_name" },
			{ kind: "type" as const, value: "string" },
			{ kind: "def" as const, value: `"twinkleplop"` },
			{ kind: "desc" as const, value: `Replaces the class on <code>&lt;pre&gt;</code>.` },
		],
		[
			{ kind: "name" as const, value: "line_numbers" },
			{ kind: "type" as const, value: "boolean | &#123; start?: number &#125;" },
			{ kind: "def" as const, value: "false" },
			{
				kind: "desc" as const,
				value: `<code>true</code> numbers from 1; <code>&#123; start &#125;</code> from <code>start</code>. Counts visible lines only.`,
			},
		],
		[
			{ kind: "name" as const, value: "attributes" },
			{ kind: "type" as const, value: "Record&lt;string, string | number | boolean&gt;" },
			{ kind: "def" as const, value: "—" },
			{
				kind: "desc" as const,
				value: `Emitted on <code>&lt;pre&gt;</code> in order. <code>true</code> is a bare name, <code>false</code> emits nothing.`,
			},
		],
		[
			{ kind: "name" as const, value: "has_classes" },
			{ kind: "type" as const, value: "boolean" },
			{ kind: "def" as const, value: "true" },
			{
				kind: "desc" as const,
				value: `Adds <code>has-&lt;classification&gt;</code> to <code>&lt;pre&gt;</code> for every overlay present.`,
			},
		],
		[
			{ kind: "name" as const, value: "overlays" },
			{ kind: "type" as const, value: "OverlayItem[]" },
			{ kind: "def" as const, value: "—" },
			{
				kind: "desc" as const,
				value: `Programmatic overlays, merged with any from markers. See <a href="/docs/render_options">render options</a>.`,
			},
		],
		[
			{ kind: "name" as const, value: "structure" },
			{ kind: "type" as const, value: `"classic" | "inline"` },
			{ kind: "def" as const, value: `"classic"` },
			{
				kind: "desc" as const,
				value: `<code>inline</code> emits no block or line elements and <code>&lt;br&gt;</code> between lines.`,
			},
		],
		[
			{ kind: "name" as const, value: "line" },
			{ kind: "type" as const, value: "(n, source_line) =&gt; HookResult | void" },
			{ kind: "def" as const, value: "—" },
			{ kind: "desc" as const, value: `Per-line hook. Not called in inline mode.` },
		],
		[
			{ kind: "name" as const, value: "token" },
			{ kind: "type" as const, value: "(type, start, end) =&gt; HookResult | void" },
			{ kind: "def" as const, value: "—" },
			{ kind: "desc" as const, value: `Per-token hook. A decorated token is never merged.` },
		],
		[
			{ kind: "name" as const, value: "whitespace" },
			{ kind: "type" as const, value: `"all" | "boundary" | "leading" | "trailing"` },
			{ kind: "def" as const, value: "—" },
			{
				kind: "desc" as const,
				value: `Wraps spaces and tabs between tokens, one span per character.`,
			},
		],
		[
			{ kind: "name" as const, value: "indent_guides" },
			{ kind: "type" as const, value: "boolean | &#123; size?: number &#125;" },
			{ kind: "def" as const, value: "false" },
			{
				kind: "desc" as const,
				value: `Splits leading indentation into <code>&lt;span class="indent"&gt;</code> levels. Default size 2.`,
			},
		],
	];
</script>

<ArticleMain
	pane_path="docs / reference / api"
	title="api reference"
	subtitle="The public surface of a language package and of @twinkleplop/core."
>
	<Section id="language" title="language()" num="§ 01">
		<p>
			The common path. A factory: give it configuration, get back a highlight
			function that turns source into an HTML string.
		</p>
		<Signature html={language_sig} />
		<CodeBlock fname="language.ts" html={language_example} />
		<p>
			Create the highlighter once and reuse it. Compiling the grammar happens at
			import; the factory only selects the pipeline.
		</p>
	</Section>

	<Section id="tokenize" title="tokenize()" num="§ 02">
		<p>
			The same configuration, but the returned function gives you the token
			stream instead of HTML. Use it when you are rendering yourself.
		</p>
		<Signature html={tokenize_sig} />
		<CodeBlock fname="tokenize.ts" html={tokenize_example} />

		<SubSection id="tokenize-result" title="TokenizeResult">
			<ParamTable
				headers={["field", "type", "", "meaning"]}
				rows={[
					[
						{ kind: "name", value: "tokens" },
						{ kind: "type", value: "Uint32Array" },
						{ kind: "def", value: "always" },
						{ kind: "desc", value: "Flat [type, start, end] triplets." },
					],
					[
						{ kind: "name", value: "token_types" },
						{ kind: "type", value: "string[]" },
						{ kind: "def", value: "always" },
						{ kind: "desc", value: "Index by the type integer to get the name." },
					],
					[
						{ kind: "name", value: "overlays" },
						{ kind: "type", value: "OverlayResult" },
						{ kind: "def", value: "optional" },
						{ kind: "desc", value: "Present only when annotation extraction ran." },
					],
					[
						{ kind: "name", value: "frames" },
						{ kind: "type", value: "FrameTable" },
						{ kind: "def", value: "optional" },
						{ kind: "desc", value: "Present only when a frame_track stage ran." },
					],
				]}
			/>
		</SubSection>
	</Section>

	<Section id="to_html" title="to_html()" num="§ 03">
		<p>
			Renders a token stream. It takes the original source because token
			positions are offsets into it.
		</p>
		<Signature html={to_html_sig} />
		<CodeBlock fname="to-html.ts" html={to_html_example} />
	</Section>

	<Section id="language_options" title="LanguageOptions" num="§ 04">
		<p>Passed to the factory. Configures the highlighter once.</p>
		<ParamTable
			headers={["option", "type", "default", "meaning"]}
			rows={language_options_rows}
		/>
	</Section>

	<Section id="render_options" title="RenderOptions" num="§ 05">
		<p>
			Per-call. Pass as the second argument to a highlight function, or the third
			to <code>to_html</code>. Omitting every option produces byte-identical
			output to the no-option path.
		</p>
		<ParamTable
			headers={["option", "type", "default", "meaning"]}
			rows={render_options_rows}
		/>
		<Callout mark="▸" variant="warn">
			<code>class</code> and <code>style</code> are reserved keys in
			<code>attributes</code> and throw a <code>TypeError</code>, as does an
			invalid attribute name. A non-integer <code>line_numbers.start</code> or a
			non-positive <code>indent_guides.size</code> throws a
			<code>RangeError</code>.
		</Callout>
	</Section>

	<Section id="core" title="@twinkleplop/core" num="§ 06">
		<p>
			Most consumers never import core directly — language packages re-export
			what you need. These are the entry points that matter when you do.
		</p>

		<SubSection id="create_language" title="create_language()">
			<p>Composes a grammar and a reclassifier pipeline into a factory.</p>
			<Signature html={create_language_sig} />
			<CodeBlock fname="compose.ts" html={create_language_example} />
		</SubSection>

		<SubSection id="overlays_fn" title="overlays()">
			<p>
				Builds an <code>OverlayResult</code> from items, optionally merging with
				an existing one.
			</p>
			<CodeBlock fname="overlays.ts" html={overlays_example} />
		</SubSection>

		<SubSection id="subpaths" title="subpath exports">
			<ParamTable
				headers={["subpath", "exports"]}
				rows={[
					[
						{ kind: "name", value: "@twinkleplop/core" },
						{
							kind: "desc",
							value: `<code>tokenize</code>, <code>to_html</code>, <code>create_language</code>, <code>reclassify</code>, <code>overlays</code>, the DSL, the reclassifier helpers, and all types.`,
						},
					],
					[
						{ kind: "name", value: "@twinkleplop/core/debug" },
						{ kind: "desc", value: `The same surface, built with introspection compiled in.` },
					],
					[
						{ kind: "name", value: "@twinkleplop/core/compile" },
						{
							kind: "desc",
							value: `<code>compile</code>, <code>define_grammar</code>, <code>verify</code>, and the character-class symbols.`,
						},
					],
					[
						{ kind: "name", value: "@twinkleplop/core/tokens" },
						{ kind: "desc", value: `The canonical token-name catalogue.` },
					],
					[
						{ kind: "name", value: "@twinkleplop/core/introspector" },
						{ kind: "desc", value: `<code>TokenizerIntrospector</code>.` },
					],
					[
						{ kind: "name", value: "@twinkleplop/core/grammar-mapper" },
						{ kind: "desc", value: `<code>GrammarMapper</code>, <code>create_grammar_mapper</code>.` },
					],
					[
						{ kind: "name", value: "@twinkleplop/core/types" },
						{ kind: "desc", value: `Type definitions.` },
					],
				]}
			/>
		</SubSection>
	</Section>
</ArticleMain>

<ArticleOtp
	title="api reference"
	sections={[
		{ href: "#language", label: "§01 — language()", active: true },
		{ href: "#tokenize", label: "§02 — tokenize()" },
		{ href: "#to_html", label: "§03 — to_html()" },
		{ href: "#language_options", label: "§04 — LanguageOptions" },
		{ href: "#render_options", label: "§05 — RenderOptions" },
		{ href: "#core", label: "§06 — @twinkleplop/core" },
	]}
/>
