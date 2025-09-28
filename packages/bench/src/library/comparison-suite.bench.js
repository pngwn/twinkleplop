import { bench, describe, beforeAll } from "vitest";
import { tokenize, toHtml } from "@twinkleplop/core";
import { grammar as css } from "@twinkleplop/css";
import { grammar as javascript } from "@twinkleplop/javascript";
import { createHighlighter } from "shiki";
import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";
import hljs from "highlight.js";
import { createStarryNight, common } from "@wooorm/starry-night";
import { smallCSS, mediumCSS, largeCSS } from "./css-samples.js";
import { 
	tinyJS, 
	smallJS, 
	mediumJS, 
	largeJS, 
	complexJS 
} from "./javascript-samples.js";

// ============================================================================
// Library Comparison Suite
// Benchmarks Twinkleplop against other popular syntax highlighters
// ============================================================================

loadLanguages(["css", "javascript"]);

let shikiHighlighter;
let starryNight;

beforeAll(async () => {
	console.log("Initializing external highlighters...");

	if (!shikiHighlighter) {
		shikiHighlighter = await createHighlighter({
			themes: ["github-light"],
			langs: ["css", "javascript"],
		});
	}

	if (!starryNight) {
		starryNight = await createStarryNight(common);
	}
});

// Test samples of various sizes
const tinyCSS = `.btn { color: blue; }`;

