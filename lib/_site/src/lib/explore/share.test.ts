import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";

import { decode_share, encode_share, type share_state } from "./share";

const state: share_state = {
  lang: "tsx",
  source: "const greeting = `héllo ${name} 👋`;\n\tlet x = a < b && c > d;\n",
  theme: "rose-pine",
  fidelity: ["function", "parameter"],
};

describe("share links", () => {
  it("round trips", async () => {
    expect(await decode_share(await encode_share(state))).toEqual(state);
  });

  it("keeps the settings readable, with the code last", async () => {
    const hash = await encode_share(state);
    expect(hash).toMatch(/^v=1&lang=tsx&theme=rose-pine&fidelity=function,parameter&code=[\w-]+$/);
  });

  it("leaves fidelity out when every tag is on, and empty when none are", async () => {
    const all = await encode_share({ ...state, fidelity: null });
    const none = await encode_share({ ...state, fidelity: [] });
    expect(all).not.toContain("fidelity");
    expect((await decode_share(all))?.fidelity).toBeNull();
    expect((await decode_share(none))?.fidelity).toEqual([]);
  });

  it("carries an empty snippet and a long one", async () => {
    const long = "x".repeat(200_000) + "\n";
    for (const source of ["", long]) {
      expect((await decode_share(await encode_share({ ...state, source })))?.source).toBe(source);
    }
  });

  it("reads a whole url", async () => {
    const link = `https://twinkleplop.pngwn.at/explore/edit#${await encode_share(state)}`;
    expect(await decode_share(new URL(link).hash)).toEqual(state);
  });

  it("rejects what is not a link it wrote", async () => {
    const good = await encode_share(state);
    const snippet_bomb = deflateRawSync(Buffer.alloc(4 << 20)).toString("base64url");
    for (const hash of [
      "",
      "#",
      good.replace("v=1", "v=2"),
      good.replace(/code=.*/, "code=not*base64"),
      good.replace(/code=.*/, "code=AAAA"),
      good.replace(/code=.*/, `code=${snippet_bomb}`),
    ]) {
      expect(await decode_share(hash)).toBeNull();
    }
  });
});
