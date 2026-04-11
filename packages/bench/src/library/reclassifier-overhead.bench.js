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
//   2. reclassify([rewriteTypes(functionVariableRules, {...})])(src, ...)
//        — adds the function-variable rule. Measures rewriteTypes with
//        a realistic rule set on code that (often) matches.
//
//   3. language(src)
//        — full JS pipeline: rewriteTypes + embedInterleaved. On code with
//        NO tagged templates this measures the "scan and find nothing"
//        cost of embedInterleaved.
//
//   4. language(taggedTemplatesJS)
//        — full JS pipeline on code WITH many tagged templates. Measures
//        embedInterleaved's actual work: virtual source construction,
//        sub-tokenization via HTML/CSS, position remapping, splicing.
//
//   5. htmlLanguage(embeddedHTML)
//        — full HTML pipeline: embedGrammars for <script>/<style> which
//        recursively invokes JS's full pipeline inside the <script> body.
//        Measures end-to-end multi-language composition.
//
// Delta between consecutive stages = cost of that stage.
//
// Target (from the plan): reclassifier overhead < 20% of tokenize time for
// in-language workloads. Stages 1→3 should sum to less than ~20% of stage 0.

import { bench, describe } from "vitest";
import {
	embedInterleaved,
	reclassify,
	rewriteTypes,
	tokenize,
} from "@twinkleplop/core";
import {
	grammar as jsGrammar,
	functionVariableRules,
	language as jsLanguage,
	scanTaggedTemplate,
} from "@twinkleplop/javascript";
import { grammar as htmlGrammar, language as htmlLanguage } from "@twinkleplop/html";
import {
	smallJS,
	mediumJS,
	largeJS,
	complexJS,
} from "./javascript-samples.js";
import {
	taggedTemplatesJS,
	embeddedHTML,
	plainJS,
} from "./reclassifier-samples.js";

// Pre-built pipelines so we measure their execution cost, not their
// construction cost (construction is a one-time setup).

const emptyPipeline = reclassify([]);

const rewriteOnlyPipeline = reclassify([
	rewriteTypes(functionVariableRules, { trivia: ["comment"] }),
]);

const fullJsPipeline = reclassify([
	rewriteTypes(functionVariableRules, { trivia: ["comment"] }),
	embedInterleaved({ scan: scanTaggedTemplate }),
]);

// Pre-tokenized inputs so we can isolate the pipeline cost from the
// tokenize cost when we want to. Note: pipelines MUTATE the input Uint32Array
// internally via the clone step, but the CLONE IS PART OF THE OVERHEAD we
// want to measure, so we call them with the original tokens each time.
// To avoid re-tokenizing, we cache the raw token result.

const rawSmall = tokenize(smallJS, jsGrammar);
const rawMedium = tokenize(mediumJS, jsGrammar);
const rawLarge = tokenize(largeJS, jsGrammar);
const rawComplex = tokenize(complexJS, jsGrammar);
const rawPlain = tokenize(plainJS, jsGrammar);
const rawTagged = tokenize(taggedTemplatesJS, jsGrammar);
const rawEmbedded = tokenize(embeddedHTML, htmlGrammar);

const BENCH_OPTS = { warmupTime: 500, time: 1500 };

// ---------------------------------------------------------------------------
// Stage decomposition — mediumJS (realistic React-ish component, ~2 KB)
// ---------------------------------------------------------------------------

