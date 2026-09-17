<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { bash } from "$lib/docs/highlighters";
	import { twoslash } from "$lib/docs/twoslash";

	const install_src = `pnpm add @twinkleplop/typescript`;
	const install = bash(install_src);

	const usage = twoslash`import { language } from "@twinkleplop/typescript";

const ts = language();`;

	type row = { name: string; notes: string };

	const languages: row[] = [
		{ name: "bash", notes: "Variables, expansions, here-docs, builtins." },
		{ name: "css", notes: "Selectors, at-rules, custom properties, units. Probe-based selector disambiguation." },
		{ name: "diff", notes: "Unified, context and normal diff, plus git metadata. Combined diff at a basic level." },
		{ name: "diff-basic", notes: "Minimal line-level overlay: +/- prefixes, ! changed, @@ hunk headers. Built to compose with another grammar, so file and git headers are deliberately omitted." },
		{ name: "go", notes: "Predeclared types and builtins at lex time; UPPER_SNAKE constants promoted after." },
		{ name: "html", notes: "Embeds css and javascript in style and script elements." },
		{ name: "javascript", notes: "Regex-vs-division disambiguation, template literals, tagged-template embedding of html and css." },
		{ name: "json", notes: "RFC 8259. No JSON5 extensions — no comments, trailing commas or single quotes." },
		{ name: "markdown", notes: "CommonMark constructs, front matter, fenced code containers." },
		{ name: "python", notes: "F-strings, soft keywords, decorators." },
		{ name: "rust", notes: "Lifetimes, attributes, generics disambiguation, macros." },
		{ name: "sql", notes: "Case-insensitive keywords resolved in the reclassifier." },
		{ name: "svelte", notes: "Blocks, directives and expressions. Embeds css and javascript." },
		{ name: "toml", notes: "Tables, array tables, datetimes." },
		{ name: "tsx", notes: "TypeScript plus JSX. Reuses the typescript pipeline." },
		{ name: "typescript", notes: "JavaScript plus types, interfaces, enums and generics." },
		{ name: "whitespace", notes: "Grammar only — exports no language or tokenize factory." },
		{ name: "yaml", notes: "Block and flow collections, anchors, aliases, scalars." },
	];

	const rows = languages.map((l) => [
		{ kind: "name" as const, value: `@twinkleplop/${l.name}` },
		{ kind: "desc" as const, value: l.notes },
	]);
</script>

<ArticleMain
	pane_path="docs / reference / languages"
	title="language reference"
	subtitle="Every grammar that ships today."
>
	<p>
		Eighteen packages. Each is installed and imported on its own, and each
		exposes the same API — see <a href="/docs/languages">languages</a>.
	</p>
	<CodeBlock fname="terminal" html={install} />
	<CodeBlock fname="usage.ts" html={usage} />

	<Section id="list" title="packages" num="§ 01">
		<ParamTable headers={["package", "notes"]} {rows} />
		<Callout mark="▸">
			A grammar is a tokenizer, not a validator. Input that is invalid in the
			source language still tokenizes — it simply tokenizes as what it looks
			like.
		</Callout>
	</Section>

	<Section id="embedding" title="embedded languages" num="§ 02">
		<p>
			Some grammars host others. The sub-language arrives as a dependency of the
			host package, so one install covers it.
		</p>
		<ParamTable
			headers={["host", "embeds", "where"]}
			rows={[
				[
					{ kind: "name", value: "html" },
					{ kind: "type", value: "css, javascript" },
					{ kind: "desc", value: `<code>&lt;style&gt;</code> and <code>&lt;script&gt;</code> elements` },
				],
				[
					{ kind: "name", value: "svelte" },
					{ kind: "type", value: "css, javascript" },
					{ kind: "desc", value: `style and script blocks, and expressions` },
				],
				[
					{ kind: "name", value: "javascript" },
					{ kind: "type", value: "html, css" },
					{ kind: "desc", value: `tagged templates, with interpolation holes preserved` },
				],
				[
					{ kind: "name", value: "typescript" },
					{ kind: "type", value: "javascript" },
					{ kind: "desc", value: `inherits the pipeline and adds type-position passes` },
				],
				[
					{ kind: "name", value: "tsx" },
					{ kind: "type", value: "typescript" },
					{ kind: "desc", value: `reuses the typescript pipeline verbatim` },
				],
			]}
		/>
		<p>
			Embedding is always on. It is a correctness concern rather than an
			enrichment one, so it runs at every
			<a href="/docs/fidelity">fidelity</a> setting.
		</p>
	</Section>

	<Section id="missing" title="something missing?" num="§ 03">
		<p>
			Check the
			<a href="https://github.com/pngwn/twinkleplop/issues">GitHub issues</a> for
			planned languages, or
			<a href="https://github.com/pngwn/twinkleplop/issues/new">open one</a> if
			yours is not listed. Writing a grammar is a contained job — see
			<a href="/docs/grammar">grammars</a>.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="language reference"
	sections={[
		{ href: "#list", label: "§01 — packages", active: true },
		{ href: "#embedding", label: "§02 — embedded languages" },
		{ href: "#missing", label: "§03 — something missing?" },
	]}
/>
