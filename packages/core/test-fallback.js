import { compile } from "./src/compiler.js";
import { tokenize } from "./src/tokenizer.js";
import { TokenizerIntrospector } from "./src/introspector.js";
import { GrammarMapper } from "./src/grammar-mapper.js";

const grammar = {
  name: "test",
  states: {
    main: {
      rules: [{ match: "if", state: "probe_if" }],
    },
    probe_if: {
      mode: "probe",
      fallback: "identifier",
      rules: [
        { match: " " },
        { match: "(", state: "if_statement" },
      ],
    },
    identifier: {
      rules: [{ match: "if", token: "identifier" }],
    },
    if_statement: {
      rules: [{ match: "if", token: "keyword.if" }],
    },
  },
};

const compiled = compile(grammar);
const mapper = new GrammarMapper(grammar, compiled);
const introspector = new TokenizerIntrospector({ grammarMapper: mapper });

tokenize("if", compiled, introspector);

console.log("State sessions:");
for (const session of introspector.stateSessions) {
  console.log(`- ${session.stateName}: entry=${session.entryPosition}, chars=${session.charactersProcessed}, probe=${session.isProbe}`);
}

console.log("\nTokens:", introspector.getTokens());
