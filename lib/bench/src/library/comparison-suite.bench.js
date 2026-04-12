import { bench, describe, beforeAll } from "vitest";
import { tokenize, to_html, } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import { grammar as css, raw_grammar as raw_css_grammar } from "@twinkleplop/css";
import { language as javascript, } from "@twinkleplop/javascript";
import { language as html } from "@twinkleplop/html";
import { createHighlighter } from "shiki";
import Prism from "prismjs";
import load_languages from "prismjs/components/index.js";
import hljs from "highlight.js";
import { createStarryNight, common } from "@wooorm/starry-night";
import { small_css, medium_css, large_css } from "./css-samples.js";
import {
	tiny_js,
	small_js,
	medium_js,
	large_js,
	complex_js
} from "./javascript-samples.js";
import {
	tiny_html,
	small_html,
	medium_html,
	large_html,
	large_embedded_html,
} from "./html-samples.js";

// ============================================================================
// Library Comparison Suite
// Benchmarks Twinkleplop against other popular syntax highlighters
// ============================================================================

// Prism: `markup` is the registered name; `html` is an alias that resolves
// to the markup language. Loading `markup` covers both.
load_languages(["css", "javascript", "markup"]);

let shiki_highlighter;
let starry_night;

beforeAll(async () => {
	console.log("Initializing external highlighters...");

	if (!shiki_highlighter) {
		shiki_highlighter = await createHighlighter({
			themes: ["github-light"],
			langs: ["css", "javascript", "html"],
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
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(tiny_css, css);
			const html = to_html(tiny_css, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shiki_highlighter.codeToHtml(tiny_css, {
				lang: "css",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(tiny_css, Prism.languages.css, "css");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(tiny_css, { language: "css" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starry_night.flagToScope("css");
			if (scope) {
				const tree = starry_night.highlight(tiny_css, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

describe.skip("Small CSS (~10 lines)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(small_css, css);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(small_css, css);
			const html = to_html(small_css, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shiki_highlighter.codeToHtml(small_css, {
				lang: "css",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(small_css, Prism.languages.css, "css");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(small_css, { language: "css" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starry_night.flagToScope("css");
			if (scope) {
				const tree = starry_night.highlight(small_css, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

describe.skip("Medium CSS (~50 lines)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(medium_css, css);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(medium_css, css);
			const html = to_html(medium_css, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shiki_highlighter.codeToHtml(medium_css, {
				lang: "css",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(medium_css, Prism.languages.css, "css");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(medium_css, { language: "css" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starry_night.flagToScope("css");
			if (scope) {
				const tree = starry_night.highlight(medium_css, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

describe.skip("Large CSS (~150 lines)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(large_css, css);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(large_css, css);
			const html = to_html(large_css, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shiki_highlighter.codeToHtml(large_css, {
				lang: "css",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(large_css, Prism.languages.css, "css");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(large_css, { language: "css" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starry_night.flagToScope("css");
			if (scope) {
				const tree = starry_night.highlight(large_css, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

// Performance characteristics analysis
describe.skip("Tokenization Only (no HTML)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(medium_css, css);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop - full pipeline",
		() => {
			const tokens = tokenize(medium_css, css);
			const html = to_html(medium_css, tokens);
		},
		{ warmupTime: 1000 }
	);
});

describe.skip("HTML Generation Performance", () => {
	const tokens = tokenize(medium_css, css);

	bench(
		"to_html with pre-tokenized",
		() => {
			const html = to_html(medium_css, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Full pipeline",
		() => {
			const tokens = tokenize(medium_css, css);
			const html = to_html(medium_css, tokens);
		},
		{ warmupTime: 1000 }
	);
});

//============================================================================
//JavaScript Benchmarks
//============================================================================

// describe("JavaScript - Tiny (~1 line)", () => {
// 	bench.skip(
// 		"Twinkleplop - tokenize only",
// 		() => {
// 			const tokens = tokenize(tiny_js, javascript);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Twinkleplop",
// 		() => {
// 			const tokens = javascript(tiny_js);
// 			const html = to_html(tiny_js, tokens);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Shiki",
// 		() => {
// 			const html = shiki_highlighter.codeToHtml(tiny_js, {
// 				lang: "javascript",
// 				theme: "github-light",
// 			});
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Prism",
// 		() => {
// 			const html = Prism.highlight(tiny_js, Prism.languages.javascript, "javascript");
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"highlight.js",
// 		() => {
// 			const result = hljs.highlight(tiny_js, { language: "javascript" });
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Starry Night",
// 		() => {
// 			const scope = starry_night.flagToScope("javascript");
// 			if (scope) {
// 				const tree = starry_night.highlight(tiny_js, scope);
// 			}
// 		},
// 		{ warmupTime: 1000 }
// 	);
// });

// describe("JavaScript - Small (~10 lines)", () => {
// 	bench.skip(
// 		"Twinkleplop - tokenize only",
// 		() => {
// 			const tokens = tokenize(small_js, javascript);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Twinkleplop",
// 		() => {
// 			const tokens = javascript(small_js);
// 			const html = to_html(small_js, tokens);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Shiki",
// 		() => {
// 			const html = shiki_highlighter.codeToHtml(small_js, {
// 				lang: "javascript",
// 				theme: "github-light",
// 			});
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Prism",
// 		() => {
// 			const html = Prism.highlight(small_js, Prism.languages.javascript, "javascript");
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"highlight.js",
// 		() => {
// 			const result = hljs.highlight(small_js, { language: "javascript" });
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Starry Night",
// 		() => {
// 			const scope = starry_night.flagToScope("javascript");
// 			if (scope) {
// 				const tree = starry_night.highlight(small_js, scope);
// 			}
// 		},
// 		{ warmupTime: 1000 }
// 	);
// });

// describe("JavaScript - Medium (~65 lines)", () => {
// 	bench.skip(
// 		"Twinkleplop - tokenize only",
// 		() => {
// 			const tokens = tokenize(medium_js, javascript);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Twinkleplop",
// 		() => {
// 			const tokens = javascript(medium_js);
// 			const html = to_html(medium_js, tokens);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Shiki",
// 		() => {
// 			const html = shiki_highlighter.codeToHtml(medium_js, {
// 				lang: "javascript",
// 				theme: "github-light",
// 			});
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Prism",
// 		() => {
// 			const html = Prism.highlight(medium_js, Prism.languages.javascript, "javascript");
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"highlight.js",
// 		() => {
// 			const result = hljs.highlight(medium_js, { language: "javascript" });
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Starry Night",
// 		() => {
// 			const scope = starry_night.flagToScope("javascript");
// 			if (scope) {
// 				const tree = starry_night.highlight(medium_js, scope);
// 			}
// 		},
// 		{ warmupTime: 1000 }
// 	);
// });

// describe("JavaScript - Large (~200 lines)", () => {
// 	bench.skip(
// 		"Twinkleplop - tokenize only",
// 		() => {
// 			const tokens = javascript(large_js);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Twinkleplop",
// 		() => {
// 			const tokens = javascript(large_js);
// 			const html = to_html(large_js, tokens);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Shiki",
// 		() => {
// 			const html = shiki_highlighter.codeToHtml(large_js, {
// 				lang: "javascript",
// 				theme: "github-light",
// 			});
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Prism",
// 		() => {
// 			const html = Prism.highlight(large_js, Prism.languages.javascript, "javascript");
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"highlight.js",
// 		() => {
// 			const result = hljs.highlight(large_js, { language: "javascript" });
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Starry Night",
// 		() => {
// 			const scope = starry_night.flagToScope("javascript");
// 			if (scope) {
// 				const tree = starry_night.highlight(large_js, scope);
// 			}
// 		},
// 		{ warmupTime: 1000 }
// 	);
// });

// describe("JavaScript - Complex (~350 lines)", () => {
// 	bench.skip(
// 		"Twinkleplop - tokenize only",
// 		() => {
// 			const tokens = tokenize(complex_js, javascript);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Twinkleplop",
// 		() => {
// 			const tokens = javascript(complex_js);
// 			const html = to_html(complex_js, tokens);
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Shiki",
// 		() => {
// 			const html = shiki_highlighter.codeToHtml(complex_js, {
// 				lang: "javascript",
// 				theme: "github-light",
// 			});
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Prism",
// 		() => {
// 			const html = Prism.highlight(complex_js, Prism.languages.javascript, "javascript");
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"highlight.js",
// 		() => {
// 			const result = hljs.highlight(complex_js, { language: "javascript" });
// 		},
// 		{ warmupTime: 1000 }
// 	);

// 	bench(
// 		"Starry Night",
// 		() => {
// 			const scope = starry_night.flagToScope("javascript");
// 			if (scope) {
// 				const tree = starry_night.highlight(complex_js, scope);
// 			}
// 		},
// 		{ warmupTime: 1000 }
// 	);
// });

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
const WARMUP = 1000;
const html_samples = [
  { name: "tiny", code: tiny_html, size: "1 line" },
  { name: "small", code: small_html, size: "10 lines" },
  { name: "medium", code: medium_html, size: "100 lines" },
  { name: "large", code: large_html, size: "1000 lines" },
  { name: "large_embedded", code: large_embedded_html, size: "1000 lines" },
];

for (const sample of html_samples) {
  describe(`HTML (tokenise) - ${sample.name} (${sample.size})`, () => {


	bench(
		"Twinkleplop",
		() => {
			const tokens = html(sample.code);
		},
		{ warmupTime: WARMUP }
	);

	bench(
		"Shiki",
		() => {
			const output = shiki_highlighter.codeToTokens(sample.code, {
				lang: "html",
				theme: "github-light",
      });
		},
		{ warmupTime: WARMUP }
	);

	bench(
		"Prism",
		() => {
      const output = Prism.tokenize(sample.code, Prism.languages.markup, "markup");
		},
		{ warmupTime: WARMUP }
	);
  });
}



for (const sample of html_samples) {
  describe(`HTML - ${sample.name} (${sample.size})`, () => {


	bench(
		"Twinkleplop",
		() => {
			const tokens = html(sample.code);
			const output = to_html(sample.code, tokens);
		},
		{ warmupTime: WARMUP }
	);

	bench(
		"Shiki",
		() => {
			const output = shiki_highlighter.codeToHtml(sample.code, {
				lang: "html",
				theme: "github-light",
			});
		},
		{ warmupTime: WARMUP }
	);

	bench(
		"Prism",
		() => {
			const output = Prism.highlight(sample.code, Prism.languages.markup, "markup");
		},
		{ warmupTime: WARMUP }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(sample.code, { language: "xml" });
		},
		{ warmupTime: WARMUP }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starry_night.flagToScope("html");
			if (scope) {
				const tree = starry_night.highlight(sample.code, scope);
			}
		},
		{ warmupTime: WARMUP }
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
		{ warmupTime: 1000 }
	);

	bench(
		"Prism - Modern Features",
		() => {
			const html = Prism.highlight(modern_features, Prism.languages.javascript, "javascript");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js - Modern Features",
		() => {
			const result = hljs.highlight(modern_features, { language: "javascript" });
		},
		{ warmupTime: 1000 }
	);
});


describe.skip("compilation", () => {
	bench(
		"Twinkleplop - JS Compilation",
		() => {
			compile(raw_js_grammar);
		},
		{ warmupTime: 1000 }
  );

	bench(
		"Twinkleplop - CSS Compilation",
		() => {
			compile(raw_css_grammar);
		},
		{ warmupTime: 1000 }
	);

});
