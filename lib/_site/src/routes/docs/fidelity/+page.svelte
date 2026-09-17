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
	subtitle="How much work the reclassifier does, and how to pick a point on that curve."
>
	<p>
		The grammar emits a lexically correct token stream. The reclassifier pipeline
		then enriches it: turning an <code>identifier</code> into a
		<code>function</code> at a call site, a <code>class_name</code> in a type
		position, a <code>constant</code> for an <code>UPPER_SNAKE_CASE</code>
		binding, and so on.
	</p>
	<p>
		Every one of those distinctions costs something. <code>fidelity</code> is the
		dial that decides which ones you pay for.
	</p>

	<Section id="tiers" title="the three settings" num="§ 01">
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
						value: `Runs only always-on passes. Output is lexically valid but carries bare grammar-level tokens — most identifiers stay <code>identifier</code>.`,
					},
				],
				[
					{ kind: "name", value: "string[]" },
					{
						kind: "desc",
						value: `Runs always-on passes, plus any pass that produces one of the named token types. Unknown names are ignored rather than throwing.`,
					},
				],
			]}
		/>
	</Section>

	<Section id="always" title="what always runs" num="§ 02">
		<p>
			Some passes are not enrichment. A pass that fixes something the grammar
			cannot express — case-insensitive SQL keywords, Rust generic angle
			brackets, TypeScript type-position tracking, Bash variable extension — is
			always on, because disabling it would produce output a knowledgeable reader
			would call a bug. So is cross-language embedding: the CSS inside a
			<code>&lt;style&gt;</code> tag is highlighted at every fidelity setting.
		</p>
		<p>
			A pass declares which category it is in by whether it advertises any output
			types.
		</p>
		<CodeBlock fname="pipeline.ts" html={tagging} />
		<p>
			A pass tagged with <code>produces</code> is fidelity-gated. A pass declared
			with <code>always</code> has no outputs to gate on and runs regardless.
			That is the whole mechanism — <code>fidelity</code> filters the pipeline by
			intersecting your request with each pass's <code>produces</code> list.
		</p>
	</Section>

	<Section id="names" title="choosing names" num="§ 03">
		<p>
			The names in the array are token types, the same vocabulary themes style.
			In the JavaScript pipeline the gated outputs are
			<code>constant</code>, <code>function</code>, <code>property</code>,
			<code>class_name</code>, <code>parameter</code> and
			<code>namespace</code>; other languages gate on the types their grammars
			leave plain.
		</p>
		<Callout mark="▸">
			A theme that styles a token type you have gated off simply never matches —
			the spans carry the un-enriched type instead. Nothing breaks, the
			highlighting is just coarser.
		</Callout>
	</Section>

	<Section id="ordering" title="why order does not matter" num="§ 04">
		<p>
			Most enrichment passes are claim producers: rather than writing token slots
			directly, they read a frozen stream and emit
			<em>claims</em> — a token index, a proposed type, and a precedence. The
			runner batches consecutive producers against the same base stream, merges
			the claims by precedence, and applies the winners in one pass.
		</p>
		<p>
			The consequence is that within a batch, pipeline order does not decide
			conflicts; precedence does. Switching fidelity on or off for one pass
			cannot reorder the outcome of the others. See
			<a href="/docs/reclassifier">reclassifiers</a> for the detail.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="fidelity"
	sections={[
		{ href: "#tiers", label: "§01 — the three settings", active: true },
		{ href: "#always", label: "§02 — what always runs" },
		{ href: "#names", label: "§03 — choosing names" },
		{ href: "#ordering", label: "§04 — why order does not matter" },
	]}
/>
