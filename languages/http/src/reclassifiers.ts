// scripts and curl requests are contiguous, so embed_grammars takes them
// bodies go through embed_interleaved with variables and comment lines as holes, so a json string survives a variable inside it
// sibling languages load lazily because javascript and html import each other

import { always, embed_grammars, embed_interleaved } from "@twinkleplop/core";
import type { GroupDescriptor, LanguageFn, LanguagePipeline, Region } from "@twinkleplop/core";
import { tokenize as bash_tokenize } from "@twinkleplop/bash";
import { tokenize as html_tokenize } from "@twinkleplop/html";
import { tokenize as js_tokenize } from "@twinkleplop/javascript";
import { tokenize as json_tokenize } from "@twinkleplop/json";

let bash_fn: LanguageFn | undefined;
let html_fn: LanguageFn | undefined;
let js_fn: LanguageFn | undefined;
let json_fn: LanguageFn | undefined;
const bash_default = (src: string) => (bash_fn ??= bash_tokenize())(src);
const html_default = (src: string) => (html_fn ??= html_tokenize())(src);
const js_default = (src: string) => (js_fn ??= js_tokenize())(src);
const json_default = (src: string) => (json_fn ??= json_tokenize())(src);

// a ### separator is also a comment, so the scanner checks comments for it
const HOLE_TYPES = ["punctuation", "variable", "builtin", "operator", "string", "comment"];

interface BodyIds {
  json: number;
  markup: number;
  comment: number;
  // 1 at each type id that may be a hole
  hole: Uint8Array;
}

const ids_cache = new WeakMap<string[], BodyIds>();

function body_ids(token_types: string[]): BodyIds {
  let ids = ids_cache.get(token_types);
  if (ids === undefined) {
    const hole = new Uint8Array(token_types.length);
    for (const name of HOLE_TYPES) {
      const id = token_types.indexOf(name);
      if (id >= 0) hole[id] = 1;
    }
    ids = {
      json: token_types.indexOf("raw_json"),
      markup: token_types.indexOf("raw_markup"),
      comment: token_types.indexOf("comment"),
      hole,
    };
    ids_cache.set(token_types, ids);
  }
  return ids;
}

/**
 * a body group runs from a raw token to the last raw token of the same kind reachable through holes,
 * every char in its range that is not a hole is content, untokenized newlines included
 */
export function scan_body(
  tokens: Uint32Array,
  input: string,
  i: number,
  token_types: string[],
): GroupDescriptor | null {
  const ids = body_ids(token_types);
  const kind = tokens[i * 3];
  if (kind !== ids.json && kind !== ids.markup) return null;

  const count = tokens.length / 3;
  let last = i;
  for (let j = i + 1; j < count; j++) {
    const type = tokens[j * 3];
    if (type === kind) {
      last = j;
      continue;
    }
    if (type >= ids.hole.length || ids.hole[type] === 0) break;
    if (type === ids.comment && input.startsWith("###", tokens[j * 3 + 1])) break;
  }

  const regions: Region[] = [];
  let cursor = tokens[i * 3 + 1];
  let k = i + 1;
  while (k <= last) {
    if (tokens[k * 3] === kind) {
      k++;
      continue;
    }
    let h = k;
    while (tokens[h * 3] !== kind) h++;
    const hole_start = tokens[k * 3 + 1];
    const hole_end = tokens[(h - 1) * 3 + 2];
    if (hole_start > cursor) {
      regions.push({ kind: "content", source_start: cursor, source_end: hole_start });
    }
    regions.push({
      kind: "hole",
      source_start: hole_start,
      source_end: hole_end,
      token_start: k,
      token_end: h,
    });
    cursor = hole_end;
    k = h;
  }
  const end = tokens[last * 3 + 2];
  if (end > cursor) regions.push({ kind: "content", source_start: cursor, source_end: end });

  return {
    token_start: i,
    token_end: last + 1,
    regions,
    language: kind === ids.json ? json_default : html_default,
  };
}

export const reclassifiers: LanguagePipeline = [
  always(
    embed_grammars({
      raw_script: js_default,
      raw_shell: bash_default,
    }),
    "embed",
  ),
  always(embed_interleaved({ scan: scan_body }), "embed"),
];
