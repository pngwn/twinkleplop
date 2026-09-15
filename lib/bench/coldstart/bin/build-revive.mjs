// prototype for "ship the compiled grammar instead of computing it".
//
// emits, per language, a self contained es module that carries the compiled
// grammar as a base64 payload plus a json side table, and revives it into the
// same CompiledGrammar shape the compiler produces. the point is not to
// propose this module as an artifact but to measure the revive against the
// compile it would replace, cold, in a fresh process. if reviving is not
// clearly cheaper than compiling then the whole idea is dead and no amount of
// encoding cleverness saves it.
//
// correctness is checked here rather than trusted: the revived grammar is
// compared field by field against the compiled one before the module is
// written.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOCS_BUNDLE } from "../scenarios.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out_dir = join(resolve(here, ".."), ".artifacts");
const root = resolve(here, "../../../..");
mkdirSync(out_dir, { recursive: true });

const TYPED = [
  ["transitions", "Uint16Array"],
  ["char_maps", "Uint16Array"],
  ["fallback_transitions", "Uint16Array"],
  ["probe_mask", "Uint8Array"],
  ["seal_flags", "Uint8Array"],
  ["fallback_seal_flags", "Uint8Array"],
];

function encode(g) {
  const chunks = [];
  const layout = [];
  for (const [key, kind] of TYPED) {
    const arr = g[key];
    if (!arr) {
      layout.push([key, kind, 0]);
      continue;
    }
    layout.push([key, kind, arr.length]);
    chunks.push(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength));
  }
  const payload = Buffer.concat(chunks).toString("base64");
  const side = {
    layout,
    states: [...g.states],
    keywords: [...g.keywords],
    token_types: g.token_types,
    probe_states: [...g.probe_states],
    probe_fallbacks: g.probe_fallbacks ? [...g.probe_fallbacks] : null,
    boundary_rules: g.boundary_rules ? [...g.boundary_rules] : null,
    has_seals: g.has_seals,
    non_ascii_ranges: [...g.non_ascii_ranges].map(([k, v]) => [k, Array.from(v)]),
    patterns: [...g.patterns].map(([k, buckets]) => [
      k,
      buckets.map((b) =>
        b ? b.map((p) => [Array.from(p.codes), p.length, p.rule_idx, p.boundary ? 1 : 0]) : 0,
      ),
    ]),
  };
  return { payload, side };
}

const REVIVE_SOURCE = `
const BPE = { Uint16Array: 2, Uint8Array: 1 };
const CTOR = { Uint16Array, Uint8Array };

export function revive(payload, side) {
  // one decode of the whole payload, then subarray views over it. decoding
  // per field would copy the bytes once per field.
  const bin = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const g = {};
  let off = 0;
  for (const [key, kind, len] of side.layout) {
    if (len === 0) continue;
    const bytes = len * BPE[kind];
    g[key] = new CTOR[kind](bin.buffer, off, len);
    off += bytes;
  }
  g.states = new Map(side.states);
  g.keywords = new Map(side.keywords);
  g.token_types = side.token_types;
  g.probe_states = new Set(side.probe_states);
  g.probe_fallbacks = side.probe_fallbacks ? new Map(side.probe_fallbacks) : undefined;
  g.boundary_rules = side.boundary_rules ? new Set(side.boundary_rules) : undefined;
  g.has_seals = side.has_seals;
  const na = new Map();
  for (const [k, triples] of side.non_ascii_ranges) na.set(k, Int32Array.from(triples));
  g.non_ascii_ranges = na;
  const pat = new Map();
  for (const [k, buckets] of side.patterns) {
    pat.set(
      k,
      buckets.map((b) =>
        b === 0
          ? null
          : b.map(([codes, length, rule_idx, boundary]) => {
              const info = { codes: Uint16Array.from(codes), length, rule_idx };
              if (boundary) info.boundary = true;
              return info;
            })
      )
    );
  }
  g.patterns = pat;
  return g;
}
`;

function same(a, b, path, problems) {
  if (a instanceof Map) {
    if (!(b instanceof Map) || a.size !== b.size) return problems.push(`${path}: map size`);
    for (const [k, v] of a) same(v, b.get(k), `${path}[${k}]`, problems);
    return;
  }
  if (a instanceof Set) {
    if (!(b instanceof Set) || a.size !== b.size) return problems.push(`${path}: set size`);
    for (const v of a) if (!b.has(v)) problems.push(`${path}: missing ${v}`);
    return;
  }
  if (ArrayBuffer.isView(a)) {
    if (!ArrayBuffer.isView(b) || a.length !== b.length) {
      return problems.push(`${path}: view length ${a?.length} vs ${b?.length}`);
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return problems.push(`${path}[${i}]: ${a[i]} vs ${b[i]}`);
    }
    return;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return problems.push(`${path}: array length`);
    for (let i = 0; i < a.length; i++) same(a[i], b[i], `${path}[${i}]`, problems);
    return;
  }
  if (a && typeof a === "object") {
    for (const k of Object.keys(a)) same(a[k], b?.[k], `${path}.${k}`, problems);
    return;
  }
  if (a !== b) problems.push(`${path}: ${a} vs ${b}`);
}

const { revive } = await import(
  `data:text/javascript;base64,${Buffer.from(REVIVE_SOURCE).toString("base64")}`
);

const report = [];
for (const lang of DOCS_BUNDLE) {
  const mod = await import(pathToFileURL(join(root, "languages", lang, "dist/index.js")).href);
  const { payload, side } = encode(mod.grammar);
  const problems = [];
  same(mod.grammar, revive(payload, side), lang, problems);
  if (problems.length > 0) {
    throw new Error(`revive mismatch for ${lang}:\n  ${problems.slice(0, 8).join("\n  ")}`);
  }
  const file = join(out_dir, `revive-${lang}.js`);
  writeFileSync(
    file,
    `${REVIVE_SOURCE}\nconst PAYLOAD = ${JSON.stringify(payload)};\nconst SIDE = ${JSON.stringify(side)};\nexport const grammar = revive(PAYLOAD, SIDE);\n`,
  );
  report.push([lang, payload.length, JSON.stringify(side).length]);
}

process.stdout.write("revive modules written (base64 chars, side json bytes)\n");
for (const [l, p, s] of report) process.stdout.write(`  ${l.padEnd(12)} ${p} ${s}\n`);
