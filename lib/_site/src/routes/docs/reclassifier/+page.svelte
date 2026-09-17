<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import SubSection from "$lib/docs/components/SubSection.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash } from "$lib/docs/snippets";

	const shape = twoslash`import type { TokenizeResult } from "@twinkleplop/core";
// ---cut---
type Reclassifier = (input: string, result: TokenizeResult) => TokenizeResult;`;

	const rewrite = twoslash`import { rewrite_types, seq, any_of, optional, type, balanced_parens } from "@twinkleplop/core";

// \`const foo = () => {}\` makes foo a function
const function_value = seq(
  optional(type("keyword", "async")),
  any_of(
    type("keyword", "function"),
    seq(type("identifier"), type("operator", "=>")),
    seq(balanced_parens("(", ")"), type("operator", "=>")),
  ),
);

const rules = [
  {
    anchor: "identifier",
    when: seq(type("operator", "="), function_value),
    rewrite: "function",
  },
];

const pass = rewrite_types(rules, { trivia: ["comment"] });`;

	const embed = twoslash`import { tokenize as js_tokenize, scan_tagged_template } from "@twinkleplop/javascript";
import { tokenize as css_tokenize } from "@twinkleplop/css";
const js_language = js_tokenize();
const css_language = css_tokenize();
// ---cut---
import { embed_grammars, embed_interleaved } from "@twinkleplop/core";

// whole-token replacement: <script> content becomes JavaScript
embed_grammars({ raw_script: js_language, raw_style: css_language });

// interpolated content, holes preserved: html\`<p class="\${cls}">hi</p>\`
embed_interleaved({ scan: scan_tagged_template, /* ... */ });`;

	const fidelity = twoslash`import {
  promote_by_text_set,
  promote_pascal_case,
  promote_by_upper_snake_case,
  promote_function_calls,
} from "@twinkleplop/core";`;

	const tag_code = twoslash`import type { Reclassifier } from "@twinkleplop/core";
declare const my_pass: Reclassifier, my_shape_pass: Reclassifier;
declare const correctness_fixup: Reclassifier, embedder: Reclassifier;
// ---cut---
import { tag, always } from "@twinkleplop/core";

// fidelity-gated: declares the token types it produces
tag(my_pass, ["function"]);                 // layer defaults to "type_claim"
tag(my_shape_pass, ["class_name"], "shape");

// always-on: no outputs to gate on, runs at every fidelity setting
always(correctness_fixup, "type_claim");
always(embedder, "embed");`;

	const claim = twoslash`declare const token_idx: number, type_id: number, precedence: number;
// ---cut---
import { as_claim_producer } from "@twinkleplop/core";

const pass = as_claim_producer((input, tokens, token_types, sink, frames) => {
  // read the frozen stream, emit claims — never write a token slot
  sink.emit(token_idx, type_id, precedence);
});`;

	const compose = twoslash`import type { Reclassifier } from "@twinkleplop/core";
declare const my_pass: Reclassifier;
// ---cut---
import { create_language, tag } from "@twinkleplop/core";
import { grammar, reclassifiers } from "@twinkleplop/javascript";

const tokenize = create_language(grammar, [
  ...reclassifiers,
  tag(my_pass, ["type"]),
]);`;
</script>

<ArticleMain
	pane_path="docs / reference / reclassifier"
	title="reclassifiers"
	subtitle="Assign more specific token types and highlight embedded languages."
