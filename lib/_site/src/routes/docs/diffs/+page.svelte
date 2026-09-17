<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import SplitCodeBlock from "$lib/docs/components/SplitCodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, bash, css, ts_split } from "$lib/docs/snippets";

	const install = bash`pnpm add @twinkleplop/diff`;

	const usage = twoslash`declare const patch: string;
// ---cut---
import { language } from "@twinkleplop/diff";

const diff = language();
const html = diff(patch);`;

	const markers = twoslash`declare const source: string;
// ---cut---
import { language } from "@twinkleplop/typescript";
import { add, del, mod } from "@twinkleplop/annotation";

const ts = language({ annotation: { plugins: [add, del, mod] } });

const html = ts(source);`;

	const marker_source = ts_split`const NUM = 100 // [!del]
const NUM = 50 // [!add]

// [!mod :4..7]
function changed_block() {
  return NUM;
}`;

	const diff_css = css`.twinkleplop .inserted        { color: var(--twp-inserted); }
.twinkleplop .deleted         { color: var(--twp-deleted); }
.twinkleplop .inserted_marker,
.twinkleplop .deleted_marker  { opacity: 0.6; }

/* annotation overlays are line classes, not token types */
.twinkleplop .l.diff-add { background: rgb(46 160 67 / 0.15); }
.twinkleplop .l.diff-del { background: rgb(248 81 73 / 0.15); }

/* the block knows what it contains */
.twinkleplop.has-diff-add { border-left: 2px solid green; }`;
</script>

<ArticleMain
	pane_path="docs / diffs"
	title="diffs"
	subtitle="Highlight patch files or use directives to mark changes in source code."
>
	<p>
		Use a diff grammar for <code>.patch</code> files or <code>git diff</code> output. Use diff directives
		to mark added, removed or modified lines in a highlighted code snippet.
	</p>

	<Section id="grammars" title="highlighting a patch" num="§ 01">
		<p>Two language packages support diff output:</p>
		<CodeBlock fname="terminal" html={install} />
		<CodeBlock fname="diff.ts" html={usage} />
		<ParamTable
			headers={["package", "covers"]}
			rows={[
				[
					{ kind: "name", value: "@twinkleplop/diff" },
					{
						kind: "desc",
						value: `Unified diff, context diff, normal diff, and git metadata (<code>index</code>, similarity, rename, mode, binary). Combined diff (<code>@@@</code>) at a basic level.`,
					},
				],
				[
					{ kind: "name", value: "@twinkleplop/diff-basic" },
					{
						kind: "desc",
						value: `A minimal overlay: <code>+</code>/<code>-</code> prefixes, <code>!</code> changed, <code>@@</code> hunk headers and the no-newline marker. Built to compose with another language's grammar without conflicting, so file headers, <code>diff --git</code> and index lines are deliberately omitted. Unrecognised lines pass through unhighlighted.`,
					},
				],
			]}
		/>
		<p>
			The tokens they emit are diff-specific:
			<code>inserted</code>, <code>deleted</code>, <code>changed</code>, each paired with a
			<code>*_marker</code>
			type for the leading
			<code>+</code>/<code>-</code>/<code>!</code> column, plus
			<code>heading</code>, <code>label</code> and <code>hash</code> for hunk headers and git metadata
			in the full package.
		</p>
		<Callout mark="▸" variant="warn">
			Diff grammars highlight patch syntax. They do not highlight the source language inside the
			patch.
		</Callout>
	</Section>

	<Section id="directives" title="marking up source" num="§ 02">
		<p>Diff directives add classes to highlighted source code to show changes.</p>
		<CodeBlock fname="setup.ts" html={markers} />
		<p>Then write the markers in comments:</p>
		<SplitCodeBlock
			lang="typescript"
			left_html={marker_source.input}
			right_html={marker_source.output}
		/>
		<ParamTable
			headers={["verb", "class", "meaning"]}
			rows={[
				[
					{ kind: "name", value: "[!add]" },
					{ kind: "type", value: "diff-add" },
					{ kind: "desc", value: "added" },
				],
				[
					{ kind: "name", value: "[!del]" },
					{ kind: "type", value: "diff-del" },
					{ kind: "desc", value: "removed" },
				],
				[
					{ kind: "name", value: "[!mod]" },
					{ kind: "type", value: "diff-mod" },
					{ kind: "desc", value: "modified" },
				],
			]}
		/>
		<p>
			Each directive supports line and text ranges. A marker without arguments applies to its own
			line. <code>+N</code> selects the next N lines, and <code>:N..M</code> selects the lines
			between N and M. See <a href="/docs/directives">directives</a> for all supported arguments.
		</p>
	</Section>

	<Section id="styling" title="styling" num="§ 03">
		<p>
			Diff grammar tokens use classes on <code>span.tok</code>. Line directives add classes to the
			line span.
		</p>
		<CodeBlock fname="diff.css" html={diff_css} />
		<p>
			A block containing directive overlays also gains a
			<code>has-</code> class per classification, so you can style the container based on the directives
			it contains.
		</p>
	</Section>

	<Section id="shiki" title="shiki notation" num="§ 04">
		<p>
			Content written for <code>@shikijs/transformers</code> works unchanged:
			<code>// [!code ++]</code> and <code>// [!code --]</code> map onto the same classes. See
			<a href="/docs/migration">migrating from shiki</a>.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="diffs"
	sections={[
		{ href: "#grammars", label: "§01 — highlighting a patch", active: true },
		{ href: "#directives", label: "§02 — marking up source" },
		{ href: "#styling", label: "§03 — styling" },
		{ href: "#shiki", label: "§04 — shiki notation" },
	]}
/>
