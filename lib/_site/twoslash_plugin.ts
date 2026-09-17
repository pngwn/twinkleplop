// build-time twoslash for the docs.
//
// a page writes a typescript snippet as a tagged template:
//
//   import { twoslash } from "$lib/docs/twoslash";
//   const usage = twoslash`import { language } from "@twinkleplop/typescript";`;
//
// this plugin runs before svelte compiles the page. it type checks every
// snippet against the workspace sources (the `source` export condition, so
// never a stale dist) and swaps the template for the rendered html string.
// neither the compiler nor the snippet source reaches the client, and an
// unexpected compiler error fails the transform: the docs cannot drift from
// the real api without the build noticing.
//
// hidden setup goes above a `// ---cut---` line, and the usual twoslash
// notations (`^?`, `@errors`, `@log`, ...) work as documented.

import MagicString from "magic-string";
import ts from "typescript";
import { runnerImport, type Plugin } from "vite";

const MODULE = "$lib/docs/twoslash";
const SCRIPT = /(<script\b[^>]*>)([\s\S]*?)<\/script>/g;

interface Snippet {
  start: number;
  end: number;
  source: string;
}

function line_of(code: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (code.charCodeAt(i) === 10) line++;
  return line;
}

// every `twoslash`...`` template in the page's script blocks, found with the
// compiler's parser so a backtick in a string or comment cannot pass for one.
// the literal's `text` is its cooked value, escapes resolved as the page would.
function find_snippets(code: string): Snippet[] {
  const snippets: Snippet[] = [];
  for (const match of code.matchAll(SCRIPT)) {
    const offset = match.index + match[1].length;
    const file = ts.createSourceFile("page.ts", match[2], ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (
        ts.isTaggedTemplateExpression(node) &&
        ts.isIdentifier(node.tag) &&
        node.tag.text === "twoslash"
      ) {
        const start = offset + node.getStart(file);
        // interpolation is rejected rather than evaluated: a snippet is a fixed
        // piece of source, and splicing a value in would type check something
        // other than what the page shows.
        if (!ts.isNoSubstitutionTemplateLiteral(node.template)) {
          throw new Error(
            `twoslash snippet on line ${line_of(code, start)} uses \${}; snippets must be static`,
          );
        }
        snippets.push({ start, end: offset + node.end, source: node.template.text });
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return snippets;
}

// @twinkleplop/twoslash publishes typescript source, which the node that loads
// this config cannot import, so it comes in through a vite module runner.
async function load_highlighter(root: string) {
  const { module } = await runnerImport<typeof import("@twinkleplop/twoslash")>(
    "@twinkleplop/twoslash",
    { root, configFile: false, logLevel: "error" },
  );
  return module.create_highlighter({
    class_name: "twinkleplop twoslash",
    // `import("@twinkleplop/core").LanguageOptions` reads as `LanguageOptions`
    process_type: (type) => type.replace(/import\("[^"]*"\)\./g, ""),
    twoslash: {
      // twoslash joins this with `/index.ts` itself; a trailing slash makes
      // the diagnostics' file names miss and silently drops every error.
      vfsRoot: root.replace(/\/+$/, ""),
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        customConditions: ["source"],
        strict: true,
        skipLibCheck: true,
      },
    },
  });
}

export function twoslash_plugin(): Plugin {
  let root = process.cwd();
  let highlighter: ReturnType<typeof load_highlighter> | undefined;
  // keyed by snippet source. the ssr and client builds transform every page
  // once each, and dev re-transforms a page on every save.
  const cache = new Map<string, string>();

  return {
    name: "docs-twoslash",
    enforce: "pre",

    configResolved(config) {
      root = config.root;
    },

    async transform(code, id) {
      const file = id.split("?", 1)[0];
      if (!file.endsWith(".svelte") && !file.endsWith(".svx")) return;
      if (!code.includes(MODULE)) return;

      const snippets = find_snippets(code);
      if (snippets.length === 0) return;

      highlighter ??= load_highlighter(root);
      const highlight = await highlighter;
      const s = new MagicString(code);
      const failures: string[] = [];
      for (const snippet of snippets) {
        let html = cache.get(snippet.source);
        if (html === undefined) {
          try {
            html = highlight(snippet.source);
          } catch (error) {
            const message = error instanceof Error ? error.message.trim() : String(error);
            failures.push(`snippet on line ${line_of(code, snippet.start)}:\n${message}`);
            continue;
          }
          cache.set(snippet.source, html);
        }
        s.overwrite(snippet.start, snippet.end, JSON.stringify(html));
      }

      // every broken snippet in the page at once, not one per save.
      if (failures.length > 0) {
        this.error(
          `twoslash rejected ${failures.length} snippet(s) in ${file}\n\n${failures.join("\n\n")}`,
        );
      }

      return { code: s.toString(), map: s.generateMap({ hires: true }) };
    },
  };
}
