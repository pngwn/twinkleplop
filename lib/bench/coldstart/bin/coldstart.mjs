// cold start measurement driver.
//
// the paired a/b harness under lib/bench/perf measures steady state: two arms
// in one process, interleaved, warmed up, ratios of medians. none of those
// properties survive contact with cold start, which happens once per process,
// before v8 has tiered anything up, and includes module parse and evaluation.
// so this is a separate instrument with weaker guarantees, and the findings
// document says so.
//
// what it does:
//   - one child process per sample. the thing being measured only happens
//     once per process, so a sample costs a process.
//   - scenarios are interleaved round robin, the way the a/b harness
//     interleaves arms, so machine drift over the run is common mode across
//     scenarios rather than concentrated in whichever ran last.
//   - the first rounds are discarded. they pay for filling the os page cache
//     with dist files, which a real deployment pays once per machine, not
//     once per request.
//   - the machine lock is taken for the whole run. other agents' benchmark
//     processes would otherwise land inside these samples, and a cold start
//     sample has no paired arm to cancel that against.
//
// what it cannot do: give a calibrated noise floor the way calibrate.mjs
// does. there is no a/a form of "import this module for the first time"
// within a process. the spread is reported per scenario and differences
// smaller than it mean nothing.

import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { acquire_bench_lock } from "../../perf/lock.mjs";
import { DOCS_BUNDLE, LANGUAGES, TTFH_LANGUAGES } from "../scenarios.mjs";
import { fmt_ms, summarise } from "../stats.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const coldstart_root = resolve(here, "..");
const local_root = resolve(here, "../../../..");
const probe = join(coldstart_root, "probes/run.mjs");

function parse_args(argv) {
  const out = {
    root: local_root,
    samples: 25,
    warmup: 5,
    mode: "survey",
    json: null,
    lock: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") out.root = resolve(argv[++i]);
    else if (a === "--samples") out.samples = Number(argv[++i]);
    else if (a === "--warmup") out.warmup = Number(argv[++i]);
    else if (a === "--mode") out.mode = argv[++i];
    else if (a === "--json") out.json = resolve(argv[++i]);
    else if (a === "--no-lock") out.lock = false;
    else throw new Error(`unknown flag ${a}`);
  }
  return out;
}

function run_child(spec) {
  return new Promise((res, rej) => {
    const started = process.hrtime.bigint();
    const child = spawn(
      process.execPath,
      // the compile cache would turn a cold start into a warm one and node
      // enables it implicitly in some setups. off, explicitly, so the number
      // means what it says.
      ["--no-warnings", probe, JSON.stringify(spec)],
      { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_COMPILE_CACHE: "" } },
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", rej);
    child.on("close", (code) => {
      const wall = Number(process.hrtime.bigint() - started) / 1e6;
      if (code !== 0) return rej(new Error(`probe exited ${code}\n${err}`));
      try {
        const parsed = out.trim() === "" ? { marks: [], total: NaN } : JSON.parse(out.trim());
        res({ wall, ...parsed });
      } catch (e) {
        rej(new Error(`bad probe output: ${out}\n${err}`));
      }
    });
  });
}

/**
 * Run every scenario `samples + warmup` times, interleaved.
 *
 * Round robin rather than scenario-at-a-time: if the machine slows down
 * halfway through the run, scenario-at-a-time attributes that slowdown to
 * whichever scenarios were scheduled late, and interleaving spreads it over
 * all of them where the median can reject it.
 */
async function measure(scenarios, { samples, warmup }) {
  const rows = new Map(scenarios.map((s) => [s.name, []]));
  const total_rounds = samples + warmup;
  for (let round = 0; round < total_rounds; round++) {
    for (const s of scenarios) {
      const r = await run_child(s.spec);
      if (round >= warmup) rows.get(s.name).push(r);
    }
    process.stderr.write(`\rround ${round + 1}/${total_rounds}   `);
  }
  process.stderr.write("\n");
  return rows;
}

