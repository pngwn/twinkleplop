// ---- unit 1 ----
// decorators + generics demo.
import { fetchUser } from "./api";

@sealed
class UserStore<T extends { id: number }> {
  private items: Map<number, T> = new Map();
  public readonly name = "users";
  public readonly active: boolean = true;

  add(item: T): this { this.items.set(item.id, item); return this; }
  get(id: number): T | undefined { return this.items.get(id); }
}

interface User { id: number; name: string; active?: boolean; }

const store = new UserStore<User>();
const re = /^[a-z]+$/i;
const query = `id=${1}`;
const markup = html`<section class="root" data-id="1">hi</section>`;

async function run() {
  const user = await fetchUser(1) as User satisfies User;
  if (re.test(user.name)) store.add(user);
}

function sealed(ctor: Function) { Object.seal(ctor); }


// ---- unit 2 ----
// ---- access_modifiers.txt ----
abstract class Shape {
  abstract area(): number;
  abstract perimeter(): number;
}

class Circle extends Shape {
  public readonly radius: number;
  private _area: number;
  protected color: string;

  constructor(radius: number) {
    super();
    this.radius = radius;
  }

  override area(): number {
    return Math.PI * this.radius ** 2;
  }

  override perimeter(): number {
    return 2 * Math.PI * this.radius;
  }
}


// ---- as_satisfies.txt ----
const x = value as string;
const y = input as unknown as number;
const z = [1, 2, 3] as const;
const el = document.getElementById("app") as HTMLElement;

const config = {
  port: 3000,
  host: "localhost"
} satisfies ServerConfig;

const palette = {
  red: [255, 0, 0],
  green: "#00ff00"
} satisfies Record<string, string | number[]>;


// ---- builtin_types.txt ----
let a: number = 42;
let b: string = "hello";
let c: boolean = true;
let d: any = null;
let e: never;
let f: unknown = undefined;
let g: object = {};
let h: symbol = Symbol();
let i: bigint = 9007199254740991n;
let j: void = undefined;

type Complex = {
  num: number;
  str: string;
  bool: boolean;
  opt?: any;
  nothing: never;
  unk: unknown;
  obj: object;
  sym: symbol;
  big: bigint;
};


// ---- classes.txt ----
class Animal {
  constructor(public name: string) {}
}

class Dog extends Animal implements Pet {
  breed: string;

  constructor(name: string, breed: string) {
    super(name);
    this.breed = breed;
  }

  speak(): string {
    return `${this.name} barks`;
  }
}

abstract class Vehicle {
  abstract start(): void;
  abstract stop(): void;
}

class Car extends Vehicle {
  override start(): void {
    console.log("Vroom!");
  }
  override stop(): void {
    console.log("Stopped.");
  }
}


// ---- declare_module.txt ----
declare module "express" {
  interface Request {
    user?: User;
  }
  interface Response {
    json(body: any): void;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    PORT?: string;
  }
}

import type { User } from "./types";
export type { User };

export type Config = {
  debug: boolean;
  port: number;
};


// ---- decorators.txt ----
@Component({
  selector: "app-root",
  template: "<h1>Hello</h1>"
})
class AppComponent {
  @Input() title: string;
  @Output() clicked = new EventEmitter();

  @HostListener("click")
  onClick() {
    this.clicked.emit();
  }
}

@Injectable()
class UserService {
  @Inject(HttpClient) private http: HttpClient;
}


// ---- enums.txt ----
enum Direction {
  Up,
  Down,
  Left,
  Right
}

enum Color {
  Red = "RED",
  Green = "GREEN",
  Blue = "BLUE"
}

enum StatusCode {
  OK = 200,
  NotFound = 404,
  ServerError = 500
}

const dir: Direction = Direction.Up;


// ---- generics.txt ----
function identity<T>(arg: T): T {
  return arg;
}

class Container<T> {
  private value: T;
  constructor(val: T) {
    this.value = val;
  }
  get(): T {
    return this.value;
  }
}

const result = identity<string>("hello");
const map = new Map<string, number>();
const arr: Array<number> = [1, 2, 3];

type Wrapped<T extends object> = { data: T };


// ---- interfaces.txt ----
interface User {
  name: string;
  age: number;
  email?: string;
  readonly id: number;
}

interface Animal {
  sound(): string;
  move(distance: number): void;
}

interface Repository extends Collection {
  field: thing;
  find(id: number): User;
  save(user: User): void;
  field: thing;
}


// ---- js_compat.txt ----
// comments work
/* block comments too */

const x = 42;
let str = "hello";
var re = /pattern/gi;

function add(a, b) {
  return a + b;
}

const arrow = (x) => x * 2;
const obj = { key: "value", nested: { a: 1 } };
const arr = [1, 2, 3];

if (x > 0) {
  console.log("positive");
} else {
  console.log("non-positive");
}

for (let i = 0; i < 10; i++) {
  arr.push(i);
}

class Foo extends Bar {
  constructor() {
    super();
  }
  method() {
    return this.value;
  }
}

const tmpl = `hello ${name}, you are ${age} years old`;
const tagged = html`<div class="${cls}">${content}</div>`;

async function fetchData() {
  const result = await fetch("/api");
  return result.json();
}

export { add };
import { something } from "module";

const nums = [0xFF, 0b1010, 0o777, 1_000_000, 1.5e10];
const ops = a === b || c !== d && e >= f;
const ternary = x ? "yes" : "no";
const spread = { ...obj, extra: true };
const nullish = x ?? "default";
const chain = obj?.prop?.method?.();


// ---- keywords.txt ----
type Foo = string;
interface Bar {}
enum Baz { A, B }
namespace NS {
  export const x = 1;
}
declare const VERSION: string;
declare function log(msg: string): void;
declare module "module" {}

abstract class Base {}
class Child extends Base implements Serializable {}

function guard(x: unknown): x is string {
  return typeof x === "string";
}

const y = value as number;
const z = obj satisfies Schema;

type Keys = keyof User;
type Inferred<T> = T extends Array<infer U> ? U : T;

using resource = getResource();

public class Open {}
private class Closed {}
protected class Semi {}
readonly class Immutable {}

override method() {}
accessor prop = "value";


// ---- type_aliases.txt ----
type Status = "active" | "inactive" | "pending";
type ID = number | string;
type Callback = (value: string) => void;
type Pair = [string, number];
type Nullable = string | null | undefined;
type ReadonlyUser = Readonly<User>;
type Partial<T> = { [K in keyof T]?: T[K] };
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;


// ---- type_annotations.txt ----
let x: number;
const name: string = "hello";
var flag: boolean = true;
let anything: any = 42;
let nothing: never;
let mystery: unknown = getValue();
let obj: object = {};
let sym: symbol = Symbol("id");
let big: bigint = 100n;

function greet(name: string, age: number): string {
  return `Hello ${name}, age ${age}`;
}

const add = (a: number, b: number): number => a + b;

function process(input: string | number): void {
  console.log(input);
}


// ---- unit 3 ----
// ---- lib/core/src/frame_track.ts ----
// frame_track — shared scope-stack pre-pass for reclassifiers
//
// walks the token stream once, maintaining a bracket-aware scope stack, and
// emits per-token side tables (`active_frame`, `depths`, `at_start`) that
// downstream reclassifiers query in O(1). this consolidates the bracket
// tracking that hand-written reclassifiers each used to maintain themselves
// (claim_property_scope, promote_js_parameters, type_position_promoter).
//
// brace-kind classification is declarative: the FrameSpec's `brace_kinds`
// rules (pending body markers, angle-depth awareness, prev-token shapes)
// are evaluated during the walk so every consumer reads one shared
// classification instead of re-deriving its own.

import { debug_enabled, warn_once } from "./debug";
import type {
  BraceKindSpec,
  FrameRecord,
  FrameSpec,
  FrameTable,
  Reclassifier,
  TokenizeResult,
} from "./types";
import {
  FRAME_BRACKET_BRACE,
  FRAME_BRACKET_BRACKET,
  FRAME_BRACKET_PAREN,
  FRAME_KIND_BRACKET,
  FRAME_KIND_PAREN,
  FRAME_KIND_TOP,
  SIGNAL_TERNARY_COLON,
} from "./types";

// shared sentinel for the disabled-at_start fast path: a single zero-length
// Uint8Array reused across calls so we don't pay per-call allocation when
// the consumer doesn't need at_start.
const EMPTY_U8 = new Uint8Array(0);

// built-in kind names occupying ids 0..2. language-defined kinds from
// BraceKindSpec are interned after these.
const BUILTIN_KIND_NAMES = ["top", "paren", "bracket"];

// stmt flags occupy signals bits 1..7; bit 0 is the ternary colon.
const MAX_STMT_FLAGS = 7;

// per-type flag bits combined into one Uint8Array so the walk loop does a
// single table load per token.
const FLAG_TRIVIA = 1;
const FLAG_TRANSPARENT = 2;
const FLAG_TRANSPARENT_TEXTS = 4;
const FLAG_MARKER = 8;
const FLAG_ANGLE = 16;
const FLAG_QMARK = 32;
const FLAG_STMT = 64;

// a text candidate compiled to char codes for slice-free comparison in
// the walk loop.
interface CompiledText {
  codes: number[];
}

function compile_text(text: string): CompiledText {
  const codes: number[] = [];
  for (let i = 0; i < text.length; i++) codes.push(text.charCodeAt(i));
  return { codes };
}

function text_matches(input: string, s: number, e: number, t: CompiledText): boolean {
  const codes = t.codes;
  if (e - s !== codes.length) return false;
  for (let i = 0; i < codes.length; i++) {
    if (input.charCodeAt(s + i) !== codes[i]) return false;
  }
  return true;
}

// compiled, token_types-independent form of BraceKindSpec. type names stay
// as strings here; resolution to ids happens per token_types array and is
// cached against its reference (see ResolvedKindTables).
interface CompiledBraceKinds {
  kind_names: string[];
  markers: { type: string; text: CompiledText; kind_id: number }[];
  pending_in_angles_kind: number;
  angle_type: string | null;
  angle_open: CompiledText | null;
  angle_closes: { text: CompiledText; pops: number }[];
  prev_rules: {
    type: string;
    texts: Set<string> | null;
    last_chars: number[] | null;
    kind_id: number;
  }[];
  default_kind: number;
  start_kind: number;
}

function compile_brace_kinds(spec: BraceKindSpec): CompiledBraceKinds {
  const kind_names = BUILTIN_KIND_NAMES.slice();
  const intern = (name: string): number => {
    const existing = kind_names.indexOf(name);
    if (existing >= 0) return existing;
    kind_names.push(name);
    return kind_names.length - 1;
  };

  const markers = (spec.body_markers ?? []).map((m) => ({
    type: m.type,
    text: compile_text(m.text),
    kind_id: intern(m.kind),
  }));
  const prev_rules = (spec.prev_rules ?? []).map((r) => {
    const last_chars: number[] | null = r.prev_last_char_in !== undefined ? [] : null;
    if (last_chars !== null && r.prev_last_char_in !== undefined) {
      for (let i = 0; i < r.prev_last_char_in.length; i++) {
        last_chars.push(r.prev_last_char_in.charCodeAt(i));
      }
    }
    return {
      type: r.prev_type,
      texts: r.prev_texts !== undefined ? new Set(r.prev_texts) : null,
      last_chars,
      kind_id: intern(r.kind),
    };
  });

  return {
    kind_names,
    markers,
    pending_in_angles_kind:
      spec.pending_in_angles_kind !== undefined ? intern(spec.pending_in_angles_kind) : -1,
    angle_type: spec.angles?.type ?? null,
    angle_open: spec.angles !== undefined ? compile_text(spec.angles.open) : null,
    angle_closes: (spec.angles?.closes ?? []).map((c) => ({
      text: compile_text(c.text),
      pops: c.pops,
    })),
    prev_rules,
    default_kind: intern(spec.default_kind),
    start_kind: spec.start_kind !== undefined ? intern(spec.start_kind) : intern(spec.default_kind),
  };
}

// per-token_types resolution of the compiled spec's type names. cached by
// token_types reference, so the indexOf scans run once per vocabulary.
interface ResolvedKindTables {
  // marker candidates as a dense array indexed by type id -- the per-token
  // dispatch is one array load + null check, no hashing.
  marker_lists: ({ text: CompiledText; kind_id: number }[] | null)[];
  angle_type_id: number;
  prev_rules: {
    type_id: number;
    texts: Set<string> | null;
    last_chars: number[] | null;
    kind_id: number;
  }[];
}

function resolve_kind_tables(
  compiled: CompiledBraceKinds,
  token_types: string[],
): ResolvedKindTables {
  const marker_lists: ({ text: CompiledText; kind_id: number }[] | null)[] = new Array(
    token_types.length,
  ).fill(null);
  for (const m of compiled.markers) {
    const id = token_types.indexOf(m.type);
    if (id < 0) {
      warn_once(
        "frame_track",
        `marker-type:${m.type}`,
        `body marker type "${m.type}" is not in the token vocabulary; the marker can never arm`,
      );
      continue;
    }
    let list = marker_lists[id];
    if (list === null) {
      list = [];
      marker_lists[id] = list;
    }
    list.push({ text: m.text, kind_id: m.kind_id });
  }
  const angle_type_id =
    compiled.angle_type !== null ? token_types.indexOf(compiled.angle_type) : -1;
  if (compiled.angle_type !== null && angle_type_id < 0) {
    warn_once(
      "frame_track",
      `angle-type:${compiled.angle_type}`,
      `angle type "${compiled.angle_type}" is not in the token vocabulary; angle depth is never tracked`,
    );
  }
  return {
    marker_lists,
    angle_type_id,
    prev_rules: compiled.prev_rules.map((r) => {
      const type_id = token_types.indexOf(r.type);
      if (type_id < 0) {
        warn_once(
          "frame_track",
          `prev-rule-type:${r.type}`,
          `prev rule type "${r.type}" is not in the token vocabulary; the rule can never match`,
        );
      }
      return {
        type_id,
        texts: r.texts,
        last_chars: r.last_chars,
        kind_id: r.kind_id,
      };
    }),
  };
}

