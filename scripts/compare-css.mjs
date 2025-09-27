import { tokenize } from "../packages/core/dist/twinkleplop.debug.js";
import { grammar } from "../packages/css/src/index.js";
import exp_nested from "../packages/css/test/nested_selectors.output.js";
import fs from "node:fs";
const input = fs.readFileSync("./packages/css/test/nested_selectors.css", "utf8");
const res = tokenize(input, grammar);
const types = res.tokenTypes;
const actual = [];
for (let i = 0; i < res.tokens.length; i += 3) {
  actual.push({ type: types[res.tokens[i]], start: res.tokens[i + 1], end: res.tokens[i + 2] });
}
console.log("actual count:", actual.length, "expected:", exp_nested.length);
const n = Math.min(actual.length, exp_nested.length);
let firstMismatch = -1;
for (let i = 0; i < n; i++) {
  const a = actual[i];
  const e = exp_nested[i];
  if (a.type !== e.type || a.start !== e.start || a.end !== e.end) {
    firstMismatch = i;
    break;
  }
}
console.log("firstMismatch index:", firstMismatch);
if (firstMismatch !== -1) {
  console.log("expected:", exp_nested[firstMismatch]);
  console.log("actual  :", actual[firstMismatch]);
  console.log("window expected:", exp_nested.slice(Math.max(0, firstMismatch - 5), firstMismatch + 5));
  console.log("window actual  :", actual.slice(Math.max(0, firstMismatch - 5), firstMismatch + 5));
} else if (actual.length !== exp_nested.length) {
  console.log("Lengths differ. Tail actual:", actual.slice(n - 10));
  console.log("Tail expected:", exp_nested.slice(n - 10));
}
