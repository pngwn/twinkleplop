<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import MiniLab from "$lib/docs/components/MiniLab.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { language as make_ts } from "@twinkleplop/typescript";
	import { language as make_html } from "@twinkleplop/html";
	import { language as make_css } from "@twinkleplop/css";

	const ts = make_ts();
	const html = make_html();
	const css = make_css();

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
</script>

<ArticleMain
	pane_path="docs / line_numbers"


	title="line numbers"
	subtitle="A popular option for code highlighting is add line numbers to the output. Twinkleplop supports this out of the box."

>
	<Section id="s1" title="line numbers" num="§ 01">
		<p>
		  Line numbers ins twinkleplop are a <em>renderer</em> option. </p>
		<p>This means that you can create a single resuable highlighter and decide whether or not render line numbers on a per-call basis.
		</p>
		<CodeBlock fname="line-numbers.ts" lang="typescript" html={line_number} />
	</Section>

	<Section id="s2" title="styling" num="§ 01">


		<p>Line numbers are just an extra HTML element that gets output at the start of the line.</p>
		<p>The HTML looks like this:</p>
		<CodeBlock fname="line-numbers.html" lang="html" html={html_output} />
		<p>You can style them like this:</p>
		<CodeBlock fname="line-numbers.css" lang="css" html={css_output} />
	</Section>

</ArticleMain>

<ArticleOtp
	title="getting started"
	sections={[
		{ href: "#s1", label: "§01 — install", active: true },
		{ href: "#s2", label: "§02 — first highlight" },
		{ href: "#s3", label: "§03 — try it live" },
		{ href: "#s4", label: "§04 — framework adapters" },
	]}
	meta={[
		{ label: "version", value: "0.4.2" },
		{ label: "updated", value: "5d ago" },
		{ label: "authors", value: "pngwn" },
		{ label: "read", value: "~4 min" },
	]}
/>