// per-token_types resolution of ternary / stmt-flag trigger types. cached
// by token_types reference like the kind tables.
interface ResolvedSignalTables {
  qmark_type_id: number;
  // dense by type id, then by the candidate text's FIRST char code; null
  // means no stmt trigger on that type / leading char. trigger lists can
  // run to a couple dozen keywords (statement starters), so the per-token
  // dispatch buckets by leading char to keep the walk at 1-3 candidates.
  stmt_lists: ((CompiledStmtRule[] | null)[] | null)[];
}

// ascii-only first-char bucket table size.
const STMT_BUCKETS = 128;

function resolve_signal_tables(
  compiled: CompiledFrameSpec,
  token_types: string[],
): ResolvedSignalTables {
  let qmark_type_id = -1;
  if (compiled.ternary_qmark_type !== null) {
    qmark_type_id = token_types.indexOf(compiled.ternary_qmark_type);
    if (qmark_type_id < 0) {
      warn_once(
        "frame_track",
        `qmark-type:${compiled.ternary_qmark_type}`,
        `ternary qmark type "${compiled.ternary_qmark_type}" is not in the token vocabulary; ternary colons are never marked`,
      );
    }
  }
  const stmt_lists: ((CompiledStmtRule[] | null)[] | null)[] = new Array(token_types.length).fill(
    null,
  );
  for (const rule of compiled.stmt_rules) {
    const id = token_types.indexOf(rule.type);
    if (id < 0) {
      warn_once(
        "frame_track",
        `stmt-type:${rule.type}`,
        `stmt flag trigger type "${rule.type}" is not in the token vocabulary; the trigger can never fire`,
      );
      continue;
    }
    const first = rule.text.codes.length > 0 ? rule.text.codes[0] : 0;
    if (first >= STMT_BUCKETS) {
      warn_once(
        "frame_track",
        `stmt-text:${rule.type}`,
        `stmt flag trigger text starting with a non-ascii char cannot be bucketed; the trigger can never fire`,
      );
      continue;
    }
    let by_char = stmt_lists[id];
    if (by_char === null) {
      by_char = new Array(STMT_BUCKETS).fill(null);
      stmt_lists[id] = by_char;
    }
    let list = by_char[first];
    if (list === null) {
      list = [];
      by_char[first] = list;
    }
    list.push(rule);
  }
  return { qmark_type_id, stmt_lists };
}

// prev-token classification for a `{` with no pending marker claim. module
// level (no captures) so the walk loop's depth counters stay in registers
// instead of a closure context. called once per opening brace.
function classify_by_prev(
  input: string,
  tokens: Uint32Array,
  kinds: CompiledBraceKinds,
  kind_tables: ResolvedKindTables,
  prev_significant: number,
): number {
  if (prev_significant < 0) return kinds.start_kind;
  const pbase = prev_significant * 3;
  const ptype = tokens[pbase];
  const ps = tokens[pbase + 1];
  const pe = tokens[pbase + 2];
  const rules = kind_tables.prev_rules;
  for (let r = 0; r < rules.length; r++) {
    const rule = rules[r];
    if (rule.type_id !== ptype) continue;
    if (rule.texts !== null) {
      if (rule.texts.has(input.slice(ps, pe))) return rule.kind_id;
      continue;
    }
    if (rule.last_chars !== null) {
      const last = input.charCodeAt(pe - 1);
      let hit = false;
      for (let c = 0; c < rule.last_chars.length; c++) {
        if (last === rule.last_chars[c]) {
          hit = true;
          break;
        }
      }
      if (hit) return rule.kind_id;
      continue;
    }
    return rule.kind_id;
  }
  return kinds.default_kind;
}

// a (type, text) stmt-flag trigger with its combined arm / clear masks.
// arm and clear entries sharing a trigger merge into one so the walk does
// a single text compare per candidate.
interface CompiledStmtRule {
  type: string;
  text: CompiledText;
  arm_mask: number;
  clear_mask: number;
}

// bracket character codes resolved from the spec, plus pre-computed
// per-bracket constants. -1 means "this bracket is not configured for
// this language" -- the corresponding char never matches.
interface CompiledFrameSpec {
  punct_type: string;
  paren_open: number;
  paren_close: number;
  brace_open: number;
  brace_close: number;
  bracket_open: number;
  bracket_close: number;
  // at_start config. reset_chars is a small char-code lookup; the empty
  // string disables at_start tracking entirely.
  at_start_reset_chars: number[];
  at_start_transparent: string[];
  // text-specific transparency, one entry per type that has transparent
  // texts. resolved against token_types lazily (the type id may not be
  // known when the spec is compiled).
  // candidate texts compiled to char codes -- the per-token membership
  // check is a length-prefiltered char compare, no slicing.
  at_start_transparent_texts: { type: string; texts: CompiledText[] }[];
  at_start_enabled: boolean;
  // kind ids (from brace_kinds interning) whose member close re-arms
  // at_start on the parent frame. null when not configured.
  rearm_kind_ids: Set<number> | null;
  brace_kinds: CompiledBraceKinds | null;
  // ternary counting. -1 colon code / null qmark when not configured.
  ternary_qmark_type: string | null;
  ternary_qmark_text: CompiledText | null;
  ternary_colon_code: number;
  // stmt flag tracking. flag i occupies mask bit i (signals bit i + 1).
  stmt_flag_names: string[];
  stmt_rules: CompiledStmtRule[];
  stmt_clear_char_codes: number[];
  stmt_clear_char_masks: number[];
  stmt_brace_close_clear_mask: number;
  // true when ternary or stmt_flags is configured -- gates the signals
  // array allocation and all per-frame counter work.
  signals_enabled: boolean;
}

function compile_frame_spec(spec: FrameSpec): CompiledFrameSpec {
  const single = (s: string | undefined): number =>
    s !== undefined && s.length > 0 ? s.charCodeAt(0) : -1;
  const at_start_chars: number[] = [];
  if (spec.at_start !== undefined) {
    for (let i = 0; i < spec.at_start.reset_chars.length; i++) {
      at_start_chars.push(spec.at_start.reset_chars.charCodeAt(i));
    }
  }
  const transparent_texts = (spec.at_start?.transparent_texts_for_type ?? []).map((e) => ({
    type: e.type,
    texts: e.texts.map(compile_text),
  }));
  const brace_kinds = spec.brace_kinds !== undefined ? compile_brace_kinds(spec.brace_kinds) : null;
  // rearm kinds resolve against the spec's own interned names. unknown
  // names (or a missing brace_kinds spec) resolve to nothing -- fail closed.
  let rearm_kind_ids: Set<number> | null = null;
  const rearm_names = spec.at_start?.rearm_after_close_kinds;
  if (rearm_names !== undefined && brace_kinds !== null) {
    rearm_kind_ids = new Set();
    for (const name of rearm_names) {
      const id = brace_kinds.kind_names.indexOf(name);
      if (id >= 0) rearm_kind_ids.add(id);
      else {
        warn_once(
          "frame_track",
          `rearm-kind:${name}`,
          `rearm_after_close_kinds kind "${name}" is not declared by the brace_kinds spec; it can never re-arm`,
        );
      }
    }
  } else if (rearm_names !== undefined && brace_kinds === null) {
    warn_once(
      "frame_track",
      "rearm-without-kinds",
      "rearm_after_close_kinds is set but brace_kinds is not configured; re-arm never happens",
    );
  }

  const stmt_specs = spec.stmt_flags ?? [];
  if (stmt_specs.length > MAX_STMT_FLAGS) {
    warn_once(
      "frame_track",
      "stmt-flags-overflow",
      `stmt_flags declares ${stmt_specs.length} flags but only ${MAX_STMT_FLAGS} signal bits exist; extras are ignored`,
    );
  }
  const stmt_flag_names: string[] = [];
  const stmt_rule_map = new Map<string, CompiledStmtRule>();
  const stmt_clear_char_codes: number[] = [];
  const stmt_clear_char_masks: number[] = [];
  let stmt_brace_close_clear_mask = 0;
  const stmt_rule = (type: string, text: string): CompiledStmtRule => {
    const key = `${type} ${text}`;
    let rule = stmt_rule_map.get(key);
    if (rule === undefined) {
      rule = { type, text: compile_text(text), arm_mask: 0, clear_mask: 0 };
      stmt_rule_map.set(key, rule);
    }
    return rule;
  };
  for (let f = 0; f < stmt_specs.length && f < MAX_STMT_FLAGS; f++) {
    const flag = stmt_specs[f];
    const mask = 1 << f;
    stmt_flag_names.push(flag.name);
    for (const text of flag.arm.texts) {
      stmt_rule(flag.arm.type, text).arm_mask |= mask;
    }
    if (flag.clear !== undefined) {
      for (const text of flag.clear.texts) {
        stmt_rule(flag.clear.type, text).clear_mask |= mask;
      }
    }
    if (flag.clear_chars !== undefined) {
      for (let c = 0; c < flag.clear_chars.length; c++) {
        const code = flag.clear_chars.charCodeAt(c);
        const existing = stmt_clear_char_codes.indexOf(code);
        if (existing >= 0) stmt_clear_char_masks[existing] |= mask;
        else {
          stmt_clear_char_codes.push(code);
          stmt_clear_char_masks.push(mask);
        }
      }
    }
    if (flag.clear_on_brace_close === true) stmt_brace_close_clear_mask |= mask;
  }

  return {
    punct_type: spec.punct_type,
    paren_open: single(spec.brackets.paren?.open),
    paren_close: single(spec.brackets.paren?.close),
    brace_open: single(spec.brackets.brace?.open),
    brace_close: single(spec.brackets.brace?.close),
    bracket_open: single(spec.brackets.bracket?.open),
    bracket_close: single(spec.brackets.bracket?.close),
    at_start_reset_chars: at_start_chars,
    at_start_transparent: spec.at_start?.transparent_types ?? [],
    at_start_transparent_texts: transparent_texts,
    at_start_enabled: spec.at_start !== undefined,
    rearm_kind_ids,
    brace_kinds,
    ternary_qmark_type: spec.ternary?.qmark.type ?? null,
    ternary_qmark_text: spec.ternary !== undefined ? compile_text(spec.ternary.qmark.text) : null,
    ternary_colon_code:
      spec.ternary !== undefined && spec.ternary.colon_char.length > 0
        ? spec.ternary.colon_char.charCodeAt(0)
        : -1,
    stmt_flag_names,
    stmt_rules: Array.from(stmt_rule_map.values()),
    stmt_clear_char_codes,
    stmt_clear_char_masks,
    stmt_brace_close_clear_mask,
    signals_enabled: spec.ternary !== undefined || stmt_flag_names.length > 0,
  };
}

// dedicated signals pass: per-frame ternary counters and stmt flag masks,
// walked over the same bracket structure as the main loop but in its own
// tight function. kept OUT of the main walk on purpose -- signal branches
// woven into that loop degraded its jit code for every frame_track
// instance in the process once a signals-enabled tracker had run. module
// level so the loop closes over nothing.
function compute_signals(
  input: string,
  tokens: Uint32Array,
  n: number,
  compiled: CompiledFrameSpec,
  tables: ResolvedSignalTables,
  type_flags: Uint8Array,
  punct_id: number,
  signals: Uint8Array,
): void {
  const qmark_text = compiled.ternary_qmark_text;
  const colon_code = compiled.ternary_colon_code;
  const stmt_lists = tables.stmt_lists;
  const clear_codes = compiled.stmt_clear_char_codes;
  const clear_masks = compiled.stmt_clear_char_masks;
  const clear_count = clear_codes.length;
  const brace_close_clear_mask = compiled.stmt_brace_close_clear_mask;
  const paren_open = compiled.paren_open;
  const paren_close = compiled.paren_close;
  const brace_open = compiled.brace_open;
  const brace_close = compiled.brace_close;
  const bracket_open = compiled.bracket_open;
  const bracket_close = compiled.bracket_close;

  // parallel per-frame stacks, mirroring the main walk's push / pop
  // conditions exactly so frame identity lines up between the passes.
  const stack_qmark: number[] = [0];
  const stack_flags: number[] = [0];

  for (let i = 0; i < n; i++) {
    const base = i * 3;
    const ttype = tokens[base];
    const flags = type_flags[ttype];
    let signal = 0;

    if ((flags & (FLAG_QMARK | FLAG_STMT)) !== 0) {
      if ((flags & FLAG_QMARK) !== 0 && qmark_text !== null) {
        const s = tokens[base + 1];
        const e = tokens[base + 2];
        if (text_matches(input, s, e, qmark_text)) {
          stack_qmark[stack_qmark.length - 1]++;
        }
      }
      if ((flags & FLAG_STMT) !== 0) {
        const by_char = stmt_lists[ttype];
        if (by_char !== null) {
          const s = tokens[base + 1];
          const e = tokens[base + 2];
          const first = input.charCodeAt(s);
          const candidates = first < STMT_BUCKETS ? by_char[first] : null;
          if (candidates !== null) {
            for (let m = 0; m < candidates.length; m++) {
              if (text_matches(input, s, e, candidates[m].text)) {
                const top = stack_flags.length - 1;
                stack_flags[top] =
                  (stack_flags[top] | candidates[m].arm_mask) & ~candidates[m].clear_mask;
                break;
              }
            }
          }
        }
      }
    }

    if (ttype === punct_id) {
      const s = tokens[base + 1];
      const e = tokens[base + 2];
      for (let p = s; p < e; p++) {
        const c = input.charCodeAt(p);
        if (c === paren_open || c === brace_open || c === bracket_open) {
          stack_qmark.push(0);
          stack_flags.push(0);
        } else if (c === paren_close || c === bracket_close) {
          if (stack_qmark.length > 1) {
            stack_qmark.pop();
            stack_flags.pop();
          }
        } else if (c === brace_close) {
          if (stack_qmark.length > 1) {
            stack_qmark.pop();
            stack_flags.pop();
            // a closing brace ends the statement that armed any
            // close-cleared flag on the parent frame.
            stack_flags[stack_flags.length - 1] &= ~brace_close_clear_mask;
          }
        } else if (c === colon_code && stack_qmark[stack_qmark.length - 1] > 0) {
          stack_qmark[stack_qmark.length - 1]--;
          signal |= SIGNAL_TERNARY_COLON;
        } else if (clear_count > 0) {
          for (let m = 0; m < clear_count; m++) {
            if (c === clear_codes[m]) {
              stack_flags[stack_flags.length - 1] &= ~clear_masks[m];
              break;
            }
          }
        }
      }
    }

    signals[i] = signal | (stack_flags[stack_flags.length - 1] << 1);
  }
}