>
	<p>
		Reclassifiers process tokens after tokenization. They use the surrounding tokens to identify
		functions, classes and other specific types. They also highlight embedded languages, such as
		JavaScript inside <code>&lt;script&gt;</code> tags.
	</p>
	<CodeBlock fname="types.ts" html={shape} />
	<p>An empty pipeline returns the original token stream.</p>

	<Section id="primitives" title="reclassifier helpers" num="§ 01">
		<SubSection id="rewrite_types" title="rewrite_types">
			<p>
				Pattern-matched rewriting over a local window. A rule is
				<code>&#123; anchor, before?, when?, rewrite, precedence? &#125;</code>:
				<code>anchor</code> names the token to rewrite, <code>when</code> is a forward pattern and
				<code>before</code> a lookbehind. Rules are indexed by anchor type for O(1) dispatch.
			</p>
			<CodeBlock fname="rewrite.ts" html={rewrite} />
			<p>
				Patterns are built from the combinators <code>type</code>,
				<code>seq</code>, <code>any_of</code>, <code>optional</code>,
				<code>capture</code>, <code>balanced_parens</code>,
				<code>repeat</code>, <code>not</code>, <code>params</code> and
				<code>type_span</code>. <code>trivia</code> names token types to skip between pattern elements.
			</p>
		</SubSection>

		<SubSection id="embedding" title="embed_grammars and embed_interleaved">
			<CodeBlock fname="embed.ts" html={embed} />
			<p>
				<code>embed_grammars</code> replaces tokens of a named type with the output of tokenizing their
				source slice as a sub-language. The host grammar identifies embedded content and emits a container
				token for the reclassifier to replace.
			</p>
			<p>
				<code>embed_interleaved</code> handles discontinuous content: it builds a virtual source of content
				chunks plus placeholder holes, sub-tokenizes it in one call so the sub-language keeps state continuity
				across the holes, then remaps positions back and re-inserts the original hole tokens. It iterates
				to a fixed point, so a template nested inside an interpolation resolves too.
			</p>
		</SubSection>

		<SubSection id="fidelity_helpers" title="fidelity helpers">
			<p>These helpers assign more specific types to identifiers:</p>
			<CodeBlock fname="fidelity.ts" html={fidelity} />
			<ParamTable
				headers={["helper", "rewrites"]}
				rows={[
					[
						{ kind: "name", value: "promote_by_text_set" },
						{ kind: "desc", value: `Tokens whose source text is in a word set.` },
					],
					[
						{ kind: "name", value: "promote_pascal_case" },
						{ kind: "desc", value: `Tokens starting with an ASCII uppercase letter.` },
					],
					[
						{ kind: "name", value: "promote_by_upper_snake_case" },
						{ kind: "desc", value: `<code>UPPER_SNAKE_CASE</code> tokens.` },
					],
					[
						{ kind: "name", value: "promote_function_calls" },
						{
							kind: "desc",
							value: `Identifiers followed by <code>(...)</code>, with optional macro, generic and turbofish variants.`,
						},
					],
				]}
			/>
		</SubSection>
	</Section>

	<Section id="tagging" title="tagging a pass" num="§ 02">
		<p>
			Each pass declares its output types and execution layer. The <a href="/docs/fidelity"
				>fidelity</a
			>
			option selects passes whose <code>produces</code> list includes a requested type.
		</p>
		<CodeBlock fname="tagging.ts" html={tag_code} />
		<p>
			<code>ReclassifierLayer</code> is
			<code>"shape" | "type_claim" | "embed"</code>. A pass declared with
			<code>always</code> has an empty <code>produces</code> and runs at every setting — correctness fixups
			and cross-language composition belong here.
		</p>
	</Section>

	<Section id="claims" title="claims and precedence" num="§ 03">
		<p>
			Most passes that change token types produce <em>claims</em>. Each claim contains a token
			index, a proposed type and a precedence. These passes read the same token stream without
			modifying it.
		</p>
		<CodeBlock fname="claim.ts" html={claim} />
		<p>
			The runner groups consecutive claim producers into a batch and applies the highest-precedence
			claim for each token. Ties use the earlier pipeline entry. The <code>tokens</code> array is copied
			only when there are claims to apply.
		</p>
		<Callout mark="▸">
			Use distinct precedence values when one pass should take priority over another. Pass order
			only resolves ties.
		</Callout>
		<p>
			Passes that change token count or splice sub-language streams are shape or embed transforms
			instead. They clone before mutating, run sequentially, and break a claim batch.
		</p>
	</Section>

	<Section id="scope" title="scope-aware passes" num="§ 04">
		<p>
			<code>frame_track</code> precomputes per-token scope-stack metadata in one walk, so several
			downstream passes read <code>result.frames</code> instead of each maintaining its own stack. A
			language whose pipeline reuses another's scope-aware passes must include the matching
			<code>frame_track</code> stage in its own pipeline.
		</p>
		<p>
			Also available: <code>merge_adjacent</code>,
			<code>matched_bracket</code>, <code>compound_compose</code>, and the
			<code>make_token_view</code> / <code>make_scope_stack</code> helpers.
		</p>
	</Section>

	<Section id="compose" title="composing a pipeline" num="§ 05">
		<CodeBlock fname="compose.ts" html={compose} />
		<p>
			Language packages export a <code>reclassifiers</code> array. Add your own passes before or after
			these defaults.
		</p>
	</Section>

	<Section id="guidance" title="writing a pass" num="§ 06">
		<ul>
			<li>
				<strong>A correctness pass</strong> should include a regression test for the incorrect output
				it fixes.
			</li>
			<li>
				<strong>A fidelity pass</strong> is optional. Declare its output types with
				<code>produces</code> and check that tokens are styled correctly when the pass is disabled.
			</li>
			<li>
				<strong>Choosing a mechanism:</strong> prefer <code>rewrite_types</code>
				when the decision fits in a bounded window. Use a stateful pass when the decision requires scope
				information.
			</li>
			<li>
				<strong>Embedding:</strong> <code>embed_grammars</code> for whole-token replacement,
				<code>embed_interleaved</code> for templates with interpolation holes. Both handle position remapping
				and token-type merging.
			</li>
		</ul>
	</Section>
</ArticleMain>
