// Finding 3: dts-buddy inlines a full copy of every reachable declaration into
// each entry point's module block. TypeScript compares classes with `private`
// members nominally, so the documented debug flows were rejected (TS2345) even
// though both sides are the same class at runtime.
import { tokenize } from "@twinkleplop/core/debug";
import { TokenizerIntrospector } from "@twinkleplop/core/introspector";
import { GrammarMapper } from "@twinkleplop/core/grammar-mapper";
import { grammar, raw_grammar } from "@twinkleplop/javascript";

const introspector = new TokenizerIntrospector({ log: null });

// introspector from `/introspector` into tokenize from `/debug`
tokenize("const x = 1;", grammar, introspector);

// and the same class into the mapper from `/grammar-mapper`
const mapper = new GrammarMapper(raw_grammar, grammar);
export const enhanced = mapper.create_enhanced_introspector(TokenizerIntrospector);