// pre-compile spec once. closures over the compiled spec capture the
// punct_type id lookup at first call, memoised against the token_types
// array reference (the same trick the JS scanner uses for tag_name lookups).
export function frame_track(spec: FrameSpec): Reclassifier {
  const compiled = compile_frame_spec(spec);
  const kind_names =
    compiled.brace_kinds !== null ? compiled.brace_kinds.kind_names : BUILTIN_KIND_NAMES;
  const punct_cache = new WeakMap<string[], number>();
  const flags_cache = new WeakMap<string[], Uint8Array>();
  const kind_table_cache = new WeakMap<string[], ResolvedKindTables>();
  const transparent_texts_cache = new WeakMap<string[], (CompiledText[] | null)[]>();
  const signal_table_cache = new WeakMap<string[], ResolvedSignalTables>();

  return (input: string, result: TokenizeResult): TokenizeResult => {
    let punct_id = punct_cache.get(result.token_types);
    if (punct_id === undefined) {
      punct_id = result.token_types.indexOf(compiled.punct_type);
      punct_cache.set(result.token_types, punct_id);
      if (punct_id < 0 && debug_enabled()) {
        warn_once(
          "frame_track",
          `punct-type:${compiled.punct_type}`,
          `punct_type "${compiled.punct_type}" is not in the token vocabulary; no frames will be tracked`,
        );
      }
    }

    const kinds = compiled.brace_kinds;
    let kind_tables: ResolvedKindTables | null = null;
    if (kinds !== null) {
      kind_tables = kind_table_cache.get(result.token_types) ?? null;
      if (kind_tables === null) {
        kind_tables = resolve_kind_tables(kinds, result.token_types);
        kind_table_cache.set(result.token_types, kind_tables);
      }
    }

    const signals_enabled = compiled.signals_enabled;
    let signal_tables: ResolvedSignalTables | null = null;
    if (signals_enabled) {
      signal_tables = signal_table_cache.get(result.token_types) ?? null;
      if (signal_tables === null) {
        signal_tables = resolve_signal_tables(compiled, result.token_types);
        signal_table_cache.set(result.token_types, signal_tables);
      }
    }

    // single per-type flags byte combining every per-token table lookup
    // (trivia, transparency, marker / angle membership) -- the hot loop
    // reads one Uint8Array slot per token and branches off bits. the
    // heavier candidate lists are only touched when their bit is set.
    // computing the tables eagerly added noticeable cost on the disabled
    // path (~30% slower on plain_js), so flags stays null when neither
    // at_start nor brace_kinds is configured.
    let type_flags: Uint8Array | null = null;
    let transparent_texts: (CompiledText[] | null)[] | null = null;
    if (compiled.at_start_enabled || kinds !== null || signals_enabled) {
      type_flags = flags_cache.get(result.token_types) ?? null;
      if (type_flags === null) {
        const types = result.token_types;
        type_flags = new Uint8Array(types.length);
        const comment_id = types.indexOf("comment");
        if (comment_id >= 0) type_flags[comment_id] |= FLAG_TRIVIA;
        for (let i = 0; i < compiled.at_start_transparent.length; i++) {
          const id = types.indexOf(compiled.at_start_transparent[i]);
          if (id >= 0) type_flags[id] |= FLAG_TRANSPARENT;
        }
        for (const entry of compiled.at_start_transparent_texts) {
          const id = types.indexOf(entry.type);
          if (id >= 0) type_flags[id] |= FLAG_TRANSPARENT_TEXTS;
        }
        if (kind_tables !== null) {
          for (let id = 0; id < kind_tables.marker_lists.length; id++) {
            if (kind_tables.marker_lists[id] !== null) type_flags[id] |= FLAG_MARKER;
          }
          if (kind_tables.angle_type_id >= 0) {
            type_flags[kind_tables.angle_type_id] |= FLAG_ANGLE;
          }
        }
        if (signal_tables !== null) {
          if (signal_tables.qmark_type_id >= 0) {
            type_flags[signal_tables.qmark_type_id] |= FLAG_QMARK;
          }
          for (let id = 0; id < signal_tables.stmt_lists.length; id++) {
            if (signal_tables.stmt_lists[id] !== null) type_flags[id] |= FLAG_STMT;
          }
        }
        flags_cache.set(result.token_types, type_flags);
      }
      if (compiled.at_start_transparent_texts.length > 0) {
        transparent_texts = transparent_texts_cache.get(result.token_types) ?? null;
        if (transparent_texts === null) {
          transparent_texts = new Array(result.token_types.length).fill(null);
          for (const entry of compiled.at_start_transparent_texts) {
            const id = result.token_types.indexOf(entry.type);
            if (id >= 0) transparent_texts[id] = entry.texts;
          }
          transparent_texts_cache.set(result.token_types, transparent_texts);
        }
      }
    }

    // hoist hot-path config reads to locals so V8 does not re-read object
    // properties on every iteration.
    const at_start_enabled = compiled.at_start_enabled;
    const paren_open = compiled.paren_open;
    const paren_close = compiled.paren_close;
    const brace_open = compiled.brace_open;
    const brace_close = compiled.brace_close;
    const bracket_open = compiled.bracket_open;
    const bracket_close = compiled.bracket_close;
    const reset_chars = compiled.at_start_reset_chars;
    const reset_chars_len = reset_chars.length;
    const rearm_kind_ids = compiled.rearm_kind_ids;
    const marker_lists = kind_tables !== null ? kind_tables.marker_lists : null;

    const { tokens, token_types } = result;
    const n = tokens.length / 3;
    const active_frame = new Uint32Array(n);
    const depths = new Uint8Array(n * 3);
    // skip allocating the at_start array when tracking is disabled. consumers
    // gate their use on whether the spec configured at_start to begin with.
    const at_start = at_start_enabled ? new Uint8Array(n) : EMPTY_U8;
    const signals = signals_enabled ? new Uint8Array(n) : EMPTY_U8;
    const frames: FrameRecord[] = [
      { bracket: -1, kind: FRAME_KIND_TOP, enter_idx: -1, parent: -1 },
    ];
    const stack: number[] = [0];
    // parallel stack of `at_start` flags per frame entry. always allocated
    // (it is small) so the inner loop can write to it unconditionally when
    // tracking is enabled. when disabled, the conditional writes are skipped
    // by the at_start_enabled guard and the array stays at length 1.
    const stack_at_start: number[] = [1];

    let paren_depth = 0;
    let brace_depth = 0;
    let bracket_depth = 0;
    let angle_depth = 0;
    // pending body-marker kind, -1 when none armed. last writer wins --
    // two markers cannot legitimately be pending at once in real code.
    let pending_kind = -1;

    // previous non-trivia token index for prev-rule classification.
    // maintained incrementally so classification never re-scans.
    let prev_significant = -1;

    // a punctuation token may contain multiple bracket characters
    // (e.g. `({` coalesces into one token). walk every character and update
    // the stack incrementally; the per-token snapshot is the state AFTER
    // the last character.
    for (let i = 0; i < n; i++) {
      const base = i * 3;
      const ttype = tokens[base];

      const flags = type_flags !== null ? type_flags[ttype] : 0;
      const is_trivia = (flags & FLAG_TRIVIA) !== 0;
      let is_transparent = false;
      if (at_start_enabled) {
        is_transparent = (flags & FLAG_TRANSPARENT) !== 0;
        if (
          !is_transparent &&
          (flags & FLAG_TRANSPARENT_TEXTS) !== 0 &&
          transparent_texts !== null
        ) {
          const text_candidates = transparent_texts[ttype];
          if (text_candidates !== null) {
            const s = tokens[base + 1];
            const e = tokens[base + 2];
            for (let t = 0; t < text_candidates.length; t++) {
              if (text_matches(input, s, e, text_candidates[t])) {
                is_transparent = true;
                break;
              }
            }
          }
        }
        at_start[i] = stack_at_start[stack_at_start.length - 1];
      }

      // brace-kind bookkeeping: body markers arm the pending kind, angle
      // tokens track generic nesting. both are exact-text matches against
      // the configured type, compiled to char codes (no slicing). marker
      // and angle types are rare, so most tokens skip on the flags test.
      if ((flags & (FLAG_MARKER | FLAG_ANGLE)) !== 0 && marker_lists !== null) {
        if ((flags & FLAG_MARKER) !== 0) {
          const candidates = marker_lists[ttype];
          if (candidates !== null) {
            const s = tokens[base + 1];
            const e = tokens[base + 2];
            for (let m = 0; m < candidates.length; m++) {
              if (text_matches(input, s, e, candidates[m].text)) {
                pending_kind = candidates[m].kind_id;
                break;
              }
            }
          }
        }
        if ((flags & FLAG_ANGLE) !== 0 && kinds !== null) {
          const s = tokens[base + 1];
          const e = tokens[base + 2];
          if (kinds.angle_open !== null && text_matches(input, s, e, kinds.angle_open)) {
            angle_depth++;
          } else {
            const closes = kinds.angle_closes;
            for (let c = 0; c < closes.length; c++) {
              if (text_matches(input, s, e, closes[c].text)) {
                angle_depth = Math.max(0, angle_depth - closes[c].pops);
                break;
              }
            }
          }
        }
      }

      if (punct_id >= 0 && ttype === punct_id) {
        const s = tokens[base + 1];
        const e = tokens[base + 2];
        for (let p = s; p < e; p++) {
          const c = input.charCodeAt(p);
          if (c === paren_open) {
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
            const idx = frames.length;
            frames.push({
              bracket: FRAME_BRACKET_PAREN,
              kind: FRAME_KIND_PAREN,
              enter_idx: i,
              parent: stack[stack.length - 1],
            });
            stack.push(idx);
            stack_at_start.push(0);
            paren_depth++;
          } else if (c === paren_close) {
            if (stack.length > 1) {
              stack.pop();
              stack_at_start.pop();
            }
            if (paren_depth > 0) paren_depth--;
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
          } else if (c === brace_open) {
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
            // declarative kind resolution: a pending body marker claims a
            // top-level brace (and is consumed); a marker under angle
            // nesting yields the constraint-literal kind without consuming;
            // everything else classifies by the previous token's shape.
            let kind = FRAME_KIND_TOP;
            if (kinds !== null && kind_tables !== null) {
              if (
                pending_kind >= 0 &&
                angle_depth === 0 &&
                paren_depth === 0 &&
                bracket_depth === 0
              ) {
                kind = pending_kind;
                pending_kind = -1;
              } else if (pending_kind >= 0 && angle_depth > 0) {
                kind =
                  kinds.pending_in_angles_kind >= 0
                    ? kinds.pending_in_angles_kind
                    : kinds.default_kind;
              } else {
                kind = classify_by_prev(input, tokens, kinds, kind_tables, prev_significant);
              }
            }
            const idx = frames.length;
            frames.push({
              bracket: FRAME_BRACKET_BRACE,
              kind,
              enter_idx: i,
              parent: stack[stack.length - 1],
            });
            stack.push(idx);
            stack_at_start.push(1);
            brace_depth++;
          } else if (c === brace_close) {
            let popped = false;
            if (stack.length > 1) {
              stack.pop();
              stack_at_start.pop();
              popped = true;
            }
            if (brace_depth > 0) brace_depth--;
            if (at_start_enabled) {
              // class / interface bodies have no separator between a
              // member's closing `}` and the next member name, so the
              // pop re-arms at_start when the parent is such a body.
              let rearm = 0;
              if (popped && rearm_kind_ids !== null) {
                const parent_frame = frames[stack[stack.length - 1]];
                if (rearm_kind_ids.has(parent_frame.kind)) rearm = 1;
              }
              stack_at_start[stack_at_start.length - 1] = rearm;
            }
          } else if (c === bracket_open) {
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
            const idx = frames.length;
            frames.push({
              bracket: FRAME_BRACKET_BRACKET,
              kind: FRAME_KIND_BRACKET,
              enter_idx: i,
              parent: stack[stack.length - 1],
            });
            stack.push(idx);
            stack_at_start.push(0);
            bracket_depth++;
          } else if (c === bracket_close) {
            if (stack.length > 1) {
              stack.pop();
              stack_at_start.pop();
            }
            if (bracket_depth > 0) bracket_depth--;
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
          } else if (at_start_enabled) {
            let is_reset = false;
            for (let r = 0; r < reset_chars_len; r++) {
              if (c === reset_chars[r]) {
                is_reset = true;
                break;
              }
            }
            stack_at_start[stack_at_start.length - 1] = is_reset ? 1 : 0;
          }
        }
      } else if (at_start_enabled && !is_trivia && !is_transparent) {
        stack_at_start[stack_at_start.length - 1] = 0;
      }

      if (!is_trivia) prev_significant = i;

      active_frame[i] = stack[stack.length - 1];
      depths[base] = paren_depth;
      depths[base + 1] = brace_depth;
      depths[base + 2] = bracket_depth;
    }

    // signals run as a second, self-contained pass so the main walk's code
    // is untouched for the (vastly more common) configs that don't track
    // them. weaving the signal branches into the loop above measurably
    // degraded the jit code shared by ALL frame_track instances once one
    // signals-enabled tracker had run (~14% on signal-free pipelines);
    // the dedicated pass keeps that cost on the opted-in pipeline only.
    if (signals_enabled && type_flags !== null && signal_tables !== null) {
      compute_signals(input, tokens, n, compiled, signal_tables, type_flags, punct_id, signals);
    }

    const table: FrameTable = {
      active_frame,
      depths,
      at_start,
      frames,
      kind_names,
      signals,
      flag_names: compiled.stmt_flag_names,
    };
    // attach to result -- callers must clone result.tokens before mutating
    // anyway (per the reclassifier contract), and frames is computed off
    // tokens so a later splice-changing reclassifier invalidates it. by
    // convention, splice-changing reclassifiers strip `frames` from their
    // output; pure type-claim reclassifiers preserve it.
    return {
      tokens: result.tokens,
      token_types: result.token_types,
      overlays: result.overlays,
      frames: table,
    };
  };
}


