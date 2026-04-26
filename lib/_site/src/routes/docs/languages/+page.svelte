<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import SubSection from "$lib/docs/components/SubSection.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Signature from "$lib/docs/components/Signature.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";

	const twinkle_sig = `<span class="kw">async function</span> <span class="name">twinkle</span><span class="punct">(</span>
  <span class="param">code</span><span class="punct">:</span> <span class="type">string</span><span class="punct">,</span>
  <span class="param">options</span><span class="punct">:</span> <span class="type">TwinkleOptions</span>
<span class="punct">)</span><span class="punct">:</span> <span class="type">Promise&lt;string&gt;</span>`;

	const create_sig = `<span class="kw">function</span> <span class="name">createInstance</span><span class="punct">(</span><span class="param">config</span><span class="punct">:</span> <span class="type">InstanceConfig</span><span class="punct">)</span><span class="punct">:</span> <span class="type">TwinkleInstance</span>`;

	const register_sig = `<span class="kw">function</span> <span class="name">registerTheme</span><span class="punct">(</span><span class="param">name</span><span class="punct">:</span> <span class="type">string</span><span class="punct">,</span> <span class="param">def</span><span class="punct">:</span> <span class="type">ThemeDef</span><span class="punct">)</span><span class="punct">:</span> <span class="type">void</span>`;

	const instance_code = `<span class="ln">1</span><span class="tok-kw">const</span> <span class="tok-var">t</span> <span class="tok-punct">=</span> <span class="tok-fn">createInstance</span><span class="tok-punct">(</span><span class="tok-punct">&#123;</span>
<span class="ln">2</span>  <span class="tok-var">langs</span><span class="tok-punct">:</span> <span class="tok-punct">[</span><span class="tok-str">'ts'</span><span class="tok-punct">,</span> <span class="tok-str">'tsx'</span><span class="tok-punct">,</span> <span class="tok-str">'json'</span><span class="tok-punct">]</span><span class="tok-punct">,</span>
<span class="ln">3</span>  <span class="tok-var">themes</span><span class="tok-punct">:</span> <span class="tok-punct">[</span><span class="tok-str">'github-dark'</span><span class="tok-punct">,</span> <span class="tok-str">'tokyo-night'</span><span class="tok-punct">]</span><span class="tok-punct">,</span>
<span class="ln">4</span><span class="tok-punct">&#125;</span><span class="tok-punct">)</span><span class="tok-punct">;</span>
<span class="ln">5</span>
<span class="ln">6</span><span class="tok-kw">const</span> <span class="tok-var">html</span> <span class="tok-punct">=</span> <span class="tok-var">t</span><span class="tok-punct">.</span><span class="tok-fn">twinkle</span><span class="tok-punct">(</span><span class="tok-var">code</span><span class="tok-punct">,</span> <span class="tok-punct">&#123;</span> <span class="tok-var">lang</span><span class="tok-punct">:</span> <span class="tok-str">'ts'</span> <span class="tok-punct">&#125;</span><span class="tok-punct">)</span><span class="tok-punct">;</span>  <span class="tok-com">// sync, cached!</span>`;

	const options_rows = [
		[
			{ kind: "name" as const, value: "lang" },
			{ kind: "type" as const, value: "string" },
			{ kind: "def" as const, value: "required" },
			{ kind: "desc" as const, value: `One of the registered grammar IDs. See <a href="#languages">languages</a>.` },
		],
		[
			{ kind: "name" as const, value: "theme" },
			{ kind: "type" as const, value: "string" },
			{ kind: "def" as const, value: "'github-dark'" },
			{ kind: "desc" as const, value: `A single theme name. Mutually exclusive with <code>themes</code>.` },
		],
		[
			{ kind: "name" as const, value: "themes" },
			{ kind: "type" as const, value: "&#123;light, dark&#125;" },
			{ kind: "def" as const, value: "—" },
			{ kind: "desc" as const, value: `Dual theme. Emits CSS variables switched by <code>prefers-color-scheme</code>.` },
		],
		[
			{ kind: "name" as const, value: "transformers" },
			{ kind: "type" as const, value: "Transformer[]" },
			{ kind: "def" as const, value: "[]" },
			{ kind: "desc" as const, value: `Ordered list of HAST transformers. See <a href="/docs/transformers">transformers</a>.` },
		],
		[
			{ kind: "name" as const, value: "lineNumbers" },
			{ kind: "type" as const, value: "boolean" },
			{ kind: "def" as const, value: "false" },
			{ kind: "desc" as const, value: `Shortcut for the <code>lineNumbers()</code> transformer.` },
		],
		[
			{ kind: "name" as const, value: "highlight" },
			{ kind: "type" as const, value: "number[]" },
			{ kind: "def" as const, value: "[]" },
			{ kind: "desc" as const, value: `Line numbers to highlight. 1-indexed.` },
		],
		[
			{ kind: "name" as const, value: "cache" },
			{ kind: "type" as const, value: "'auto' | 'off'" },
			{ kind: "def" as const, value: "'auto'" },
			{ kind: "desc" as const, value: `Whether to cache tokenized output by content hash.` },
		],
	];

	const language_rows = [
		[
			{ kind: "name" as const, value: "javascript" },
			{ kind: "desc" as const, value: "aliases: js, jsx, mjs, cjs" },
			{ kind: "def" as const, value: "core" },
		],
		[
			{ kind: "name" as const, value: "typescript" },
			{ kind: "desc" as const, value: "aliases: ts, tsx" },
			{ kind: "def" as const, value: "core" },
		],
		[
			{ kind: "name" as const, value: "python" },
			{ kind: "desc" as const, value: "alias: py" },
			{ kind: "def" as const, value: "core" },
		],
		[
			{ kind: "name" as const, value: "rust" },
			{ kind: "desc" as const, value: "alias: rs" },
			{ kind: "def" as const, value: "core" },
		],
		[
			{ kind: "name" as const, value: "go" },
			{ kind: "desc" as const, value: "—" },
			{ kind: "def" as const, value: "core" },
		],
		[
			{ kind: "name" as const, value: "...178 more" },
			{ kind: "desc" as const, value: `run <code>twinkle.listLanguages()</code>` },
			{ kind: "def" as const, value: "—" },
		],
	];
