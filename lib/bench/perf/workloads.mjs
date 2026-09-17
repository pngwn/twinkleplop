// workload definitions.
//
// one spec, instantiated once per arm. both arms therefore run the same
// corpus text through the same entry points in the same order, and a
// workload that cannot be built on one arm is reported as a surface
// mismatch instead of being quietly skipped on that side.
//
// the modes exist to keep every consumer-visible path covered. a change that
// speeds up `tokenize` while slowing `html`, or that speeds up the default
// pipeline by moving work into `bind`, is not a win, and the only way to see
// that is to measure all of them.
//
//   tokenize    core.tokenize(src, grammar) - the grammar state machine on
//               its own. no reclassifiers, no rendering.
//   pipeline    lang.tokenize()(src) - tokenize plus the language's default
//               reclassifier stack. this is the plugin path: every language
//               package plugs its passes in here, and a gain that does not
//               show up in this column is a gain in a codepath consumers do
//               not use.
//   html        lang.language()(src) - the full string-in string-out path
//               most consumers actually call.
//   fidelity    lang.tokenize({fidelity: "low"})(src) - the opt-out tier.
//   annotation  the overlay extractor path.
//   compile     compile(raw_grammar) - paid once per process at import.
//   bind        lang.tokenize(opts) - per-configuration setup, paid by any
//               consumer that rebinds (per-block fidelity, per-request SSR).

import { corpus } from "./corpus.mjs";

// languages whose packages export a full pipeline. `whitespace` ships only a
// grammar, so it takes part in `tokenize` and `compile` only.
const HAS_PIPELINE = (lang_mod) => typeof lang_mod?.tokenize === "function";
const HAS_HTML = (lang_mod) => typeof lang_mod?.language === "function";

// the six languages with the heaviest reclassifier stacks. used where a
// mode is too expensive to run across all eighteen.
export const HEADLINE = ["typescript", "javascript", "svelte", "markdown", "rust", "go"];

export const SUITES = {
  // fast signal while iterating. not sufficient evidence for a claim.
  quick: {
    families: ["real"],
    languages: HEADLINE,
    modes: ["tokenize", "pipeline", "html"],
  },
  // the default. every language, the two families that represent real
  // consumer input, all three main paths.
  core: {
    families: ["micro", "real"],
    languages: null,
    modes: ["tokenize", "pipeline", "html"],
    extra: { fixtures: ["tokenize", "pipeline"] },
  },
  // everything, including the synthetic scale tier and the setup paths.
  full: {
    families: ["micro", "fixtures", "real", "scale", "sized", "upstream"],
    languages: null,
    modes: ["tokenize", "pipeline", "html", "fidelity"],
    setup: true,
    annotation: true,
  },
  // scaling only: how cost grows with input length.
  scale: {
    families: ["scale"],
    languages: null,
    modes: ["tokenize", "pipeline", "html"],
  },
  // what CI runs on every pull request.
  //
  // `core` plus `upstream`. the upstream family is inputs we did not choose,
  // so including it here is the cheapest available guard against a change
  // that is only a win on the corpus we wrote: a gain that shows up on
  // micro/real and vanishes on upstream is a gain on our own file habits,
  // not on the language. it is small (21KB over 16 languages), so it costs
  // little to carry.
  //
  // deliberately does NOT include `sized`. the size tiers repeat their
  // sources, and 54 mostly-redundant workloads would dilute every group
  // geomean the PR comment reports without adding independent evidence.
  // they are measured, but by the comparison runner, for the charts.
  ci: {
    families: ["micro", "real", "upstream"],
    languages: null,
    modes: ["tokenize", "pipeline", "html"],
    extra: { fixtures: ["tokenize", "pipeline"] },
  },
  // the published comparison charts' own inputs, for when a chart moves and
  // the question is whether the library moved or the chart did.
  sized: {
    families: ["sized"],
    languages: null,
    modes: ["tokenize", "pipeline", "html"],
  },
};

// equivalent plugins to @twinkleplop/annotation's, defined here rather than
// imported, so the plugin set is identical on both arms by construction: the
// thing under test is the extractor in core, not the plugins' own bodies, and
// a reference arm built at an older commit need not have shipped the same set.
const ANNOTATION_PLUGINS = [
  {
    verbs: ["em", "hl", "dim"],
    handle: ({ verb, range }) => ({
      overlays: [{ kind: "token", range, classes: [`tp-${verb}`] }],
    }),
  },
  {
    verbs: ["add", "del", "mod"],
    handle: ({ verb, range }) => ({
      overlays: [{ kind: "line", range, classes: [`tp-diff-${verb}`] }],
    }),
  },
  {
    verbs: ["err", "warn", "info"],
    handle: ({ verb, range, args }) => ({
      overlays: [
        {
          kind: "token",
          range,
          classes: [`tp-diag-${verb}`],
          data: { message: String(args ?? "") },
        },
      ],
    }),
  },
];