function mark_series(results, name) {
  return results
    .map((r) => {
      const hit = r.marks.find((m) => m[0] === name);
      return hit ? hit[1] : NaN;
    })
    .filter(Number.isFinite);
}

function sum_marks(results, predicate) {
  return results.map((r) =>
    r.marks.filter((m) => predicate(m[0])).reduce((acc, m) => acc + m[1], 0),
  );
}

function table(header, rows) {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) =>
    `| ${cells.map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join(" | ")} |`;
  const sep = `| ${widths.map((w, i) => (i === 0 ? "-".repeat(w) : `${"-".repeat(w - 1)}:`)).join(" | ")} |`;
  return [line(header), sep, ...rows.map(line)].join("\n");
}

async function main() {
  const args = parse_args(process.argv.slice(2));
  if (!existsSync(join(args.root, "lib/core/dist/twinkleplop.production.js"))) {
    throw new Error(`${args.root} is not built. run pnpm build.`);
  }

  const scenarios = [];
  const push = (name, spec) => scenarios.push({ name, spec: { root: args.root, ...spec } });

  push("bare", { langs: [] });
  push("core", { preload_core: true, langs: [] });

  if (args.mode === "survey" || args.mode === "full") {
    for (const l of LANGUAGES) {
      push(`lang:${l}`, { preload_core: true, langs: [l], recompile: true, bind: 20 });
      push(`stub:${l}`, { preload_core: true, langs: [l], stub_compile: true });
    }
    push("docs-bundle", { preload_core: true, langs: DOCS_BUNDLE });
    push("docs-bundle-stub", { preload_core: true, langs: DOCS_BUNDLE, stub_compile: true });
  }

  // the bundled scenarios answer "how much of the unbundled figure is node's
  // own module resolution". a browser or edge consumer ships one chunk and
  // never pays it, so attributing it to this library would be wrong.
  if (args.mode === "bundle") {
    const artifacts = join(coldstart_root, ".artifacts");
    push("bundle-eager", { files: { docs: join(artifacts, "docs-bundle.js") } });
    push("bundle-lazy", { files: { docs: join(artifacts, "docs-lazy.js") } });
    push("bundle-dist", { files: { docs: join(artifacts, "docs-dist.js") } });
    push("docs-bundle", { preload_core: true, langs: DOCS_BUNDLE });
    push("docs-bundle-stub", { preload_core: true, langs: DOCS_BUNDLE, stub_compile: true });
  }

  // revive scenarios pair, per language, the cost of importing a module that
  // carries the compiled tables as base64 against the cost of importing the
  // real package and compiling. same process shape, same cold conditions.
  if (args.mode === "revive") {
    const artifacts = join(coldstart_root, ".artifacts");
    for (const l of DOCS_BUNDLE) {
      push(`revive:${l}`, {
        preload_core: true,
        files: { [l]: join(artifacts, `revive-${l}.js`) },
      });
      push(`lang:${l}`, { preload_core: true, langs: [l] });
      push(`stub:${l}`, { preload_core: true, langs: [l], stub_compile: true });
    }
  }

  if (args.mode === "ttfh" || args.mode === "full") {
    const micro = join(local_root, "lib/bench/perf/corpus/micro");
    for (const l of TTFH_LANGUAGES) {
      const f = pick_micro(micro, l);
      if (f) {
        push(`ttfh:${l}`, {
          preload_core: true,
          langs: [l],
          highlight: { [l]: f },
        });
      }
    }
  }

  const release = args.lock
    ? await acquire_bench_lock({ label: `coldstart:${args.mode}` })
    : () => {};
  let rows;
  try {
    rows = await measure(scenarios, args);
  } finally {
    release();
  }

  report(rows, args);
}

function pick_micro(dir, lang) {
  for (const ext of ["ts", "js", "md", "css", "json", "html", "sh"]) {
    const f = join(dir, `${lang}.${ext}`);
    if (existsSync(f)) return f;
  }
  return null;
}

