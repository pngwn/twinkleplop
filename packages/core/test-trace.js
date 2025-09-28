import { compile } from "./src/compiler.js";
import { tokenize } from "./src/tokenizer.js";
import { TokenizerIntrospector } from "./src/introspector.js";
import { GrammarMapper } from "./src/grammar-mapper.js";

const grammar = {
  name: "test",
  states: {
    main: {
      rules: [
        { match: "{", token: "brace.open", state: "block" },
        { match: "x", token: "x" },
      ],
    },
    block: {
      rules: [
        { match: "y", token: "y" },
        { match: "}", token: "brace.close", exit: true },
      ],
    },
  },
};

const compiled = compile(grammar);
const mapper = new GrammarMapper(grammar, compiled);
const introspector = new TokenizerIntrospector({ 
  grammarMapper: mapper,
  enhancedLogging: true 
});
const input = "x{yyy}x";

tokenize(input, compiled, introspector);

console.log("\n=== State Sessions ===");
for (const session of introspector.stateSessions) {
  console.log(`${session.stateName}: entry=${session.entryPosition}, chars=${session.charactersProcessed}, probe=${session.isProbe}`);
}
