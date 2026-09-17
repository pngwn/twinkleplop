// one adapter per highlighter under comparison.
//
// an adapter exposes the narrowest entry point doing the same STAGE of work
// as its neighbours - `tokenize` is tokens-out for everyone, `html` is
// string-out for everyone - and declares its languages explicitly rather than
// letting the library fall back. otherwise a library that returns escaped
// plaintext for a language it does not know benchmarks as spectacularly fast.
//
// token granularity is NOT equalised, because it cannot be. twinkleplop emits
// a finer stream than most of these, which is more work per byte; the runner
// records a token count per cell so that is visible rather than hidden.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require_ = createRequire(import.meta.url);
// a comparison that cannot say which version it measured is not
// reproducible, so "unknown" is a real defect. two lookups because neither
// works everywhere: `<name>/package.json` is blocked when `exports` does not
// list it (sugar-high), and walking up from the entry point fails for a
// package with no main export.
const version_of = (name) => {
  try {
    return require_(`${name}/package.json`).version;
  } catch {
    // check the name matches, so a parent package's manifest in a hoisted
    // tree cannot be mistaken for this one.
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
      note: "Oniguruma wasm engine, shiki's default. HTML output carries inline styles rather than classes.",
      engine_factory: () => createOnigurumaEngine(() => import("shiki/wasm")),
    });
  },

  "shiki-js": async () => {
    const { createJavaScriptRegexEngine } = await import("shiki");
    return shiki_adapter({
      id: "shiki-js",
      label: "Shiki (JS engine)",
      note: "same grammars, RegExp engine instead of wasm. Shiki's own benchmark treats these as separate arms, the wasm payload is a real deployment cost the JS engine avoids.",
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
