// the highlighters behind the docs snippet tags in snippets.ts. build only:
// the docs-snippets vite plugin loads this module and renders every tagged
// snippet with the function of the same name, so none of it ships.
//
// the plain highlighters run annotation extraction, so authors can drop
// `[!em]`, `[!hl]`, `[!add]`, `[!del]`, etc. into example sources. the
// extractor early-outs on input with no `[!`, so the cost elsewhere is noise.

import { add, del, dim, em, err, hl, info, mod, warn } from "@twinkleplop/annotation";
import { shiki_notation } from "@twinkleplop/annotation/shiki";
import { language as make_bash } from "@twinkleplop/bash";
import type { RenderOptions } from "@twinkleplop/core";
import { language as make_css } from "@twinkleplop/css";
import { language as make_html } from "@twinkleplop/html";
import { create_highlighter as create_twoslash } from "@twinkleplop/twoslash";
import { language as make_ts } from "@twinkleplop/typescript";
import typescript from "typescript";

const annotation = { plugins: [em, hl, dim, add, del, mod, err, warn, info] };

/** `root` is the site root, which twoslash resolves snippet imports from. */
export function create_highlighters(root: string) {
  const ts = make_ts({ annotation });
  const ts_raw = make_ts();
  const ts_shiki = make_ts({ annotation: { plugins: [shiki_notation()] } });
  const twoslash = create_twoslash({
    class_name: "twinkleplop twoslash",
    // `import("@twinkleplop/core").LanguageOptions` reads as `LanguageOptions`
    process_type: (type) => type.replace(/import\("[^"]*"\)\./g, ""),
    twoslash: {
      // twoslash joins this with `/index.ts` itself; a trailing slash makes
      // the diagnostics' file names miss and silently drops every error.
      vfsRoot: root.replace(/\/+$/, ""),
      compilerOptions: {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.ESNext,
        moduleResolution: typescript.ModuleResolutionKind.Bundler,
        // type check against workspace sources, never a stale dist
        customConditions: ["source"],
        strict: true,
        skipLibCheck: true,
      },
    },
  });

  return {
    twoslash: (code: string) => twoslash(code),
    ts,
    // source -> output pairs for SplitCodeBlock: the input pane shows the
    // markup as authored comment text, the output pane what it renders to.
    ts_split: (code: string) => ({ input: ts_raw(code), output: ts(code) }),
    ts_shiki_split: (code: string) => ({ input: ts_raw(code), output: ts_shiki(code) }),
    twoslash_split: (code: string) => ({ input: ts_raw(code), output: twoslash(code) }),
    html: make_html({ annotation }),
    css: make_css({ annotation }),
    bash: make_bash({ annotation }),
  } satisfies Record<string, (code: string, render?: RenderOptions) => unknown>;
}
