// commutativity check for the OPTIONAL fidelity layer.
//
// the grammar strip refactor split the pipeline into three layers:
//
//   1. correctness passes — always on; fix things the grammar couldn't emit
//      correctly (type_alias_rules, reclassify_generics, …)
//   2. restoration passes — always on BY DEFAULT; restore the fidelity the
//      grammar used to emit directly (promote_*_booleans, promote_pascal_case,
//      promote_*_primitive_types, promote_call_site_functions, etc). the
//      user can disable these for a "low fidelity" tier. they are internally
//      ordered (e.g. booleans before pascal_case in Python because True/False
//      start with uppercase).
//   3. optional fidelity passes — user-selectable extras that layer richer
//      classification on top (function_variable_rules, class_name_promoter,
//      extend_lifetime_over_type, …).
//
// this check verifies that the OPTIONAL fidelity passes commute on top of
// "correctness + restoration" (applied as one unit). if that holds, the API
// surface can be "select any subset of optional flags" with no ordering
// caveats.

import { tokenize, reclassify } from "@twinkleplop/core";
import { grammar as js_grammar, reclassifiers as js_reclassifiers } from "@twinkleplop/javascript";
import { grammar as py_grammar, reclassifiers as py_reclassifiers } from "@twinkleplop/python";
import { grammar as rs_grammar, reclassifiers as rs_reclassifiers } from "@twinkleplop/rust";
import {
  grammar as svelte_grammar,
  reclassifiers as svelte_reclassifiers,
} from "@twinkleplop/svelte";

import {
  medium_js,
  large_js,
  complex_js,
  python_medium,
  python_large,
  rust_medium,
  rust_large,
} from "./samples.js";

// split each language's reclassifier array into (base, optional). base is
// the "always-on" prefix (correctness + restoration). optional is the
// fidelity passes that layer on top — this is what the commutativity
// property needs to hold over.
//
// the split indices are hand-picked based on the current reclassifiers.ts
// ordering in each language. keep them in sync as pipelines change.
const LANGS = [
  {
    name: "javascript",
    grammar: js_grammar,
    reclassifiers: js_reclassifiers,
    base_count: 2, // promote_boolean_literals, promote_call_site_functions
    optional_labels: [
      "function_variable_rules",
      "interface_member_promoter",
      "class_name_promoter",
      "embed_interleaved",
    ],
    samples: [
      { name: "medium_js", src: medium_js },
      { name: "large_js", src: large_js },
      { name: "complex_js", src: complex_js },
      {
        name: "adversarial_js",
        src: `
class Foo extends Bar {
	name = "default";
	render = () => this.show(new User());
	method() { return class_name_handler(Baz, pkg.Qux); }
}
interface Handler { method(): Promise<User>; value: string; }
const tpl = html\`<div class="\${variant}">\${new Foo().render()}</div>\`;
const styled = css\`.x { color: var(--fg); }\`;
const asName = obj.method as Fn;
const satisfiesType = {} satisfies Config;
`,
      },
    ],
  },
  {
    name: "python",
    grammar: py_grammar,
    reclassifiers: py_reclassifiers,
    // base: promote_booleans, promote_builtins, promote_pascal_case,
    // type_alias_rules. optional: promote_function_calls.
    base_count: 4,
    optional_labels: ["promote_python_function_calls"],
    samples: [
      { name: "python_medium", src: python_medium },
      { name: "python_large", src: python_large },
    ],
  },
  {
    name: "rust",
    grammar: rs_grammar,
    reclassifiers: rs_reclassifiers,
    // base: promote_booleans, promote_primitive_types, promote_pascal_case,
    // reclassify_generics. optional: function_call_rules, extend_lifetime.
    base_count: 4,
    optional_labels: ["function_call_rules", "extend_lifetime_over_type"],
    samples: [
      { name: "rust_medium", src: rust_medium },
      { name: "rust_large", src: rust_large },
      {
        name: "adversarial_rust",
        src: `
fn apply<'a>(x: &'a str) -> &'a str { x }
fn call_via_lifetime<'b>(f: &'b Foo) -> &'b str { f.name() }
let y = &'static str_fn();
let z: &'a Vec<i32> = &data;
macro_rules! make { ($n:ident) => { fn $n() { println!("{}", stringify!($n)); } } }
make!(generated);
let r = generated::<String>();
`,
      },
    ],
  },
  {
    name: "svelte",
    grammar: svelte_grammar,
    reclassifiers: svelte_reclassifiers,
    // base: none (rewrite_block_braces + embed_grammars are both fidelity
    // and user-toggleable). treat both as optional.
    base_count: 0,
    optional_labels: ["rewrite_block_braces", "embed_grammars"],
    samples: [
      {
        name: "svelte_component",
        src: `<script>\n  let count = 0;\n  function inc() { count += 1; }\n</script>\n<style>\n  button { color: red; }\n</style>\n<button on:click={inc}>\n  {#if count > 0}\n    Count is {count}\n  {:else}\n    Start\n  {/if}\n</button>\n{@html '<b>x</b>'}\n`,
      },
    ],
  },
];

