<!-- <script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import SubSection from "$lib/docs/components/SubSection.svelte";
	import AsciiArt from "$lib/docs/components/AsciiArt.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";

	const pipeline = `   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌────────┐
   │  lex    │ ──▶ │  parse  │ ──▶ │  theme  │ ──▶ │  emit   │ ──▶ │  html  │
   │         │     │         │     │         │     │         │     │        │
   │ bytes   │     │ tree of │     │ color   │     │ <span>  │     │ done!  │
   │ → tokens│     │ scopes  │     │ lookup  │     │ spans   │     │        │
   └─────────┘     └─────────┘     └─────────┘     └─────────┘     └────────┘
        ▲                ▲                ▲                ▲
     ~0.01ms          ~0.02ms          ~0.005ms         ~0.01ms`;

	const tokens_diagram = `  input:   const x = 42;
          │

  tokens:  KW    ID  OP  NUM  OP
           └─5─┘ └1┘ └1┘ └─2─┘ └1┘`;

	const demo_diagram = `  source:   const greet = 'hi';
  ───────────────────────────────────
  lex:      5 tokens                0.008ms
  parse:    1 statement, 3 scopes   0.014ms
  theme:    3 lookups, 0 misses     0.003ms
  emit:     3 spans (2 collapsed)   0.009ms
  ───────────────────────────────────
  total:                           0.034ms`;
</script>

<ArticleMain
	pane_path="docs / concepts / tokenization.md"
	last_edit="last edit: 3d ago · v0.4.2"
	breadcrumb={[
		{ label: "docs", href: "/docs" },
		{ label: "concepts", href: "/docs" },
		{ label: "tokenization" },
	]}
	tagline="λ 03 · concept · ~6 min"
	title="how tokenization works"
	subtitle={`An illustrated walk through the pipeline, from the first byte of your source to the last <code>&lt;span&gt;</code> in the output.`}
	prev={{ dir: "← prev", label: "02. themes", href: "/docs/themes" }}
	next={{ dir: "next →", label: "04. api reference", href: "/docs/api" }}
>
	<Section id="overview" title="the pipeline" num="§ 01">
		<p>
			twinkleplop is four stages chained together. Each stage is pure, serializable, and
			independently cacheable — that's where the speed comes from.
		</p>
		<AsciiArt content={pipeline} />

		<SubSection id="lex" title="1 · lex" />
		<p>
			The lexer is a hand-written state machine per grammar, compiled at build time. No regex. No
			backtracking. Bytes go in, a flat stream of <code>(kind, start, end)</code> triples comes out.
		</p>
		<AsciiArt content={tokens_diagram} />

		<SubSection id="parse" title="2 · parse" />
		<p>
			Tokens fold into a <strong>scope tree</strong> — a lightweight AST that mirrors TextMate's
			scope stack but in a denser tree form. Scopes are intern-hashed so equal scopes share memory.
		</p>

		<SubSection id="theme" title="3 · theme" />
		<p>
			Each scope is resolved against the current theme's precedence table. Themes compile into a
			trie at load time; resolution is a single pointer walk, O(scope-depth).
		</p>

		<SubSection id="emit" title="4 · emit" />
		<p>
			A linear writer produces
			<code>&lt;span style="color:#…"&gt;…&lt;/span&gt;</code>
			runs. Adjacent spans with the same style are collapsed automatically.
		</p>
	</Section>

	<Section id="demo" title="live demo" num="§ 02">
		<p>
			Hover a line in the output to see which pipeline stage produced it. The numbers below update
			in real time.
		</p>
		<AsciiArt content={demo_diagram} compact />
	</Section>

	<Section id="why-fast" title="why it's fast" num="§ 03">
		<p>Three things, in order of impact:</p>
		<ul>
			<li>
				<strong>No regex.</strong> Compiled state machines are ~40× faster than the TextMate regex
				engine on real-world code.
			</li>
			<li>
				<strong>Interned scopes.</strong> The scope tree is a flyweight. Equal subtrees share
				pointers; theme lookups amortize to zero.
			</li>
			<li>
				<strong>Single-pass emit.</strong> We never re-walk the tree; emit is driven by the parser's
				visit order.
			</li>
		</ul>
		<Callout variant="tip">
			<strong>Going deeper.</strong> The <a href="/docs/api">API reference</a> exposes each stage as
			a standalone function (<code>lex()</code>, <code>parse()</code>, <code>theme()</code>,
			<code>emit()</code>) if you want to swap one out or pipe your own pass in between.
		</Callout>
	</Section>
</ArticleMain>

<ArticleOtp
	title="tokenization"
	sections={[
		{ href: "#overview", label: "§01 — the pipeline", active: true },
		{ href: "#demo", label: "§02 — live demo" },
		{ href: "#why-fast", label: "§03 — why it's fast" },
	]}
	meta={[
		{ label: "version", value: "0.4.2" },
		{ label: "updated", value: "3d ago" },
		{ label: "authors", value: "pngwn" },
		{ label: "read", value: "~6 min" },
	]}
/>
 -->
