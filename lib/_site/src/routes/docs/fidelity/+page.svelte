<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash } from "$lib/docs/snippets";

	const tiers = twoslash`import { language } from "@twinkleplop/typescript";

// every pass — the default
const full = language();
const same = language({ fidelity: "high" });

// correctness only, no identifier enrichment
const fast = language({ fidelity: "low" });

// pick exactly the distinctions you want
const picked = language({ fidelity: ["function", "class_name"] });`;

	const tagging = twoslash`import { embed_interleaved } from "@twinkleplop/core";
import { js_frame_track, promote_call_site_functions, scan_tagged_template } from "@twinkleplop/javascript";
// ---cut---
import { tag, always } from "@twinkleplop/core";

// a fidelity-gated pass declares what it produces
tag(promote_call_site_functions, ["function"]);

// an always-on pass declares no outputs and runs at every setting
always(js_frame_track, "type_claim");
always(embed_interleaved({ scan: scan_tagged_template }), "embed");`;
</script>

<ArticleMain
	pane_path="docs / fidelity"
	title="fidelity"
	subtitle="Choose which token types the reclassifier identifies."
>
	<p>
		The grammar produces tokens. The reclassifier pipeline assigns more specific types, turning an <code
			>identifier</code
		>
		into a
		<code>function</code> at a call site, a <code>class_name</code> in a type position, a
		<code>constant</code>
		for an <code>UPPER_SNAKE_CASE</code>
		binding, and so on.
	</p>
	<p>
		Use <code>fidelity</code> to choose which reclassifier passes run. Running fewer passes reduces highlighting
		time.
	</p>

	<Section id="tiers" title="fidelity options" num="§ 01">
		<CodeBlock fname="fidelity.ts" html={tiers} />
		<ParamTable
			headers={["value", "behaviour"]}
			rows={[
				[
					{ kind: "name", value: `"high"` },
					{
						kind: "desc",
						value: `The default. Runs every pass in the language's pipeline.`,
					},
				],
				[
					{ kind: "name", value: `"low"` },
					{
						kind: "desc",
						value: `Runs only required passes. Most identifiers keep the <code>identifier</code> type.`,
					},
				],
				[
					{ kind: "name", value: "string[]" },
					{
						kind: "desc",
						value: `Runs always-on passes, plus any pass that produces one of the named token types. Unknown names are ignored.`,
					},
				],
			]}
		/>
	</Section>

	<Section id="always" title="required passes" num="§ 02">
		<p>
			Some passes are required for correct highlighting and run at every fidelity setting. These
			handle case-insensitive SQL keywords, Rust generic angle brackets, TypeScript type positions
			and Bash variables. Embedded languages also run at every setting, so CSS inside a <code
				>&lt;style&gt;</code
			> tag is always highlighted.
		</p>
		<p>
			Declare optional passes with <code>produces</code> and required passes with
			<code>always</code>.
		</p>
		<CodeBlock fname="pipeline.ts" html={tagging} />
		<p>
			A pass tagged with <code>produces</code> runs when its output types match the requested
			fidelity. A pass declared with <code>always</code> runs regardless of fidelity.
		</p>
	</Section>

	<Section id="names" title="token types" num="§ 03">
		<p>
			The array contains token type names. In JavaScript, the optional types are
			<code>constant</code>, <code>function</code>, <code>property</code>,
			<code>class_name</code>, <code>parameter</code> and
			<code>namespace</code>; other languages have their own optional types.
		</p>
		<Callout mark="▸">
			When a pass is disabled, tokens keep their earlier types and use those types' theme colours.
		</Callout>
	</Section>

	<Section id="ordering" title="pass precedence" num="§ 04">
		<p>
			Most optional passes read the same token stream and produce <em>claims</em>. A claim contains
			a token index, a proposed type and a precedence. The runner groups consecutive claim producers
			into a batch and applies the highest-precedence claim for each token.
		</p>
		<p>
			Precedence resolves competing claims within a batch. If precedence is equal, the earlier pass
			wins. See <a href="/docs/reclassifier">reclassifiers</a> for details.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="fidelity"
	sections={[
		{ href: "#tiers", label: "§01 — fidelity options", active: true },
		{ href: "#always", label: "§02 — required passes" },
		{ href: "#names", label: "§03 — token types" },
		{ href: "#ordering", label: "§04 — pass precedence" },
	]}
/>
