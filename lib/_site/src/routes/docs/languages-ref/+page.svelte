<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, bash } from "$lib/docs/snippets";

	const install = bash`pnpm add @twinkleplop/typescript`;

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
	subtitle="Supported languages and their packages."
>
	<p>
		Install and import each language package separately. See <a href="/docs/languages">languages</a> for
		usage and exports.
	</p>
	<CodeBlock fname="terminal" html={install} />
	<CodeBlock fname="usage.ts" html={usage} />

	<Section id="list" title="packages" num="§ 01">
		<ParamTable headers={["package", "notes"]} {rows} />
		<Callout mark="▸">
			Grammars highlight invalid source code too. They do not validate language syntax.
		</Callout>
	</Section>

	<Section id="embedding" title="embedded languages" num="§ 02">
		<p>Embedded languages are installed as dependencies of the parent language package.</p>
		<ParamTable
			headers={["host", "embeds", "where"]}
			rows={[
				[
					{ kind: "name", value: "html" },
					{ kind: "type", value: "css, javascript" },
					{
						kind: "desc",
						value: `<code>&lt;style&gt;</code> and <code>&lt;script&gt;</code> elements`,
					},
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
			Embedded languages are highlighted at every
			<a href="/docs/fidelity">fidelity</a> setting.
		</p>
	</Section>

	<Section id="missing" title="requesting a language" num="§ 03">
		<p>
			Check the
			<a href="https://github.com/pngwn/twinkleplop/issues">GitHub issues</a> for planned languages,
			or
			<a href="https://github.com/pngwn/twinkleplop/issues/new">open one</a> if yours is not listed.
			To write a grammar yourself, see
			<a href="/docs/grammar">grammars</a>.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="language reference"
	sections={[
		{ href: "#list", label: "§01 — packages", active: true },
		{ href: "#embedding", label: "§02 — embedded languages" },
		{ href: "#missing", label: "§03 — requesting a language" },
	]}
/>
