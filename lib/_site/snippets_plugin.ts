// build-time rendering for docs code snippets.
//
// a page imports a tag from `$lib/docs/snippets` and writes its snippet as a
// tagged template, optionally passing render options first:
//
//   import { bash, ts, twoslash } from "$lib/docs/snippets";
//   const install = bash`pnpm add @twinkleplop/typescript`;
//   const numbered = ts({ line_numbers: true })`const x = 1;`;
//   const usage = twoslash`import { language } from "@twinkleplop/typescript";`;
//
// this plugin runs before svelte compiles the page and replaces each tagged
// template with the html its highlighter (src/lib/docs/highlighters.ts)
// renders, so neither the highlighters nor the snippet sources reach the
// client. `twoslash` snippets are also type checked against the workspace
// sources, and an unexpected compiler error fails the transform: the docs
// cannot drift from the real api without the build noticing.
//
// twoslash snippets hide setup above a `// ---cut---` line, and the usual
// twoslash notations (`^?`, `@errors`, `@log`, ...) work as documented.

import MagicString from "magic-string";
import ts from "typescript";
import { runnerImport, type Plugin } from "vite";

type Highlighters = ReturnType<typeof import("./src/lib/docs/highlighters").create_highlighters>;

const MODULE = "$lib/docs/snippets";
const SCRIPT = /(<script\b[^>]*>)([\s\S]*?)<\/script>/g;

interface Snippet {
  start: number;
  end: number;
  name: string;
  options: unknown;
  source: string;
}

function line_of(code: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (code.charCodeAt(i) === 10) line++;
  return line;
}

// options are read from the source, not evaluated, so only literals will do.
function static_value(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(static_value);
  if (ts.isObjectLiteralExpression(node)) {
    const value: Record<string, unknown> = {};
    for (const property of node.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
      ) {
        throw new Error("snippet options must be a literal");
      }
      value[property.name.text] = static_value(property.initializer);
    }
    return value;
  }
  throw new Error("snippet options must be a literal");
}

// every tagged template in the page's script blocks whose tag was imported
// from the snippets module, found with the compiler's parser so a backtick in
// a string or comment cannot pass for one. the literal's `text` is its cooked
// value, escapes resolved as the page would.
function find_snippets(code: string): Snippet[] {
  const snippets: Snippet[] = [];
  for (const match of code.matchAll(SCRIPT)) {
    const offset = match.index + match[1].length;
    const file = ts.createSourceFile("page.ts", match[2], ts.ScriptTarget.Latest, true);

    // local name -> tag name, so `import { html as html_hl }` still counts.
    const tags = new Map<string, string>();
    for (const statement of file.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === MODULE &&
        statement.importClause?.namedBindings &&
        ts.isNamedImports(statement.importClause.namedBindings)
      ) {
        for (const element of statement.importClause.namedBindings.elements) {
          tags.set(element.name.text, (element.propertyName ?? element.name).text);
        }
      }
    }
    if (tags.size === 0) continue;

    const visit = (node: ts.Node) => {
      if (ts.isTaggedTemplateExpression(node)) {
        const call = ts.isCallExpression(node.tag) ? node.tag : undefined;
        const callee = call ? call.expression : node.tag;
        const name = ts.isIdentifier(callee) ? tags.get(callee.text) : undefined;
        if (name !== undefined) {
          const start = offset + node.getStart(file);
          const line = line_of(code, start);
          // interpolation is rejected rather than evaluated: a snippet is a
          // fixed piece of source, and splicing a value in would render (and
          // type check) something other than what the page shows.
          if (!ts.isNoSubstitutionTemplateLiteral(node.template)) {
            throw new Error(`snippet on line ${line} uses \${}; snippets must be static`);
          }
          let options: unknown;
          if (call) {
            if (call.arguments.length !== 1) {
              throw new Error(`snippet on line ${line} takes exactly one options argument`);
            }
            try {
              options = static_value(call.arguments[0]);
            } catch (error) {
              throw new Error(`snippet on line ${line}: ${(error as Error).message}`);
            }
          }
          snippets.push({
            start,
            end: offset + node.end,
            name,
            options,
            source: node.template.text,
          });
          return;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return snippets;
}

// the highlighters import packages that publish typescript source, which the
// node that loads this config cannot import, so they come in through a vite
// module runner.
async function load_highlighters(root: string): Promise<Highlighters> {
  const { module } = await runnerImport<typeof import("./src/lib/docs/highlighters")>(
    `${root}/src/lib/docs/highlighters.ts`,
    { root, configFile: false, logLevel: "error" },
  );
  return module.create_highlighters(root);
}

export function snippets_plugin(): Plugin {
  let root = process.cwd();
  let highlighters: Promise<Highlighters> | undefined;
  // keyed by tag, options and source. the ssr and client builds transform
  // every page once each, and dev re-transforms a page on every save.
  const cache = new Map<string, string>();

  return {
    name: "docs-snippets",
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

      highlighters ??= load_highlighters(root);
      const loaded = await highlighters;
      const s = new MagicString(code);
      const failures: string[] = [];
      for (const snippet of snippets) {
        const key = `${snippet.name}\0${JSON.stringify(snippet.options) ?? ""}\0${snippet.source}`;
        let rendered = cache.get(key);
        if (rendered === undefined) {
          const highlight = loaded[snippet.name as keyof Highlighters] as (
            code: string,
            options?: unknown,
          ) => unknown;
          try {
            if (typeof highlight !== "function")
              throw new Error(`no highlighter named ${snippet.name}`);
            rendered = JSON.stringify(highlight(snippet.source, snippet.options));
          } catch (error) {
            const message = error instanceof Error ? error.message.trim() : String(error);
            failures.push(
              `${snippet.name} snippet on line ${line_of(code, snippet.start)}:\n${message}`,
            );
            continue;
          }
          cache.set(key, rendered);
        }
        s.overwrite(snippet.start, snippet.end, rendered);
      }

      // every broken snippet in the page at once, not one per save.
      if (failures.length > 0) {
        this.error(`${failures.length} snippet(s) failed in ${file}\n\n${failures.join("\n\n")}`);
      }

      return { code: s.toString(), map: s.generateMap({ hires: true }) };
    },
  };
}
