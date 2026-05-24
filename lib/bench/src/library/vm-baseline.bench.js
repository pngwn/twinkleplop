// Reclassifier-VM baseline benches.
//
// Purpose: nail down the cost of every reclassifier stage we are about to
// touch, so each step of the VM migration can be measured against a known
// reference point. Two kinds of measurement:
//
//   1. JS pipeline stage isolation — start from the empty pipeline and
//      add one reclassifier at a time. The delta between consecutive
//      benches is that one stage's contribution.
//
//   2. Per-language full-pipeline overhead — for every language whose
//      reclassifiers we plan to migrate to the new VM (TS, Rust, Markdown,
//      Go, Svelte), record raw-tokenize vs full-pipeline numbers so we
//      can detect regressions per language.
//
// These benches are deliberately stable: no random data, fixed warmup +
// time so JSON comparison is meaningful across runs.

import { bench, describe } from "vitest";
import { reclassify, tokenize } from "@twinkleplop/core";
import {
  grammar as js_grammar,
  reclassifiers as js_reclassifiers,
} from "@twinkleplop/javascript";
import {
  grammar as ts_grammar,
  reclassifiers as ts_reclassifiers,
  tokenize as make_ts_tokenize,
} from "@twinkleplop/typescript";
import {
  grammar as rust_grammar,
  reclassifiers as rust_reclassifiers,
  tokenize as make_rust_tokenize,
} from "@twinkleplop/rust";
import {
  grammar as md_grammar,
  reclassifiers as md_reclassifiers,
  tokenize as make_md_tokenize,
} from "@twinkleplop/markdown";
import {
  grammar as go_grammar,
  reclassifiers as go_reclassifiers,
  tokenize as make_go_tokenize,
} from "@twinkleplop/go";
import {
  grammar as svelte_grammar,
  reclassifiers as svelte_reclassifiers,
  tokenize as make_svelte_tokenize,
} from "@twinkleplop/svelte";

import { medium_js, large_js, complex_js } from "./javascript-samples.js";
import { medium_ts } from "./typescript-samples.js";
import { medium_md } from "./markdown-samples.js";
import { plain_js } from "./reclassifier-samples.js";

const BENCH_OPTS = { warmupTime: 500, time: 1500 };

// ---------------------------------------------------------------------------
// JS pipeline stage isolation (incremental composition)
// ---------------------------------------------------------------------------
//
// The full JS reclassifiers array is (lib/javascript/src/reclassifiers.ts):
//
//   0: promote_js_constants
//   1: rewrite_types(function_variable_rules)
//   2: promote_js_const_bindings
//   3: claim_property_scope
//   4: class_name_promoter
//   5: promote_js_parameters
//   6: promote_js_namespaces
//   7: embed_interleaved(scan_tagged_template)
//
// For each prefix length 0..N we build a pipeline of that prefix and bench
// it. The delta between bench[i] and bench[i-1] is stage i's cost.

// language packages export TaggedReclassifier entries (high-fidelity by
// default). reclassify() expects the raw functions, so unwrap before
// building prefix pipelines for stage-isolation benches.
function unwrap(entry) {
  return typeof entry === "function" ? entry : entry.reclassifier;
}

function make_prefix(name, length) {
  const prefix = js_reclassifiers.slice(0, length).map(unwrap);
  return reclassify(prefix);
}

const stage_prefixes = [
  { idx: 0, label: "0. empty pipeline" },
  { idx: 1, label: "1. + promote_js_constants" },
  { idx: 2, label: "2. + function_variable_rules" },
  { idx: 3, label: "3. + promote_js_const_bindings" },
  { idx: 4, label: "4. + claim_property_scope" },
  { idx: 5, label: "5. + class_name_promoter" },
  { idx: 6, label: "6. + promote_js_parameters" },
  { idx: 7, label: "7. + promote_js_namespaces" },
  { idx: 8, label: "8. + embed_interleaved (full)" },
];

const pipelines = stage_prefixes.map(s => ({ ...s, fn: make_prefix(s.label, s.idx) }));

const raw_medium = tokenize(medium_js, js_grammar);
const raw_large = tokenize(large_js, js_grammar);
const raw_complex = tokenize(complex_js, js_grammar);
const raw_plain = tokenize(plain_js, js_grammar);

describe("JS stage isolation — medium_js (pre-tokenized)", () => {
  for (const p of pipelines) {
    bench(p.label, () => { p.fn(medium_js, raw_medium); }, BENCH_OPTS);
  }
});

describe("JS stage isolation — large_js (pre-tokenized)", () => {
  for (const p of pipelines) {
    bench(p.label, () => { p.fn(large_js, raw_large); }, BENCH_OPTS);
  }
});

describe("JS stage isolation — complex_js (pre-tokenized)", () => {
  for (const p of pipelines) {
    bench(p.label, () => { p.fn(complex_js, raw_complex); }, BENCH_OPTS);
  }
});

describe("JS stage isolation — plain_js (pre-tokenized)", () => {
  for (const p of pipelines) {
    bench(p.label, () => { p.fn(plain_js, raw_plain); }, BENCH_OPTS);
  }
});

// ---------------------------------------------------------------------------
// Per-language full pipelines (the VM migration targets)
// ---------------------------------------------------------------------------
//
// Each language gets: raw tokenize vs full reclassifier pipeline. Pre-tokenized
// pipeline cost is reported so we can see the reclassifier's share in
// isolation. Numbers serve as A/B reference for the per-language migrations
// (rust lifetime merge, markdown compound styles, go param chunker, svelte
// block braces, ts type_position_promoter).

