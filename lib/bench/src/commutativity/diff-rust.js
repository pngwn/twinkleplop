// diff the two non-commuting orderings of rust fidelity passes.

import { tokenize, reclassify } from "@twinkleplop/core";
import { grammar as rs_grammar, reclassifiers as rs_reclassifiers } from "@twinkleplop/rust";

const correctness = reclassify([rs_reclassifiers[0]]);
const order_a = reclassify([rs_reclassifiers[1], rs_reclassifiers[2]]);
const order_b = reclassify([rs_reclassifiers[2], rs_reclassifiers[1]]);

const src = `
fn apply<'a>(x: &'a str) -> &'a str { x }
fn call_via_lifetime<'b>(f: &'b Foo) -> &'b str { f.name() }
let y = &'static str_fn();
let z: &'a Vec<i32> = &data;
macro_rules! make { ($n:ident) => { fn $n() { println!("{}", stringify!($n)); } } }
make!(generated);
let r = generated::<String>();
`;

function clone(r) {
  return {
    tokens: new Uint32Array(r.tokens),
    token_types: r.token_types.slice(),
  };
}

const raw = tokenize(src, rs_grammar);
const corrected = correctness(src, raw);

const a = order_a(src, clone(corrected));
const b = order_b(src, clone(corrected));

console.log("order a:", "function_call → extend_lifetime");
console.log("order b:", "extend_lifetime → function_call");
console.log();

for (let i = 0; i < Math.max(a.tokens.length, b.tokens.length); i += 3) {
  const at = a.token_types[a.tokens[i]];
  const bt = b.token_types[b.tokens[i]];
  const atxt = src.slice(a.tokens[i + 1], a.tokens[i + 2]);
  const btxt = src.slice(b.tokens[i + 1], b.tokens[i + 2]);
  if (at !== bt || atxt !== btxt) {
    console.log(`@ idx ${i / 3}`);
    console.log(`   a: ${at.padEnd(14)} ${JSON.stringify(atxt)}`);
    console.log(`   b: ${bt.padEnd(14)} ${JSON.stringify(btxt)}`);
  }
}