function split_reclassifiers(lang) {
  const base = lang.reclassifiers.slice(0, lang.base_count);
  const optional = [];
  for (let i = lang.base_count; i < lang.reclassifiers.length; i++) {
    const label = lang.optional_labels[i - lang.base_count] ?? `pass_${i}`;
    optional.push({ pass: lang.reclassifiers[i], label });
  }
  return { base, optional };
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

function subsets(arr) {
  const result = [[]];
  for (const item of arr) {
    const n = result.length;
    for (let i = 0; i < n; i++) {
      result.push([...result[i], item]);
    }
  }
  return result;
}

function fingerprint(_src, result) {
  const out = [];
  for (let i = 0; i < result.tokens.length; i += 3) {
    const type_name = result.token_types[result.tokens[i]];
    const start = result.tokens[i + 1];
    const end = result.tokens[i + 2];
    out.push(`${type_name}|${start}|${end}`);
  }
  return out.join("\n");
}

function clone_tokens(result) {
  return {
    tokens: new Uint32Array(result.tokens),
    token_types: result.token_types.slice(),
  };
}

function apply_pipeline(src, corrected, passes) {
  const input = clone_tokens(corrected);
  const pipeline = reclassify(passes);
  return pipeline(src, input);
}

function subset_label(subset) {
  return subset.map((s) => s.label).join(" + ") || "(empty)";
}

function check_language(lang) {
  const { base, optional } = split_reclassifiers(lang);
  const base_pipeline = reclassify(base);

  console.log(`\n=== ${lang.name} ===`);
  console.log(`  base passes: ${base.length}`);
  console.log(
    `  optional passes: ${optional.length} (${optional.map((o) => o.label).join(", ") || "—"})`,
  );

  if (optional.length < 2) {
    console.log(`  → trivially commutative (< 2 optional passes)`);
    return { lang: lang.name, status: "trivial" };
  }

  const issues = [];

  for (const sample of lang.samples) {
    const raw = tokenize(sample.src, lang.grammar);
    const corrected = base_pipeline(sample.src, raw);

    for (const subset of subsets(optional)) {
      if (subset.length < 2) continue;
      const perms = permutations(subset);
      const fingerprints = new Map();
      for (const perm of perms) {
        const result = apply_pipeline(
          sample.src,
          corrected,
          perm.map((p) => p.pass),
        );
        const fp = fingerprint(sample.src, result);
        const order = perm.map((p) => p.label).join(" → ");
        if (!fingerprints.has(fp)) fingerprints.set(fp, []);
        fingerprints.get(fp).push(order);
      }
      if (fingerprints.size === 1) continue;
      issues.push({
        sample: sample.name,
        subset: subset_label(subset),
        groupings: [...fingerprints.values()],
      });
    }
  }

  if (issues.length === 0) {
    console.log(`  ✓ all optional subsets commute across all samples`);
    return { lang: lang.name, status: "commutative" };
  }
  console.log(`  ✗ ${issues.length} non-commutative case(s):`);
  for (const iss of issues) {
    console.log(`    [${iss.sample}] ${iss.subset}`);
    for (let i = 0; i < iss.groupings.length; i++) {
      console.log(`       group ${i + 1}: ${iss.groupings[i].join("  ;  ")}`);
    }
  }
  return { lang: lang.name, status: "non-commutative", issues };
}

const summary = [];
for (const lang of LANGS) {
  summary.push(check_language(lang));
}

console.log("\n=== summary ===");
for (const s of summary) {
  console.log(`  ${s.lang}: ${s.status}`);
}
