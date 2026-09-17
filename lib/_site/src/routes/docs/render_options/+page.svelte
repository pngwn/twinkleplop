<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, css, html } from "$lib/docs/snippets";

	const basic = twoslash`import { language } from "@twinkleplop/typescript";
declare const code: string;
// ---cut---
const ts = language();

const out = ts(code, {
  class_name: "my-code",
  line_numbers: { start: 10 },
  attributes: { "data-title": "math.ts", tabindex: 0 },
});`;

	const attributes = twoslash`import { language } from "@twinkleplop/typescript";
const ts = language();
declare const code: string;
// ---cut---
ts(code, {
  attributes: {
    "data-title": "math.ts",  // data-title="math.ts"
    tabindex: 0,              // tabindex="0"
    hidden: true,             // hidden
    draggable: false,         // omitted entirely
  },
});`;

	const overlays = twoslash`import { language } from "@twinkleplop/typescript";
const ts = language();
declare const code: string;
// ---cut---
ts(code, {
  overlays: [
    // by byte offset
    { start: 0, end: 12, class: "highlight" },
    // by line
    { line: 3, class: "diff-add" },
    // several lines, individually or as ranges
    { lines: [1, [5, 8]], class: "subdued" },
    // by line and character
    { start: { line: 2, character: 4 }, end: { line: 2, character: 9 }, class: "error" },
    // hide a range: it renders as spaces of equal width
    { start: 40, end: 60, hide: true },
  ],
});`;

	const hooks = twoslash`import { language } from "@twinkleplop/typescript";
const ts = language();
declare const code: string;
// ---cut---
ts(code, {
  // n is the visible index, source_line the 1-based input line
  line: (n, source_line) => {
    if (source_line % 2 === 0) return { class: "even" };
  },
  // a decorated token renders as its own span and is never merged
  token: (type, start, end) => {
    if (type === "keyword") return { attrs: { "data-kw": true } };
  },
});`;

	const inline = twoslash`import { language } from "@twinkleplop/typescript";
const ts = language();
declare const code: string;
// ---cut---
// no <pre>, no <code>, no line spans — <br> between lines
const snippet = ts("const x = 1", { structure: "inline" });

// drop it straight into prose
\`Try <code>\${snippet}</code> instead.\`;`;

	const whitespace = twoslash`import { language } from "@twinkleplop/typescript";
const ts = language();
declare const code: string;
// ---cut---
ts(code, {
  whitespace: "leading",      // "all" | "boundary" | "leading" | "trailing"
  indent_guides: { size: 4 }, // a tab is one level, 4 spaces is one level
});`;

	const whitespace_css = css`.twinkleplop .space { white-space: pre; }
.twinkleplop .tab   { white-space: pre; }

/* indent guides are nested spans, one per level */
.twinkleplop .indent {
  box-shadow: inset 1px 0 0 var(--twp-comment);
}`;

	const output = html`<pre class="twinkleplop"><code>
<span class="l"><span class="ln">1</span><span class="tok keyword">const</span> <span class="tok identifier">x</span></span>
<span class="l diff-add">...</span>
</code></pre>`;
</script>

<ArticleMain
	pane_path="docs / render-options"
	title="render options"
	subtitle="Per-call options on the renderer: classes, attributes, overlays, hooks and whitespace."
