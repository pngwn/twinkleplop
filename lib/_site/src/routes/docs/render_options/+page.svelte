<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import SplitCodeBlock from "$lib/docs/components/SplitCodeBlock.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, ts, css, html } from "$lib/docs/snippets";

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
    draggable: false,         // omitted
  },
});`;

	const overlays = twoslash`import { language } from "@twinkleplop/typescript";
const ts = language();
declare const code: string;
// ---cut---
ts(code, {
  overlays: [
    // by UTF-16 offset
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

	const guides_off = ts`function total(items) {
  let sum = 0;
  for (const item of items) {
    if (item.active) {
      sum += item.price;
    }
  }
  return sum;
}`;

	const guides_on = ts({ indent_guides: true })`function total(items) {
  let sum = 0;
  for (const item of items) {
    if (item.active) {
      sum += item.price;
    }
  }
  return sum;
}`;

	const whitespace_css = css`.twinkleplop .space { white-space: pre; }
.twinkleplop .tab   { white-space: pre; }

/* indent guides are adjacent spans, one per level */
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
		Render options control the output of each call. Pass them as the second argument to a highlight
		function, or as the third argument to <code>to_html</code>.
	</p>
	<CodeBlock fname="render.ts" html={basic} />

	<Section id="block" title="block attributes" num="§ 01">
		<p>
			<code>class_name</code> replaces <code>twinkleplop</code> on the <code>&lt;pre&gt;</code>.
			<code>attributes</code> adds arbitrary attributes after the class, in the order given.
		</p>
		<p>Do with this information what you will.</p>
		<CodeBlock fname="attributes.ts" html={attributes} />
		<ul>
			<li>A string or number becomes <code>name="value"</code>,</li>
			<li><code>true</code> becomes a bare attribute name,</li>
			<li><code>false</code> emits nothing at all.</li>
		</ul>
		<p>
			Values are HTML-escaped, so a value containing quotes cannot break out of the attribute.
		</p>
		<Callout mark="▸" variant="warn">
			<code>class</code> and <code>style</code> are reserved. Use <code>class_name</code> for the
			class and CSS for styling. Passing a reserved or invalid attribute name throws a
			<code>TypeError</code>.
		</Callout>
	</Section>

	<Section id="overlays" title="overlays" num="§ 02">
		<p>
			Overlays add CSS classes to ranges of source code. You can add them through <a
				href="/docs/directives">directives</a
			>
			or the <code>overlays</code> option.
		</p>
		<CodeBlock fname="overlays.ts" html={overlays} />
		<p>
			Numeric positions are JavaScript string indices, the same as token positions. In the
			<code>&#123; line, character &#125;</code> form, lines start at 1 and characters at 0. In both
			forms the range stops just before <code>end</code>, like
			<code>String.prototype.slice</code>.
		</p>
		<p>
			Line-mode overlays add their class to every <code>span.l</code> the range matches. Token-mode
			overlays wrap the non-whitespace characters on each line. When overlays overlap, each region
			gets all the classes that apply to it. A hidden range renders as spaces of equal width, and a
			line that becomes whitespace-only is dropped. Visible line numbering continues without a gap.
		</p>
		<p>
			Every classification present also adds a <code>has-</code> class to the
			<code>&lt;pre&gt;</code>, so a theme can style the block as a whole. Turn that off with
			<code>has_classes: false</code>.
		</p>
	</Section>

	<Section id="hooks" title="line and token hooks" num="§ 03">
		<p>
			Use hooks to add classes or attributes to individual lines and tokens. Return nothing to leave
			an element unchanged.
		</p>
		<CodeBlock fname="hooks.ts" html={hooks} />
		<p>
			Returned classes go after the element's own classes, and returned attributes follow the same
			escaping rules as <code>attributes</code>. The
			<code>line</code> hook is not called in inline mode.
		</p>
	</Section>

	<Section id="inline" title="inline structure" num="§ 04">
		<p>
			Use <code>structure: "inline"</code> for code inside a sentence. It omits the block and line
			elements and separates lines with <code>&lt;br&gt;</code>.
		</p>
		<CodeBlock fname="inline.ts" html={inline} />
	</Section>

	<Section id="whitespace" title="whitespace and indent guides" num="§ 05">
		<p>
			By default whitespace between tokens is bare text. The options below wrap it so you can style
			it.
		</p>
		<CodeBlock fname="whitespace.ts" html={whitespace} />
		<p>
			<code>whitespace</code> wraps spaces and tabs between tokens, one span per character;
			whitespace inside a token stays part of that token.
		</p>
		<p>
			<code>indent_guides</code> wraps each level of a line's leading indentation in its own
			<code>&lt;span class="indent"&gt;</code>. Each tab is one level, and every
			<code>size</code> spaces (2 by default) is one level. Spaces left over after the last full level
			are not wrapped. The spans sit next to each other rather than inside each other, so styling
			<code>.indent</code> draws one guide per level.
		</p>
		<SplitCodeBlock
			lang="typescript"
			left_html={guides_off}
			right_html={guides_on}
			left_label="default"
			right_label="indent_guides"
		/>
		<CodeBlock fname="whitespace.css" html={whitespace_css} />
	</Section>

	<Section id="output" title="HTML output" num="§ 06">
		<p>Block output uses this HTML structure:</p>
		<CodeBlock fname="output.html" html={output} />
		<ul>
			<li>
				The block contains a <code>&lt;pre&gt;</code> and a <code>&lt;code&gt;</code> element, with a
				<code>span.l</code> for each visible line.
			</li>
			<li>Tokens use <code>span.tok</code> with a class for their type.</li>
			<li>
				Adjacent tokens of the same type share a span unless a hook adds classes or attributes.
			</li>
			<li>Text between tokens is escaped and rendered without a span.</li>
		</ul>
	</Section>
</ArticleMain>
