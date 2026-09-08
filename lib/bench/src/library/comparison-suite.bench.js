import { bench, describe, beforeAll } from "vitest";
import { tokenize, to_html, reclassify, rewrite_types } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import { grammar as css, raw_grammar as raw_css_grammar } from "@twinkleplop/css";
import {
  tokenize as make_javascript,
  grammar as js_grammar,
  function_variable_rules as js_function_variable_rules,
  claim_property_scope as js_claim_property_scope,
} from "@twinkleplop/javascript";
import {
  tokenize as make_typescript,
  grammar as ts_grammar,
  function_variable_rules as ts_function_variable_rules,
  claim_property_scope as ts_claim_property_scope,
} from "@twinkleplop/typescript";
// import {
// 	tokenize as typescript_experiment,
// 	grammar as ts_exp_grammar,
// } from "@twinkleplop/typescript_experiment";
import { tokenize as make_html } from "@twinkleplop/html";
import { tokenize as make_markdown, grammar as md_grammar } from "@twinkleplop/markdown";

// bind default-fidelity tokenizers once for the benchmarks.
const javascript = make_javascript();
const typescript = make_typescript();
const html = make_html();
const markdown = make_markdown();
import { createHighlighter } from "shiki";
import { createHighlighter as create_tanstack } from "@tanstack/highlight/core";
import { js as tanstack_js } from "@tanstack/highlight/languages/js";
import { markdown as tanstack_markdown } from "@tanstack/highlight/languages/markdown";
import { ts as tanstack_ts } from "@tanstack/highlight/languages/ts";
import Prism from "prismjs";
import load_languages from "prismjs/components/index.js";
import hljs from "highlight.js";
import { createStarryNight, common } from "@wooorm/starry-night";
import { highlight as sugar_high_highlight, tokenize as sugar_high_tokenize } from "sugar-high";
import { small_css, medium_css, large_css } from "./css-samples.js";
import { tiny_js, small_js, medium_js, large_js, complex_js } from "./javascript-samples.js";
import { tiny_ts, small_ts, medium_ts, large_ts, complex_ts } from "./typescript-samples.js";
import {
  tiny_html,
  small_html,
  medium_html,
  large_html,
  large_embedded_html,
} from "./html-samples.js";
import { tiny_md, small_md, medium_md, large_md } from "./markdown-samples.js";

// ============================================================================
// Library Comparison Suite
// Benchmarks Twinkleplop against other popular syntax highlighters
// ============================================================================

// Prism: `markup` is the registered name; `html` is an alias that resolves
// to the markup language. Loading `markup` covers both.
load_languages(["css", "javascript", "typescript", "markup", "markdown"]);

// TanStack Highlight. Synchronous, so the highlighter is built at module load
// rather than in beforeAll like shiki and starry-night. Languages are
// explicitly registered; there is no auto-loading registry.
//
// TWO THINGS TO KNOW BEFORE READING ITS NUMBERS.
//
// 1. It falls back to escaped plaintext for an unregistered language instead
//    of throwing, so a typo in `lang` produces a bench that measures string
//    escaping and looks spectacular. Verified at the time of adding: every
//    sample below emits real classified tokens (js 318, ts 2452, markdown 81
//    classified spans). If you add a sample or a language, check that again.
//
// 2. Its token stream is coarser than everything else here, so per-call time
//    is not directly comparable. On the same complex_js sample:
//
//      tanstack 615 tokens   twinkleplop 1031   prism 1552
//      (ts: 4804 / 6220 / 9104,  markdown: 135 / 198 / 242)
//
//    Fewer, larger tokens is a legitimate design choice for a docs
//    highlighter, but it means it is doing less work per byte, not only
//    doing the same work faster.
//
// `highlight()` returns tokens AND html in one object; the narrower
// `tokenize()` / `highlightToHtml()` entry points are used here so each
// bench measures the same stage as its neighbours.
const tanstack = create_tanstack({
  languages: [tanstack_js, tanstack_ts, tanstack_markdown],
});

let shiki_highlighter;
let starry_night;

beforeAll(async () => {
  console.log("Initializing external highlighters...");

  if (!shiki_highlighter) {
    shiki_highlighter = await createHighlighter({
      themes: ["github-light"],
      langs: ["css", "javascript", "typescript", "html", "markdown"],
    });
  }

  if (!starry_night) {
    starry_night = await createStarryNight(common);
  }
});