>
	<p>
		Render options are passed per call, not per highlighter, so one reusable
		highlighter can render the same source differently in different places. Pass
		them as the second argument to a highlight function, or as the third to
		<code>to_html</code>.
	</p>
	<CodeBlock fname="render.ts" html={basic} />
	<Callout mark="▸">
		Omitting every option produces byte-identical output to the no-option path.
		Options you do not use cost nothing.
	</Callout>

	<Section id="block" title="the block itself" num="§ 01">
		<p>
			<code>class_name</code> replaces <code>twinkleplop</code> on the
			<code>&lt;pre&gt;</code>. <code>attributes</code> adds arbitrary attributes
			after the class, in the order given.
		</p>
		<CodeBlock fname="attributes.ts" html={attributes} />
		<p>
			A string or number becomes <code>name="value"</code>, <code>true</code> a
			bare attribute name, and <code>false</code> emits nothing at all. Values
			are HTML-escaped, so a value containing quotes cannot break out of the
			attribute.
		</p>
		<Callout mark="▸" variant="warn">
			<code>class</code> and <code>style</code> are reserved —
			<code>class_name</code> owns the class attribute and themes own styling.
			Passing either throws a <code>TypeError</code> naming the key, as does an
			attribute name that is not a valid HTML attribute name.
		</Callout>
	</Section>

	<Section id="overlays" title="overlays" num="§ 02">
		<p>
			An overlay is a CSS class over a range of the source. Overlays never change
			token types and never move bytes — they only add classes. They come from
			<a href="/docs/directives">directives</a> in the source, and from this
			option.
		</p>
		<CodeBlock fname="overlays.ts" html={overlays} />
		<p>
			Offsets are UTF-16 code units, the same units as token positions. Lines are
			1-based, characters 0-based, and <code>end</code> is exclusive in both
			forms.
		</p>
		<p>
			Line-mode overlays add their class to every <code>span.l</code> the range
			touches. Token-mode overlays wrap the non-whitespace run on each line.
			Overlapping overlays never nest or throw: each region gets the union of the
			active classes. A hidden range renders as spaces of equal width, and a line
			that becomes whitespace-only is dropped — visible line numbering continues
			without a gap.
		</p>
		<p>
			Every classification present also adds a <code>has-</code> class to the
			<code>&lt;pre&gt;</code>, so a theme can style the block as a whole. Turn
			that off with <code>has_classes: false</code>.
		</p>
	</Section>

	<Section id="hooks" title="line and token hooks" num="§ 03">
		<p>
			The hooks are the extension point for per-line and per-token decoration.
			Each returns a class, attributes, or nothing.
		</p>
		<CodeBlock fname="hooks.ts" html={hooks} />
		<p>
			Returned classes go after the element's own classes, and returned
			attributes follow the same escaping rules as <code>attributes</code>. The
			<code>line</code> hook is not called in inline mode.
		</p>
	</Section>

	<Section id="inline" title="inline structure" num="§ 04">
		<p>
			<code>structure: "inline"</code> drops the block and line elements
			entirely, which is what you want for code inside a sentence.
		</p>
		<CodeBlock fname="inline.ts" html={inline} />
	</Section>

	<Section id="whitespace" title="whitespace and indent guides" num="§ 05">
		<p>
			By default whitespace between tokens is bare text. Both options below wrap
			it so you can style it.
		</p>
		<CodeBlock fname="whitespace.ts" html={whitespace} />
		<p>
			<code>whitespace</code> wraps spaces and tabs between tokens, one span per
			character; whitespace inside a token stays part of that token.
			<code>indent_guides</code> splits leading indentation into nested
			<code>span.indent</code> levels — a tab is always one level, and
			<code>size</code> spaces is one level, defaulting to 2.
		</p>
		<CodeBlock fname="whitespace.css" html={whitespace_css} />
	</Section>

	<Section id="output" title="the output contract" num="§ 06">
		<p>
			Whatever combination of options you pass, the shape is the same, and themes
			style it by class alone.
		</p>
		<CodeBlock fname="output.html" html={output} />
		<p>
			One <code>pre.twinkleplop &gt; code</code> per call. One
			<code>span.l</code> per visible line. Every classified region is a
			<code>span.tok &lt;type&gt;</code>, and adjacent regions of the same type
			render as one span unless a hook decorated them. Text between tokens is
			bare, escaped text. HTML is produced in a single pass as a string — there
			is no intermediate document model.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="render options"
	sections={[
		{ href: "#block", label: "§01 — the block itself", active: true },
		{ href: "#overlays", label: "§02 — overlays" },
		{ href: "#hooks", label: "§03 — line and token hooks" },
		{ href: "#inline", label: "§04 — inline structure" },
		{ href: "#whitespace", label: "§05 — whitespace" },
		{ href: "#output", label: "§06 — the output contract" },
	]}
/>