</script>

<ArticleMain
	pane_path="docs / reference / api.md"
	last_edit="last edit: 2d ago · v0.4.2"
	breadcrumb={[
		{ label: "docs", href: "/docs" },
		{ label: "reference", href: "/docs" },
		{ label: "api" },
	]}
	tagline="¶ 04 · reference · v0.4.2"
	title="api reference"
	subtitle="Every function, every option, every default. Signatures are the source of truth — everything else is decoration."
	prev={{ dir: "← prev", label: "03. tokenization", href: "/docs/tokenization" }}
	next={{ dir: "next →", label: "05. transformers", href: "/docs/transformers" }}
>
	<Section id="twinkle" title="twinkle()" num="§ 01">
		<p>
			The one-shot function. Takes source, returns HTML. Lazy-loads grammars and themes on demand.
		</p>
		<Signature html={twinkle_sig} />
		<SubSection id="twinkle-opts" title="options" />
		<ParamTable headers={["name", "type", "default", "description"]} rows={options_rows} />
	</Section>

	<Section id="createInstance" title="createInstance()" num="§ 02">
		<p>
			Build a persistent instance when you need to highlight many snippets. Reuses the
			grammar+theme cache across calls.
		</p>
		<Signature html={create_sig} />
		<CodeBlock fname="instance.ts" lang="typescript" html={instance_code} />
	</Section>

	<Section id="registerTheme" title="registerTheme()" num="§ 03">
		<Signature html={register_sig} />
		<p>
			Install a theme by name. The <code>ThemeDef</code> shape is a superset of the vs-code theme
			JSON, plus an optional <code>pixel</code> field for dithered variants.
		</p>
	</Section>

	<Section id="languages" title="supported languages" num="§ 04">
		<p>184 grammars ship in the default bundle. A few of note:</p>
		<ParamTable rows={language_rows} />
		<Callout variant="warn" mark="!">
			<strong>ESM only.</strong> twinkleplop is published as ESM. If you're on CJS, use the
			<code>twinkleplop/cjs</code> entry but note that top-level await won't work.
		</Callout>
	</Section>
</ArticleMain>

<ArticleOtp
	title="api reference"
	sections={[
		{ href: "#twinkle", label: "§01 — twinkle()", active: true },
		{ href: "#createInstance", label: "§02 — createInstance()" },
		{ href: "#registerTheme", label: "§03 — registerTheme()" },
		{ href: "#languages", label: "§04 — languages" },
	]}
	meta={[
		{ label: "version", value: "0.4.2" },
		{ label: "updated", value: "2d ago" },
		{ label: "authors", value: "pngwn, al" },
		{ label: "read", value: "~5 min" },
	]}
/>