// Test samples of various sizes
const tiny_css = `.btn { color: blue; }`;

describe.skip("Tiny CSS (~1 line)", (t) => {
  bench(
    "Twinkleplop - tokenize only",
    (t) => {
      const tokens = tokenize(tiny_css, css);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Twinkleplop",
    () => {
      const tokens = tokenize(tiny_css, css);
      const html = to_html(tiny_css, tokens);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Shiki",
    () => {
      const html = shiki_highlighter.codeToHtml(tiny_css, {
        lang: "css",
        theme: "github-light",
      });
    },
    { warmupTime: 1000 },
  );

  bench(
    "Prism",
    () => {
      const html = Prism.highlight(tiny_css, Prism.languages.css, "css");
    },
    { warmupTime: 1000 },
  );

  bench(
    "highlight.js",
    () => {
      const result = hljs.highlight(tiny_css, { language: "css" });
    },
    { warmupTime: 1000 },
  );

  bench(
    "Starry Night",
    () => {
      const scope = starry_night.flagToScope("css");
      if (scope) {
        const tree = starry_night.highlight(tiny_css, scope);
      }
    },
    { warmupTime: 1000 },
  );
});

describe.skip("Small CSS (~10 lines)", () => {
  bench(
    "Twinkleplop - tokenize only",
    () => {
      const tokens = tokenize(small_css, css);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Twinkleplop",
    () => {
      const tokens = tokenize(small_css, css);
      const html = to_html(small_css, tokens);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Shiki",
    () => {
      const html = shiki_highlighter.codeToHtml(small_css, {
        lang: "css",
        theme: "github-light",
      });
    },
    { warmupTime: 1000 },
  );

  bench(
    "Prism",
    () => {
      const html = Prism.highlight(small_css, Prism.languages.css, "css");
    },
    { warmupTime: 1000 },
  );

  bench(
    "highlight.js",
    () => {
      const result = hljs.highlight(small_css, { language: "css" });
    },
    { warmupTime: 1000 },
  );

  bench(
    "Starry Night",
    () => {
      const scope = starry_night.flagToScope("css");
      if (scope) {
        const tree = starry_night.highlight(small_css, scope);
      }
    },
    { warmupTime: 1000 },
  );
});

describe.skip("Medium CSS (~50 lines)", () => {
  bench(
    "Twinkleplop - tokenize only",
    () => {
      const tokens = tokenize(medium_css, css);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Twinkleplop",
    () => {
      const tokens = tokenize(medium_css, css);
      const html = to_html(medium_css, tokens);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Shiki",
    () => {
      const html = shiki_highlighter.codeToHtml(medium_css, {
        lang: "css",
        theme: "github-light",
      });
    },
    { warmupTime: 1000 },
  );

  bench(
    "Prism",
    () => {
      const html = Prism.highlight(medium_css, Prism.languages.css, "css");
    },
    { warmupTime: 1000 },
  );

  bench(
    "highlight.js",
    () => {
      const result = hljs.highlight(medium_css, { language: "css" });
    },
    { warmupTime: 1000 },
  );

  bench(
    "Starry Night",
    () => {
      const scope = starry_night.flagToScope("css");
      if (scope) {
        const tree = starry_night.highlight(medium_css, scope);
      }
    },
    { warmupTime: 1000 },
  );
});

describe.skip("Large CSS (~150 lines)", () => {
  bench(
    "Twinkleplop - tokenize only",
    () => {
      const tokens = tokenize(large_css, css);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Twinkleplop",
    () => {
      const tokens = tokenize(large_css, css);
      const html = to_html(large_css, tokens);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Shiki",
    () => {
      const html = shiki_highlighter.codeToHtml(large_css, {
        lang: "css",
        theme: "github-light",
      });
    },
    { warmupTime: 1000 },
  );

  bench(
    "Prism",
    () => {
      const html = Prism.highlight(large_css, Prism.languages.css, "css");
    },
    { warmupTime: 1000 },
  );

  bench(
    "highlight.js",
    () => {
      const result = hljs.highlight(large_css, { language: "css" });
    },
    { warmupTime: 1000 },
  );

  bench(
    "Starry Night",
    () => {
      const scope = starry_night.flagToScope("css");
      if (scope) {
        const tree = starry_night.highlight(large_css, scope);
      }
    },
    { warmupTime: 1000 },
  );
});

// Performance characteristics analysis
describe.skip("Tokenization Only (no HTML)", () => {
  bench(
    "Twinkleplop - tokenize only",
    () => {
      const tokens = tokenize(medium_css, css);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Twinkleplop - full pipeline",
    () => {
      const tokens = tokenize(medium_css, css);
      const html = to_html(medium_css, tokens);
    },
    { warmupTime: 1000 },
  );
});

describe.skip("HTML Generation Performance", () => {
  const tokens = tokenize(medium_css, css);

  bench(
    "to_html with pre-tokenized",
    () => {
      const html = to_html(medium_css, tokens);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Full pipeline",
    () => {
      const tokens = tokenize(medium_css, css);
      const html = to_html(medium_css, tokens);
    },
    { warmupTime: 1000 },
  );
});

//============================================================================
//JavaScript Benchmarks
//============================================================================
const WARMUP = 1000;

// JS/TS pipelines without `embed_interleaved` so the comparison against
// Prism/Shiki is like-for-like: neither of those tokenizers dives into
// `` html`...` `` / `` css`...` `` tagged templates as sub-languages, and
// the default `language()` entry does. The lean pipeline keeps the
// function-variable reclassifier and the scope-aware property claim pass
// (both are JS/TS structural logic, not cross-language work) but drops the
// tagged-template embedder.
const js_no_embed = reclassify([
  rewrite_types(js_function_variable_rules, { trivia: ["comment"] }),
  js_claim_property_scope,
]);
const ts_no_embed = reclassify([
  rewrite_types(ts_function_variable_rules, { trivia: ["comment"] }),
  ts_claim_property_scope,
]);

const js_samples = [
  // {
  //   name: "Tiny",
  //   code: tiny_js,
  //   size: '~1 line',
  // },
  // {
  //   name: "Medium",
  //   code: medium_js,
  //   size: '~10 lines',
  // },
  // {
  //   name: "Large",
  //   code: large_js,
  //   size: '~100 lines',
  // },
  {
    name: "Complex",
    code: complex_js,
    size: "~1000 lines",
  },
];

js_samples.forEach(({ name, code, size }) => {
  describe(`JavaScript (tokenise) - ${name} (${size})`, () => {
    bench(
      "Twinkleplop - no embed (1-for-1 vs Prism/Shiki)",
      () => {
        const raw = tokenize(code, js_grammar);
        js_no_embed(code, raw);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Twinkleplop - full pipeline",
      () => {
        const result = javascript(code);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Prism",
      () => {
        const tokens = Prism.tokenize(code, Prism.languages.javascript, "javascript");
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Shiki",
      () => {
        const html = shiki_highlighter.codeToTokens(code, {
          lang: "javascript",
          theme: "github-light",
        });
      },
      { warmupTime: WARMUP },
    );

    bench(
      "sugar-high",
      () => {
        const tokens = sugar_high_tokenize(code);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "TanStack Highlight",
      () => {
        const tokens = tanstack.tokenize(code, { lang: "js" });
      },
      { warmupTime: WARMUP },
    );
  });
});

js_samples.forEach(({ name, code, size }) => {
  describe(`JavaScript  - ${name} (${size})`, () => {
    bench(
      "Twinkleplop - no embed (1-for-1 vs Prism/Shiki)",
      () => {
        const raw = tokenize(code, js_grammar);
        const result = js_no_embed(code, raw);
        const html = to_html(code, result);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Twinkleplop - full pipeline",
      () => {
        const result = javascript(code);
        const html = to_html(code, result);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Prism",
      () => {
        const tokens = Prism.highlight(code, Prism.languages.javascript, "javascript");
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Shiki",
      () => {
        const html = shiki_highlighter.codeToHtml(code, {
          lang: "javascript",
          theme: "github-light",
        });
      },
      { warmupTime: WARMUP },
    );

    bench(
      "sugar-high",
      () => {
        const html = sugar_high_highlight(code);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "TanStack Highlight",
      () => {
        const html = tanstack.highlightToHtml(code, { lang: "js" });
      },
      { warmupTime: WARMUP },
    );
  });
});

//============================================================================
//TypeScript Benchmarks
//============================================================================
//
// Same shape as the JS benches but exercises the TS pipeline, which adds:
//   - the TS grammar's larger keyword set + builtin-type recognition
//   - the reclassifier pipeline including the stateful
//     `interface_member_promoter` (walks tokens once with brace/paren/
//     bracket depth tracking)
//   - the existing function-variable detector + tagged-template embedder
// The samples are sized to the JS samples for direct comparison; they
// intentionally include interfaces, class fields with defaults, typed
// parameters, and generics to exercise the reclassifier surface.

const ts_samples = [
  // { name: "Tiny", code: tiny_ts, size: "~1 line" },
  // { name: "Medium", code: medium_ts, size: "~75 lines" },
  // { name: "Large", code: large_ts, size: "~130 lines" },
  { name: "Complex", code: complex_ts, size: "~1000 lines" },
];

ts_samples.forEach(({ name, code, size }) => {
  describe(`TypeScript (tokenise) - ${name} (${size})`, () => {
    bench(
      "Twinkleplop - no embed (1-for-1 vs Prism/Shiki)",
      () => {
        const raw = tokenize(code, ts_grammar);
        ts_no_embed(code, raw);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Twinkleplop - full pipeline",
      () => {
        const result = typescript(code);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Prism",
      () => {
        const tokens = Prism.tokenize(code, Prism.languages.typescript, "typescript");
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Shiki",
      () => {
        const out = shiki_highlighter.codeToTokens(code, {
          lang: "typescript",
          theme: "github-light",
        });
      },
      { warmupTime: WARMUP },
    );

    bench(
      "sugar-high",
      () => {
        const tokens = sugar_high_tokenize(code);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "TanStack Highlight",
      () => {
        const tokens = tanstack.tokenize(code, { lang: "ts" });
      },
      { warmupTime: WARMUP },
    );
  });
});

ts_samples.forEach(({ name, code, size }) => {
  describe(`TypeScript - ${name} (${size})`, () => {
    bench(
      "Twinkleplop - no embed (1-for-1 vs Prism/Shiki)",
      () => {
        const raw = tokenize(code, ts_grammar);
        const result = ts_no_embed(code, raw);
        const html = to_html(code, result);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Twinkleplop - full pipeline",
      () => {
        const result = typescript(code);
        const html = to_html(code, result);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Prism",
      () => {
        const html = Prism.highlight(code, Prism.languages.typescript, "typescript");
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Shiki",
      () => {
        const html = shiki_highlighter.codeToHtml(code, {
          lang: "typescript",
          theme: "github-light",
        });
      },
      { warmupTime: WARMUP },
    );

    bench(
      "sugar-high",
      () => {
        const html = sugar_high_highlight(code);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "TanStack Highlight",
      () => {
        const html = tanstack.highlightToHtml(code, { lang: "ts" });
      },
      { warmupTime: WARMUP },
    );
  });
});

//============================================================================
//HTML Benchmarks
//============================================================================
//
// Twinkleplop's `html.language()` is the full pipeline including the
// reclassifier's embed_grammars for <script> and <style> content. The
// comparison samples here are pure HTML with NO embedded code, so every
// highlighter is measured on apples-to-apples "structural HTML only" work.
// (The embedded-content case is covered separately in the reclassifier
// overhead suite.)
//
// Highlight.js uses the `xml` language for HTML (no separate `html`
// registration). Prism uses `markup`, aliased to `html`. Shiki and
// Starry Night both expose `html` directly.

const html_samples = [
  { name: "tiny", code: tiny_html, size: "1 line" },
  { name: "small", code: small_html, size: "10 lines" },
  { name: "medium", code: medium_html, size: "100 lines" },
  { name: "large", code: large_html, size: "1000 lines" },
  { name: "large_embedded", code: large_embedded_html, size: "1000 lines" },
];

for (const sample of html_samples) {
  describe.skip(`HTML (tokenise) - ${sample.name} (${sample.size})`, () => {
    bench(
      "Twinkleplop",
      () => {
        const tokens = html(sample.code);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Shiki",
      () => {
        const output = shiki_highlighter.codeToTokens(sample.code, {
          lang: "html",
          theme: "github-light",
        });
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Prism",
      () => {
        const output = Prism.tokenize(sample.code, Prism.languages.markup, "markup");
      },
      { warmupTime: WARMUP },
    );
  });
}

for (const sample of html_samples) {
  describe.skip(`HTML - ${sample.name} (${sample.size})`, () => {
    bench(
      "Twinkleplop",
      () => {
        const tokens = html(sample.code);
        const output = to_html(sample.code, tokens);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Shiki",
      () => {
        const output = shiki_highlighter.codeToHtml(sample.code, {
          lang: "html",
          theme: "github-light",
        });
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Prism",
      () => {
        const output = Prism.highlight(sample.code, Prism.languages.markup, "markup");
      },
      { warmupTime: WARMUP },
    );

    bench(
      "highlight.js",
      () => {
        const result = hljs.highlight(sample.code, { language: "xml" });
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Starry Night",
      () => {
        const scope = starry_night.flagToScope("html");
        if (scope) {
          const tree = starry_night.highlight(sample.code, scope);
        }
      },
      { warmupTime: WARMUP },
    );
  });
}

//============================================================================
// HTML with embedded CSS + JS — cross-language comparison
//============================================================================
//
// Realistic full-page sample (~300 lines) containing substantial inline
// <style> and <script> blocks. This is the apples-to-apples "highlight a
// real webpage" benchmark. The libraries handle embedded sub-languages to
// varying degrees:
//
//   - Twinkleplop:  full CSS + full JS pipelines via the embed_grammars
//                   reclassifier, including function-variable detection
//                   inside the <script> body.
//   - Prism:        the `markup` language uses sub-language hooks to
//                   tokenize script/style contents as JS/CSS.
//   - Shiki:        TextMate HTML grammar embeds source.js / source.css
//                   via injection rules.
//   - Starry Night: TextMate grammar injection produces multi-language
//                   highlighting for script/style bodies.
//   - highlight.js: the xml language does NOT sub-tokenize script/style
//                   content by default — it just marks the tag structure.
//                   Its output is therefore less accurate on this sample,
//                   but its raw numbers are also consistently slower than
//                   Prism so "doing less work" is not translating into a
//                   speed advantage.

// describe("HTML - Large with embedded CSS/JS (~300 lines)", () => {
// 	bench(
// 		"Twinkleplop - tokenize only",
// 		() => {
// 			const tokens = html(large_embedded_html);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Twinkleplop",
// 		() => {
// 			const tokens = html(large_embedded_html);
// 			const output = to_html(large_embedded_html, tokens);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Shiki",
// 		() => {
// 			const output = shiki_highlighter.codeToHtml(large_embedded_html, {
// 				lang: "html",
// 				theme: "github-light",
// 			});
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Prism",
// 		() => {
// 			const output = Prism.highlight(
// 				large_embedded_html,
// 				Prism.languages.markup,
// 				"markup",
// 			);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"highlight.js",
// 		() => {
// 			const result = hljs.highlight(large_embedded_html, { language: "xml" });
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Starry Night",
// 		() => {
// 			const scope = starry_night.flagToScope("html");
// 			if (scope) {
// 				const tree = starry_night.highlight(large_embedded_html, scope);
// 			}
// 		},
// 		{ warmupTime: 1000 }
// 	);
// });

// // JavaScript-specific performance analysis
// describe("JavaScript Regex vs Division Performance", () => {
// 	// Test code with many regex patterns
// 	const regex_heavy_code = `
// 		const patterns = [
// 			/^[a-z]+$/gi,
// 			/\\d{3}-\\d{3}-\\d{4}/,
// 			/https?:\\/\\/(www\\.)?[^\\s]+/gi,
// 			/^[\\w._%+-]+@[\\w.-]+\\.[A-Za-z]{2,}$/
// 		];
// 		const result = text.match(/\\b\\w+\\b/g);
// 	`;

// 	// Test code with many division operations
// 	const division_heavy_code = `
// 		const avg = sum / count;
// 		const ratio = width / height;
// 		const percentage = (part / whole) * 100;
// 		const normalized = (value - min) / (max - min);
// 		const rate = distance / time;
// 	`;

// 	// Mixed regex and division
// 	const mixed_code = `
// 		if (/^\\d+$/.test(input)) {
// 			const value = parseInt(input) / 100;
// 			return value;
// 		}
// 		const pattern = /[a-z]+/gi;
// 		const result = total / count;
// 	`;

// 	bench(
// 		"Twinkleplop - Regex Heavy",
// 		() => {
// 			const tokens = tokenize(regex_heavy_code, javascript);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Twinkleplop - Division Heavy",
// 		() => {
// 			const tokens = tokenize(division_heavy_code, javascript);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Twinkleplop - Mixed Regex/Division",
// 		() => {
// 			const tokens = tokenize(mixed_code, javascript);
// 		},
// 		{ warmupTime: 1000 }
// 	);
// });

describe.skip("JavaScript Modern Features Performance", () => {
  // Test modern JavaScript features
  const modern_features = `
		// Optional chaining and nullish coalescing
		const value = obj?.prop?.nested ?? defaultValue;

		// Private fields and methods
		class Example {
			#privateField = 42;
			#privateMethod() { return this.#privateField; }
		}

		// BigInt operations
		const big = 123n ** 456n;

		// Dynamic imports
		const module = await import('./module.js');

		// Template literals with expressions
		const msg = \`Result: \${calculate(x, y)}\`;
	`;

  bench(
    "Twinkleplop - Modern Features",
    () => {
      const tokens = tokenize(modern_features, javascript);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Prism - Modern Features",
    () => {
      const html = Prism.highlight(modern_features, Prism.languages.javascript, "javascript");
    },
    { warmupTime: 1000 },
  );

  bench(
    "highlight.js - Modern Features",
    () => {
      const result = hljs.highlight(modern_features, { language: "javascript" });
    },
    { warmupTime: 1000 },
  );
});

describe.skip("compilation", () => {
  bench(
    "Twinkleplop - JS Compilation",
    () => {
      compile(raw_js_grammar);
    },
    { warmupTime: 1000 },
  );

  bench(
    "Twinkleplop - CSS Compilation",
    () => {
      compile(raw_css_grammar);
    },
    { warmupTime: 1000 },
  );
});

//============================================================================
// Markdown Benchmarks
//============================================================================
//
// Markdown is block-line-oriented (atx headings, list markers, fences,
// blockquotes) with a rich inline grammar (emphasis, code spans, links).
// The flat-token twinkleplop grammar emits sibling tokens for the whole
// inline stream; prism and shiki both do delimiter-matched inline tokens,
// so this is a like-for-like "highlight markdown" comparison.

const md_samples = [
  { name: "tiny", code: tiny_md, size: "1 line" },
  { name: "small", code: small_md, size: "~10 lines" },
  { name: "medium", code: medium_md, size: "~50 lines" },
  { name: "large", code: large_md, size: "~200 lines" },
];

for (const sample of md_samples) {
  describe(`Markdown (tokenise) - ${sample.name} (${sample.size})`, () => {
    bench(
      "Twinkleplop",
      () => {
        const tokens = tokenize(sample.code, md_grammar);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Prism",
      () => {
        const tokens = Prism.tokenize(sample.code, Prism.languages.markdown, "markdown");
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Shiki",
      () => {
        const output = shiki_highlighter.codeToTokens(sample.code, {
          lang: "markdown",
          theme: "github-light",
        });
      },
      { warmupTime: WARMUP },
    );

    bench(
      "TanStack Highlight",
      () => {
        const tokens = tanstack.tokenize(sample.code, { lang: "markdown" });
      },
      { warmupTime: WARMUP },
    );
  });
}

for (const sample of md_samples) {
  describe(`Markdown - ${sample.name} (${sample.size})`, () => {
    bench(
      "Twinkleplop",
      () => {
        const tokens = markdown(sample.code);
        const output = to_html(sample.code, tokens);
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Prism",
      () => {
        const output = Prism.highlight(sample.code, Prism.languages.markdown, "markdown");
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Shiki",
      () => {
        const output = shiki_highlighter.codeToHtml(sample.code, {
          lang: "markdown",
          theme: "github-light",
        });
      },
      { warmupTime: WARMUP },
    );

    bench(
      "highlight.js",
      () => {
        const result = hljs.highlight(sample.code, { language: "markdown" });
      },
      { warmupTime: WARMUP },
    );

    bench(
      "Starry Night",
      () => {
        const scope = starry_night.flagToScope("markdown");
        if (scope) {
          const tree = starry_night.highlight(sample.code, scope);
        }
      },
      { warmupTime: WARMUP },
    );

    bench(
      "TanStack Highlight",
      () => {
        const html = tanstack.highlightToHtml(sample.code, { lang: "markdown" });
      },
      { warmupTime: WARMUP },
    );
  });
}
