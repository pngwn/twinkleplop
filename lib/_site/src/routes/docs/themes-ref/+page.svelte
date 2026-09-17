<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import ThemeSwatch from "$lib/docs/components/ThemeSwatch.svelte";
	import { THEMES } from "$lib/docs/themes_data";
	import { bash, ts } from "$lib/docs/highlighters";

	const install_src = `pnpm add @twinkleplop/theme-github`;
	const install = bash(install_src);

	const use_src = `import "@twinkleplop/theme-github";`;
	const use = ts(use_src);

	const palette_src = `import type { theme_palette } from "@twinkleplop/core";

export const light: theme_palette = {
  background_color: "#ffffff",
  keyword: "#cf222e",
  string: "#0a3069",
  comment: "#6e7781",
  // ...one entry per token type you want to style
};`;
	const palette = ts(palette_src);

	const vocab: { group: string; tokens: string }[] = [
		{
			group: "universal",
			tokens: "boolean, comment, identifier, keyword, number, operator, punctuation, regex, string, template",
		},
		{
			group: "named entities",
			tokens: "attribute, builtin, class_name, constant, decorator, function, lifetime, namespace, parameter, property, type, variable, variant",
		},
		{ group: "markup", tokens: "attr_name, doctype, entity, tag_name" },
		{
			group: "css",
			tokens: "css_variable, selector, selector_class, selector_id, selector_pseudo, unit",
		},
		{
			group: "diff",
			tokens: "changed, changed_marker, deleted, deleted_marker, inserted, inserted_marker, hash, heading, label",
		},
		{
			group: "markdown",
			tokens: "autolink, bold, code, code_block, code_language, italic, link_text, strike, url, url_link, url_title, blockquote_marker, code_fence, front_matter_marker, heading_marker, hr, list_marker, task_marker, escape, hard_break",
		},
		{ group: "svelte", tokens: "expression, svelte_block, svelte_directive" },
		{ group: "whitespace", tokens: "space, tab, newline, carriage_return" },
		{
			group: "language-unique",
			tokens: "string_escape (bash), format (python), attr_sigil (rust), bit (sql), array_table_header, datetime (toml), null",
		},
	];

	const vocab_rows = vocab.map((v) => [
		{ kind: "name" as const, value: v.group },
		{ kind: "desc" as const, value: `<code>${v.tokens.split(", ").join("</code>, <code>")}</code>` },
	]);
</script>

<ArticleMain
	pane_path="docs / reference / themes"
	title="theme reference"
	subtitle="The themes that ship, and the token vocabulary they style."
>
	<Section id="builtin" title="built-in themes" num="§ 01">
		<p>
			Two theme packages ship today. Each carries a light and a dark variant in
			one stylesheet, switched by a <code>.dark</code> class on any ancestor.
		</p>
		<CardGrid cols={2}>
			{#each THEMES as theme}
				<ThemeSwatch {theme} />
			{/each}
		</CardGrid>
		<ParamTable
			headers={["theme", "package"]}
			rows={THEMES.map((t) => [
				{ kind: "name" as const, value: t.name },
				{ kind: "desc" as const, value: `<code>${t.package_name}</code>` },
			])}
		/>
		<CodeBlock fname="terminal" html={install} />
		<CodeBlock fname="theme.ts" html={use} />
		<p>
			See <a href="/docs/themes">themes</a> for variants, overrides and the CSS
			contract.
		</p>
	</Section>

	<Section id="vocabulary" title="token vocabulary" num="§ 02">
		<p>
			A theme is a map from token type to colour. These are the types any grammar
			in the tree emits; the canonical list lives in
			<code>@twinkleplop/core/tokens</code>.
		</p>
		<ParamTable headers={["group", "tokens"]} rows={vocab_rows} />
		<Callout mark="▸" variant="warn">
			Markdown's <code>*_open</code> / <code>*_close</code> pairs and the
			<code>raw_*</code> containers are intermediate types. They are consumed by
			reclassifiers and never reach the output, so styling them has no effect.
		</Callout>
	</Section>

	<Section id="authoring" title="authoring a theme" num="§ 03">
		<p>
			Export a <code>light</code> and a <code>dark</code> palette keyed by token
			name. The build step generates the three stylesheets —
			<code>light.css</code>, <code>dark.css</code> and the combined
			<code>index.css</code>.
		</p>
		<CodeBlock fname="tokens.ts" html={palette} />
		<p>
			Validate a palette against
			<code>@twinkleplop/core/tokens</code>: a key that is not in that catalogue
			will never match a span. Not every theme needs an entry for every type —
			anything unstyled simply inherits.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="theme reference"
	sections={[
		{ href: "#builtin", label: "§01 — built-in themes", active: true },
		{ href: "#vocabulary", label: "§02 — token vocabulary" },
		{ href: "#authoring", label: "§03 — authoring a theme" },
	]}
/>
