<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import AsciiArt from "$lib/docs/components/AsciiArt.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import { ts } from "$lib/docs/snippets";

	const layers = `  ┌─────────────────────────────────────────────────────┐
  │  language package    grammar + reclassifiers        │
  ├─────────────────────────────────────────────────────┤
  │  @twinkleplop/core   compiler · tokenizer ·         │
  │                      reclassifier · generator       │
  └─────────────────────────────────────────────────────┘
       language-specific data          language-agnostic runtime`;

	const packages = ts`lib/core          runtime, compiler, DSL, reclassifier, generator
lib/annotation    marker plugins, shiki-notation compatibility
lib/markdown-*    rehype / remark / markdown-it over one core
lib/theme-*       generated stylesheets
lib/twoslash*     twoslash integrations
languages/*       one package per grammar`;
</script>

<ArticleMain
	pane_path="docs / technical / architecture"
	title="architecture"
	subtitle="The tokenizer, reclassifier pipeline, renderer and package structure."
>
	<Callout variant="warn" mark="!">This page is a work in progress.</Callout>

	<p>
		Twinkleplop uses a shared tokenizer with a separate grammar for each language. Grammars define
		the rules the tokenizer uses to recognise tokens.
	</p>
	<AsciiArt content={layers} />

	<Section id="principles" title="design principles" num="§ 01">
		<CardGrid cols={2}>
			<Card
				icon="▲"
				title="Performance first"
				description="The tokenizer scans characters and stores tokens in typed arrays to reduce processing time and memory use."
			/>
			<Card
				icon="◆"
				title="Separation of concerns"
				description="The runtime, language grammars and reclassifier pipeline are separate. Embedded languages are handled after tokenization."
			/>
			<Card
				icon="●"
				title="Declarative grammars"
				description="Grammars use a small set of helper functions. The compiler converts them into lookup tables for the tokenizer."
				more_href="/docs/grammar"
			/>
			<Card
				icon="◐"
				title="User-controlled fidelity"
				description="The fidelity option controls which passes run to identify functions, classes and other specific token types."
				more_href="/docs/fidelity"
			/>
		</CardGrid>
	</Section>

	<Section id="machine" title="state machine" num="§ 02">
		<p>
			The tokenizer uses a state machine with a stack. The stack tracks nested constructs, such as a
			template literal inside another template literal's interpolation.
		</p>
		<p>
			Grammars describe states and rules. The compiler turns them into flat typed arrays: a
			transition table indexed by computed integers, dense character maps for ASCII classification,
			range lists for everything above 127, and a keyword set checked after scanning an identifier
			span. The tokenizer uses numeric indexes to look up transitions.
		</p>
		<Callout mark="▸">
			Grammars are JavaScript or TypeScript modules. Their rules can contain symbols and tagged
			objects, so they cannot be serialised as JSON.
		</Callout>
	</Section>

	<Section id="reclassifier" title="reclassification" num="§ 03">
		<p>Reclassifiers handle two tasks after tokenization:</p>
		<ul>
			<li>
				<strong>Multi-token lookahead.</strong> Recognising that
				<code>foo</code> in <code>const foo = () =&gt; &#123;&#125;</code> is a function would need
				chained probe states and balanced-paren matching at every <code>=</code> in the file.
			</li>
			<li>
				<strong>Cross-language embedding.</strong> Handing
				<code>&lt;script&gt;</code> content to a JavaScript tokenizer would otherwise mean duplicating
				an entire sub-language into the host grammar.
			</li>
		</ul>
		<p>
			These operations run in a pipeline between the tokenizer and renderer. You can use the
			tokenizer directly if you only need the grammar's tokens.
		</p>
		<p>
			The fidelity option selects which reclassifier passes run. Most passes propose token types,
			and the pipeline uses precedence to resolve competing proposals. See
			<a href="/docs/reclassifier">reclassifiers</a>.
		</p>
	</Section>

	<Section id="rendering" title="HTML rendering" num="§ 04">
		<p>
			The renderer builds an HTML string in a single pass. This avoids the cost of creating an
			intermediate tree.
		</p>
		<p>
			Use overlays and line or token hooks to add classes and attributes to the generated elements.
			These options cannot change the element structure. See <a href="/docs/render_options"
				>render options</a
			>.
		</p>
	</Section>

	<Section id="packages" title="package layout" num="§ 05">
		<p>A pnpm workspace of <code>lib/*</code> and <code>languages/*</code>.</p>
		<CodeBlock fname="workspace" html={packages} />
		<p>
			Every language is its own package so consumers install only what they use, and grammars can be
			versioned independently of the runtime. Themes are generated CSS stylesheets.
		</p>
	</Section>
</ArticleMain>
