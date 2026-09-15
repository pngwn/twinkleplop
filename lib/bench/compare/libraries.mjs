// one adapter per highlighter under comparison.
//
// an adapter's job is to expose the narrowest entry point that does the same
// STAGE of work as its neighbours, and to say honestly which languages it can
// do. two rules follow from that, and both have bitten this suite before:
//
// 1. NEVER let a library fall back. several of these return escaped plaintext
//    for a language they do not know rather than throwing, so a typo in a
//    language name produces a benchmark that measures string escaping and
//    looks spectacular. every adapter declares `langs` explicitly and the
//    runner checks the output is non-trivial before recording a cell.
//
// 2. NEVER compare across stages. `tokenize` must be tokens-out for
//    everyone and `html` must be a string-out for everyone. a library whose
//    only entry point does both is recorded under `html` alone.
//
// what is deliberately NOT equalised, because it cannot be: token
// granularity. twinkleplop and prism emit finer streams than some of these,
// and finer means more work per byte. the runner records a token count per
// cell so a reader can see that rather than having to take the bar chart at
// face value.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require_ = createRequire(import.meta.url);
// a published comparison that cannot say which version of a competitor it
// measured is not reproducible, so "unknown" here is a real defect rather
// than a cosmetic one. two lookups, because neither works everywhere:
// `<name>/package.json` is blocked when the package's `exports` map does not
// list it (sugar-high does not), and resolving the entry point then walking
// up fails for a package with no main export.
const version_of = (name) => {
  try {
    return require_(`${name}/package.json`).version;
  } catch {
    // ERR_PACKAGE_PATH_NOT_EXPORTED and friends: find the manifest by
    // walking up from whatever the entry point resolved to, and check the
    // name matches so a parent package's manifest cannot be mistaken for it.
    try {
      let dir = dirname(require_.resolve(name));
      for (let up = 0; up < 10; up++) {
        const manifest = join(dir, "package.json");
        if (existsSync(manifest)) {
          const pkg = JSON.parse(readFileSync(manifest, "utf8"));
          if (pkg.name === name) return pkg.version;
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    } catch {
      // fall through
    }
    return "unknown";
  }
};

const core_version = (root) => {
  try {
    return JSON.parse(readFileSync(join(root, "lib/core/package.json"), "utf8")).version;
  } catch {
    return "unknown";
  }
};

// our language id -> that library's id. absent means "this library does not
// do this language", and the cell is simply not measured.
const SHIKI_LANGS = {
  bash: "bash",
  css: "css",
  diff: "diff",
  go: "go",
  html: "html",
  javascript: "javascript",
  json: "json",
  markdown: "markdown",
  python: "python",
  rust: "rust",
  sql: "sql",
  svelte: "svelte",
  toml: "toml",
  tsx: "tsx",
  typescript: "typescript",
  yaml: "yaml",
};

const PRISM_LANGS = {
  bash: "bash",
  css: "css",
  diff: "diff",
  go: "go",
  html: "markup",
  javascript: "javascript",
  json: "json",
  markdown: "markdown",
  python: "python",
  rust: "rust",
  sql: "sql",
  toml: "toml",
  tsx: "tsx",
  typescript: "typescript",
  yaml: "yaml",
};

// sugar-high has no grammar registry at all: one JS-shaped tokenizer, no
// language argument. listing it against js/ts/tsx is the honest reading of
// what it supports, and its absence everywhere else is a real limitation of
// the library rather than a gap in this suite.
const SUGAR_HIGH_LANGS = {
  javascript: "javascript",
  typescript: "typescript",
  tsx: "tsx",
};

const SHIKI_THEME = "github-light";

async function shiki_adapter({ id, label, note, engine_factory }) {
  const { createHighlighter } = await import("shiki");
  const highlighter = await createHighlighter({
    themes: [SHIKI_THEME],
    langs: [...new Set(Object.values(SHIKI_LANGS))],
    engine: await engine_factory(),
  });
  return {
    id,
    label,
    version: version_of("shiki"),
    note,
    supports: (lang) => lang in SHIKI_LANGS,
    tokenize: (code, lang) =>
      highlighter.codeToTokens(code, { lang: SHIKI_LANGS[lang], theme: SHIKI_THEME }),
    html: (code, lang) =>
      highlighter.codeToHtml(code, { lang: SHIKI_LANGS[lang], theme: SHIKI_THEME }),
    count_tokens: (out) => out.tokens.reduce((n, line) => n + line.length, 0),
  };
}

export const ADAPTERS = {
  // the library under test. measured on the path a consumer actually gets:
  // `tokenize()` runs the language's full reclassifier stack, not the bare
  // grammar. the bare `core.tokenize` path is faster and would make a nicer
  // chart, but nobody ships it.
  twinkleplop: async ({ arm }) => ({
    id: "twinkleplop",
    label: "twinkleplop",
    // read from the ARM's own package.json, not this checkout's. the arm can
    // be any built root - a frozen reference, another worktree - and
    // labelling its numbers with the version of whatever tree happens to
    // contain this file would attach the chart to the wrong commit.
    version: core_version(arm.root),
    note: "full pipeline: grammar plus the language's reclassifier stack, as shipped.",
    supports: (lang) => {
      const mod = arm.languages[lang];
      return typeof mod?.tokenize === "function" && typeof mod?.language === "function";
    },
    bind: (lang) => {
      const mod = arm.languages[lang];
      return { tokenize: mod.tokenize(), html: mod.language() };
    },
    count_tokens: (out) => out?.tokens?.length ?? out?.length ?? 0,
  }),

  "shiki-wasm": async () => {
    const { createOnigurumaEngine } = await import("shiki");
    return shiki_adapter({
      id: "shiki-wasm",
      label: "Shiki (wasm)",
      note: "Oniguruma wasm engine, shiki's default. HTML output carries inline styles rather than classes, which is strictly more string work than a class-based emitter does.",
      engine_factory: () => createOnigurumaEngine(() => import("shiki/wasm")),
    });
  },

  "shiki-js": async () => {
    const { createJavaScriptRegexEngine } = await import("shiki");
    return shiki_adapter({
      id: "shiki-js",
      label: "Shiki (JS engine)",
      note: "same grammars, RegExp engine instead of wasm. Shiki's own benchmark treats these as separate arms; the wasm payload is a real deployment cost the JS engine avoids.",
      engine_factory: () => createJavaScriptRegexEngine(),
    });
  },

  prism: async () => {
    const Prism = (await import("prismjs")).default;
    const { default: load_languages } = await import("prismjs/components/index.js");
    load_languages([...new Set(Object.values(PRISM_LANGS))]);
    return {
      id: "prism",
      label: "Prism",
      version: version_of("prismjs"),
      note: "class-based HTML output, same as twinkleplop's.",
      supports: (lang) => lang in PRISM_LANGS && Boolean(Prism.languages[PRISM_LANGS[lang]]),
      tokenize: (code, lang) =>
        Prism.tokenize(code, Prism.languages[PRISM_LANGS[lang]], PRISM_LANGS[lang]),
      html: (code, lang) =>
        Prism.highlight(code, Prism.languages[PRISM_LANGS[lang]], PRISM_LANGS[lang]),
      count_tokens: (out) => (Array.isArray(out) ? out.length : 0),
    };
  },

  "sugar-high": async () => {
    const { highlight, tokenize } = await import("sugar-high");
    return {
      id: "sugar-high",
      label: "sugar-high",
      version: version_of("sugar-high"),
      note: "JavaScript-shaped tokenizer with no grammar registry: it has no language argument, so it appears only in the JS-family charts. Coarser output than the others.",
      supports: (lang) => lang in SUGAR_HIGH_LANGS,
      tokenize: (code) => tokenize(code),
      html: (code) => highlight(code),
      count_tokens: (out) => (Array.isArray(out) ? out.length : 0),
    };
  },
};

export const DEFAULT_LIBRARIES = ["twinkleplop", "shiki-wasm", "shiki-js", "prism", "sugar-high"];

/**
 * Instantiate the requested adapters.
 *
 * `twinkleplop` needs the loaded arm; the rest take nothing. A library that
 * fails to load is a hard error rather than a silent omission - a chart
 * missing a competitor because its import threw is worse than no chart.
 */
export async function load_libraries(ids, { arm }) {
  const out = [];
  for (const id of ids) {
    const make = ADAPTERS[id];
    if (!make) {
      throw new Error(`unknown library "${id}" (have: ${Object.keys(ADAPTERS).join(", ")})`);
    }
    out.push(await make({ arm }));
  }
  return out;
}
