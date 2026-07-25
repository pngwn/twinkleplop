// frozen corpus loader.
//
// the corpus files are checked in and hashed. both arms of an A/B read the
// same bytes from the same place, and the report records the corpus hash so
// a comparison against a report built from a different corpus is rejected
// rather than silently believed.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const corpus_dir = join(here, "corpus");

const manifest = JSON.parse(readFileSync(join(corpus_dir, "manifest.json"), "utf8"));

const cache = new Map();

function load(entry) {
  const key = `${entry.family}/${entry.file}`;
  if (!cache.has(key)) {
    const text = readFileSync(join(corpus_dir, entry.family, entry.file), "utf8");
    const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
    if (hash !== entry.hash) {
      throw new Error(
        `corpus file ${key} does not match the manifest (${hash} != ${entry.hash}).\n` +
          `the corpus is frozen; regenerate it with bin/build-corpus.mjs and re-capture baselines.`,
      );
    }
    cache.set(key, text);
  }
  return cache.get(key);
}

export const CORPUS_HASH = manifest.corpus_hash;
export const FAMILIES = ["micro", "fixtures", "real", "scale"];

/**
 * @param {{families?: string[], languages?: string[]}} filter
 * @returns {{family: string, lang: string, file: string, bytes: number, id: string, source: string}[]}
 */
export function corpus(filter = {}) {
  const families = filter.families ?? FAMILIES;
  const languages = filter.languages ?? null;
  return manifest.entries
    .filter((e) => families.includes(e.family))
    .filter((e) => languages === null || languages.includes(e.lang))
    .map((e) => ({
      family: e.family,
      lang: e.lang,
      file: e.file,
      bytes: e.bytes,
      lines: e.lines,
      stem: e.file.replace(/\.[^.]+$/, ""),
      id: `${e.family}/${e.file.replace(/\.[^.]+$/, "")}`,
      get source() {
        return load(e);
      },
    }));
}

export function corpus_summary() {
  const by_family = {};
  for (const e of manifest.entries) {
    by_family[e.family] ??= { files: 0, bytes: 0 };
    by_family[e.family].files++;
    by_family[e.family].bytes += e.bytes;
  }
  return { corpus_hash: CORPUS_HASH, by_family };
}
