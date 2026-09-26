// builtin type names are contextual, these checks hold their classification
// to position without listing cases

import { readFileSync } from "node:fs";
import ts from "typescript";

export const BUILTIN_TYPE_NAMES =
  /\b(?:string|number|boolean|any|never|unknown|object|symbol|bigint)\b/g;

const BUILTIN_KINDS = new Set([
  ts.SyntaxKind.StringKeyword,
  ts.SyntaxKind.NumberKeyword,
  ts.SyntaxKind.BooleanKeyword,
  ts.SyntaxKind.AnyKeyword,
  ts.SyntaxKind.NeverKeyword,
  ts.SyntaxKind.UnknownKeyword,
  ts.SyntaxKind.ObjectKeyword,
  ts.SyntaxKind.SymbolKeyword,
  ts.SyntaxKind.BigIntKeyword,
]);

type Tokenize = (src: string) => {
  tokens: ArrayLike<number>;
  token_types: string[];
};

export function read_fixture(name: string): string {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

function line_of(src: string, pos: number): string {
  const start = src.lastIndexOf("\n", pos - 1) + 1;
  const end = src.indexOf("\n", pos);
  return src.slice(start, end < 0 ? undefined : end).trim();
}

/** Builtin-named tokens whose `type` classification disagrees with the TypeScript compiler. */
export function oracle_mismatches(tokenize: Tokenize, src: string, tsx = false): string[] {
  const kind = tsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile("fixture", src, ts.ScriptTarget.Latest, false, kind);
  const type_starts = new Set<number>();
  const visit = (node: ts.Node) => {
    if (BUILTIN_KINDS.has(node.kind)) type_starts.add(node.getStart(sf));
    node.forEachChild(visit);
  };
  visit(sf);

  const { tokens, token_types } = tokenize(src);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 3) {
    const start = tokens[i + 1];
    const text = src.slice(start, tokens[i + 2]);
    if (text.replace(BUILTIN_TYPE_NAMES, "") !== "") continue;
    const type = token_types[tokens[i]];
    if ((type === "type") !== type_starts.has(start)) {
      out.push(`${line_of(src, start)}: ${text} -> ${type}`);
    }
  }
  return out;
}

/**
 * Tokens whose type or bounds change when every `names` match is renamed to a
 * same-length plain name.
 */
export function rename_differences(
  tokenize: Tokenize,
  src: string,
  names: RegExp = BUILTIN_TYPE_NAMES,
): string[] {
  const a = tokenize(src);
  const b = tokenize(src.replace(names, (w) => w.slice(0, -1) + "q"));
  const out: string[] = [];
  const n = Math.max(a.tokens.length, b.tokens.length);
  for (let i = 0; i < n; i += 3) {
    const start = a.tokens[i + 1];
    const type_a = a.token_types[a.tokens[i]];
    const type_b = b.token_types[b.tokens[i]];
    if (type_a !== type_b || start !== b.tokens[i + 1]) {
      out.push(
        `${line_of(src, start)}: ${src.slice(start, a.tokens[i + 2])} ${type_a} -> ${type_b}`,
      );
    }
  }
  return out;
}
