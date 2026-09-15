// test helper: two html strings mean the same markup when they parse to the
// same tree. the hast output path re-serialises through the pipeline's
// stringifier, which spells entities its own way (`&#x3C;` for `&lt;`, a
// bare `'` for `&#39;`), so bytes differ where meaning does not.

import { fromHtml } from "hast-util-from-html";

export function markup(html: string): unknown {
  return strip(fromHtml(html, { fragment: true }));
}

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "position") continue;
    out[key] = strip(entry);
  }
  return out;
}
