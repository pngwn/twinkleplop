import type { ThemedToken } from "shiki";

// returns true when textmate selector `sel` matches the dot-segmented
// scope `target`. selectors match when their segments are a prefix of
// the target's segments (e.g. `keyword.operator` matches
// `keyword.operator.assignment.js`, but `keyword.assignment` does not).
function selector_matches(sel: string, target: string): boolean {
  return target === sel || target.startsWith(sel + ".");
}

// resolves which theme rule actually colored a sub-token, given the
// rendered color of its parent themedtoken. walks the sub-token's
// scopes and finds the themematch whose `settings.foreground` equals
// the parent color. when a matching rule has an array `scope` (theme
// json shorthand for "all these selectors share these settings"), we
// narrow to the single selector that actually matched this scope:
// listing siblings would point at unrelated tokens that happen to
// share the rule.
type SubScope = { scopeName: string; themeMatches?: ThemedTokenScopeMatch[] };
type ThemedTokenScopeMatch = {
  scope?: string | string[];
  settings?: { foreground?: string };
};
function resolve_rule(scopes: SubScope[], parent_color: string): string | null {
  if (!parent_color) return null;
  for (const scope of scopes) {
    for (const match of scope.themeMatches ?? []) {
      const fg = match.settings?.foreground?.toLowerCase();
      if (!fg || fg !== parent_color) continue;
      const s = match.scope;
      if (typeof s === "string") return s;
      if (Array.isArray(s)) {
        let best: string | null = null;
        for (const sel of s) {
          if (typeof sel !== "string") continue;
          if (selector_matches(sel, scope.scopeName)) {
            if (!best || sel.length > best.length) best = sel;
          }
        }
        if (best) return best;
        for (const sel of s) {
          if (typeof sel === "string") return sel;
        }
      }
      return null;
    }
  }
  return null;
}

type Sub = { content: string; scopes: string[]; theme_scope: string | null };

// dom annotation: walks the rendered shiki output and tags each token
// span with `data-scopes` (the grammar chain) and `data-theme-scope`
// (the theme rule that earned the color). shiki coalesces tokens at
// *two* layers and we have to undo both:
//
// 1. `codeToHtml` merges adjacent same-color spans for the rendered
//    output, so a single dom span often contains several themedtokens.
// 2. inside a themedtoken, the tokenizer can also coalesce neighboring
//    same-color atoms: `");"` arrives as one themedtoken whose
//    `explanation` array carries two entries (`)` with `meta.brace
//    .round` and `;` with `punctuation.terminator.statement`). so the
//    real atomic unit is the explanation entry, not the themedtoken.
//
// we flatten the line into per-explanation sub-tokens, walk dom spans
// in lockstep by character length, and split any span that ends up
// containing more than one sub-token into per-sub-token spans. cloning
// the original span's style preserves the rendered color so splitting
// is visually invisible, but each sub-span is now its own hover
// target with its own accurate scope/rule annotation.
export function annotate_shiki(root: Element, explained: ThemedToken[][]) {
  const lines = root.querySelectorAll(".line");
  for (let line_idx = 0; line_idx < lines.length; line_idx++) {
    const line = lines[line_idx];
    const tokens = explained[line_idx];
    if (!tokens || tokens.length === 0) continue;
    const flat: Sub[] = [];
    for (const tok of tokens) {
      const color = (tok.color ?? "").toLowerCase();
      const exps = tok.explanation ?? [];
      if (exps.length === 0) {
        flat.push({ content: tok.content, scopes: [], theme_scope: null });
        continue;
      }
      for (const exp of exps) {
        const scopes_arr = exp.scopes ?? [];
        const names = scopes_arr.map((s) => s.scopeName);
        const theme_scope = resolve_rule(scopes_arr as SubScope[], color);
        flat.push({ content: exp.content, scopes: names, theme_scope });
      }
    }
    const original_spans = Array.from(line.querySelectorAll(":scope > span"));
    let sub_idx = 0;
    for (const span of original_spans) {
      const span_len = span.textContent?.length ?? 0;
      const contained: Sub[] = [];
      let consumed = 0;
      while (sub_idx < flat.length && consumed < span_len) {
        contained.push(flat[sub_idx]);
        consumed += flat[sub_idx].content.length;
        sub_idx++;
      }
      apply_subtokens(span as HTMLElement, contained);
    }
  }
}

function apply_subtokens(span: HTMLElement, subs: Sub[]) {
  if (subs.length === 0) return;
  if (subs.length === 1) {
    annotate_span(span, subs[0].scopes, subs[0].theme_scope);
    return;
  }
  const style = span.getAttribute("style") ?? "";
  const cls = span.getAttribute("class") ?? "";
  const fragment = document.createDocumentFragment();
  for (const s of subs) {
    const new_span = document.createElement("span");
    if (style) new_span.setAttribute("style", style);
    if (cls) new_span.setAttribute("class", cls);
    new_span.textContent = s.content;
    annotate_span(new_span, s.scopes, s.theme_scope);
    fragment.appendChild(new_span);
  }
  span.replaceWith(fragment);
}

function annotate_span(span: HTMLElement, scopes: string[], theme_scope: string | null) {
  if (scopes.length > 0) span.dataset.scopes = scopes.join("|");
  if (theme_scope) span.dataset.themeScope = theme_scope;
  // inspect underlines tokens, not indentation
  if (!span.textContent?.trim()) span.dataset.ws = "";
}
