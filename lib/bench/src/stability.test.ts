import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { tokenize as raw_tokenize, visible_text } from "@twinkleplop/core";
import type {
  AnnotationPlugin,
  CompiledGrammar,
  LanguageFactory,
  TokenizeResult,
} from "@twinkleplop/core";

interface LanguageModule {
  grammar?: CompiledGrammar;
  tokenize?: LanguageFactory;
}

const modules = import.meta.glob<LanguageModule>("../../../languages/*/src/index.ts", {
  eager: true,
});
const fixture_dir = join(import.meta.dirname, "../perf/corpus/fixtures");
const fixtures = readdirSync(fixture_dir);

function cut_points(length: number): number[] {
  const cuts: number[] = [];
  const dense = Math.min(length, 400);
  for (let cut = 1; cut <= dense; cut++) cuts.push(cut);
  const step = Math.max(1, Math.floor((length - dense) / 300));
  for (let cut = dense + step; cut < length; cut += step) cuts.push(cut);
  return cuts;
}

function settled(result: TokenizeResult, end: number): string[] {
  const out: string[] = [];
  const { tokens, token_types } = result;
  for (let t = 0; t < tokens.length && tokens[t + 2] <= end; t += 3) {
    out.push(`${token_types[tokens[t]]} ${tokens[t + 1]} ${tokens[t + 2]}`);
  }
  return out;
}

const languages = Object.keys(modules)
  .sort()
  .map((path) => {
    const name = path.split("/").at(-3)!;
    const file = fixtures.find((entry) => entry.startsWith(name + "."));
    return { name, module: modules[path], file };
  })
  .filter((entry) => entry.file !== undefined);

const read = (file: string) => readFileSync(join(fixture_dir, file), "utf8");

// every prefix of a document must agree with the whole document up to its stable_end
describe("stable_end holds for every grammar", () => {
  for (const { name, module, file } of languages) {
    const grammar = module.grammar;
    if (grammar === undefined) continue;

    test(name, () => {
      const source = read(file!);
      const full = raw_tokenize(source, grammar);
      let furthest = 0;
      for (const cut of cut_points(source.length)) {
        const open = raw_tokenize(source.slice(0, cut), grammar, null, true);
        const end = open.stable_end!;
        expect(end).toBeLessThanOrEqual(cut);
        expect(settled(open, end), `${name} cut at ${cut}, stable_end ${end}`).toEqual(
          settled(full, end),
        );
        if (end > furthest) furthest = end;
      }
      // a grammar that never settles would pass trivially
      expect(furthest).toBeGreaterThan(source.length / 2);
    });
  }
});

// passes known to wait for text that has not arrived, a new one fails the suite
const WAITS_FOR_A_CLOSER: Record<string, string> = {
  javascript: "a tagged template body is embedded once its closing backtick arrives",
  svelte: "the braces of a block tag are retagged once the tag closes",
};

describe("stable_end holds through the always-on pipeline", () => {
  for (const { name, module, file } of languages) {
    if (module.tokenize === undefined) continue;
    const language = module.tokenize({ fidelity: "low" });
    const run = name in WAITS_FOR_A_CLOSER ? test.fails : test;

    run(name, () => {
      const source = read(file!);
      const full = language(source);
      for (const cut of cut_points(source.length)) {
        const open = language(source.slice(0, cut), { open: true });
        const end = open.stable_end!;
        expect(settled(open, end), `${name} cut at ${cut}, stable_end ${end}`).toEqual(
          settled(full, end),
        );
      }
    });
  }
});

// multi-character comment openers outside embedded code
const COMMENT_OPENERS: Record<string, string[]> = {
  c: ["//", "/*"],
  cpp: ["//", "/*"],
  css: ["/*"],
  go: ["//", "/*"],
  html: ["<!--"],
  javascript: ["//", "/*"],
  jsonc: ["//", "/*"],
  mdsvex: ["<!--"],
  powershell: ["<#"],
  rust: ["//", "/*"],
  sql: ["--", "/*"],
  svelte: ["<!--"],
  tsx: ["//", "/*"],
  typescript: ["//", "/*"],
};

const noop: AnnotationPlugin = { verbs: ["noop"], handle: () => ({}) };

describe("a comment opener is undecided from its first character", () => {
  for (const { name, module } of languages) {
    const openers = COMMENT_OPENERS[name];
    if (openers === undefined || module.tokenize === undefined) continue;
    const language = module.tokenize({ annotation: { plugins: [noop] } });

    test(name, () => {
      for (const opener of openers) {
        const whole = "a\n" + opener;
        const hidden = visible_text(whole, language(whole, { open: true }));
        expect(hidden, opener).not.toContain(opener);
        for (let length = 1; length < opener.length; length++) {
          const input = "a\n" + opener.slice(0, length);
          const open = language(input, { open: true });
          expect(open.overlays?.undecided, input).toBe(2);
          expect(open.stable_end, input).toBeLessThanOrEqual(2);
          expect(visible_text(input, open), input).toBe(hidden);
          expect(language(input).overlays, input).toBeUndefined();
        }
      }
    });
  }
});

// cut points where the full pipeline changed a token before stable_end
function drift(
  language: (input: string, call?: { open?: boolean }) => TokenizeResult,
  source: string,
) {
  const full = language(source);
  let moved = 0;
  let cuts = 0;
  for (const cut of cut_points(source.length)) {
    const open = language(source.slice(0, cut), { open: true });
    const end = open.stable_end!;
    const a = settled(open, end);
    const b = settled(full, end);
    cuts++;
    if (a.length !== b.length || a.some((entry, i) => entry !== b[i])) moved++;
  }
  return { moved, cuts };
}

test.skipIf(!process.env.STABILITY_REPORT)("report: full fidelity drift per language", () => {
  const rows: string[] = [];
  for (const { name, module, file } of languages) {
    if (module.tokenize === undefined) continue;
    const { moved, cuts } = drift(module.tokenize(), read(file!));
    rows.push(`${name.padEnd(14)} ${String(moved).padStart(4)} of ${cuts}`);
  }
  process.stdout.write(
    "\ncuts where a token before stable_end later changed\n" + rows.join("\n") + "\n",
  );
});