// ---- lib/core/src/fidelity.ts ----
// shared fidelity reclassifiers.
//
// these are the post-tokenization building blocks that promote low-fidelity
// identifier tokens to higher-fidelity types (`function`, `class_name`,
// `builtin`, `boolean`, `type`, etc.) using simple text or case checks.
// before these existed each language re-implemented them inline; they are
// factored here so a language's reclassifier pipeline is just a few calls
// plus any language-specific stateful passes.
//
// every helper returns a claim-producing reclassifier: matches emit claims
// at the target type's table precedence, so consecutive promoters batch
// together (one flush, conflicts resolved by precedence) and never mutate
// the caller's tokens or shared token_types array.

import { debug_enabled, warn_once } from "./debug";
import {
  any_of,
  as_claim_producer,
  balanced_parens,
  precedence_for,
  rewrite_types,
  seq,
  type,
} from "./reclassifier";
import type {
  ClaimFn,
  ClaimingReclassifier,
  Reclassifier,
  RewriteOptions,
  TokenPatternSpec,
} from "./types";

// ---------------------------------------------------------------------------
// promote_by_text_set
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose source text appears in `text_set`
// to `target_type`. does not need a Set — iterables are fine — but a Set
// is what callers almost always have. allocates the target_type entry in
// the token_types array if it's not already present.
//
// common uses: Python builtin types (list, dict, …) → builtin; Rust
// PRIMITIVE_TYPES (i32, u64, …) → class_name; JS / Python / Rust boolean
// literals → boolean.

// candidate texts compiled to code-unit arrays, bucketed by leading char.
// membership then answers from `input` directly instead of materialising a
// substring per candidate token: `input.slice(s, e)` allocated a string for
// every token of the source type on every highlight purely to feed
// Set.has, and these passes run over the whole stream.
const ASCII_BUCKETS = 128;

interface CompiledTextSet {
  buckets: (Uint16Array[] | null)[];
  // entries whose first code unit is outside ascii keep the string path.
  wide: Set<string> | null;
  min_len: number;
  max_len: number;
}

function compile_text_set(texts: Iterable<string>): CompiledTextSet {
  const buckets: (Uint16Array[] | null)[] = new Array(ASCII_BUCKETS).fill(null);
  let wide: Set<string> | null = null;
  let min_len = Infinity;
  let max_len = 0;
  for (const text of texts) {
    if (text.length === 0) continue;
    if (text.length < min_len) min_len = text.length;
    if (text.length > max_len) max_len = text.length;
    const first = text.charCodeAt(0);
    if (first >= ASCII_BUCKETS) {
      wide ??= new Set();
      wide.add(text);
      continue;
    }
    const codes = new Uint16Array(text.length);
    for (let i = 0; i < text.length; i++) codes[i] = text.charCodeAt(i);
    let bucket = buckets[first];
    if (bucket === null) {
      bucket = [];
      buckets[first] = bucket;
    }
    bucket.push(codes);
  }
  return { buckets, wide, min_len: min_len === Infinity ? 1 : min_len, max_len };
}

