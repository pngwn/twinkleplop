import { tokenize } from "@twinkleplop/core";
import { raw_grammar } from "./src/index.js";

// Test the raw grammar to see rules
console.log("Main state identifier rule:");
const identifierRule = raw_grammar.states.main.rules.find(r => r.range && r.state === "identifier");
console.log(JSON.stringify(identifierRule, null, 2));

console.log("\nIdentifier state rules:");
console.log(JSON.stringify(raw_grammar.states.identifier, null, 2));