describe("JS pipeline stages — mediumJS", () => {
	bench(
		"0. raw tokenize",
		() => {
			tokenize(mediumJS, jsGrammar);
		},
		BENCH_OPTS,
	);

	bench(
		"1. + empty pipeline",
		() => {
			const raw = tokenize(mediumJS, jsGrammar);
			emptyPipeline(mediumJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"2. + rewriteTypes (function-variable)",
		() => {
			const raw = tokenize(mediumJS, jsGrammar);
			rewriteOnlyPipeline(mediumJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3. + embedInterleaved (full pipeline)",
		() => {
			const raw = tokenize(mediumJS, jsGrammar);
			fullJsPipeline(mediumJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3b. language() — convenience entry point",
		() => {
			jsLanguage(mediumJS);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// Stage decomposition — largeJS (~200 lines, real-world representative)
// ---------------------------------------------------------------------------

describe("JS pipeline stages — largeJS", () => {
	bench(
		"0. raw tokenize",
		() => {
			tokenize(largeJS, jsGrammar);
		},
		BENCH_OPTS,
	);

	bench(
		"1. + empty pipeline",
		() => {
			const raw = tokenize(largeJS, jsGrammar);
			emptyPipeline(largeJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"2. + rewriteTypes (function-variable)",
		() => {
			const raw = tokenize(largeJS, jsGrammar);
			rewriteOnlyPipeline(largeJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3. + embedInterleaved (full pipeline)",
		() => {
			const raw = tokenize(largeJS, jsGrammar);
			fullJsPipeline(largeJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3b. language() — convenience entry point",
		() => {
			jsLanguage(largeJS);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// Stage decomposition — complexJS (~350 lines, edge-case heavy)
// ---------------------------------------------------------------------------

describe("JS pipeline stages — complexJS", () => {
	bench(
		"0. raw tokenize",
		() => {
			tokenize(complexJS, jsGrammar);
		},
		BENCH_OPTS,
	);

	bench(
		"1. + empty pipeline",
		() => {
			const raw = tokenize(complexJS, jsGrammar);
			emptyPipeline(complexJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"2. + rewriteTypes (function-variable)",
		() => {
			const raw = tokenize(complexJS, jsGrammar);
			rewriteOnlyPipeline(complexJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3. + embedInterleaved (full pipeline)",
		() => {
			const raw = tokenize(complexJS, jsGrammar);
			fullJsPipeline(complexJS, raw);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// Scan-and-find-nothing — plainJS (no templates at all)
// ---------------------------------------------------------------------------
//
// Isolates "embedInterleaved scans the token stream but never finds a
// group" as a specific cost. If this is expensive, it's a hot-path concern
// because most real code doesn't have tagged templates everywhere.

describe("JS pipeline — plainJS (no templates)", () => {
	bench(
		"0. raw tokenize",
		() => {
			tokenize(plainJS, jsGrammar);
		},
		BENCH_OPTS,
	);

	bench(
		"1. + empty pipeline",
		() => {
			const raw = tokenize(plainJS, jsGrammar);
			emptyPipeline(plainJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"2. + rewriteTypes",
		() => {
			const raw = tokenize(plainJS, jsGrammar);
			rewriteOnlyPipeline(plainJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3. + embedInterleaved scan (no matches)",
		() => {
			const raw = tokenize(plainJS, jsGrammar);
			fullJsPipeline(plainJS, raw);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// Tagged-templates heavy — exercises embedInterleaved's actual work
// ---------------------------------------------------------------------------
//
// This is the stage that matters for answering "does virtual-source
// sub-tokenization cost an acceptable amount?" The sample has many
// `html`...`` and `css`...`` calls including attribute-position
// interpolations, so every pipeline pass will:
//   - walk the token stream
//   - scanTaggedTemplate fires many times
//   - for each match: build virtual source, call htmlLanguage/cssLanguage
//     (which runs THEIR pipelines), splice results

describe("JS pipeline — taggedTemplatesJS (heavy embedding)", () => {
	bench(
		"0. raw tokenize",
		() => {
			tokenize(taggedTemplatesJS, jsGrammar);
		},
		BENCH_OPTS,
	);

	bench(
		"2. + rewriteTypes",
		() => {
			const raw = tokenize(taggedTemplatesJS, jsGrammar);
			rewriteOnlyPipeline(taggedTemplatesJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3. + embedInterleaved (full pipeline with embedding)",
		() => {
			const raw = tokenize(taggedTemplatesJS, jsGrammar);
			fullJsPipeline(taggedTemplatesJS, raw);
		},
		BENCH_OPTS,
	);

	bench(
		"3b. jsLanguage() — convenience",
		() => {
			jsLanguage(taggedTemplatesJS);
		},
		BENCH_OPTS,
	);
});

// ---------------------------------------------------------------------------
// HTML pipeline — embedGrammars for <script> and <style>
// ---------------------------------------------------------------------------
//
// The HTML `language(src)` call runs embedGrammars, which sub-tokenizes
// each <script> and <style> body via the JS and CSS languages. Each of
// those invocations ALSO runs their own reclassifier pipelines, so this
// is the end-to-end multi-language composition.

describe("HTML pipeline — embeddedHTML (script + style)", () => {
	bench(
		"0. raw tokenize (HTML grammar only)",
		() => {
			tokenize(embeddedHTML, htmlGrammar);
		},
		BENCH_OPTS,
	);

	bench(
		"1. htmlLanguage() — full pipeline incl. sub-languages",
		() => {
			htmlLanguage(embeddedHTML);
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
		"mediumJS — empty pipeline",
		() => {
			emptyPipeline(mediumJS, rawMedium);
		},
		BENCH_OPTS,
	);

	bench(
		"mediumJS — rewriteTypes only",
		() => {
			rewriteOnlyPipeline(mediumJS, rawMedium);
		},
		BENCH_OPTS,
	);

	bench(
		"mediumJS — full JS pipeline",
		() => {
			fullJsPipeline(mediumJS, rawMedium);
		},
		BENCH_OPTS,
	);

	bench(
		"largeJS — full JS pipeline",
		() => {
			fullJsPipeline(largeJS, rawLarge);
		},
		BENCH_OPTS,
	);

	bench(
		"complexJS — full JS pipeline",
		() => {
			fullJsPipeline(complexJS, rawComplex);
		},
		BENCH_OPTS,
	);

	bench(
		"plainJS — full JS pipeline (scan, no match)",
		() => {
			fullJsPipeline(plainJS, rawPlain);
		},
		BENCH_OPTS,
	);

	bench(
		"taggedTemplatesJS — full JS pipeline (heavy embed)",
		() => {
			fullJsPipeline(taggedTemplatesJS, rawTagged);
		},
		BENCH_OPTS,
	);
});