function text_set_has(set: CompiledTextSet, input: string, s: number, e: number): boolean {
  const len = e - s;
  if (len < set.min_len || len > set.max_len) return false;
  const first = input.charCodeAt(s);
  if (first >= ASCII_BUCKETS) {
    return set.wide !== null && set.wide.has(input.slice(s, e));
  }
  const bucket = set.buckets[first];
  if (bucket === null) return false;
  for (let b = 0; b < bucket.length; b++) {
    const codes = bucket[b];
    if (codes.length !== len) continue;
    let ok = true;
    for (let k = 1; k < len; k++) {
      if (input.charCodeAt(s + k) !== codes[k]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export function promote_by_text_set(
  source_type: string,
  target_type: string,
  text_set: Iterable<string>,
): ClaimingReclassifier {
  const set = compile_text_set(text_set);
  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const source_id = token_types.indexOf(source_type);
    if (source_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "fidelity",
          `source-type:${source_type}`,
          `source type "${source_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    let target_id = token_types.indexOf(target_type);
    if (target_id < 0) {
      target_id = token_types.length;
      token_types.push(target_type);
    }
    const prec = precedence_for(target_type);
    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== source_id) continue;
      const s = tokens[i * 3 + 1];
      const e = tokens[i * 3 + 2];
      if (text_set_has(set, input, s, e)) {
        sink.emit(i, target_id, prec);
      }
    }
  };
  return as_claim_producer(claim_fn);
}

// ---------------------------------------------------------------------------
// promote_pascal_case
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose first character is ASCII uppercase
// (A-Z) to `target_type`. this mirrors the grammar-time case dispatch that
// Python and Rust historically had: an identifier starting with an uppercase
// letter is almost certainly a type name (class / struct / enum / trait).
//
// the check is a single char-code compare per identifier token. for
// non-ASCII-aware classification the caller can post-process further.

const ASCII_UPPER_MIN = 0x41;
const ASCII_UPPER_MAX = 0x5a;

export function promote_pascal_case(
  source_type: string,
  target_type: string,
): ClaimingReclassifier {
  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const source_id = token_types.indexOf(source_type);
    if (source_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "fidelity",
          `source-type:${source_type}`,
          `source type "${source_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    let target_id = token_types.indexOf(target_type);
    if (target_id < 0) {
      target_id = token_types.length;
      token_types.push(target_type);
    }
    const prec = precedence_for(target_type);
    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== source_id) continue;
      const s = tokens[i * 3 + 1];
      const e = tokens[i * 3 + 2];
      const first = input.charCodeAt(s);
      if (first < ASCII_UPPER_MIN || first > ASCII_UPPER_MAX) continue;
      // reject all-upper multi-char names (`MAX_SIZE`, `PI`). these are
      // UPPER_SNAKE constants by convention, not PascalCase types. the
      // constant promoter (promote_by_upper_snake_case) is the right
      // home for them. single-char uppercase (generic params `T`, `X`)
      // still promote so languages that treat them as types don't lose
      // coverage.
      if (e - s > 1) {
        let has_lower = false;
        for (let k = s; k < e; k++) {
          const c = input.charCodeAt(k);
          if (c >= 0x61 && c <= 0x7a) {
            has_lower = true;
            break;
          }
        }
        if (!has_lower) continue;
      }
      sink.emit(i, target_id, prec);
    }
  };
  return as_claim_producer(claim_fn);
}

// ---------------------------------------------------------------------------
// promote_by_upper_snake_case
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose source text is UPPER_SNAKE_CASE to
// `target_type`. the predicate is: first char in [A-Z], every char in
// [A-Z0-9_], length >= 2. single-char uppercase identifiers (like generic
// type parameters `T`) are left alone so the pascal_case pass can claim them
// as class_name.
//
// common use: promoting convention-declared constants — `MAX_VALUE`, `PI`,
// `HTTP_STATUS` — to `constant`. pair with pascal_case ordering so the two
// predicates don't overlap: this pass claims `MAX_VALUE`, pascal_case then
// claims `MaxValue`.

const ASCII_DIGIT_MIN = 0x30;
const ASCII_DIGIT_MAX = 0x39;
const ASCII_UNDERSCORE = 0x5f;

function is_upper_snake_char(code: number): boolean {
  return (
    (code >= ASCII_UPPER_MIN && code <= ASCII_UPPER_MAX) ||
    (code >= ASCII_DIGIT_MIN && code <= ASCII_DIGIT_MAX) ||
    code === ASCII_UNDERSCORE
  );
}

export function promote_by_upper_snake_case(
  source_type: string,
  target_type: string,
): ClaimingReclassifier {
  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const source_id = token_types.indexOf(source_type);
    if (source_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "fidelity",
          `source-type:${source_type}`,
          `source type "${source_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    let target_id = token_types.indexOf(target_type);
    if (target_id < 0) {
      target_id = token_types.length;
      token_types.push(target_type);
    }
    const prec = precedence_for(target_type);
    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== source_id) continue;
      const s = tokens[i * 3 + 1];
      const e = tokens[i * 3 + 2];
      if (e - s < 2) continue;
      const first = input.charCodeAt(s);
      if (first < ASCII_UPPER_MIN || first > ASCII_UPPER_MAX) continue;
      let all_ok = true;
      for (let k = s + 1; k < e; k++) {
        if (!is_upper_snake_char(input.charCodeAt(k))) {
          all_ok = false;
          break;
        }
      }
      if (all_ok) sink.emit(i, target_id, prec);
    }
  };
  return as_claim_producer(claim_fn);
}

// ---------------------------------------------------------------------------
// promote_function_calls
// ---------------------------------------------------------------------------
//
// rewrites identifier tokens that appear in function-call position to
// `function`. the simplest variant — `foo()` — is a single rewrite_types
// rule; extras handle language-specific call shapes.
//
//   plain:       ident (…)              — javascript, python, css
//   macro:       ident !(…)             — rust
//   generic:     ident <…>(…)           — rust (generic fn call)
//   turbofish:   ident ::<…>(…)         — rust
//   css-simple:  ident(                 — css emits `(` as its own token
//                                         more often, so pattern is tighter
//
// callers opt into variants via `variants`. returning one reclassifier
// means the call-site rewrite is a single rewrite_types pass.

export interface FunctionCallVariants {
  plain?: boolean;
  macro?: boolean;
  generic_fn?: boolean;
  turbofish?: boolean;
}

export function promote_function_calls(
  source_type = "identifier",
  target_type = "function",
  variants: FunctionCallVariants = { plain: true },
  options?: RewriteOptions,
): Reclassifier {
  const when_branches: TokenPatternSpec[] = [];
  const paren_call = balanced_parens("(", ")");
  if (variants.plain) {
    when_branches.push(paren_call);
  }
  if (variants.macro) {
    when_branches.push(seq(type("builtin", ["!"]), paren_call));
  }
  if (variants.generic_fn) {
    when_branches.push(seq(balanced_parens("<", ">"), paren_call));
  }
  if (variants.turbofish) {
    when_branches.push(seq(type("punctuation", ["::"]), balanced_parens("<", ">"), paren_call));
  }
  if (when_branches.length === 0) {
    return (_input, result) => result;
  }
  return rewrite_types(
    [
      {
        anchor: source_type,
        when: when_branches.length === 1 ? when_branches[0] : any_of(...when_branches),
        rewrite: target_type,
      },
    ],
    options,
  );
}


// ---- lib/core/src/matched_bracket.ts ----
// matched_bracket — retag paired opener / matching closer tokens.
//
// data-driven primitive: walks the token stream looking for an opener that
// matches (type + text, optional sigil gate), then scans forward for the
// matching closer (type + text), then claims new types for both endpoints.
// ignores trivia in the scan. used by Svelte to retag block braces
// `{#if ...}{/if}` as `punctuation` while leaving ordinary interpolation
// braces alone.
//
// runs as a claim producer: endpoint retags are emitted as claims at the
// target type's table precedence instead of mutating the stream, so the
// pass batches with other claim producers and never touches the caller's
// tokens.

import { debug_enabled, warn_once } from "./debug";
import { as_claim_producer, precedence_for } from "./reclassifier";
import type { ClaimFn, ClaimingReclassifier, MatchedBracketConfig } from "./types";

export function matched_bracket(config: MatchedBracketConfig): ClaimingReclassifier {
  const post_open_set: Set<string> | null =
    config.post_open_required !== undefined ? new Set(config.post_open_required.text_in) : null;

  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const n = tokens.length / 3;
    if (n === 0) return;

    const open_id = token_types.indexOf(config.open_type);
    const close_id = token_types.indexOf(config.close_type);
    if (open_id < 0 || close_id < 0) {
      if (debug_enabled()) {
        const missing = open_id < 0 ? config.open_type : config.close_type;
        warn_once(
          "matched_bracket",
          `endpoint-type:${missing}`,
          `endpoint type "${missing}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }

    const comment_id = token_types.indexOf("comment");
    const post_open_type_id =
      config.post_open_required !== undefined
        ? token_types.indexOf(config.post_open_required.type)
        : -1;
    if (config.post_open_required !== undefined && post_open_type_id < 0) {
      // configured but not present in this stream's vocabulary -- can't fire.
      if (debug_enabled()) {
        warn_once(
          "matched_bracket",
          `post-open-type:${config.post_open_required.type}`,
          `post_open_required type "${config.post_open_required.type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }

    // retag targets must exist by name (added by an upstream pass if needed
    // or pre-listed in the grammar). silently skip if absent. identity
    // retags (target same as source) emit no claims.
    const retag_open_id =
      config.retag_open_to !== undefined ? token_types.indexOf(config.retag_open_to) : open_id;
    const retag_close_id =
      config.retag_close_to !== undefined ? token_types.indexOf(config.retag_close_to) : close_id;
    if (retag_open_id < 0 || retag_close_id < 0) {
      if (debug_enabled()) {
        const missing = retag_open_id < 0 ? config.retag_open_to : config.retag_close_to;
        warn_once(
          "matched_bracket",
          `retag-type:${missing}`,
          `retag target "${missing}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    const open_prec = precedence_for(config.retag_open_to ?? config.open_type);
    const close_prec = precedence_for(config.retag_close_to ?? config.close_type);

    const text = (i: number): string => input.slice(tokens[i * 3 + 1], tokens[i * 3 + 2]);

    const next_non_trivia = (from: number): number => {
      for (let i = from; i < n; i++) {
        if (tokens[i * 3] !== comment_id) return i;
      }
      return -1;
    };

    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== open_id) continue;
      if (text(i) !== config.open_text) continue;
      if (post_open_set !== null) {
        const sigil_idx = next_non_trivia(i + 1);
        if (sigil_idx === -1) continue;
        if (tokens[sigil_idx * 3] !== post_open_type_id) continue;
        if (!post_open_set.has(text(sigil_idx))) continue;
      }
      for (let j = i + 1; j < n; j++) {
        if (tokens[j * 3] !== close_id) continue;
        if (text(j) !== config.close_text) continue;
        if (retag_open_id !== open_id) sink.emit(i, retag_open_id, open_prec);
        if (retag_close_id !== close_id) sink.emit(j, retag_close_id, close_prec);
        i = j;
        break;
      }
    }
  };

  return as_claim_producer(claim_fn);
}


// ---- lib/core/src/compound_compose.ts ----
// compound_compose — stack-driven multi-class type composition.
//
// data-driven primitive that maintains an open-style stack via open/close
// marker token types and emits a composed type per token (e.g. for
// markdown's bold/italic/code nesting). composed types are interned into
// token_types dynamically so the renderer can split on the separator.

import { debug_enabled, warn_once } from "./debug";
import type { CompoundComposeConfig, Reclassifier, TokenizeResult } from "./types";

interface OpenStyleMap {
  // resolved open type_id -> style name (a string label, NOT an id)
  by_open_id: Map<number, string>;
  // resolved close type_id -> style name
  by_close_id: Map<number, string>;
}

function resolve_style_map(token_types: string[], config: CompoundComposeConfig): OpenStyleMap {
  const by_open_id = new Map<number, string>();
  const by_close_id = new Map<number, string>();
  for (const s of config.styles) {
    const oid = token_types.indexOf(s.open_type);
    const cid = token_types.indexOf(s.close_type);
    if (oid >= 0) by_open_id.set(oid, s.style_name);
    if (cid >= 0) by_close_id.set(cid, s.style_name);
  }
  return { by_open_id, by_close_id };
}

export function compound_compose(config: CompoundComposeConfig): Reclassifier {
  return (input: string, result: TokenizeResult): TokenizeResult => {
    const { tokens, token_types } = result;
    const new_token_types = token_types.slice();
    const styles = resolve_style_map(new_token_types, config);

    // empty fast path: no styles resolved (this stream's vocabulary has
    // none of the configured open/close types) -- nothing to do.
    if (styles.by_open_id.size === 0 && styles.by_close_id.size === 0) {
      if (debug_enabled()) {
        warn_once(
          "compound_compose",
          "no-styles",
          "none of the configured open/close marker types are in the token vocabulary; pass disabled",
        );
      }
      return result;
    }

    const type_index = new Map<string, number>();
    for (let i = 0; i < new_token_types.length; i++) {
      type_index.set(new_token_types[i], i);
    }
    const intern = (name: string): number => {
      let id = type_index.get(name);
      if (id === undefined) {
        id = new_token_types.length;
        new_token_types.push(name);
        type_index.set(name, id);
      }
      return id;
    };

    const compose_with = (stack: string[], base: string): string => {
      if (stack.length === 0) return base;
      if (config.dedup_against_base && stack.indexOf(base) !== -1) {
        return stack.join(config.join_separator);
      }
      return stack.join(config.join_separator) + config.join_separator + base;
    };

    const new_tokens = new Uint32Array(tokens.length);
    const stack: string[] = [];
    let last_end = 0;

    for (let i = 0; i < tokens.length; i += 3) {
      const old_type_id = tokens[i];
      const old_type = new_token_types[old_type_id];
      const start = tokens[i + 1];
      const end = tokens[i + 2];

      if (config.auto_pop_on_newline && stack.length > 0) {
        const nl = input.indexOf("\n", last_end);
        if (nl !== -1 && nl < start) {
          stack.length = 0;
        }
      }

      let new_type: string;
      const open_style = styles.by_open_id.get(old_type_id);
      const close_style = styles.by_close_id.get(old_type_id);

      if (open_style !== undefined) {
        const existing_idx = stack.lastIndexOf(open_style);
        if (existing_idx !== -1) {
          // grammar leaked a frame -- treat this "open" as a close down
          // to the existing entry.
          new_type = stack.join(config.join_separator);
          stack.length = existing_idx;
        } else {
          stack.push(open_style);
          new_type = stack.join(config.join_separator);
        }
      } else if (close_style !== undefined) {
        new_type = stack.join(config.join_separator);
        const idx = stack.lastIndexOf(close_style);
        if (idx !== -1) stack.length = idx;
      } else {
        new_type = compose_with(stack, old_type);
      }

      new_tokens[i] = intern(new_type);
      new_tokens[i + 1] = start;
      new_tokens[i + 2] = end;
      last_end = end;
    }

    return {
      tokens: new_tokens,
      token_types: new_token_types,
      overlays: result.overlays,
      frames: result.frames,
    };
  };
}


// ---- unit 4 ----
// ---- lib/core/src/types.ts ----
import type { TokenizerIntrospector } from "./introspector";

// shape every theme package ships: one entry per canonical token name
// exported from `./tokens`, plus the extra `background_color` key that
// themes declare but the generated stylesheets do not bind.
export type theme_palette = Record<string, string> & {
  background_color: string;
};

// Character class symbol types
export type CharacterClassSymbol = symbol;

// Grammar types
export interface GrammarRule {
  match?: string | string[] | CharacterClassSymbol;
  range?: [string, string] | [number, number] | [string, string][] | [number, number][];
  match_within?: {
    start: string;
    end: string;
    escape?: string;
    multiline?: boolean;
  };
  any?: boolean;
  boundary?: boolean;
  token?: string;
  state?: string;
  exit?: boolean;
  // force a lexeme boundary after this rule even if the emitted token type
  // matches the previous one. the compiler also sets this implicitly for
  // multi-char matches, structural transitions (push/pop/sideways), and
  // boundary-checked rules, so authors only need `seal: true` for
  // lexeme-atom single-char matches that would otherwise coalesce.
  seal?: boolean;
}

export interface GrammarState {
  rules?: GrammarRule[];
  mode?: "probe" | "tokenise";
  fallback?: string;
}

export interface Grammar {
  name?: string;
  states: Record<string, GrammarState>;
}

// Compiled grammar types
export interface PatternInfo {
  // Using typed array for faster indexed access in hot loop
  codes: Uint16Array;
  length: number;
  rule_idx: number;
  boundary?: boolean;
}

export interface CompiledGrammar {
  states: Map<string, number>;
  transitions: Uint16Array;
  char_maps: Uint16Array;
  keywords: Map<string, number>;
  token_types: string[];
  patterns: Map<number, (PatternInfo[] | null)[]>;
  fallback_transitions: Uint16Array;
  // per state, flat [start, end, rule_idx] triples over codepoints >= 128.
  // ranges rather than one entry per codepoint: a grammar that accepts any
  // unicode identifier character covers 65408 of them, and materialising that
  // per codepoint dominated compile time for the grammars that do it.
  non_ascii_ranges: Map<number, Int32Array>;
  // retain set for external tooling, but also include fast mask for hot path
  probe_states: Set<number>;
  probe_mask?: Uint8Array;
  probe_fallbacks?: Map<number, number>;
  // track which rules require boundary checking (state * 256 + rule_idx)
  boundary_rules?: Set<number>;
  // true when any rule sets seal: true or boundary: true. lets the
  // tokenizer skip the per-emission seal lookup on grammars that don't
  // opt in — most grammars don't.
  has_seals: boolean;
  // parallel Uint8Array to transitions, indexed by (state * 256 + rule_idx).
  // 1 means the emission at that rule seals a lexeme boundary. undefined on
  // grammars without any seal rules so the tokenizer can skip the lookup.
  seal_flags?: Uint8Array;
  fallback_seal_flags?: Uint8Array;
}

// Tokenizer types
export interface TokenizeResult {
  tokens: Uint32Array;
  token_types: string[];
  // populated only when annotation extraction ran during this call (i.e. the
  // language factory was given an `annotation` config). undefined otherwise so
  // the renderer's no-overlay fast path is reachable via a single check.
  overlays?: OverlayResult;
  // populated by the `frame_track` reclassifier when present. downstream
  // reclassifiers query the table instead of reconstructing their own
  // scope stack. undefined when no frame_track stage ran.
  frames?: FrameTable;
}

// Frame tracker types
//
// A FrameTable is the output of a `frame_track` reclassifier stage: per-token
// scope-stack metadata pre-computed in one walk so multiple downstream
// reclassifiers can read it instead of each maintaining their own stack.
//
// The schema is intentionally a superset across the JS/TS/Python/Rust
// reclassifiers we plan to migrate. Languages that don't use frame tracking
// simply don't run the stage and `frames` stays undefined.

// integer encodings for Frame.bracket. matches the order in FrameSpec.brackets.
export const FRAME_BRACKET_PAREN = 0;
export const FRAME_BRACKET_BRACE = 1;
export const FRAME_BRACKET_BRACKET = 2;

// integer encodings for Frame.kind. the top-of-stack sentinel is 0 so a
// freshly-allocated Uint8Array fills with TOP frames naturally. specific
// brace kinds are language-supplied via FrameSpec.brace_kinds and resolved
// to small ints at compile time.
export const FRAME_KIND_TOP = 0;
export const FRAME_KIND_PAREN = 1;
export const FRAME_KIND_BRACKET = 2;
// 3..255 reserved for language-defined brace kinds (class, interface, ...)

export interface FrameRecord {
  bracket: number; // FRAME_BRACKET_* constant
  kind: number; // FRAME_KIND_* or language-defined
  enter_idx: number; // token index of the opening bracket
  // index into FrameTable.frames of the enclosing frame, -1 for TOP.
  // consumers walk this chain to find e.g. the nearest brace frame when
  // the active frame is a paren or bracket.
  parent: number;
}

// bit 0 of FrameTable.signals: a colon character in this token consumed a
// pending ternary qmark on the active frame. stmt flags occupy bits 1..7
// (stmt_flags[i] maps to bit i + 1).
export const SIGNAL_TERNARY_COLON = 1;

export interface FrameTable {
  // active_frame[i] = index into `frames` for the frame on top after
  // token i has been processed. tokens that are themselves closers point
  // at the frame they CLOSED so their lookup is consistent with "frame
  // active during this token's lifetime."
  active_frame: Uint32Array;
  // for each token i: paren_depth, brace_depth, bracket_depth interleaved
  // as a flat Uint8Array (length = 3 * tokens.length). depths reflect the
  // state AFTER processing token i.
  depths: Uint8Array;
  // per-token at_start flag, 1 byte per token. true means: this token
  // is the first significant content after the active frame opened
  // (or after a member separator like `,` / `;`). consumed by reclassifiers
  // that distinguish "key position" from "value position" inside object
  // and interface bodies. populated only when FrameSpec.at_start is set.
  at_start: Uint8Array;
  // dense list of all frames ever opened, frames[0] is the implicit TOP
  // frame (kind=FRAME_KIND_TOP, never popped).
  frames: FrameRecord[];
  // kind id -> name. indices 0..2 are the built-in "top" / "paren" /
  // "bracket"; language-defined brace kinds from BraceKindSpec follow.
  // consumers resolve their kind names against this once per call and
  // compare integer ids in the loop.
  kind_names: string[];
  // per-token signal bits. bit 0 (SIGNAL_TERNARY_COLON) marks tokens whose
  // colon char consumed a pending ternary qmark; bits 1..7 snapshot the
  // active frame's stmt flags AFTER the token was processed. empty when
  // neither FrameSpec.ternary nor FrameSpec.stmt_flags is configured --
  // gates over signals fail closed against the empty array.
  signals: Uint8Array;
  // stmt flag bit positions by name: flag_names[i] occupies signals bit
  // i + 1. empty when stmt_flags is not configured.
  flag_names: string[];
}

export interface FrameSpec {
  // type name of the token carrying bracket characters in this language's
  // grammar. nearly always "punctuation" but exposed so grammars that
  // emit different types (e.g. operator for `<`/`>`) can still be tracked.
  punct_type: string;
  // character codes for each bracket pair. each must be a single code unit.
  // omit a bracket pair if the language doesn't use it (e.g. languages with
  // no square-bracket scope).
  brackets: {
    paren?: { open: string; close: string };
    brace?: { open: string; close: string };
    bracket?: { open: string; close: string };
  };
  // optional at_start tracking. when set, the frame table's at_start
  // array is populated per token. otherwise the array is zeroed and
  // downstream reclassifiers either don't consume it or compute their own.
  at_start?: AtStartSpec;
  // optional declarative brace-kind classification. when set, every `{`
  // frame gets a language-defined kind resolved during the walk and the
  // table's kind_names array maps kind ids back to spec names. when
  // omitted, brace frames keep the FRAME_KIND_TOP placeholder.
  brace_kinds?: BraceKindSpec;
  // optional per-frame ternary counting. when set, the table's signals
  // array marks colons that consumed a pending ternary qmark so colon
  // anchor rules can tell `cond ? a : b` from annotation colons.
  ternary?: TernarySpec;
  // optional named statement-context flags surfaced per token in the
  // signals array. at most 7 flags (signals bits 1..7).
  stmt_flags?: StmtFlagSpec[];
}

// per-frame ternary tracking. a token matching `qmark` increments the
// active frame's counter; a `colon_char` inside a punct_type token with a
// positive counter decrements it and sets SIGNAL_TERNARY_COLON on that
// token instead of leaving the colon to read as an annotation. counters
// live on the frame that saw the qmark, so a ternary inside parens never
// marks a colon outside them. counting is mode-blind: type-level `? :`
// pairs (conditional types) are balanced, so the net effect at any later
// colon matches a type-aware walker.
export interface TernarySpec {
  // token type + exact source text that increments the counter. exact
  // matching keeps `?.` `??` `?:` from counting.
  qmark: { type: string; text: string };
  // single colon character consumed against pending qmarks during the
  // punct_type char walk.
  colon_char: string;
}

// a named statement-context flag. armed by exact-text tokens, cleared by
// other exact-text tokens, separator chars, or a brace-frame close. the
// flag lives on the frame that armed it: nested frames open with the flag
// clear and a pop discards it. canonical case: TS var-decl annotations,
// where a colon rule needs "a let/const/var appeared earlier in this
// statement at this nesting level".
export interface StmtFlagSpec {
  name: string;
  arm: { type: string; texts: string[] };
  clear?: { type: string; texts: string[] };
  // single chars (inside punct_type tokens) that clear the flag on the
  // active frame. typically ";".
  clear_chars?: string;
  // also clear the flag on the parent frame when a brace frame pops --
  // a closing `}` ends the statement that armed the flag.
  clear_on_brace_close?: boolean;
}

// declarative brace-kind classification. the language describes how to
// decide what kind of scope a `{` opens and frame_track evaluates the
// rules during its single walk, so downstream reclassifiers share one
// classification instead of each maintaining their own.
//
// evaluation order at each opening brace:
//   1. a pending body marker (armed earlier by a body_markers entry) is
//      consumed when the brace opens outside all angle / paren / bracket
//      nesting -- the frame takes the marker's kind.
//   2. a pending marker with angle nesting yields pending_in_angles_kind
//      without consuming the marker (generic constraints like
//      `class C<T extends { x: V }>` -- the constraint's `{` is a type
//      literal, the real body brace still claims the marker).
//   3. otherwise the previous non-trivia token is tested against
//      prev_rules in order; the first matching rule's kind wins.
//   4. no rule matches: default_kind (or start_kind when the brace has
//      no previous token).
export interface BraceKindRule {
  // token type name of the previous non-trivia token.
  prev_type: string;
  // exact source texts to match. omit to match any text of prev_type.
  prev_texts?: string[];
  // match when the previous token's LAST character is in this set. used
  // for shapes like "punctuation ending in `)`" where the grammar may
  // coalesce `)` with adjacent punctuation chars.
  prev_last_char_in?: string;
  kind: string;
}

export interface BraceKindSpec {
  // pending markers: a token of `type` with source text `text` arms the
  // marker; the next top-level `{` takes `kind` and consumes it.
  body_markers?: { type: string; text: string; kind: string }[];
  // kind assigned when a marker is pending but the `{` opens inside
  // angle brackets. the marker stays armed for the real body brace.
  pending_in_angles_kind?: string;
  // angle-bracket depth tracking feeding the pending-marker rules.
  // exact-text matching against tokens of `type`; coalesced closers
  // (`>>`, `>>>`) pop multiple levels.
  angles?: {
    type: string;
    open: string;
    closes: { text: string; pops: number }[];
  };
  prev_rules?: BraceKindRule[];
  // fallback kind when no rule matches.
  default_kind: string;
  // kind when the brace has no previous token. defaults to default_kind.
  start_kind?: string;
}

// compound_compose primitive — stack-driven multi-class type composition.
// canonical case: markdown inline styling where bold/italic/code can nest
// and each token inside the nested region gets a composed class like
// "bold italic code". walks tokens once, maintains an open-style stack
// via open / close marker pairs, and emits a composed type per token via
// dynamic interning into the token_types array.

export interface CompoundComposeConfig {
  // each entry maps a (open marker type, close marker type) pair to a
  // style name. when an open token appears, the style name is pushed
  // onto the stack; when the matching close appears, popped.
  styles: { open_type: string; close_type: string; style_name: string }[];
  // when true, finding a `\n` in the source gap between two tokens flushes
  // the entire style stack -- handles grammars that drop back to a block
  // state on newlines without emitting close markers.
  auto_pop_on_newline: boolean;
  // string used to join style names into a composed type (e.g. " " for
  // HTML class lists).
  join_separator: string;
  // when true and the composed token's base type already equals one of
  // the active style names, don't repeat it in the composed string.
  dedup_against_base: boolean;
}

// matched_bracket primitive — retag a pair of opener / matching closer
// tokens as a different type. canonical case: Svelte's `{#if ... }` block
// braces are emitted by the grammar as `expression` tokens (so the inner
// JS body parses) but render better as `punctuation`. this primitive walks
// the stream, finds each open token whose follow-on token matches the
// optional sigil predicate, scans forward for the matching close, and
// retags both endpoints.

export interface MatchedBracketConfig {
  // type + text of the opening token (must match exactly).
  open_type: string;
  open_text: string;
  // type + text of the closing token (must match exactly).
  close_type: string;
  close_text: string;
  // optional gate: the next non-trivia token immediately after the open
  // must have this type AND its source text must be in this set. used to
  // distinguish block braces (followed by `#` / `:` / `/` / `@`) from
  // ordinary interpolation braces.
  post_open_required?: { type: string; text_in: string[] };
  // type to retag the opener to. defaults to open_type (no retag).
  retag_open_to?: string;
  // type to retag the closer to. defaults to close_type (no retag).
  retag_close_to?: string;
}

// merge_adjacent primitive — splice anchor + immediately-following token
// into one. output token count shrinks per merge. portable: a host runtime
// executes the same spec for every language that needs adjacent-token
// merging (Rust lifetime+type fusion is the canonical case).

export interface MergeAdjacentConfig {
  // anchor token type that triggers a merge attempt.
  anchor_type: string;
  // type names of the token immediately after the anchor that can be
  // consumed into the merged token.
  consume_next_types: string[];
  // refuse the merge when the token at (anchor + offset) is of the given
  // type AND its source text starts with any of the listed characters.
  // typically used for the Rust case: refuse to merge `'a Fn` because
  // `Fn(` is a function-call generic, not a type to fuse into the lifetime.
  refuse_if?: {
    offset: number; // 1-based: 2 means "two tokens after the anchor"
    type_must_be: string; // token type required for the guard to apply
    first_char_in: string; // single-char codes that disqualify the merge
  };
  // resulting type of the merged token. defaults to anchor's type.
  result_type?: string;
}

// per-token at_start computation. a frame's "at_start" is true immediately
// after the frame opens or after a separator token at that frame's depth
// fires. it is set to false the moment a non-trivia, non-transparent token
// appears.
//
// transparent_types: token types that pass through without changing at_start.
//   the entire type is transparent (e.g. all comments).
// transparent_texts_for_type: a map of token type -> set of source texts
//   that, for that specific type, are transparent. lets a language treat
//   modifier keywords like `async` `static` `public` as transparent without
//   also marking every other keyword that way. matched against the token's
//   raw source via input.slice(start, end) -- exact equality, no regex.
// reset_chars: single-character punctuation that re-arms at_start = true on
//   the top frame. typically `,` `;` and the language's open-brace char.
export interface AtStartSpec {
  transparent_types?: string[];
  transparent_texts_for_type?: { type: string; texts: string[] }[];
  reset_chars: string;
  // brace kinds (names from BraceKindSpec) whose member close re-arms
  // at_start: when a `}` pops a frame and the PARENT frame's kind is in
  // this list, at_start re-arms on the parent. class and interface
  // bodies need this because consecutive members have no separator
  // between a method's closing `}` and the next member name. all other
  // closers consume at_start. requires brace_kinds to be configured.
  rearm_after_close_kinds?: string[];
}

// Reclassifier types
//
// A Reclassifier is a pure function over a TokenizeResult that may rewrite
// token types, splice new tokens in, or both. Multiple reclassifiers are
// composed into a pipeline by `reclassify(...)`.
//
// Claim-producing reclassifiers (step 2 of the refactor) additionally carry
// a `__claim` method that returns claims for a frozen input rather than
// mutating. The pipeline runner batches adjacent claim-producers: each sees
// the same base stream, their claims merge by precedence, and the winning
// claims apply once. Passes without `__claim` still mutate in place and
// break the batch.

export type Reclassifier = (input: string, result: TokenizeResult) => TokenizeResult;

export type ReclassifierPipeline = Reclassifier[];

// A claim asserts that a given token should have a given type, at the given
// precedence. Higher precedence wins during merge; when two claims tie on
// precedence, the earlier-emitted claim wins (stable insertion order).
//
// The Claim object form is retained for diagnostic APIs (test_util's
// collect_claims_per_pass). Hot paths emit into a ClaimSink instead, which
// writes directly into parallel typed arrays to avoid per-match allocation.
export interface Claim {
  token_idx: number;
  type_id: number;
  precedence: number;
}

// Allocation-free claim emitter. Claim producers call `sink.emit(...)` for
// each claim; the sink stores the tuple in parallel typed arrays. The batch
// runner reuses a single sink across all producers in a batch and applies
// winners in one pass.
export interface ClaimSink {
  emit(token_idx: number, type_id: number, precedence: number): void;
}

// Claim-mode entry. A claim-producing reclassifier may append new names to
// `token_types` (for types it wants to rewrite to) but MUST NOT mutate any
// slot of `tokens`. Emitted type_ids must be valid for the (possibly
// extended) `token_types` array at call time.
//
// `frames` is the FrameTable produced by an upstream `frame_track` stage,
// undefined when no such stage ran. ClaimFns that need scope-stack data
// read from this side table instead of maintaining their own.
export type ClaimFn = (
  input: string,
  tokens: Uint32Array,
  token_types: string[],
  sink: ClaimSink,
  frames?: FrameTable,
) => void;

// A Reclassifier with a `__claim` property is claim-producing: callable in
// apply mode (as a normal Reclassifier) and also usable in batch mode via
// `.__claim`. The apply-mode path applies the claims itself; the batch path
// defers application so multiple passes can merge claims by precedence.
export type ClaimingReclassifier = Reclassifier & {
  __claim: ClaimFn;
};

// reclassifier layers. a reclassifier belongs to exactly one layer, which
// reflects what kind of transform it performs — and, post-refactor, which
// execution tier it will run in once claims-based composition lands.
//
//   shape       — modifies the token STREAM (merges adjacent tokens, splits
//                 tokens, otherwise changes token count / positions). must
//                 run sequentially and before type_claim passes because
//                 downstream passes' token indices depend on the final stream
//                 shape. examples: bash/extend_variables, bash/merge_numbers,
//                 rust/extend_lifetime_over_type.
//   type_claim  — rewrites only token TYPES (no shape changes). the vast
//                 majority of passes. in the current architecture these still
//                 run sequentially; in the planned claims-based architecture
//                 they will run against the base stream and merge by precedence.
//   embed       — splices SUB-LANGUAGE tokens into the host stream. always
//                 runs after all type_claim passes so sub-tokenization sees
//                 the fully classified host tokens around it.
//
// the layer is metadata today (step 1 of the reclassifier refactor). later
// steps drive the pipeline runner from these labels.
export type ReclassifierLayer = "shape" | "type_claim" | "embed";

// a tagged reclassifier advertises which token types it may produce and which
// execution layer it belongs to. the language factory uses `produces` to decide
// whether the pass runs under a given fidelity setting; an empty `produces`
// array marks the pass as always-on (correctness / normalisation / embed
// passes), equivalent to leaving the reclassifier untagged in earlier versions.
export interface TaggedReclassifier {
  reclassifier: Reclassifier;
  produces: string[];
  layer: ReclassifierLayer;
}

export type ReclassifierEntry = Reclassifier | TaggedReclassifier;
export type LanguagePipeline = ReclassifierEntry[];

// coarse fidelity tiers plus a fine-grained allowlist by output token type.
//   'high'        — run every reclassifier (all produces). the default.
//   'low'         — run only always-on entries; skip every tagged pass. the
//                   output stream contains bare grammar-level tokens.
//   string[]      — run always-on entries plus any tagged entry whose
//                   `produces` intersects the list. unknown names are
//                   silently ignored.
export type FidelityLevel = "high" | "low";
export type FidelitySpec = FidelityLevel | readonly string[];

export interface LanguageOptions {
  fidelity?: FidelitySpec;
  // when present, the language factory installs an annotation extractor in
  // the returned LanguageFn. when absent the factory closure is identical to
  // today's, preserving the zero-cost-when-disabled invariant.
  annotation?: AnnotationConfig;
}

// ---------------------------------------------------------------------------
// annotation transformer system
// ---------------------------------------------------------------------------
//
// in-source directives `[!verb[#id][ args]]` written inside source-language
// comments are extracted post-tokenize and produce overlays — additional
// CSS classes that the renderer applies to token spans (token-mode) or line
// spans (line-mode). overlays do NOT affect token types; they live in a
// parallel structure on TokenizeResult.

export interface AnnotationConfig {
  // plugins claim verbs and produce overlay contributions. order is preserved
  // for stable error reporting on collisions.
  plugins: AnnotationPlugin[];
  // optional sink for extraction errors. when omitted the framework throws.
  on_error?: (issue: AnnotationIssue) => void;
}

export interface AnnotationPlugin {
  // verbs claimed by this plugin. registration-time collision is an error.
  verbs: string[];
  // 'shared' (default) parses the args into ParsedArgs. 'raw' passes the
  // text after the verb (and #id) with trailing whitespace trimmed; the
  // framework still finds, hides and validates the marker but resolves
  // anchors, line refs and pairs only when the plugin asks via `resolve`.
  parse?: "shared" | "raw";
  handle(input: AnnotationInput): AnnotationOutput | void;
}

export interface AnnotationInput {
  verb: string;
  id?: string;
  args: ParsedArgs | string;
  // resolved source range the marker targets (already includes pair resolution
  // and anchor lookup, so plugins receive a fully-resolved span). the
  // marker's own line for raw plugins.
  range: SourceRange;
  marker: SourcePosition;
  // the marker's line holds only markers and will disappear. lets a raw
  // plugin tell a marker above its target from a trailing one.
  standalone: boolean;
  // resolves a fragment of the shared grammar (`+2`, `foo..bar`, `=foo +3`)
  // relative to this marker. half-open pairs cannot be resolved. throws
  // with an AnnotationIssueKind on failure; an escaped throw is reported at
  // the marker's position.
  resolve(fragment: string): SourceRange;
  // every range, one per occurrence for the set form.
  resolve_all(fragment: string): SourceRange[];
}

export interface AnnotationOutput {
  overlays?: OverlayContribution[];
  // reported like framework issues, at the marker's position unless one
  // carries its own.
  issues?: PluginIssue[];
  // false leaves the marker text visible, for a plugin that recognises only
  // part of its verb's argument space. default true.
  consumed?: boolean;
}

export interface PluginIssue {
  kind: AnnotationIssueKind;
  message: string;
  position?: SourcePosition;
}

export interface OverlayContribution {
  start: number;
  end: number;
  // CSS class name (e.g. "emphasis", "highlight", "diff-add").
  classification: string;
  // line-mode overlays attach to the <span class="l"> wrapping each line in
  // the range; token-mode overlays attach to each <span class="tok"> whose
  // bytes intersect the range. defaults to false (token-mode).
  line_mode?: boolean;
}

// argument forms the framework parses for plugins with parse: 'shared'.
//
// `inclusive*` (on lineRef and range) follows the spec's "more dots more
// content" rule:
//   `..`  -> inclusive: false (endpoint excluded)
//   `...` -> inclusive: true  (endpoint included)
// for single-line `lineRef` with no `to`, `inclusive` is ignored.
//
// `range` carries independent inclusivity per endpoint so that paired
// half-open markers (`<a>...` paired with `..<b>`) can preserve each
// half's chosen inclusivity. closed forms set both flags from the same
// dot count (`<a>..<b>` -> both false, `<a>...<b>` -> both true).
export type ParsedArgs =
  | { kind: "bare" }
  | { kind: "lineCount"; count: number }
  | { kind: "lineRef"; from: number; to?: number; inclusive?: boolean }
  | {
      kind: "range";
      from: Anchor | null;
      to: Anchor | null;
      inclusive_start: boolean;
      inclusive_end: boolean;
    }
  // `=foo` matches on the marker's own line; a scope (`=foo +2`, `=foo :*`)
  // searches those lines instead.
  | { kind: "set"; anchor: Anchor; scope?: SetScope }
  // `***` shorthand: every byte on the marker's own line, token-mode. the
  // cleaner equivalent of `*..*` (which the parser rejects as malformed
  // because it has no anchor reference). use bare `[!em]` for line-mode
  // styling instead.
  | { kind: "wholeLine" };

export type SetScope =
  | { kind: "lineCount"; count: number }
  | { kind: "lineRef"; from: number; to?: number; inclusive?: boolean }
  | { kind: "all" };

export type Anchor =
  | { kind: "word"; value: string }
  | { kind: "literal"; value: string }
  | { kind: "wildcard" };

export interface SourcePosition {
  // byte offsets into the original input string.
  start: number;
  end: number;
  // 1-indexed line number containing the marker.
  line: number;
}

export interface SourceRange {
  // byte offsets into the original input.
  start: number;
  end: number;
  // 1-indexed line numbers covering the resolved range.
  start_line: number;
  end_line: number;
}

export type AnnotationIssueKind =
  | "verb_collision"
  | "anchor_not_found"
  | "unmatched_pair"
  | "marker_spans_newline"
  | "set_with_pairing"
  | "malformed"
  | "unsupported";

export interface AnnotationIssue {
  kind: AnnotationIssueKind;
  message: string;
  position: SourcePosition;
}

// the result attached to TokenizeResult.overlays. flat typed arrays so the
// renderer's overlay sweep is integer-only.
export interface OverlayResult {
  // sorted by start. Uint32Array of 4-tuples [start, end, class_id, flags].
  // flags bit 0 = line-mode. other bits reserved (focus-sibling etc.).
  ranges: Uint32Array;
  // class_id -> CSS class name.
  classifications: string[];
  // sorted Uint32Array pairs [start, end] of marker bytes the renderer
  // substitutes with whitespace (or omits, depending on phase 1 choice).
  skip_ranges: Uint32Array;
  // 1-indexed line numbers (sparse) the renderer should drop entirely:
  // lines that contained only marker bytes plus whitespace. stored as a
  // dense Uint8Array indexed by line number; bit 0 of byte n marks line n.
  elided_lines: Uint8Array;
}

// a compiled language: call the factory with options to get the tokenize
// function for that configuration. `language()` (no args) is the default,
// full-fidelity pipeline.
export type LanguageFactory = (options?: LanguageOptions) => LanguageFn;

// per-call options for rendering tokens to HTML. passed to the function
// returned by a language package's `language()` factory, and consumed
// directly by `to_html`.
export interface RenderOptions {
  class_name?: string;
  // numbering counts visible lines, so a line elided by an annotation never
  // leaves a gap.
  line_numbers?: boolean | { start?: number };
  // emitted on <pre> after class, in the order given. true is a bare name,
  // false emits nothing. `class` and `style` are reserved.
  attributes?: Record<string, string | number | boolean>;
  // `has-<classification>` on <pre> for every overlay the snippet carries.
  // default true.
  has_classes?: boolean;
  // merged with any marker overlays already on the tokenize result.
  overlays?: OverlayItem[];
  // "inline" emits no block or line elements and <br> between lines. the
  // block and line level options are ignored.
  structure?: "classic" | "inline";
  // n is the visible index regardless of a line_numbers start, source_line
  // the 1-based input line. not called in inline mode.
  line?: (n: number, source_line: number) => HookResult | void;
  // a decorated token renders as its own span and is never merged.
  token?: (type: string, start: number, end: number) => HookResult | void;
  // wraps spaces and tabs between tokens, one span per character. whitespace
  // inside a token stays part of it.
  whitespace?: "all" | "boundary" | "leading" | "trailing";
  // splits leading indentation into <span class="indent"> levels: a tab is
  // one level, `size` spaces are one level (default 2).
  indent_guides?: boolean | { size?: number };
}

// class goes after the element's own classes; attrs follow the `attributes`
// rules.
export interface HookResult {
  class?: string;
  attrs?: Record<string, string | number | boolean>;
}

// offsets are utf-16 code units, the same units as token positions. lines
// are 1-based and characters 0-based. `end` is exclusive in both forms.
export type OverlayPosition = number | { line: number; character: number };

// a hidden range renders as spaces of equal width and takes any line it
// empties with it.
export type OverlayItem =
  | { start: OverlayPosition; end: OverlayPosition; class: string }
  | { line: number; class: string }
  | { lines: (number | [number, number])[]; class: string }
  | { start: OverlayPosition; end: OverlayPosition; hide: true };

// Pattern language for `rewrite_types` — tag-discriminated union so authors
// build patterns with the exported combinator helpers (`type`, `seq`,
// `any_of`, `optional`, `capture`, `balanced_parens`).

// Named character-class predicates over a token's source text. Used as a
// declarative alternative to writing a hand-rolled Reclassifier just to
// check casing conventions. Adding a new predicate name requires a matching
// runtime implementation in reclassifier.ts.
export type CharPredName = "upper_snake_case" | "pascal_case";

export interface TypePatternSpec {
  __kind: "type";
  type_name: string;
  value?: string | string[];
  // Filter the matched token by a character-class predicate on its source
  // text. Combinable with `value`: both must pass. Currently only used on
  // anchor patterns; when used inside `when` it falls back to the runtime
  // predicate but does not yet skip the type/value bytecode work.
  text_pred?: CharPredName;
}

export interface SeqPatternSpec {
  __kind: "seq";
  children: TokenPatternSpec[];
}

export interface AnyOfPatternSpec {
  __kind: "anyOf";
  branches: TokenPatternSpec[];
}

export interface OptionalPatternSpec {
  __kind: "optional";
  inner: TokenPatternSpec;
}

export interface CapturePatternSpec {
  __kind: "capture";
  name: string;
  inner: TokenPatternSpec;
}

// Walk tokens counting paren depth inside bracket-carrying tokens until
// depth returns to zero. Used for arrow-function parameter lists.
export interface BalancedPatternSpec {
  __kind: "balanced";
  open: string;
  close: string;
  max_tokens?: number;
  // token type carrying the bracket characters. defaults to "punctuation";
  // grammars that emit brackets under a different type name set this.
  punct_type?: string;
}

// Match the inner pattern zero or more times, optionally separated. The
// repetition is POSSESSIVE: once an iteration matches, the matcher never
// backtracks into fewer iterations -- design patterns so the token after
// the repetition cannot also start an iteration. An iteration that
// consumes no tokens terminates the loop (no infinite repeats). Captures
// inside the body record one span per iteration.
export interface RepeatPatternSpec {
  __kind: "repeat";
  inner: TokenPatternSpec;
  separator?: TokenPatternSpec;
}

// Zero-width negative lookahead over a single token: succeeds when the
// next non-trivia token does NOT match the inner spec (or the stream has
// ended), without consuming anything. An inner spec naming an unknown
// type or predicate fails CLOSED -- the assertion (and so the rule)
// never matches, consistent with the rest of the pattern language.
export interface NotPatternSpec {
  __kind: "not";
  inner: TypePatternSpec;
}

// Char-aware parameter-list walker: locate an opening "(" from the current
// position, walk its separator-split chunks, and record each tagged name
// token as one capture span under `into` (claimed by a `{ into: type }`
// rewrite map like any capture). The construct exists because grammars
// coalesce adjacent punctuation ("((", "({"), so paren walking needs
// character offsets the token-granular combinators cannot express:
// detection composes from ordinary anchors, gates, and combinators; the
// walk runs as one opcode.
export interface ParamsPatternSpec {
  __kind: "params";
  // capture name receiving one single-token span per tagged parameter.
  into: string;
  // how to locate the opening paren:
  //  "starts_with" — the next non-trivia token must be punctuation whose
  //                  text begins with "(" (function / method shapes).
  //  "scan"        — scan forward through punctuation counting [] and {}
  //                  depth to the first "(" at top depth (rides over
  //                  go-style [T any] generics). the first non-trivia
  //                  token must be punctuation; an unbalanced close or
  //                  the scan bound fails the branch.
  //  "arrow"       — the ANCHOR token carries the "(": try each "("
  //                  offset and accept the first whose matching close
  //                  ends its token and is followed by "=>". must be the
  //                  first element of `when`.
  find_open: "starts_with" | "scan" | "arrow";
  // chunk strategies:
  //  "first_ident"   — tag the first identifier at depth 1 of each chunk;
  //                    `default_introducer` suspends tagging until the
  //                    next chunk; `transparent_operators` pass through.
  //  "carry_pending" — bare single-name chunks pend; a chunk with a type
  //                    after its first name promotes itself and all
  //                    pending names (go's `x, y int`).
  strategy: "first_ident" | "carry_pending";
  // single-char chunk separator at top depth. usually ",".
  separator: string;
  default_introducer?: string;
  transparent_operators?: string[];
  // skip a leading generics group before locating the paren: token-text
  // angle counting over operator tokens (`<` `>` `>>` `>>>`).
  skip_generics: boolean;
  // arrow mode: allow `(...): T =>` by scanning a return type annotation
  // between the close and the arrow.
  skip_ts_return_type: boolean;
  // arrow mode: reject a candidate whose preceding token ends with ":"
  // unless directly inside an object-kind brace frame (a `: (x) => y`
  // type signature vs an object-literal function value). requires an
  // upstream frame_track stage; fails closed without one.
  skip_in_type_position: boolean;
  // scan mode bound on tokens examined while locating the paren.
  scan_max_tokens: number;
}

// Type-expression span walker: from the current position, consume tokens
// in "type mode" until a terminator, recording each identifier that reads
// as a type reference as one capture span under `into` (claimed by a
// `{ into: type }` rewrite map like any capture). The construct exists
// because type-expression extent is stream-continuous: where a type ends
// depends on bracket / angle depth relative to entry and on terminator
// classes (value operators, statement keywords), which the token-granular
// combinators cannot express. Entry detection composes from ordinary
// anchors and gates; the span walk runs as one opcode.
//
// Exits (always relative to the depths at entry):
//   - a `)` `}` `]` that drops below entry depth
//   - `;` at entry depth
//   - `,` at entry depth (exit_on_comma; off for extends / implements /
//     generics lists, whose commas separate more types)
//   - `=` at entry depth (exit_on_eq; off for generics, where `=`
//     introduces a default type)
//   - `=>` at entry depth, unless the previous token ends with `)` (a
//     function type's result arrow)
//   - `?` at entry depth (exit_on_qmark; on for as / satisfies spans,
//     which end at a ternary, off elsewhere where `?` is type level)
//   - any operator in value_op_terminators / keyword in
//     stmt_keyword_terminators at entry depth
//   - the unmatched `>` when enter_angle is set (the span IS an angle
//     group, e.g. generic type arguments)
//   - a `{` at entry depth whose previous token reads as the end of a
//     type expression (brace_exit_on_closer; return-type and heritage
//     spans end at the body brace)
//
// Inside the span, identifiers are recorded EXCEPT key positions: at
// nested paren / brace depth, an identifier directly followed by `:` or
// `?:` is a parameter name or property key, not a type reference.
export interface TypeSpanPatternSpec {
  __kind: "type_span";
  // capture name receiving one single-token span per type identifier.
  into: string;
  exit_on_comma: boolean;
  exit_on_eq: boolean;
  exit_on_qmark: boolean;
  // start the walk one angle level deep: the anchor consumed the opening
  // `<`, so the matching unmatched `>` ends the span.
  enter_angle: boolean;
  brace_exit_on_closer: boolean;
  // operator source texts that end the span at entry depth (binary /
  // assignment / increment operators that cannot appear in a type).
  value_op_terminators?: string[];
  // keyword source texts that end the span at entry depth (statement
  // starters that mean the type expression is over).
  stmt_keyword_terminators?: string[];
  // keywords that can legitimately END a type expression; used by the
  // brace_exit_on_closer check so `(): void {` exits at the body brace.
  type_terminal_keywords?: string[];
  // with enter_angle: before walking, verify the span LOOKS like a
  // generic type-argument list -- a balanced single-char `>` close exists
  // (riding `{...}` groups, bailing on `;` or a stray `}`), and the token
  // after the close is consistent with type arguments finishing (bracket
  // / separator punctuation, `=` `=>` `?:` `|` `&` `>` `?` `!` operators,
  // or `extends` / `implements`). when the check fails the BRANCH fails,
  // so `a < b` comparisons never start a span.
  verify_generic_args: boolean;
}

export type TokenPatternSpec =
  | TypePatternSpec
  | SeqPatternSpec
  | AnyOfPatternSpec
  | OptionalPatternSpec
  | CapturePatternSpec
  | BalancedPatternSpec
  | RepeatPatternSpec
  | NotPatternSpec
  | ParamsPatternSpec
  | TypeSpanPatternSpec;

// A rewrite rule says: starting at a token matching `anchor` (a bare type
// name, or `type(name, value)` to also constrain source text), if the
// token stream after the anchor matches `when` (and optionally the token
// stream before the anchor matches `before`), apply `rewrite`:
//   - `string`   → rewrite the anchor token's type to this name (Phase 1).
//   - object map → for each `{ capture_name: type_name }` entry, find the
//                  capture() with that name in `when` and rewrite every
//                  token inside every span that capture recorded -- one
//                  span per occurrence, so captures inside repeat bodies
//                  retag each iteration. Missing captures silently skip.
// anchor form of a rewrite rule. extends the single-token filters with
// optional gates over the shared frame table produced by an upstream
// frame_track stage:
//
//   at_start     — the token must sit at member start (frames.at_start).
//   frame_kinds  — the kind of the nearest enclosing BRACE frame must be
//                  one of these names (paren / bracket frames are walked
//                  through via parent links; "top" matches tokens no
//                  brace encloses).
//   frame_direct — with frame_kinds, match the token's INNERMOST frame
//                  instead of walking to the nearest brace. a token
//                  inside parens then only matches the built-in "paren"
//                  kind, so member-position rules can require the brace
//                  body itself rather than any nesting depth within it.
//   ternary_colon — require (true) or forbid (false) that a colon char in
//                  the anchor consumed a pending ternary qmark. needs
//                  FrameSpec.ternary configured upstream.
//   stmt_flags_all / stmt_flags_none — every named stmt flag must be
//                  armed / no named flag may be armed on the anchor's
//                  frame. needs FrameSpec.stmt_flags configured upstream.
//
// either gate failing — or the pipeline having no frame_track stage at
// all — means the rule never fires (fail closed). `type(...)` helper
// output is assignable here for gate-free anchors.
export interface AnchorSpec {
  type_name: string;
  value?: string | string[];
  // match when the anchor's source text ENDS with one of these strings.
  // grammars coalesce adjacent punctuation (`):`, `]:`, `}))`), so exact
  // value sets cannot anchor on "a token whose last char is `:`" without
  // enumerating every bundle; this is the suffix form. combinable with
  // `value`: both must pass.
  value_ends_with?: string | string[];
  text_pred?: CharPredName;
  at_start?: boolean;
  frame_kinds?: string[];
  frame_direct?: boolean;
  ternary_colon?: boolean;
  stmt_flags_all?: string[];
  stmt_flags_none?: string[];
}

export interface RewriteRule {
  // The anchor identifies the token to rewrite. A bare type name is
  // sugar for `type(name)` with no value constraint; the object form
  // also filters on source text, character class, and frame gates.
  anchor: string | AnchorSpec;
  before?: TokenPatternSpec;
  // when is optional: a rule with only `before` (and optionally an
  // anchor value constraint) runs a no-op forward scan that always
  // succeeds, so the anchor is rewritten whenever the preceding window
  // matches.
  when?: TokenPatternSpec;
  rewrite: string | Record<string, string>;
  // claim precedence for this rule's targets (anchor and captures).
  // defaults to the target type's shared-table precedence. languages
  // whose pipeline priority deviates from the table (e.g. structural
  // position beating a casing convention) state the deviation here
  // instead of dropping to a hand-written ClaimFn.
  precedence?: number;
}

export interface RewriteOptions {
  // token type names treated as trivia and skipped between pattern elements.
  // for JavaScript this is typically ["comment"].
  trivia?: string[];
}

// A "language function" — the common-case entry point every language package
// exports via `create_language`. Takes source text, returns the full enriched
// TokenizeResult. This is what `embed_grammars` calls to sub-tokenize a span.
export type LanguageFn = (input: string) => TokenizeResult;

// Detailed embed entry for cases that need slicing / delimiter wrapping.
// - `trim_start`/`trim_end` skip that many chars at the respective end of the
//   host token before passing the content to the sub-language.
// - `wrap_token` (optional) names a host token type. If set, the trimmed
//   delimiter chars are re-emitted as tokens of this type so they stay
//   styled — useful for tagged-template backticks which would otherwise
//   become untokenized gaps in the output.
export interface EmbedEntry {
  language: LanguageFn;
  trim_start?: number;
  trim_end?: number;
  wrap_token?: string;
}

// Mapping from host token type names to the sub-language (or detailed
// EmbedEntry) to apply when the host emits a token of that type. When
// `embed_grammars` encounters such a token, it calls the language on the
// token's source slice, merges the sub-result's token types into the host's,
// remaps sub type IDs, and splices the remapped tokens in place of the
// original host token.
export interface EmbedMapping {
  [host_type_name: string]: LanguageFn | EmbedEntry;
}

// ---------------------------------------------------------------------------
// embed_interleaved — generic discontinuous embedding
// ---------------------------------------------------------------------------
//
// Some host-language constructs produce a "group" of tokens where content
// for a sub-language is interleaved with host-language "holes" that must be
// preserved verbatim. Tagged template literals are the exemplar case —
// `html`<p class="${cls}">hi</p>`` has HTML content broken up by a JS
// interpolation that needs to stay highlighted as JS.
//
// `embed_interleaved` handles this generically: the user provides a scanner
// callback that finds a group in the token stream and describes its regions
// (content chunks, hole chunks, synthetic delimiter wrappers). The transform
// then builds a single virtual source string, tokenizes it with the
// sub-language in one call (giving the sub-tokenizer full state continuity
// across holes), and splices the result back into the host stream with
// positions remapped to the real source.

/**
 * Region kinds describing how each part of a group contributes to the output.
 */
export type Region = ContentRegion | HoleRegion | SyntheticRegion;

/**
 * Content region — its source bytes are copied into the virtual source and
 * handed to the sub-language. Sub-tokens covering this range are emitted in
 * the output at their remapped real positions.
 */
export interface ContentRegion {
  kind: "content";
  /** Start of the range in the real host input (inclusive). */
  source_start: number;
  /** End of the range in the real host input (exclusive). */
  source_end: number;
}

/**
 * Hole region — its source bytes become placeholder-filled in the virtual
 * source so the sub-language's state machine flows across them. In the output,
 * the original host tokens in `[token_start, token_end)` are emitted verbatim
 * in place of the hole.
 */
export interface HoleRegion {
  kind: "hole";
  /** Start of the range in the real host input (inclusive). */
  source_start: number;
  /** End of the range in the real host input (exclusive). */
  source_end: number;
  /** First host token index to emit verbatim. */
  token_start: number;
  /** One past the last host token index to emit verbatim. */
  token_end: number;
}

/**
 * Synthetic region — does not contribute to the virtual source and has no
 * corresponding host token. A NEW token is synthesized at the region's
 * position with the given type name. Used for delimiter characters that
 * are part of a larger host token but need to appear as separate tokens in
 * the output (e.g. the backticks of a JS tagged template).
 */
export interface SyntheticRegion {
  kind: "synthetic";
  /** Start of the range covered by the synthetic token (inclusive). */
  source_start: number;
  /** End of the range covered by the synthetic token (exclusive). */
  source_end: number;
  /** Token type name — merged into token_types if not already present. */
  type_name: string;
}

/**
 * A group descriptor returned by a scan callback. Describes everything the
 * core primitive needs to process a discontinuous embedded group.
 */
export interface GroupDescriptor {
  /** Host token index where the group begins (inclusive). */
  token_start: number;
  /** Host token index where the group ends (exclusive). */
  token_end: number;
  /**
   * The group's regions in source order. The scanner is responsible for
   * ensuring regions are non-overlapping and cover the group meaningfully.
   */
  regions: Region[];
  /**
   * Optional per-group sub-language override. If set, this language is
   * used instead of the config's default — lets one scanner route
   * different groups to different sub-languages (e.g. `html` vs `css`
   * tagged templates in one pass).
   */
  language?: LanguageFn;
}

/**
 * Scanner callback — called at each host token position. Returns a
 * GroupDescriptor if a group starts at `start_idx`, or null if not. The
 * scanner is the only host-specific code; the core transform is entirely
 * language-agnostic.
 */
export type GroupScanFn = (
  tokens: Uint32Array,
  input: string,
  start_idx: number,
  token_types: string[],
) => GroupDescriptor | null;

export interface EmbedInterleavedConfig {
  /** Scanner that finds groups in the host token stream. */
  scan: GroupScanFn;
  /**
   * Default sub-language used when a descriptor omits `language`. May be
   * omitted if every descriptor supplies its own.
   */
  language?: LanguageFn;
  /**
   * Character used to fill hole spans in the virtual source. Must be
   * "neutral" for the sub-language's tokenizer. Default: " ".
   */
  hole_char?: string;
}

// Introspector types
export interface IntrospectorOptions {
  log?: ((type: string, data: any) => void) | null;
  collect_history?: boolean;
  max_history_size?: number;
  grammar_mapper?: GrammarMapper;
  state_names?: Record<number, string>;
  rule_names?: Record<number, Record<number, string>>;
  enhanced_logging?: boolean;
}

export interface IntrospectorEvent {
  type: string;
  pos?: number;
  char?: number;
  char_str?: string;
  current_state?: string | number;
  current_state_index?: number;
  stack_depth?: number;
  state_stack?: string[] | number[] | Uint16Array;
  state_stack_indices?: number[];
  full_state_path?: string[] | number[];
  full_state_indices?: number[];
  probe_mode?: boolean;
  probe_entry?: any;
  failed_probes?: string[];
  input_context?: InputContext;
  rule_index?: number;
  rule_name?: string;
  matched_length?: number;
  transition?: string | number | null;
  token_type?: string | number | null;
  stack_op?: string | number;
  target_state?: string | number;
  is_target_probe_state?: boolean;
  is_in_probe_state?: boolean;
  from_state?: string | number;
  from_state_index?: number;
  to_state?: string;
  to_state_index?: number;
  start?: number;
  end?: number;
  token_index?: number;
  token_name?: string;
  is_fallback?: boolean;
  is_non_ascii?: boolean;
  old_end?: number;
  new_end?: number;
  success?: boolean;
  reset_pos?: number;
  reset_state?: string | number | null;
  reason?: string;
  final_stack_depth?: number;
  token_count?: number;
  final_state?: string | number;
  timestamp?: number;
  token_emitted?: boolean;
  text?: string;
}

export interface InputContext {
  before: string;
  char: string;
  after: string;
  display: string;
}

export interface StateInfo {
  current_state: number;
  state_stack: number[];
  full_path: number[];
}

export interface TokenInfo {
  type: string;
  token_type: number;
  token_name: string;
  start: number;
  end: number;
  value?: string;
  token_index: number;
  is_fallback?: boolean;
  is_non_ascii?: boolean;
}

export interface RouteStep {
  type: "START" | "PUSH" | "POP" | "TRANSITION";
  state?: number;
  state_name?: string;
  from?: number;
  from_name?: string;
  to?: string | number;
  to_name?: string;
  position: number;
  depth: number;
  rule?: string | number | null;
  token_emitted?: boolean;
  entry_position?: number;
  characters_processed?: number;
  rules_applied?: Array<{ rule: string; count: number }>;
  is_probe?: boolean;
}

export interface StateSession {
  state_name: string;
  state_index: number;
  entry_position: number;
  exit_position?: number;
  characters_processed: number;
  rules_applied: Map<string, number>;
  is_probe: boolean;
  depth: number;
  entry_rule?: string;
  exit_rule?: string;
}

export interface CompleteState {
  position: number;
  char: string | null;
  context: InputContext;
  state: {
    current: number;
    stack: number[];
    full_path: number[];
    depth: number;
  };
  current_token: TokenInfo | null;
  rules_matched: IntrospectorEvent[];
  state_transitions_at_position?: IntrospectorEvent[];
  all_events_at_position?: IntrospectorEvent[];
  recent_history: IntrospectorEvent[];
  total_events_processed: number;
  current_state_session?: StateSession;
}

export interface TokenHistory {
  token: TokenInfo;
  history: IntrospectorEvent[];
}

export interface Report {
  summary: {
    input_length: number;
    token_count: number;
    state_transitions: number;
    rule_matches: number;
    probe_events: number;
  };
  tokens: TokenInfo[];
  state_transitions: IntrospectorEvent[];
  top_rules: Array<{ rule: string | number; count: number }>;
  probe_history: IntrospectorEvent[];
}

// Grammar Mapper types
export interface RuleDetails {
  pattern: string;
  token?: string;
  action: string | null;
  description: string;
  original: GrammarRule;
}

export interface TokenDescription {
  name: string;
  position: string;
  text: string;
  length: number;
}

export interface Analysis {
  summary: {
    total_tokens: number;
    unique_token_types: number;
    states_visited: number;
    max_stack_depth: number;
  };
  tokens_by_type: Record<
    string,
    {
      count: number;
      examples: string[];
      total_length: number;
    }
  >;
  state_visits: Record<string, number>;
  rule_usage: Record<
    string,
    {
      count: number;
      state: string;
      details: RuleDetails | null;
    }
  >;
}

export interface PositionAnalysis {
  position: number;
  character: string;
  input_context: string;
  state_path: string;
  state_stack: string[];
  current_state: string;
  depth: number;
  current_token: (TokenInfo & { type_name: string }) | null;
  matched_rules: Array<{
    rule: string;
    details: RuleDetails | null;
  }>;
  recent_events: string[];
}

// Grammar Mapper class interface
export interface IGrammarMapper {
  original_grammar: Grammar;
  compiled_grammar: CompiledGrammar;
  state_names: Record<number, string>;
  state_rules: Record<number, Record<number, string>>;
  rule_descriptions: Record<number, Record<number, RuleDetails>>;
  token_names: Record<number, string>;

  get_state_path(state_indices: number[]): string;
  get_state_name(state_index: number): string;
  get_rule_name(state_index: number, rule_index: number): string;
  get_rule_details(state_index: number, rule_index: number): RuleDetails | null;
  get_token_name(token_type: number): string;
  describe_transition(from_state: number, to_state: number, stack_op: number): string;
  describe_token(token_type: number, start: number, end: number, text?: string): TokenDescription;
  create_enhanced_introspector<T extends TokenizerIntrospector>(
    IntrospectorClass: new (options: IntrospectorOptions) => T,
    options?: IntrospectorOptions,
  ): T;
  analyze_tokenization(introspector: TokenizerIntrospector): Analysis;
  generate_report(introspector: TokenizerIntrospector): string;
  analyze_position(introspector: TokenizerIntrospector, pos: number): PositionAnalysis;
  get_full_route(introspector: TokenizerIntrospector, pos: number): RouteStep[];
  format_route(introspector: TokenizerIntrospector, pos: number): string;
}

// Type guard for GrammarMapper in options
export interface GrammarMapper extends IGrammarMapper {}
export type { TokenizerIntrospector };
