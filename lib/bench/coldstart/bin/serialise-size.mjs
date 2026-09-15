// what would shipping the compiled grammar cost in bytes?
//
// question three of the cold start track: the compiled grammar is typed
// arrays and maps, so it could in principle be serialised into the bundle
// instead of computed at import. that trade is only worth taking if the bytes
// added are small next to the milliseconds saved, and the bytes added depend
// heavily on encoding, because the compiled form is mostly padding: the
// transition table is allocated at 256 rule slots per state and almost every
// slot stays at the 65535 sentinel.
//
// so this measures four encodings per language, each before and after
// compression, against the size of the module that computes the same thing
// today. no timing here; timing is coldstart.mjs.

import { brotliCompressSync, gzipSync } from "node:zlib";
import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { LANGUAGES } from "../scenarios.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");

const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const br = (buf) => brotliCompressSync(buf).length;

/** Every typed array in the compiled grammar, in a fixed order. */
function typed_arrays(g) {
  const out = [
    ["transitions", g.transitions],
    ["char_maps", g.char_maps],
    ["fallback_transitions", g.fallback_transitions],
  ];
  if (g.probe_mask) out.push(["probe_mask", g.probe_mask]);
  if (g.seal_flags) out.push(["seal_flags", g.seal_flags]);
  if (g.fallback_seal_flags) out.push(["fallback_seal_flags", g.fallback_seal_flags]);
  return out;
}

/**
 * Pack the typed arrays back to back.
 *
 * This is the smallest honest "ship the compiled form" encoding: no
 * delimiters, no keys, just the bytes the runtime already holds. It ignores
 * the Maps and Sets, which have to be encoded some other way, so it is a
 * lower bound on a real implementation rather than a proposal.
 */
function pack_binary(g) {
  const parts = typed_arrays(g).map(([, a]) => Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  return Buffer.concat(parts);
}

/** The side tables that are not typed arrays, as compact json. */
function side_tables(g) {
  return Buffer.from(
    JSON.stringify({
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
          b ? b.map((p) => [[...p.codes], p.length, p.rule_idx, !!p.boundary]) : 0,
        ),
      ]),
    }),
  );
}

function row(name, source_bytes, g) {
  const bin = pack_binary(g);
  const side = side_tables(g);
  const total_raw = bin.length + side.length;
  // base64 is what an inline string literal in a js module actually costs on
  // the wire, and it compresses far worse than the binary it encodes.
  const b64 = Buffer.from(bin.toString("base64"));
  const combined_gz = gz(Buffer.concat([bin, side]));
  const combined_br = br(Buffer.concat([bin, side]));
  return {
    name,
    states: g.states.size,
    source: source_bytes,
    source_gz: 0,
    binary: bin.length,
    side: side.length,
    total_raw,
    b64: b64.length + side.length,
    gz: combined_gz,
    br: combined_br,
    b64_gz: gz(Buffer.concat([b64, side])),
    b64_br: br(Buffer.concat([b64, side])),
  };
}

const rows = [];
for (const lang of LANGUAGES) {
  const dist = join(root, "languages", lang, "dist/index.js");
  let mod;
  try {
    mod = await import(pathToFileURL(dist).href);
  } catch {
    continue;
  }
  if (!mod.grammar) continue;
  const src_bytes = statSync(dist).size;
  const r = row(lang, src_bytes, mod.grammar);
  r.source_gz = gz(readFileSync(dist));
  rows.push(r);
}

const header = [
  "language",
  "states",
  "dist js",
  "dist gz",
  "binary",
  "side json",
  "raw total",
  "raw gz",
  "raw br",
  "b64 gz",
  "b64 br",
];
const body = rows.map((r) => [
  r.name,
  r.states,
  r.source,
  r.source_gz,
  r.binary,
  r.side,
  r.total_raw,
  r.gz,
  r.br,
  r.b64_gz,
  r.b64_br,
]);

const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
body.push([
  "TOTAL",
  sum("states"),
  sum("source"),
  sum("source_gz"),
  sum("binary"),
  sum("side"),
  sum("total_raw"),
  sum("gz"),
  sum("br"),
  sum("b64_gz"),
  sum("b64_br"),
]);

const widths = header.map((h, i) => Math.max(h.length, ...body.map((r) => String(r[i]).length)));
const line = (cells) =>
  `| ${cells.map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join(" | ")} |`;
process.stdout.write(`${line(header)}\n`);
process.stdout.write(
  `| ${widths.map((w, i) => (i === 0 ? "-".repeat(w) : `${"-".repeat(w - 1)}:`)).join(" | ")} |\n`,
);
for (const b of body) process.stdout.write(`${line(b)}\n`);