describe("Tiny CSS (~1 line)", (t) => {
	bench(
		"Twinkleplop - tokenize only",
		(t) => {
			const tokens = tokenize(tinyCSS, css);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(tinyCSS, css);
			const html = toHtml(tinyCSS, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shikiHighlighter.codeToHtml(tinyCSS, {
				lang: "css",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(tinyCSS, Prism.languages.css, "css");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(tinyCSS, { language: "css" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starryNight.flagToScope("css");
			if (scope) {
				const tree = starryNight.highlight(tinyCSS, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

describe("Small CSS (~10 lines)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(smallCSS, css);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(smallCSS, css);
			const html = toHtml(smallCSS, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shikiHighlighter.codeToHtml(smallCSS, {
				lang: "css",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(smallCSS, Prism.languages.css, "css");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(smallCSS, { language: "css" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starryNight.flagToScope("css");
			if (scope) {
				const tree = starryNight.highlight(smallCSS, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

describe("Medium CSS (~50 lines)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(mediumCSS, css);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(mediumCSS, css);
			const html = toHtml(mediumCSS, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shikiHighlighter.codeToHtml(mediumCSS, {
				lang: "css",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(mediumCSS, Prism.languages.css, "css");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(mediumCSS, { language: "css" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starryNight.flagToScope("css");
			if (scope) {
				const tree = starryNight.highlight(mediumCSS, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

describe("Large CSS (~150 lines)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(largeCSS, css);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(largeCSS, css);
			const html = toHtml(largeCSS, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shikiHighlighter.codeToHtml(largeCSS, {
				lang: "css",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(largeCSS, Prism.languages.css, "css");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(largeCSS, { language: "css" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starryNight.flagToScope("css");
			if (scope) {
				const tree = starryNight.highlight(largeCSS, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

// Performance characteristics analysis
describe("Tokenization Only (no HTML)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(mediumCSS, css);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop - full pipeline",
		() => {
			const tokens = tokenize(mediumCSS, css);
			const html = toHtml(mediumCSS, tokens);
		},
		{ warmupTime: 1000 }
	);
});

describe("HTML Generation Performance", () => {
	const tokens = tokenize(mediumCSS, css);

	bench(
		"toHtml with pre-tokenized",
		() => {
			const html = toHtml(mediumCSS, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Full pipeline",
		() => {
			const tokens = tokenize(mediumCSS, css);
			const html = toHtml(mediumCSS, tokens);
		},
		{ warmupTime: 1000 }
	);
});

// ============================================================================
// JavaScript Benchmarks
// ============================================================================

describe("JavaScript - Tiny (~1 line)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(tinyJS, javascript);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(tinyJS, javascript);
			const html = toHtml(tinyJS, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shikiHighlighter.codeToHtml(tinyJS, {
				lang: "javascript",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(tinyJS, Prism.languages.javascript, "javascript");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(tinyJS, { language: "javascript" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starryNight.flagToScope("javascript");
			if (scope) {
				const tree = starryNight.highlight(tinyJS, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

describe("JavaScript - Small (~10 lines)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(smallJS, javascript);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(smallJS, javascript);
			const html = toHtml(smallJS, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shikiHighlighter.codeToHtml(smallJS, {
				lang: "javascript",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(smallJS, Prism.languages.javascript, "javascript");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(smallJS, { language: "javascript" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starryNight.flagToScope("javascript");
			if (scope) {
				const tree = starryNight.highlight(smallJS, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

describe("JavaScript - Medium (~65 lines)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(mediumJS, javascript);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(mediumJS, javascript);
			const html = toHtml(mediumJS, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shikiHighlighter.codeToHtml(mediumJS, {
				lang: "javascript",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(mediumJS, Prism.languages.javascript, "javascript");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(mediumJS, { language: "javascript" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starryNight.flagToScope("javascript");
			if (scope) {
				const tree = starryNight.highlight(mediumJS, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

describe("JavaScript - Large (~200 lines)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(largeJS, javascript);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(largeJS, javascript);
			const html = toHtml(largeJS, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shikiHighlighter.codeToHtml(largeJS, {
				lang: "javascript",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(largeJS, Prism.languages.javascript, "javascript");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(largeJS, { language: "javascript" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starryNight.flagToScope("javascript");
			if (scope) {
				const tree = starryNight.highlight(largeJS, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

describe("JavaScript - Complex (~350 lines)", () => {
	bench(
		"Twinkleplop - tokenize only",
		() => {
			const tokens = tokenize(complexJS, javascript);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop",
		() => {
			const tokens = tokenize(complexJS, javascript);
			const html = toHtml(complexJS, tokens);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Shiki",
		() => {
			const html = shikiHighlighter.codeToHtml(complexJS, {
				lang: "javascript",
				theme: "github-light",
			});
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism",
		() => {
			const html = Prism.highlight(complexJS, Prism.languages.javascript, "javascript");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js",
		() => {
			const result = hljs.highlight(complexJS, { language: "javascript" });
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Starry Night",
		() => {
			const scope = starryNight.flagToScope("javascript");
			if (scope) {
				const tree = starryNight.highlight(complexJS, scope);
			}
		},
		{ warmupTime: 1000 }
	);
});

// JavaScript-specific performance analysis
describe("JavaScript Regex vs Division Performance", () => {
	// Test code with many regex patterns
	const regexHeavyCode = `
		const patterns = [
			/^[a-z]+$/gi,
			/\\d{3}-\\d{3}-\\d{4}/,
			/https?:\\/\\/(www\\.)?[^\\s]+/gi,
			/^[\\w._%+-]+@[\\w.-]+\\.[A-Za-z]{2,}$/
		];
		const result = text.match(/\\b\\w+\\b/g);
	`;
	
	// Test code with many division operations
	const divisionHeavyCode = `
		const avg = sum / count;
		const ratio = width / height;
		const percentage = (part / whole) * 100;
		const normalized = (value - min) / (max - min);
		const rate = distance / time;
	`;
	
	// Mixed regex and division
	const mixedCode = `
		if (/^\\d+$/.test(input)) {
			const value = parseInt(input) / 100;
			return value;
		}
		const pattern = /[a-z]+/gi;
		const result = total / count;
	`;

	bench(
		"Twinkleplop - Regex Heavy",
		() => {
			const tokens = tokenize(regexHeavyCode, javascript);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop - Division Heavy",
		() => {
			const tokens = tokenize(divisionHeavyCode, javascript);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Twinkleplop - Mixed Regex/Division",
		() => {
			const tokens = tokenize(mixedCode, javascript);
		},
		{ warmupTime: 1000 }
	);
});

describe("JavaScript Modern Features Performance", () => {
	// Test modern JavaScript features
	const modernFeatures = `
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
			const tokens = tokenize(modernFeatures, javascript);
		},
		{ warmupTime: 1000 }
	);

	bench(
		"Prism - Modern Features",
		() => {
			const html = Prism.highlight(modernFeatures, Prism.languages.javascript, "javascript");
		},
		{ warmupTime: 1000 }
	);

	bench(
		"highlight.js - Modern Features",
		() => {
			const result = hljs.highlight(modernFeatures, { language: "javascript" });
		},
		{ warmupTime: 1000 }
	);
});
