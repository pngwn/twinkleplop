import type { Handle } from "@sveltejs/kit";

// coop+coep put the `/explore` pages into a cross-origin isolated context.
// that drops `performance.now()` quantization from ~100us to ~5us in
// chrome/edge, which is the resolution we actually need to show a live
// twinkleplop tokenize time that isn't stuck at 0. the explore route has
// no cross-origin assets (shiki bundles its wasm from the same origin),
// so the stricter embedder policy is safe.
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if (event.url.pathname.startsWith("/explore")) {
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  }
  return response;
};