function report(rows, args) {
  const get = (n) => rows.get(n) ?? [];
  const bare = get("bare");
  const bare_wall = summarise(bare.map((r) => r.wall));
  const bare_boot = summarise(mark_series(bare, "boot"));

  const out = [];
  out.push(`# cold start survey`);
  out.push("");
  out.push(`root: ${args.root}`);
  out.push(`node: ${process.version}  samples: ${args.samples} (+${args.warmup} discarded)`);
  out.push("");
  out.push(`## process floor`);
  out.push("");
  out.push(
    table(
      ["scenario", "wall ms", "iqr%", "in-proc ms"],
      [
        [
          "bare node",
          fmt_ms(bare_wall.median),
          bare_wall.iqr_pct.toFixed(0),
          fmt_ms(bare_boot.median),
        ],
        ...["core"].map((n) => {
          const r = get(n);
          const w = summarise(r.map((x) => x.wall));
          const c = summarise(mark_series(r, "core"));
          return [`+ @twinkleplop/core`, fmt_ms(w.median), w.iqr_pct.toFixed(0), fmt_ms(c.median)];
        }),
      ],
    ),
  );

  const lang_rows = [];
  const bind_rows = [];
  const us = (x) => (Number.isFinite(x) ? (x * 1000).toFixed(1) : "-");
  for (const l of LANGUAGES) {
    const full = get(`lang:${l}`);
    const stub = get(`stub:${l}`);
    if (full.length === 0) continue;
    const imp = summarise(mark_series(full, `import:${l}`));
    const imp_stub = summarise(mark_series(stub, `import:${l}`));
    const recompile = summarise(mark_series(full, `recompile:${l}`));
    lang_rows.push([
      l,
      fmt_ms(imp.median),
      fmt_ms(imp_stub.median),
      fmt_ms(imp.median - imp_stub.median),
      fmt_ms(recompile.median),
      imp.iqr_pct.toFixed(0),
    ]);

    const cells = [l];
    let any_bind = false;
    for (const tag of ["high", "low", "allow"]) {
      const first = summarise(mark_series(full, `bind1_${tag}:${l}`));
      const rest = summarise(mark_series(full, `bindn_${tag}:${l}`));
      if (Number.isFinite(first.median)) any_bind = true;
      cells.push(us(first.median), us(rest.median / 20));
    }
    if (any_bind) bind_rows.push(cells);
  }
  if (lang_rows.length > 0) {
    out.push("");
    out.push(`## per language, core already loaded`);
    out.push("");
    out.push(
      "`import` is module parse + evaluate + compile(). `stub` is the same import with compile() replaced by a no-op, so `cold compile` is the difference. `recompile` is a second compile of the same grammar in the same process, ie warm, a lower bound rather than the figure itself.",
    );
    out.push("");
    out.push(table(["language", "import", "stub", "cold compile", "recompile", "iqr%"], lang_rows));
  }
  if (bind_rows.length > 0) {
    out.push("");
    out.push(`## bind, microseconds`);
    out.push("");
    out.push(
      "`lang.tokenize(options)`. `1` is the first call in the process, `N` the mean of twenty more. `high` skips the downgrade table, `low` builds it, `allow` builds it from an explicit category list. a consumer that binds once pays column `1`; one that rebinds per block pays column `N`.",
    );
    out.push("");
    out.push(
      table(["language", "high 1", "high N", "low 1", "low N", "allow 1", "allow N"], bind_rows),
    );
  }

  const revive_rows = [];
  for (const l of DOCS_BUNDLE) {
    const rev = get(`revive:${l}`);
    if (rev.length === 0) continue;
    const full = summarise(mark_series(get(`lang:${l}`), `import:${l}`));
    const stub = summarise(mark_series(get(`stub:${l}`), `import:${l}`));
    const r = summarise(mark_series(rev, `import:${l}`));
    revive_rows.push([
      l,
      fmt_ms(r.median),
      fmt_ms(full.median - stub.median),
      fmt_ms(full.median),
      fmt_ms(stub.median + r.median),
      r.iqr_pct.toFixed(0),
    ]);
  }
  if (revive_rows.length > 0) {
    out.push("");
    out.push(`## ship the compiled grammar instead of computing it`);
    out.push("");
    out.push(
      "`revive` is the cost of importing a module whose compiled tables are a base64 payload plus a json side table, reconstructed at module scope. `compile` is the cold compile it would replace. `import today` is the real package; `import revived` is the same package with compile() removed and the revive added, which is the number the proposal would have to beat.",
    );
    out.push("");
    out.push(
      table(
        ["language", "revive", "compile", "import today", "import revived", "iqr%"],
        revive_rows,
      ),
    );
  }

  const bundle_rows = [];
  for (const name of ["bundle-dist", "bundle-eager", "bundle-lazy"]) {
    const r = get(name);
    if (r.length === 0) continue;
    const w = summarise(r.map((x) => x.wall));
    const imp = summarise(mark_series(r, "import:docs"));
    const boot = summarise(mark_series(r, "boot"));
    bundle_rows.push([
      name,
      fmt_ms(boot.median),
      fmt_ms(imp.median),
      fmt_ms(summarise(r.map((x) => x.total)).median),
      fmt_ms(w.median),
      w.iqr_pct.toFixed(0),
    ]);
  }
  if (bundle_rows.length > 0) {
    out.push("");
    out.push(`## single bundled chunk, core plus the seven docs languages`);
    out.push("");
    out.push(
      "`bundle-dist` concatenates the shipped dist files, so its code is byte for byte what the unbundled case runs and the gap against `core parse+eval + all language imports` below is node's module resolution alone. `bundle-eager` is rebuilt from the language sources with esbuild, so the gap against `bundle-dist` is the bundler. `bundle-lazy` is `bundle-eager` with compile() deferred to first use.",
    );
    out.push("");
    out.push(table(["artifact", "node boot", "import", "in-process", "wall", "iqr%"], bundle_rows));
  }

  for (const name of ["docs-bundle", "docs-bundle-stub"]) {
    const r = get(name);
    if (r.length === 0) continue;
    const w = summarise(r.map((x) => x.wall));
    const imports = summarise(sum_marks(r, (m) => m.startsWith("import:")));
    const core = summarise(mark_series(r, "core"));
    const boot = summarise(mark_series(r, "boot"));
    out.push("");
    out.push(`## ${name} (${DOCS_BUNDLE.join(" + ")})`);
    out.push("");
    out.push(
      table(
        ["component", "ms"],
        [
          ["node boot", fmt_ms(boot.median)],
          ["core parse+eval", fmt_ms(core.median)],
          ["all language imports", fmt_ms(imports.median)],
          ["total in-process", fmt_ms(summarise(r.map((x) => x.total)).median)],
          ["total wall (incl. spawn)", fmt_ms(w.median)],
          ["wall over bare node", fmt_ms(w.median - bare_wall.median)],
          ["iqr% of wall", w.iqr_pct.toFixed(0)],
        ],
      ),
    );
  }

  const ttfh_rows = [];
  for (const l of TTFH_LANGUAGES) {
    const r = get(`ttfh:${l}`);
    if (r.length === 0) continue;
    ttfh_rows.push([
      l,
      fmt_ms(summarise(mark_series(r, `import:${l}`)).median),
      fmt_ms(summarise(mark_series(r, `ttfh_bind:${l}`)).median),
      fmt_ms(summarise(mark_series(r, `ttfh_render:${l}`)).median),
      fmt_ms(summarise(mark_series(r, `warm20:${l}`)).median / 20),
    ]);
  }
  if (ttfh_rows.length > 0) {
    out.push("");
    out.push(`## time to first highlight, micro corpus`);
    out.push("");
    out.push(table(["language", "import", "bind", "first highlight", "warm highlight"], ttfh_rows));
  }

  const text = out.join("\n");
  process.stdout.write(`${text}\n`);
  if (args.json) {
    const dump = {};
    for (const [k, v] of rows) dump[k] = v;
    writeFileSync(args.json, JSON.stringify({ args, node: process.version, rows: dump }, null, 2));
  }
}

await main();
