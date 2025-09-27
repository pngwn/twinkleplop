import { bench, describe, beforeAll } from "vitest";
import { tokenize, toHtml } from "@twinkleplop/core";
import { grammar as css } from "@twinkleplop/css";
import { createHighlighter } from "shiki";
import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";
import hljs from "highlight.js";
import { createStarryNight, common } from "@wooorm/starry-night";
import { smallCSS, mediumCSS, largeCSS } from "./css-samples.js";

// ============================================================================
// Library Comparison Suite
// Benchmarks Twinkleplop against other popular syntax highlighters
// ============================================================================

loadLanguages(["css"]);

let shikiHighlighter;
let starryNight;

beforeAll(async () => {
	console.log("Initializing external highlighters...");

	if (!shikiHighlighter) {
		shikiHighlighter = await createHighlighter({
			themes: ["github-light"],
			langs: ["css"],
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
