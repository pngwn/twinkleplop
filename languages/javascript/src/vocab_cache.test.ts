import { describe, it, expect } from "vitest";
import { find_vocab, remember_vocab } from "./reclassifiers.js";

describe("vocabulary id cache", () => {
  it("hits for a distinct array with equal contents", () => {
    const keys: string[][] = [];
    const vals: number[] = [];
    remember_vocab(keys, vals, ["identifier", "comment", "template"], 1);
    const hit = find_vocab(keys, ["identifier", "comment", "template"]);
    expect(hit).toBe(0);
    expect(vals[hit]).toBe(1);
  });

  it("misses for a different vocabulary of the same length", () => {
    const keys: string[][] = [];
    const vals: number[] = [];
    remember_vocab(keys, vals, ["identifier", "comment"], 1);
    expect(find_vocab(keys, ["identifier", "string"])).toBe(-1);
  });

  it("misses once a cached vocabulary grows in place", () => {
    const keys: string[][] = [];
    const vals: number[] = [];
    const token_types = ["identifier", "template"];
    remember_vocab(keys, vals, token_types, 1);
    token_types.push("comment");
    expect(find_vocab(keys, token_types)).toBe(-1);
    remember_vocab(keys, vals, token_types, 2);
    expect(vals[find_vocab(keys, token_types)]).toBe(2);
    expect(find_vocab(keys, ["identifier", "template"])).toBe(0);
  });

  it("evicts the oldest entry when full", () => {
    const keys: string[][] = [];
    const vals: number[] = [];
    for (let i = 0; i < 5; i++) remember_vocab(keys, vals, ["t" + i], i);
    expect(keys.length).toBe(4);
    expect(find_vocab(keys, ["t0"])).toBe(-1);
    expect(vals[find_vocab(keys, ["t4"])]).toBe(4);
  });
});