// inline samples for languages without existing sample files. kept small but
// representative of the reclassifier features they exercise.

const small_rust = `use std::collections::HashMap;

pub struct Cache<'a, T: Clone> {
    inner: HashMap<&'a str, T>,
    cap: usize,
}

impl<'a, T: Clone> Cache<'a, T> {
    pub fn new(cap: usize) -> Self {
        Self { inner: HashMap::new(), cap }
    }

    pub fn get(&'a self, key: &'a str) -> Option<&'a T> {
        self.inner.get(key)
    }

    pub fn insert(&mut self, key: &'a str, value: T) {
        if self.inner.len() >= self.cap {
            return;
        }
        self.inner.insert(key, value);
    }
}

pub enum Color { Red, Green, Blue, Custom(u8, u8, u8) }

pub fn classify(c: &Color) -> &'static str {
    match c {
        Color::Red => "warm",
        Color::Green => "cool",
        Color::Blue => "cool",
        Color::Custom(_, _, _) => "unknown",
    }
}
`;

const small_go = `package main

import (
	"context"
	"fmt"
	"sync"
)

type Cache struct {
	mu    sync.RWMutex
	store map[string]string
}

func NewCache() *Cache {
	return &Cache{store: make(map[string]string)}
}

func (c *Cache) Get(ctx context.Context, key string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	v, ok := c.store[key]
	return v, ok
}

func (c *Cache) Put(key, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.store[key] = value
}

func processAll(items []string, fn func(string) error) error {
	for _, it := range items {
		if err := fn(it); err != nil {
			return fmt.Errorf("process: %w", err)
		}
	}
	return nil
}

func main() {
	c := NewCache()
	c.Put("hello", "world")
	v, ok := c.Get(context.Background(), "hello")
	fmt.Println(v, ok)
}
`;

const small_svelte = `<script lang="ts">
  import { onMount } from "svelte";

  let count = $state(0);
  let doubled = $derived(count * 2);

  function increment() {
    count += 1;
  }

  onMount(() => {
    console.log("mounted");
  });
</script>

<style>
  .counter {
    display: flex;
    gap: 1rem;
    padding: 1rem;
  }
  button {
    background: var(--primary, #0070f3);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
</style>

<div class="counter">
  <button onclick={increment}>Increment</button>
  <p>Count: {count} (doubled: {doubled})</p>

  {#if count > 0}
    <p>Positive</p>
  {:else}
    <p>Zero or negative</p>
  {/if}

  {#each [1, 2, 3] as n}
    <span>{n}</span>
  {/each}
</div>
`;

const ts_lang = make_ts_tokenize();
const rust_lang = make_rust_tokenize();
const md_lang = make_md_tokenize();
const go_lang = make_go_tokenize();
const svelte_lang = make_svelte_tokenize();

const raw_ts = tokenize(medium_ts, ts_grammar);
const raw_rust = tokenize(small_rust, rust_grammar);
const raw_md = tokenize(medium_md, md_grammar);
const raw_go = tokenize(small_go, go_grammar);
const raw_svelte = tokenize(small_svelte, svelte_grammar);

const ts_full = reclassify(ts_reclassifiers.map(unwrap));
const rust_full = reclassify(rust_reclassifiers.map(unwrap));
const md_full = reclassify(md_reclassifiers.map(unwrap));
const go_full = reclassify(go_reclassifiers.map(unwrap));
const svelte_full = reclassify(svelte_reclassifiers.map(unwrap));

describe("TypeScript pipeline — medium_ts", () => {
  bench("0. raw tokenize", () => { tokenize(medium_ts, ts_grammar); }, BENCH_OPTS);
  bench("1. full pipeline (pre-tokenized)", () => { ts_full(medium_ts, raw_ts); }, BENCH_OPTS);
  bench("2. language() entry point", () => { ts_lang(medium_ts); }, BENCH_OPTS);
});

describe("Rust pipeline — small_rust (lifetimes)", () => {
  bench("0. raw tokenize", () => { tokenize(small_rust, rust_grammar); }, BENCH_OPTS);
  bench("1. full pipeline (pre-tokenized)", () => { rust_full(small_rust, raw_rust); }, BENCH_OPTS);
  bench("2. language() entry point", () => { rust_lang(small_rust); }, BENCH_OPTS);
});

describe("Markdown pipeline — medium_md (compound styles)", () => {
  bench("0. raw tokenize", () => { tokenize(medium_md, md_grammar); }, BENCH_OPTS);
  bench("1. full pipeline (pre-tokenized)", () => { md_full(medium_md, raw_md); }, BENCH_OPTS);
  bench("2. language() entry point", () => { md_lang(medium_md); }, BENCH_OPTS);
});

describe("Go pipeline — small_go (param chunker)", () => {
  bench("0. raw tokenize", () => { tokenize(small_go, go_grammar); }, BENCH_OPTS);
  bench("1. full pipeline (pre-tokenized)", () => { go_full(small_go, raw_go); }, BENCH_OPTS);
  bench("2. language() entry point", () => { go_lang(small_go); }, BENCH_OPTS);
});

describe("Svelte pipeline — small_svelte (block braces)", () => {
  bench("0. raw tokenize", () => { tokenize(small_svelte, svelte_grammar); }, BENCH_OPTS);
  bench("1. full pipeline (pre-tokenized)", () => { svelte_full(small_svelte, raw_svelte); }, BENCH_OPTS);
  bench("2. language() entry point", () => { svelte_lang(small_svelte); }, BENCH_OPTS);
});
