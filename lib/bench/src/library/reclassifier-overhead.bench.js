// Reclassifier pipeline overhead benchmarks.
//
// Purpose: isolate the cost of each pipeline stage so we can answer "is the
// reclassifier architecture performant?" with numbers rather than vibes.
//
// Stages (progressively composed):
//
//   0. tokenize(src, grammar)
//        — raw tokenization, no pipeline. Baseline.
//
//   1. reclassify([])(src, tokenize(...))
//        — empty pipeline wrapper. Measures the cost of the reclassify()
//        composer itself when it has nothing to do.
//
//   2. reclassify([rewrite_types(function_variable_rules, {...})])(src, ...)
//        — adds the function-variable rule. Measures rewrite_types with
//        a realistic rule set on code that (often) matches.
//
//   3. language(src)
//        — full JS pipeline: rewrite_types + embed_interleaved. On code with
//        NO tagged templates this measures the "scan and find nothing"
//        cost of embed_interleaved.
//
//   4. language(tagged_templates_js)
//        — full JS pipeline on code WITH many tagged templates. Measures
//        embed_interleaved's actual work: virtual source construction,
//        sub-tokenization via HTML/CSS, position remapping, splicing.
//
//   5. html_language(embedded_html)
//        — full HTML pipeline: embed_grammars for <script>/<style> which
//        recursively invokes JS's full pipeline inside the <script> body.
//        Measures end-to-end multi-language composition.
//
// Delta between consecutive stages = cost of that stage.
//
// Target (from the plan): reclassifier overhead < 20% of tokenize time for
// in-language workloads. Stages 1→3 should sum to less than ~20% of stage 0.

import { bench, describe } from "vitest";
import {
	embed_interleaved,
	reclassify,
	rewrite_types,
	tokenize,
} from "@twinkleplop/core";
import {
	grammar as js_grammar,
	function_variable_rules,
	language as js_language,
	scan_tagged_template,
} from "@twinkleplop/javascript";
import { grammar as html_grammar, language as html_language } from "@twinkleplop/html";
import {
	small_js,
	medium_js,
	large_js,
	complex_js,
} from "./javascript-samples.js";
import {
	tagged_templates_js,
	embedded_html,
	plain_js,
} from "./reclassifier-samples.js";

// Pre-built pipelines so we measure their execution cost, not their
// construction cost (construction is a one-time setup).

const empty_pipeline = reclassify([]);

const rewrite_only_pipeline = reclassify([
	rewrite_types(function_variable_rules, { trivia: ["comment"] }),
]);

const full_js_pipeline = reclassify([
	rewrite_types(function_variable_rules, { trivia: ["comment"] }),
	embed_interleaved({ scan: scan_tagged_template }),
]);

// Pre-tokenized inputs so we can isolate the pipeline cost from the
// tokenize cost when we want to. Note: pipelines MUTATE the input Uint32Array
// internally via the clone step, but the CLONE IS PART OF THE OVERHEAD we
// want to measure, so we call them with the original tokens each time.
// To avoid re-tokenizing, we cache the raw token result.

const raw_small = tokenize(small_js, js_grammar);
const raw_medium = tokenize(medium_js, js_grammar);
const raw_large = tokenize(large_js, js_grammar);
const raw_complex = tokenize(complex_js, js_grammar);
const raw_plain = tokenize(plain_js, js_grammar);
const raw_tagged = tokenize(tagged_templates_js, js_grammar);
const raw_embedded = tokenize(embedded_html, html_grammar);

const BENCH_OPTS = { warmupTime: 500, time: 1500 };

// ---------------------------------------------------------------------------
// Stage decomposition — medium_js (realistic React-ish component, ~2 KB)
// ---------------------------------------------------------------------------

