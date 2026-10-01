import { expect, it } from "vitest";
import type { LanguageFn } from "@twinkleplop/core";
import { GRAMMAR_LOADERS, LANGUAGES } from "./grammars";

it("loads GraphQL and highlights both GraphQL Markdown fence names", async () => {
  expect(LANGUAGES).toContain("graphql");
  const graphql = (await GRAMMAR_LOADERS.graphql()) as { tokenize: () => LanguageFn };
  expect(graphql.tokenize()("query Q { name }").token_types).toContain("keyword");

  const markdown = (await GRAMMAR_LOADERS.markdown()) as { tokenize: () => LanguageFn };
  for (const fence of ["graphql", "gql"]) {
    const source = `\`\`\`${fence}\nquery Q { name }\n\`\`\``;
    const result = markdown.tokenize()(source);
    const properties = [];
    for (let i = 0; i < result.tokens.length; i += 3) {
      if (result.token_types[result.tokens[i]] === "property") {
        properties.push(source.slice(result.tokens[i + 1], result.tokens[i + 2]));
      }
    }
    expect(properties).toContain("name");
  }
});
