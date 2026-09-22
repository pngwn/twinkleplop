// the /explore/edit link format, in the hash so one prerendered page serves
// every link and snippets never reach the server
//
//   #v=1&lang=tsx&theme=github&fidelity=function,parameter&code=<source>
//
// code is utf8, deflate raw and base64url, and goes last so the settings stay
// readable, fidelity lists the enabled tags, absent means all and empty none
// scripts/share_to_fixture.mjs decodes the same format in node

const VERSION = "1";

// a crafted link can inflate a few kb into gigabytes
const MAX_SOURCE_BYTES = 1 << 20;

export interface share_state {
  lang: string;
  source: string;
  theme: string | null;
  // enabled fidelity tags, or null for every tag the grammar has
  fidelity: string[] | null;
}

/** the hash for `state`, without its leading `#` */
export async function encode_share(state: share_state): Promise<string> {
  const parts = [`v=${VERSION}`, `lang=${encodeURIComponent(state.lang)}`];
  if (state.theme) parts.push(`theme=${encodeURIComponent(state.theme)}`);
  if (state.fidelity) parts.push(`fidelity=${state.fidelity.map(encodeURIComponent).join(",")}`);
  const code = await deflate(new TextEncoder().encode(state.source));
  parts.push(`code=${to_base64url(code)}`);
  return parts.join("&");
}

/** the state in a hash with or without its `#`, null when it is not a share link */
export async function decode_share(hash: string): Promise<share_state | null> {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const lang = params.get("lang");
  const code = params.get("code");
  if (params.get("v") !== VERSION || !lang || code === null) return null;

  let source: string;
  try {
    const bytes = await inflate(from_base64url(code));
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }

  const fidelity = params.get("fidelity");
  return {
    lang,
    source,
    theme: params.get("theme"),
    fidelity: fidelity === null ? null : fidelity.split(",").filter(Boolean),
  };
}

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new Error("snippet too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function to_base64url(bytes: Uint8Array): string {
  let binary = "";
  // chunked so a long snippet stays under the engine argument limit
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function from_base64url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
