import { describe, it, expect } from "vitest";
import { tokenize as make_language } from "./index.js";

const language = make_language();

function tokens_of(input) {
  const r = language(input);
  const out = [];
  for (let i = 0; i < r.tokens.length / 3; i++) {
    out.push({
      type: r.token_types[r.tokens[i * 3]],
      value: input.slice(r.tokens[i * 3 + 1], r.tokens[i * 3 + 2]),
    });
  }
  return out;
}

describe("user-reported type-only declarations", () => {
  it("import type / export type / type alias names tag as type", () => {
    const src = `import type { User } from "./types";
export type { User };

export type Config = {
  debug: boolean;
  port: number;
};`;
    const tokens = tokens_of(src);
    const at = (val) => tokens.find((t) => t.value === val)?.type;
    expect(at("User")).toBe("type");
    expect(at("Config")).toBe("type");
    expect(at("debug")).toBe("property");
    expect(at("port")).toBe("property");
    expect(at("boolean")).toBe("type");
    expect(at("number")).toBe("type");
  });

  it("import type Foo from default import tags Foo as type", () => {
    const tokens = tokens_of('import type Foo from "./foo";');
    const at = (val) => tokens.find((t) => t.value === val)?.type;
    expect(at("Foo")).toBe("type");
  });

  it("import type { A as B } tags both as type", () => {
    const tokens = tokens_of('import type { A as B } from "./x";');
    const at = (val) => tokens.find((t) => t.value === val)?.type;
    expect(at("A")).toBe("type");
    expect(at("B")).toBe("type");
  });
});

describe("user-reported interface example", () => {
  it("interface Repository extends Collection { ... } params tag correctly", () => {
    const src = `interface Repository extends Collection {
  field: thing;
  find(id: number): User;
  save(user: User): void;
  field2: thing;
}`;
    const tokens = tokens_of(src);
    const at = (val) => tokens.find((t) => t.value === val)?.type;
    expect(at("Repository")).toBe("class_name");
    expect(at("Collection")).toBe("class_name");
    expect(at("field")).toBe("property");
    expect(at("field2")).toBe("property");
    expect(at("find")).toBe("function");
    expect(at("save")).toBe("function");
    expect(at("id")).toBe("parameter");
    expect(at("user")).toBe("parameter");
  });
});
