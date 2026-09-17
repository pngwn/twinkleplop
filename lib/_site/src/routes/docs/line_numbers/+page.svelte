<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import MiniLab from "$lib/docs/components/MiniLab.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { ts, html, css } from "$lib/docs/highlighters";

	const line_number_src = `import { language } from "@twinkleplop/typescript";

const ts = language();

// line numbers
const html = ts("1 + 2", {
  line_numbers: true,
});

// no line numbers
const html_no_line_numbers = ts("1 + 2");`;

	const line_number = ts(line_number_src, {
		line_numbers: true,
	})

	const html_output_src = `<pre class="twinkleplop">
  <code>
    <span class="l"><span class="ln">1</span> ...tokens </span>
    <span class="l"><span class="ln">2</span> ...tokens</span>
    <span class="l"><span class="ln">3</span> ...tokens</span>
  </code>
</pre>`

	const html_output = html(html_output_src);

	const css_output_src = `.twinkleplop .ln {
  display: inline-block;
  width: 40px;
  text-align: right;
  padding-right: 16px;
}`

	const css_output = css(css_output_src);

	const start_src = `// the first visible line is numbered 10
const html = ts(code, {
  line_numbers: { start: 10 },
});`;
	const start_code = ts(start_src);
</script>

<ArticleMain
	pane_path="docs / line_numbers"


	title="line numbers"
	subtitle="A popular option for code highlighting is add line numbers to the output. Twinkleplop supports this out of the box."

>
	<Section id="s1" title="line numbers" num="§ 01">
		<p>
		  Line numbers in twinkleplop are a <em>renderer</em> option.</p>
		<p>This means you can create a single reusable highlighter and decide whether to render line numbers on a per-call basis.
		</p>
		<CodeBlock fname="line-numbers.ts" html={line_number} />
	</Section>

	<Section id="s2" title="styling" num="§ 02">


		<p>Line numbers are just an extra HTML element that gets output at the start of the line.</p>
		<p>The HTML looks like this:</p>
		<CodeBlock fname="line-numbers.html" html={html_output} />
		<p>You can style them like this:</p>
		<CodeBlock fname="line-numbers.css" html={css_output} />
	</Section>

	<Section id="s3" title="starting number" num="§ 03">
		<p>
			<code>line_numbers</code> also takes an object, so a snippet excerpted from
			a larger file can carry its real line numbers.
		</p>
		<CodeBlock fname="start.ts" html={start_code} />
		<p>
			Numbering counts <em>visible</em> lines. A line dropped because it held only
			<a href="/docs/directives">directive</a> markers does not consume a number,
			so the sequence never shows a gap.
		</p>
	</Section>

</ArticleMain>

<ArticleOtp
	title="line numbers"
	sections={[
		{ href: "#s1", label: "§01 — line numbers", active: true },
		{ href: "#s2", label: "§02 — styling" },
		{ href: "#s3", label: "§03 — starting number" },
	]}
/>
