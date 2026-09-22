// both panes render a <code> of line elements whose element children are
// the tokens, so a token is found again in the other pane by line and column

export interface text_position {
  line: number;
  col: number;
}

function is_gutter(node: Node) {
  return node instanceof Element && node.classList.contains("ln");
}

function is_token(node: Node): node is HTMLElement {
  return node instanceof HTMLElement && !is_gutter(node) && !!node.textContent?.trim();
}

/** the position of the token under `target`, or null when it is not on one */
export function locate(target: EventTarget | null): text_position | null {
  if (!(target instanceof Element)) return null;
  const code = target.closest("[data-pane]")?.querySelector("code");
  if (!code?.contains(target)) return null;
  let token: Element | null = target;
  while (token && token.parentElement?.parentElement !== code) token = token.parentElement;
  const line = token?.parentElement;
  if (!token || !line || !is_token(token)) return null;
  let col = 0;
  for (const child of line.childNodes) {
    if (child === token) break;
    if (!is_gutter(child)) col += child.textContent?.length ?? 0;
  }
  return { line: Array.prototype.indexOf.call(code.children, line), col };
}

/** the token in `pane` covering `at`, or null for whitespace */
export function token_in(pane: Element, at: text_position): HTMLElement | null {
  const line = pane.querySelector("code")?.children[at.line];
  if (!line) return null;
  let col = 0;
  for (const child of line.childNodes) {
    if (is_gutter(child)) continue;
    const length = child.textContent?.length ?? 0;
    if (at.col < col + length) return is_token(child) ? child : null;
    col += length;
  }
  return null;
}

/** how many token elements come before `token` in `pane` */
export function token_index(pane: Element, token: Element): number {
  let index = 0;
  for (const line of pane.querySelector("code")?.children ?? []) {
    for (const child of line.children) {
      if (child === token) return index;
      if (!is_gutter(child)) index++;
    }
  }
  return -1;
}
