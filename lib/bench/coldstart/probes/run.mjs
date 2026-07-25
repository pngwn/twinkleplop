// the child process. one cold start, one json line on stdout.
//
// everything here runs exactly once, unwarmed, which is the entire point:
// module parse, module evaluation and the first call of every function are
// what a cold start pays and what a steady-state benchmark deliberately
// discards. so this file must not loop, must not warm up, and must not
// import anything under test before the clock starts.
//
// `performance.now()` is measured from `timeOrigin`, which node sets at
// process start, so the first mark is the node boot cost the process paid
// before reaching user code.

import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const spec = JSON.parse(process.argv[2]);
const marks = [];
let last = 0;

function mark(name) {
  const now = performance.now();
  marks.push([name, now - last]);
  last = now;
  return now;
}

// stub mode replaces `compile` with a function that returns a shape every
// language's module body accepts without inspecting. it exists to subtract
// compile() from the import measurement: the same import, with and without
// the compiler running, differ by exactly the cold cost of compiling that
// language's grammar. every language index does
//   export const grammar = compile(raw_grammar)
//   export const tokenize = create_language(grammar, reclassifiers)
// and nothing reads the grammar at module scope, so the stub is inert.
if (spec.stub_compile) {
  const real = join(spec.root, "lib/core/dist/twinkleplop.compiler.js");
  const real_url = pathToFileURL(real).href;
  const shim_url = `${real_url}?coldstart-stub`;
  registerHooks({
    resolve(specifier, context, next_resolve) {
      if (specifier === "@twinkleplop/core/compile") {
        return { url: shim_url, shortCircuit: true, format: "module" };
      }
      return next_resolve(specifier, context);
    },
    load(url, context, next_load) {
      if (url !== shim_url) return next_load(url, context);
      return {
        format: "module",
        shortCircuit: true,
        source:
          `export * from ${JSON.stringify(real_url)};\n` +
          `export function compile() { return { token_types: [], name: "stub" }; }\n`,
      };
    },
  });
}

// the boot mark closes over node's own startup. it is reported separately
// because no change to this library can move it, and leaving it inside the
// import figures would flatter or damn every result by a constant.
mark("boot");

const core_path = join(spec.root, "lib/core/dist/twinkleplop.production.js");
const compiler_path = join(spec.root, "lib/core/dist/twinkleplop.compiler.js");

const loaded = {};

if (spec.preload_core) {
  await import(pathToFileURL(core_path).href);
  mark("core");
  await import(pathToFileURL(compiler_path).href);
  mark("compiler_entry");
}

for (const name of spec.langs ?? []) {
  const mod = await import(pathToFileURL(join(spec.root, "languages", name, "dist/index.js")).href);
  mark(`import:${name}`);
  loaded[name] = mod;
}

// arbitrary absolute paths, for measuring bundled artifacts that do not live
// under languages/. the key is what the mark is named.
for (const [name, file] of Object.entries(spec.files ?? {})) {
  const mod = await import(pathToFileURL(file).href);
  mark(`import:${name}`);
  loaded[name] = mod;
}

// a second compile of an already-compiled grammar. the compiler's code paths
// are warm by now, so this is a lower bound on the cold figure rather than
// the figure itself, and is reported as such.
if (spec.recompile) {
  const { compile } = await import(pathToFileURL(compiler_path).href);
  for (const name of spec.langs ?? []) {
    const raw = loaded[name]?.raw_grammar;
    if (!raw) continue;
    compile(raw);
    mark(`recompile:${name}`);
  }
}

// bind is `lang.tokenize(options)`. the first call per language is what a
// consumer that binds once pays; the repeats show how much of that first call
// was one-off tier-up rather than work the bind actually does.
//
// the three option shapes have different costs and different consumers. `high`
// skips the downgrade table entirely, `low` builds it, and an explicit
// allowlist builds it and a Set. per-block fidelity rebinds on every block, so
// which of these a consumer uses decides whether bind is amortised or not.
const BIND_SHAPES = [
  ["high", { fidelity: "high" }],
  ["low", { fidelity: "low" }],
  ["allow", { fidelity: ["function", "boolean"] }],
];

if (spec.bind > 0) {
  for (const name of spec.langs ?? []) {
    const make = loaded[name]?.tokenize;
    if (typeof make !== "function") continue;
    for (const [tag, options] of BIND_SHAPES) {
      make(options);
      mark(`bind1_${tag}:${name}`);
      for (let i = 0; i < spec.bind; i++) make(options);
      mark(`bindn_${tag}:${name}`);
    }
  }
}

// time to first highlight: the number a docs site's first paint actually
// waits on. source text is read before the clock segment so file io does not
// land inside the highlight mark.
if (spec.highlight) {
  for (const [name, file] of Object.entries(spec.highlight)) {
    const mod = loaded[name];
    if (typeof mod?.language !== "function") continue;
    const src = readFileSync(file, "utf8");
    mark(`read:${name}`);
    const render = mod.language();
    mark(`ttfh_bind:${name}`);
    const out = render(src);
    mark(`ttfh_render:${name}`);
    if (out.length === 0) throw new Error(`empty output for ${name}`);
    // repeats show the same call once v8 has seen it, which is what the
    // steady-state harness measures. the gap between the two is the cold tax.
    for (let i = 0; i < 20; i++) render(src);
    mark(`warm20:${name}`);
  }
}

process.stdout.write(
  `${JSON.stringify({ marks, total: performance.now(), rss: process.memoryUsage().rss })}\n`,
);
