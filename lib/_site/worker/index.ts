// The site is prerendered; this worker only picks which representation of a
// page to hand back, and sets the headers static assets cannot.
//
// Every page is built twice, `build/<route>.html` and `build/<route>.md`, and
// the markdown is served from the canonical url on `Accept: text/markdown`, a
// known agent user-agent or `?format=md`. The user-agent list is what fires
// today: the fetchers that mangle the html ask for html and convert it
// themselves, so they never negotiate. Search crawlers are deliberately absent
// from it — they must keep getting html or the pages stop being indexed.

// narrowed to what this worker uses, so there is no @cloudflare/workers-types
// dependency
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const AGENTS =
  /\b(ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|GPTBot|ChatGPT-User|OAI-SearchBot|PerplexityBot|Perplexity-User|CCBot|cohere-ai|Bytespider|meta-externalagent|Applebot-Extended|Diffbot)\b/i;

/** `/docs/migration` -> `/docs/migration.md`, `/` -> `/index.md`. */
function markdown_path(pathname: string): string {
  const clean = pathname.replace(/\/+$/, "");
  return clean === "" ? "/index.md" : `${clean}.md`;
}

function wants_markdown(request: Request, url: URL): boolean {
  const format = url.searchParams.get("format");
  if (format === "md" || format === "markdown") return true;
  if (format === "html") return false;

  const accept = request.headers.get("accept") ?? "";
  if (/\btext\/markdown\b/i.test(accept)) return true;

  return AGENTS.test(request.headers.get("user-agent") ?? "");
}

/** A page request is one that could have a markdown twin: no file extension. */
function is_page(pathname: string): boolean {
  return !pathname.startsWith("/_app/") && !/\.[a-z0-9]+$/i.test(pathname);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!is_page(url.pathname)) return env.ASSETS.fetch(request);

    if (wants_markdown(request, url)) {
      const target = new URL(markdown_path(url.pathname), url.origin);
      const markdown = await env.ASSETS.fetch(new Request(target, { headers: request.headers }));

      // a route with no markdown twin (the lab, anything client-rendered)
      // falls through to the page itself
      if (markdown.ok) {
        const response = new Response(markdown.body, markdown);
        response.headers.set("content-type", "text/markdown; charset=utf-8");
        response.headers.set("vary", "accept, user-agent");
        // Cloudflare's cache does not vary on `accept`, so a shared cache told
        // to keep this would start serving markdown to browsers at the html
        // url. The markdown url itself caches normally.
        response.headers.set("cache-control", "no-store");
        return response;
      }
    }

    const page = await env.ASSETS.fetch(request);
    const response = new Response(page.body, page);

    if (page.ok) {
      const alternate = new URL(markdown_path(url.pathname), url.origin);
      response.headers.append("link", `<${alternate}>; rel="alternate"; type="text/markdown"`);
      response.headers.set("vary", "accept, user-agent");
    }

    // cross-origin isolation drops `performance.now()` quantization from
    // ~100us to ~5us, the resolution the live tokenize timer needs. the copy
    // in hooks.server.ts only reaches `vite dev`.
    if (url.pathname === "/explore" || url.pathname.startsWith("/explore/")) {
      response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
      response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    }

    return response;
  },
};