function annotation_plugins() {
  return ANNOTATION_PLUGINS;
}

/**
 * Build the concrete callable workloads for one arm.
 *
 * Returns `{ id, family, lang, mode, bytes, run }` entries. `id` is stable
 * across arms and across runs, and is what the A/B engine pairs on.
 */
export function build_workloads(arm, suite_name = "core", filter = {}) {
  const suite = SUITES[suite_name];
  if (!suite)
    throw new Error(`unknown suite "${suite_name}" (have: ${Object.keys(SUITES).join(", ")})`);

  const languages = filter.languages ?? suite.languages;
  const out = [];
  const skipped = [];

  // the id keys the pairing between arms, so it has to distinguish two
  // corpus files of the same language (typescript has three) or they collide
  // and all but one silently vanish from the comparison.
  const push = (family, lang, stem, mode, bytes, run) => {
    out.push({ id: `${family}/${stem}:${mode}`, family, lang, stem, mode, bytes, run });
  };

  const families = filter.families ?? suite.families;
  const modes = filter.modes ?? suite.modes;

  const plan = [];
  for (const f of families) plan.push([f, modes]);
  for (const [f, m] of Object.entries(suite.extra ?? {})) {
    if (!families.includes(f)) plan.push([f, filter.modes ?? m]);
  }

  for (const [family, family_modes] of plan) {
    for (const entry of corpus({ families: [family], languages })) {
      const mod = arm.languages[entry.lang];
      if (!mod) {
        skipped.push(`${entry.id}: language not built on ${arm.label}`);
        continue;
      }
      const src = entry.source;

      for (const mode of family_modes) {
        switch (mode) {
          case "tokenize": {
            const { tokenize } = arm.core;
            const grammar = mod.grammar;
            if (!grammar) {
              skipped.push(`${entry.id}:tokenize: no grammar export`);
              break;
            }
            push(family, entry.lang, entry.stem, mode, entry.bytes, () => tokenize(src, grammar));
            break;
          }
          case "pipeline": {
            if (!HAS_PIPELINE(mod)) break;
            const fn = mod.tokenize();
            push(family, entry.lang, entry.stem, mode, entry.bytes, () => fn(src));
            break;
          }
          case "html": {
            if (!HAS_HTML(mod)) break;
            const fn = mod.language();
            push(family, entry.lang, entry.stem, mode, entry.bytes, () => fn(src));
            break;
          }
          case "fidelity": {
            if (!HAS_PIPELINE(mod)) break;
            const fn = mod.tokenize({ fidelity: "low" });
            push(family, entry.lang, entry.stem, mode, entry.bytes, () => fn(src));
            break;
          }
          case "annotation": {
            if (!HAS_PIPELINE(mod)) break;
            const plugins = annotation_plugins();
            const fn = mod.tokenize({ annotation: { plugins } });
            push(family, entry.lang, entry.stem, mode, entry.bytes, () => fn(src));
            break;
          }
          default:
            throw new Error(`unknown mode "${mode}"`);
        }
      }
    }
  }

  if (suite.annotation && !modes.includes("annotation")) {
    const plugins = annotation_plugins();
    for (const entry of corpus({
      families: ["real"],
      languages: ["typescript", "javascript", "markdown"],
    })) {
      const mod = arm.languages[entry.lang];
      if (!mod || !HAS_PIPELINE(mod)) continue;
      const src = entry.source;
      const fn = mod.tokenize({ annotation: { plugins } });
      push(entry.family, entry.lang, entry.stem, "annotation", entry.bytes, () => fn(src));
    }
  }

  // setup paths are per-language, not per-corpus-file.
  if (suite.setup) {
    const { compile } = arm.compiler;
    for (const [lang, mod] of Object.entries(arm.languages)) {
      if (languages !== null && !languages.includes(lang)) continue;
      if (mod.raw_grammar) {
        push("setup", lang, lang, "compile", 0, () => compile(mod.raw_grammar));
      }
      if (HAS_PIPELINE(mod)) {
        const make = mod.tokenize;
        push("setup", lang, lang, "bind", 0, () => make({ fidelity: "high" }));
      }
    }
  }

  return { workloads: out, skipped };
}
