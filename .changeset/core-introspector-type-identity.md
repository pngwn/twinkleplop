---
"@twinkleplop/core": patch
---

Fix the debug and introspector declarations rejecting the documented calls. The declaration bundle emits each entry point as a self-contained block, so a class reachable from several subpaths was inlined once per block; because TypeScript compares classes with `private` members nominally, those copies were mutually unassignable. Passing `TokenizerIntrospector` from `/introspector` to `tokenize` from `/debug`, or to `GrammarMapper.create_enhanced_introspector` from `/grammar-mapper`, reported `TS2345` even though both sides are the same class at runtime. The bundled declarations no longer carry `private` members, so the copies share one structural identity.
