<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import SplitCodeBlock from "$lib/docs/components/SplitCodeBlock.svelte";
	import MiniLab from "$lib/docs/components/MiniLab.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, ts, ts_split, html, css } from "$lib/docs/snippets";

	const line_number = ts({ line_numbers: true })`import { language } from "@twinkleplop/typescript";

const ts = language();

// line numbers
const html = ts("1 + 2", {
  line_numbers: true,
});

// no line numbers
const html_no_line_numbers = ts("1 + 2");`;

	const html_output = html`<pre class="twinkleplop">
  <code>
    <span class="l"><span class="ln">1</span> ...tokens </span>
    <span class="l"><span class="ln">2</span> ...tokens</span>
    <span class="l"><span class="ln">3</span> ...tokens</span>
  </code>
</pre>`

	const css_output = css`.twinkleplop .ln {
  display: inline-block;
  width: 40px;
  text-align: right;
  padding-right: 16px;
}`

	const start_code = twoslash`import { language } from "@twinkleplop/typescript";
const ts = language();
declare const code: string;
// ---cut---
// the first visible line is numbered 10
const html = ts(code, {
  line_numbers: { start: 10 },
});`;

	const removed_lines = ts_split({ line_numbers: true })`const price = 100;
// [!hl +1]
const tax = 20;
// [!em +1]
const total = price + tax;`;
</script>

<ArticleMain
	pane_path="docs / line_numbers"
	title="line numbers"
	subtitle="Add line numbers to highlighted code."
>
	<p>
		A long time ago, someone decided that counting lines every time you wanted to figure out the
		location of some code is not good at all.
	</p>
	<p>Twinkleplop agrees.</p>

	<Section id="s1" title="line numbers" num="§ 01">
		<p>
			Enable line numbers with the <code>line_numbers</code> render option.
		</p>
		<p>You can enable or disable them on each call to the highlighter.</p>
		<CodeBlock fname="line-numbers.ts" html={line_number} />
	</Section>

	<Section id="s2" title="styling" num="§ 02">
		<p>Each line number is a <code>span.ln</code> at the start of the line.</p>
		<p>The HTML looks like this:</p>
		<CodeBlock fname="line-numbers.html" html={html_output} />
		<p>You can style them like this:</p>
		<CodeBlock fname="line-numbers.css" html={css_output} />
	</Section>

	<Section id="s3" title="starting number" num="§ 03">
		<p>
			Set <code>line_numbers.start</code> to choose the first number. This is useful for excerpts from
			a larger file.
		</p>
		<CodeBlock fname="start.ts" html={start_code} />
		<p>
			Only visible lines are numbered. Lines containing only <a href="/docs/directives">directive</a
			> markers are removed and do not count towards the sequence.
		</p>
		<SplitCodeBlock
			lang="typescript"
			left_html={removed_lines.input}
			right_html={removed_lines.output}
		/>
	</Section>
</ArticleMain>
