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