describe("JS pipeline stages — medium_js", () => {
	bench(
		"0. raw tokenize",
		() => {
			tokenize(medium_js, js_grammar);
		},
		BENCH_OPTS,
	);

	bench(
		"1. + empty pipeline",
		() => {
			const raw = tokenize(medium_js, js_grammar);
			empty_pipeline(medium_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"2. + rewrite_types (function-variable)",
		() => {
			const raw = tokenize(medium_js, js_grammar);
			rewrite_only_pipeline(medium_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3. + embed_interleaved (full pipeline)",
		() => {
			const raw = tokenize(medium_js, js_grammar);
			full_js_pipeline(medium_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3b. language() — convenience entry point",
		() => {
			js_language(medium_js);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// Stage decomposition — large_js (~200 lines, real-world representative)
// ---------------------------------------------------------------------------

describe("JS pipeline stages — large_js", () => {
	bench(
		"0. raw tokenize",
		() => {
			tokenize(large_js, js_grammar);
		},
		BENCH_OPTS,
	);

	bench(
		"1. + empty pipeline",
		() => {
			const raw = tokenize(large_js, js_grammar);
			empty_pipeline(large_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"2. + rewrite_types (function-variable)",
		() => {
			const raw = tokenize(large_js, js_grammar);
			rewrite_only_pipeline(large_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3. + embed_interleaved (full pipeline)",
		() => {
			const raw = tokenize(large_js, js_grammar);
			full_js_pipeline(large_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3b. language() — convenience entry point",
		() => {
			js_language(large_js);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// Stage decomposition — complex_js (~350 lines, edge-case heavy)
// ---------------------------------------------------------------------------

describe("JS pipeline stages — complex_js", () => {
	bench(
		"0. raw tokenize",
		() => {
			tokenize(complex_js, js_grammar);
		},
		BENCH_OPTS,
	);

	bench(
		"1. + empty pipeline",
		() => {
			const raw = tokenize(complex_js, js_grammar);
			empty_pipeline(complex_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"2. + rewrite_types (function-variable)",
		() => {
			const raw = tokenize(complex_js, js_grammar);
			rewrite_only_pipeline(complex_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3. + embed_interleaved (full pipeline)",
		() => {
			const raw = tokenize(complex_js, js_grammar);
			full_js_pipeline(complex_js, raw);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// Scan-and-find-nothing — plain_js (no templates at all)
// ---------------------------------------------------------------------------
//
// Isolates "embed_interleaved scans the token stream but never finds a
// group" as a specific cost. If this is expensive, it's a hot-path concern
// because most real code doesn't have tagged templates everywhere.

describe("JS pipeline — plain_js (no templates)", () => {
	bench(
		"0. raw tokenize",
		() => {
			tokenize(plain_js, js_grammar);
		},
		BENCH_OPTS,
	);

	bench(
		"1. + empty pipeline",
		() => {
			const raw = tokenize(plain_js, js_grammar);
			empty_pipeline(plain_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"2. + rewrite_types",
		() => {
			const raw = tokenize(plain_js, js_grammar);
			rewrite_only_pipeline(plain_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3. + embed_interleaved scan (no matches)",
		() => {
			const raw = tokenize(plain_js, js_grammar);
			full_js_pipeline(plain_js, raw);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// Tagged-templates heavy — exercises embed_interleaved's actual work
// ---------------------------------------------------------------------------
//
// This is the stage that matters for answering "does virtual-source
// sub-tokenization cost an acceptable amount?" The sample has many
// `html`...`` and `css`...`` calls including attribute-position
// interpolations, so every pipeline pass will:
//   - walk the token stream
//   - scan_tagged_template fires many times
//   - for each match: build virtual source, call html_language/css_language
//     (which runs THEIR pipelines), splice results

describe("JS pipeline — tagged_templates_js (heavy embedding)", () => {
	bench(
		"0. raw tokenize",
		() => {
			tokenize(tagged_templates_js, js_grammar);
		},
		BENCH_OPTS,
	);

	bench(
		"2. + rewrite_types",
		() => {
			const raw = tokenize(tagged_templates_js, js_grammar);
			rewrite_only_pipeline(tagged_templates_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3. + embed_interleaved (full pipeline with embedding)",
		() => {
			const raw = tokenize(tagged_templates_js, js_grammar);
			full_js_pipeline(tagged_templates_js, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3b. js_language() — convenience",
		() => {
			js_language(tagged_templates_js);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// HTML pipeline — embed_grammars for <script> and <style>
// ---------------------------------------------------------------------------
//
// The HTML `language(src)` call runs embed_grammars, which sub-tokenizes
// each <script> and <style> body via the JS and CSS languages. Each of
// those invocations ALSO runs their own reclassifier pipelines, so this
// is the end-to-end multi-language composition.

describe("HTML pipeline — embedded_html (script + style)", () => {
	bench(
		"0. raw tokenize (HTML grammar only)",
		() => {
			tokenize(embedded_html, html_grammar);
		},
		BENCH_OPTS,
	);

	bench(
		"1. html_language() — full pipeline incl. sub-languages",
		() => {
			html_language(embedded_html);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// Pipeline-only (pre-tokenized inputs)
// ---------------------------------------------------------------------------
//
// Removes the tokenize step from the measurement so we can see the
// reclassifier cost in isolation. Useful for when the numbers above include
// too much base tokenize noise to compare stages.

describe("Pipeline cost alone (pre-tokenized)", () => {
	bench(
		"medium_js — empty pipeline",
		() => {
			empty_pipeline(medium_js, raw_medium);
		},
		BENCH_OPTS,
	);

	bench(
		"medium_js — rewrite_types only",
		() => {
			rewrite_only_pipeline(medium_js, raw_medium);
		},
		BENCH_OPTS,
	);

	bench(
		"medium_js — full JS pipeline",
		() => {
			full_js_pipeline(medium_js, raw_medium);
		},
		BENCH_OPTS,
	);

	bench(
		"large_js — full JS pipeline",
		() => {
			full_js_pipeline(large_js, raw_large);
		},
		BENCH_OPTS,
	);

	bench(
		"complex_js — full JS pipeline",
		() => {
			full_js_pipeline(complex_js, raw_complex);
		},
		BENCH_OPTS,
	);

	bench(
		"plain_js — full JS pipeline (scan, no match)",
		() => {
			full_js_pipeline(plain_js, raw_plain);
		},
		BENCH_OPTS,
	);

	bench(
		"tagged_templates_js — full JS pipeline (heavy embed)",
		() => {
			full_js_pipeline(tagged_templates_js, raw_tagged);
		},
		BENCH_OPTS,
	);
});
