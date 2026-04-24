// mirrors the explore page's tag-derivation logic so regressions in the UI
// toggles surface as a unit-level failure rather than a UI-only bug. keeps
// the lookup of grammar-baked categories (via GRAMMAR_EXTENSION_CATEGORIES)
// next to the reclassifier-produced categories so the UI exposes both.

import { describe, expect, it } from "vitest";
import {
	GRAMMAR_EXTENSION_CATEGORIES,
	type LanguagePipeline,
} from "@twinkleplop/core";

import { grammar as js_g, reclassifiers as js_r } from "@twinkleplop/javascript";
import { grammar as ts_g, reclassifiers as ts_r } from "@twinkleplop/typescript";
import { grammar as tsx_g, reclassifiers as tsx_r } from "@twinkleplop/tsx";
import { grammar as go_g, reclassifiers as go_r } from "@twinkleplop/go";
import { grammar as py_g, reclassifiers as py_r } from "@twinkleplop/python";
import { grammar as rs_g, reclassifiers as rs_r } from "@twinkleplop/rust";
import {
	grammar as bash_g,
	reclassifiers as bash_r,
} from "@twinkleplop/bash";
import { grammar as sql_g, reclassifiers as sql_r } from "@twinkleplop/sql";

function derive_tags(
	grammar: { token_types: string[] },
	reclassifiers: LanguagePipeline,
): string[] {
	const tags: string[] = [];
	const seen = new Set<string>();
	const grammar_types = new Set(grammar.token_types);
	for (const cat of GRAMMAR_EXTENSION_CATEGORIES) {
		if (grammar_types.has(cat) && !seen.has(cat)) {
			seen.add(cat);
			tags.push(cat);
		}
	}
	for (const entry of reclassifiers ?? []) {
		if (typeof entry === "function") continue;
		for (const p of entry.produces) {
			if (!seen.has(p)) {
				seen.add(p);
				tags.push(p);
			}
		}
	}
	return tags;
}

describe("explore UI — available fidelity tags", () => {
	it("javascript exposes grammar-baked boolean/function alongside reclassifier tags", () => {
		const tags = derive_tags(js_g, js_r);
		// grammar-baked categories must appear (so users can toggle them off
		// individually instead of losing them silently on partial allowlist).
		expect(tags).toContain("boolean");
		expect(tags).toContain("function");
		// reclassifier tags must also appear.
		expect(tags).toContain("constant");
		expect(tags).toContain("class_name");
		expect(tags).toContain("property");
		expect(tags).toContain("namespace");
		expect(tags).toContain("parameter");
	});

	it("typescript exposes decorator (grammar-baked) alongside reclassifier tags", () => {
		const tags = derive_tags(ts_g, ts_r);
		expect(tags).toContain("decorator");
		expect(tags).toContain("type");
		expect(tags).toContain("constant");
		expect(tags).toContain("namespace");
		expect(tags).toContain("parameter");
	});

	it("tsx inherits TS tag set", () => {
		const tags = derive_tags(tsx_g, tsx_r);
		expect(tags).toContain("decorator");
		expect(tags).toContain("type");
		expect(tags).toContain("parameter");
	});

	it("go exposes boolean/function (grammar-baked) and reclassifier tags", () => {
		const tags = derive_tags(go_g, go_r);
		expect(tags).toContain("boolean");
		expect(tags).toContain("function");
		expect(tags).toContain("constant");
		expect(tags).toContain("namespace");
		expect(tags).toContain("parameter");
	});

	it("python exposes reclassifier-upgrade tags (incl. boolean via upgrade path)", () => {
		const tags = derive_tags(py_g, py_r);
		// python's grammar doesn't emit `boolean` or `function` directly —
		// both come from reclassifier upgrades. they still surface in the
		// tags list so users can toggle them.
		expect(py_g.token_types).not.toContain("boolean");
		expect(py_g.token_types).not.toContain("function");
		expect(tags).toContain("boolean");
		expect(tags).toContain("function");
		expect(tags).toContain("constant");
		expect(tags).toContain("class_name");
		expect(tags).toContain("parameter");
		expect(tags).toContain("namespace");
	});

	it("rust exposes reclassifier tags + variant", () => {
		const tags = derive_tags(rs_g, rs_r);
		expect(tags).toContain("variant");
		expect(tags).toContain("class_name");
		expect(tags).toContain("constant");
		expect(tags).toContain("namespace");
		expect(tags).toContain("parameter");
	});

	it("bash exposes function (reclassifier) + keyword/builtin/boolean", () => {
		const tags = derive_tags(bash_g, bash_r);
		expect(tags).toContain("function");
		expect(tags).toContain("keyword");
		expect(tags).toContain("builtin");
		expect(tags).toContain("boolean");
	});

	it("sql exposes function (reclassifier) + keyword/boolean/type", () => {
		const tags = derive_tags(sql_g, sql_r);
		expect(tags).toContain("function");
		expect(tags).toContain("keyword");
		expect(tags).toContain("type");
	});

	it("tags are de-duped: a category appears only once even if both grammar and reclassifier produce it", () => {
		// javascript emits `boolean` in grammar.token_types and ALSO has a
		// reclassifier that produces... nothing for "boolean" directly, but
		// the dedupe logic must handle the general case. we verify by
		// ensuring the derived list has no duplicates.
		const tags = derive_tags(js_g, js_r);
		expect(new Set(tags).size).toBe(tags.length);
	});
});
