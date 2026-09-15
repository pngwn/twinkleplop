// svelte-aware `create_twoslasher` — wraps twoslash's base factory with a
// preprocessing pass that runs svelte2tsx on the input before handing it
// to the TS language service. Positions in the twoslash result are then
// remapped back into the original .svelte source via the SourceMap built
// by `generate_source_map`.
//
// Ported from twoslashes/twoslash#57 (Hugos68). Translated from TS → JS.
// The behavior is identical: same filter rules, same compilerOptions
// type roots (the svelte2tsx-bundled shims), same keepNotations plumbing.

import { createRequire } from "node:module";
import { join } from "node:path";
import { svelte2tsx } from "svelte2tsx";
import {
  createTwoslasher as createBaseTwoslasher,
  defaultCompilerOptions,
  defaultHandbookOptions,
  findFlagNotations,
  findQueryMarkers,
} from "twoslash";
import { createPositionConverter, removeCodeRanges, resolveNodePositions } from "twoslash-protocol";
import ts from "typescript";
import type { CompilerOptions } from "typescript";

import { generate_source_map } from "./source-map.js";
import type {
  TwoslashInstance,
  TwoslashExecuteOptions,
  CreateTwoslashOptions,
  CompilerOptionDeclaration,
  NodeTag,
  Range,
  TwoslashNode,
} from "twoslash";
/**
 * Advance a generator/iterator N steps and return the Nth item (or
 * undefined if the iterator is shorter). Used because SourceMap returns
 * iterables from `toGeneratedLocation` / `toSourceLocation`.
 */
function get<T>(iterator: IterableIterator<T> | Generator<T>, index: number): T | undefined {
  for (const item of iterator) {
    if (index-- === 0) return item;
  }
  return undefined;
}

/**
 * Create a twoslash instance with added Svelte support. Pass-through for
 * any non-svelte extension, so this is a drop-in replacement for the base
 * `createTwoslasher`.
 */
