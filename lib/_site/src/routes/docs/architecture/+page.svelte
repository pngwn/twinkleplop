<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import AsciiArt from "$lib/docs/components/AsciiArt.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import { ts } from "$lib/docs/highlighters";

	const layers = `  ┌─────────────────────────────────────────────────────┐
  │  language package    grammar + reclassifiers        │
  ├─────────────────────────────────────────────────────┤
  │  @twinkleplop/core   compiler · tokenizer ·         │
  │                      reclassifier · generator       │
  └─────────────────────────────────────────────────────┘
       language-specific data          language-agnostic runtime`;

	const packages_src = `lib/core          runtime, compiler, DSL, reclassifier, generator
lib/annotation    marker plugins, shiki-notation compatibility
lib/markdown-*    rehype / remark / markdown-it over one core
lib/theme-*       generated stylesheets
lib/twoslash*     twoslash integrations
languages/*       one package per grammar`;
	const packages = ts(packages_src);
</script>

<ArticleMain
	pane_path="docs / technical / architecture"
	title="architecture"
	subtitle="Why the library is shaped the way it is."
>
	<p>
		Twinkleplop is a language-agnostic runtime engine plus a set of declarative
		grammars. The engine knows nothing about any particular language; a grammar
		knows nothing about the machine that will run it.
	</p>
	<AsciiArt content={layers} />

	<Section id="principles" title="design principles" num="§ 01">
		<CardGrid cols={2}>
			<Card
				icon="▲"
				title="Performance first"
				description="Character scanning over regex. Tight loops over abstractions. Typed arrays over objects in hot paths."
			/>
			<Card
				icon="◆"
				title="Separation of concerns"
				description="A language-agnostic runtime. Per-language grammars are external and declarative. Cross-language concerns live in a post-tokenization layer."
			/>
			<Card
				icon="●"
				title="Declarative grammars"
				description="Authored with a small DSL of pure factories, compiled into the runtime's optimized form."
				more_href="/docs/grammar"
			/>
			<Card
				icon="◐"
				title="User-controlled fidelity"
				description="Consumers opt into finer token distinctions. The cost of opt-in detail is the feature's cost, not overhead."
				more_href="/docs/fidelity"
			/>
		</CardGrid>
	</Section>

	<Section id="machine" title="the state machine" num="§ 02">
		<p>
			The tokenizer is modelled as a finite state machine augmented with a state
			stack — formally a pushdown automaton. The FSM gives linear-time
			processing; the stack is what makes nested and recursive constructs
			tractable, so a template literal containing an interpolation containing
			another template literal is a matter of pushing and popping rather than
			special-casing.
		</p>
		<p>
			Grammars describe states and rules. The compiler turns them into flat typed
			arrays: a transition table indexed by computed integers, dense character
			maps for ASCII classification, range lists for everything above 127, and a
			keyword set checked after scanning an identifier span. Nothing is looked up
			by string at runtime.
		</p>
		<Callout mark="▸">
			Grammars are TypeScript modules, not JSON. They use symbols and tagged
			objects the compiler understands, so they are not serializable — the
			"declarative" part is the shape, not the format.
		</Callout>
	</Section>

	<Section id="reclassifier" title="why a separate reclassifier" num="§ 03">
		<p>Two problems the state machine cannot solve cheaply:</p>
		<ul>
			<li>
				<strong>Multi-token lookahead.</strong> Recognising that
				<code>foo</code> in <code>const foo = () =&gt; &#123;&#125;</code> is a
				function would need chained probe states and balanced-paren matching at
				every <code>=</code> in the file.
			</li>
			<li>
				<strong>Cross-language embedding.</strong> Handing
				<code>&lt;script&gt;</code> content to a JavaScript tokenizer would
				otherwise mean duplicating an entire sub-language into the host grammar.
			</li>
		</ul>
		<p>
			Both are token-stream transformations, so they compose as a pipeline of
			pure transforms sitting between the tokenizer and the renderer. The
			tokenizer stays focused on one language at a time, and a consumer who wants
			only raw tokens pays nothing for either.
		</p>
		<p>
			The pipeline is also where fidelity is decided. Most passes are claim
			producers that merge by precedence rather than order, which is what lets
			passes be switched on and off independently. See
			<a href="/docs/reclassifier">reclassifiers</a>.
		</p>
	</Section>

	<Section id="rendering" title="rendering without a tree" num="§ 04">
		<p>
			The generator builds HTML in a single pass as a string. There is no
			intermediate document model, and that is a deliberate constraint rather
			than an omission — a tree would dominate the cost of everything else in the
			pipeline.
		</p>
		<p>
			The consequence is that decoration is expressed as classes and attributes
			on the elements the generator already emits: overlays over byte ranges, and
			per-line and per-token hooks. That covers the great majority of what
			transformer systems are used for, and rules out arbitrary element surgery.
			See <a href="/docs/render_options">render options</a>.
		</p>
	</Section>

	<Section id="packages" title="package layout" num="§ 05">
		<p>A pnpm workspace of <code>lib/*</code> and <code>languages/*</code>.</p>
		<CodeBlock fname="workspace" html={packages} />
		<p>
			Every language is its own package so consumers install only what they use,
			and grammars can be versioned independently of the runtime. Themes are
			generated stylesheets with no runtime component at all.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="architecture"
	sections={[
		{ href: "#principles", label: "§01 — design principles", active: true },
		{ href: "#machine", label: "§02 — the state machine" },
		{ href: "#reclassifier", label: "§03 — why a separate reclassifier" },
		{ href: "#rendering", label: "§04 — rendering without a tree" },
		{ href: "#packages", label: "§05 — package layout" },
	]}
/>