export function create_twoslasher(
  create_options: CreateTwoslashOptions & { debugShowGeneratedCode?: boolean } = {},
): TwoslashInstance {
  const require = createRequire(import.meta.url);
  const base_twoslasher = createBaseTwoslasher(create_options);

  function twoslasher(code: string, extension?: string, options: TwoslashExecuteOptions = {}) {
    if (extension !== "svelte") {
      return base_twoslasher(code, extension, options);
    }

    // third-party interface properties stay camelCase for compatibility

    const compiler_options: CompilerOptions = {
      ...defaultCompilerOptions,
      ...options.compilerOptions,
    };
    const handbook_options = {
      ...defaultHandbookOptions,
      // svelte2tsx produces a lot of trailing type gymnastics that
      // TypeScript will complain about under strict settings. Cut
      // errors that land in removed ranges so we only surface ones
      // tied to user code.
      noErrorsCutted: true,
      ...options.handbookOptions,
    };

    // query markers live in the *svelte* text, not the generated tsx,
    // so parse them against the original source.
    const source_meta = findQueryMarkers(
      code,
      {
        removals: /** @type {import("twoslash-protocol").Range[]} */ ([]),
        positionCompletions: /** @type {number[]} */ ([]),
        positionQueries: /** @type {number[]} */ ([]),
        positionHighlights:
          /** @type {import("twoslash").TwoslashReturnMeta["positionHighlights"]} */ ([]),
      },
      createPositionConverter(code),
    );

    const custom_tags = options.customTags ?? create_options.customTags ?? [];
    const option_declarations: CompilerOptionDeclaration[] = (ts as any).optionDeclarations;

    const flag_notations = findFlagNotations(code, custom_tags, option_declarations);

    // tag comments are blanked before svelte2tsx runs, so the base twoslasher
    // never sees them; their nodes get built here in svelte space instead.
    const tag_nodes: NodeTag[] = [];

    for (const flag of flag_notations) {
      switch (flag.type) {
        case "unknown":
          continue;
        case "compilerOptions":
          compiler_options[flag.name] = flag.value;
          break;
        case "handbookOptions":
          // @ts-expect-error -- dynamic
          handbook_options[flag.name] = flag.value;
          break;
        case "tag":
          tag_nodes.push({
            type: "tag",
            name: flag.name,
            // once the comment is removed its end is the start of the line
            // the tag annotates.
            start: flag.end,
            length: 0,
            text: typeof flag.value === "string" ? flag.value : undefined,
            line: 0,
            character: 0,
          });
          break;
      }
      source_meta.removals.push([flag.start, flag.end]);
    }

    // replace every non-whitespace char in a removal range with a
    // space. Preserves offsets (important for the source map) but
    // makes the content invisible to svelte2tsx.
    let stripped_code = code;
    for (const [start, end] of source_meta.removals) {
      stripped_code =
        stripped_code.slice(0, start) +
        stripped_code.slice(start, end).replace(/\S/g, " ") +
        stripped_code.slice(end);
    }

    const compiled = svelte2tsx(stripped_code);
    // svelte2tsx prepends `///<reference types="svelte" />`. Twoslash's
    // vfs doesn't traverse node_modules, so the directive fails to
    // resolve even when `svelte` is installed. We satisfy the same
    // need by passing the svelte types file path explicitly via
    // compilerOptions.types below, and blank out the triple-slash
    // line here so TS doesn't error on the unresolved reference.
    // replace with spaces to preserve source-map offsets.
    const REF_DIRECTIVE = /^\/\/\/<reference types="svelte" \/>/;
    const ref_match = compiled.code.match(REF_DIRECTIVE);
    if (ref_match) {
      compiled.code = " ".repeat(ref_match[0].length) + compiled.code.slice(ref_match[0].length);
    }
    const map = generate_source_map(stripped_code, compiled.code, compiled.map.mappings);

    function get_last_generated_offset(pos: number) {
      const offsets = [...map.toGeneratedLocation(pos)];
      if (!offsets.length) return undefined;
      return offsets[offsets.length - 1]?.[0];
    }

    // svelte2tsx bundles a set of .d.ts files next to its main entry.
    // we point TypeScript's types array at them so $$props, $$slots,
    // on:* handlers, etc. resolve inside the generated tsx.
    // we also include svelte's own types so runes like $state /
    // $derived / $props get proper hover info. svelte2tsx's
    // generated code starts with `///<reference types="svelte" />`
    // which only resolves if the TS program can find the package —
    // because twoslash's vfs doesn't traverse node_modules, we
    // supply the file path explicitly here.
    const svelte2tsx_path = require.resolve("svelte2tsx");
    const svelte_types_path = join(
      require.resolve("svelte/package.json"),
      "..",
      "types",
      "index.d.ts",
    );
    const result = base_twoslasher(compiled.code, "tsx", {
      ...options,
      compilerOptions: {
        types: [
          join(svelte2tsx_path, "..", "svelte-jsx"),
          join(svelte2tsx_path, "..", "svelte-jsx-v4"),
          join(svelte2tsx_path, "..", "svelte-shims"),
          join(svelte2tsx_path, "..", "svelte-shims-v4"),
          svelte_types_path,
        ],
        ...compiler_options,
      },
      handbookOptions: {
        ...handbook_options,
        // tell base twoslash to leave notations alone — we handle
        // removal after remapping positions, so it can operate on
        // the svelte source rather than the generated tsx.
        keepNotations: true,
      },
      positionCompletions: source_meta.positionCompletions
        .map((p) => get_last_generated_offset(p))
        .filter((v) => v != null),
      positionQueries: source_meta.positionQueries
        .map((p) => get(map.toGeneratedLocation(p), 0)?.[0])
        .filter((v) => v != null),
      positionHighlights: source_meta.positionHighlights
        .map(
          ([start, end]) =>
            [
              get(map.toGeneratedLocation(start), 0)?.[0],
              get(map.toGeneratedLocation(end), 0)?.[0],
            ] as [number, number],
        )
        .filter((x) => x?.[0] != null && x?.[1] != null),
    });

    if (create_options.debugShowGeneratedCode) {
      return result;
    }

    // map twoslash node positions back to the svelte source. Drop any
    // node whose range can't be mapped (svelte2tsx wrapper boilerplate),
    // and drop `any` hovers, which are overwhelmingly noise.
    const mapped_nodes: TwoslashNode[] = result.nodes
      .map((node) => {
        if ("text" in node && node.text === "any") return undefined;
        const start_map = get(map.toSourceLocation(node.start), 0);
        if (!start_map) return undefined;
        const start = start_map[0];
        let end = get(map.toSourceLocation(node.start + node.length), 0)?.[0];
        // fallback: if the end position doesn't map, and the start
        // mapping sits at the beginning of a mapped source range,
        // use the end of that same range.
        if (end == null && start_map[1].sourceOffsets[0] === start_map[0]) {
          end = start_map[1].sourceOffsets[1];
        }
        if (end == null || start < 0 || end < 0 || start > end) {
          return undefined;
        }
        return {
          ...node,
          target: code.slice(start, end),
          start,
          length: end - start,
        };
      })
      .filter((v) => v != null);

    mapped_nodes.push(...tag_nodes);

    // remap twoslash's own removals (things it cut from the tsx) and
    // concat them with our svelte-source removals so the full list of
    // ranges-to-strip is in svelte space.
    const mapped_removals: Range[] = [
      ...source_meta.removals,
      ...result.meta.removals
        .map((r) => {
          const start =
            get(map.toSourceLocation(r[0]), 0)?.[0] ?? code.match(/(?<=<script[\s\S]*>\s)/)?.index;
          const end = get(map.toSourceLocation(r[1]), 0)?.[0];
          if (start == null || end == null || start < 0 || end < 0 || start >= end) {
            return undefined;
          }
          return [start, end] as Range;
        })
        .filter((v) => v != null),
    ];

    if (!options.handbookOptions?.keepNotations) {
      const removed = removeCodeRanges(code, mapped_removals, mapped_nodes);
      result.code = removed.code;
      result.meta.removals = removed.removals;
      result.nodes = resolveNodePositions(removed.nodes, result.code);
    } else {
      result.code = code;
      // line/character still come from the generated tsx, so redo them against
      // the svelte source the offsets were just mapped into.
      result.nodes = resolveNodePositions(mapped_nodes, code);
      result.meta.removals = mapped_removals;
    }

    // dedupe nodes that landed on the same position — svelte2tsx's
    // source map often emits two hovers at the same character when a
    // template expression gets wrapped.
    result.nodes = result.nodes.filter((node, index) => {
      const next = result.nodes[index + 1];
      if (!next) return true;
      if (next.type === node.type && next.start === node.start) return false;
      return true;
    });
    result.meta.extension = "svelte";

    return result;
  }

  twoslasher.getCacheMap = base_twoslasher.getCacheMap;
  return /** @type {import("twoslash").TwoslashInstance} */ (twoslasher);
}
