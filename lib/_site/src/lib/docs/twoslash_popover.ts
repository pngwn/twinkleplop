// hover popovers for twoslash snippets.
//
// the renderer nests each popover inside its hover target, and the code
// block around it clips overflow in both directions, so an absolutely
// positioned popover would be cut off at the block's edges. instead the
// popover is promoted to the top layer on hover and placed against the
// viewport, below the target or above it when there is no room.

import type { Attachment } from "svelte/attachments";

const GAP = 6;
const EDGE = 8;

function place(popover: HTMLElement, target: Element) {
  const anchor = target.getBoundingClientRect();
  const { width, height } = popover.getBoundingClientRect();
  const below = anchor.bottom + GAP;
  const top = below + height > innerHeight - EDGE ? anchor.top - GAP - height : below;
  const left = Math.min(anchor.left, innerWidth - EDGE - width);
  popover.style.top = `${Math.max(EDGE, top)}px`;
  popover.style.left = `${Math.max(EDGE, left)}px`;
}

// listeners go on every block, not only those holding a hover when mounted,
// because the block's html can change without the attachment re-running.
export const twoslash_popovers: Attachment<HTMLElement> = (node) => {
  let open: { hover: Element; popover: HTMLElement } | null = null;

  const hide = () => {
    if (!open) return;
    open.popover.hidePopover();
    open = null;
  };

  const show = (hover: Element) => {
    if (open?.hover === hover) return;
    hide();
    const target = hover.querySelector(":scope > .twoslash-target");
    const popover = hover.querySelector<HTMLElement>(":scope > .twoslash-popover");
    if (!target || !popover || !("showPopover" in popover)) return;
    popover.popover = "manual";
    popover.showPopover();
    place(popover, target);
    open = { hover, popover };
  };

  const on_over = (event: PointerEvent) => {
    const hover = (event.target as Element).closest(".twoslash-hover");
    if (hover && node.contains(hover)) show(hover);
  };

  // a touch lifts straight after it lands, so a tapped popover stays up until
  // the next tap somewhere else instead of closing on pointerout.
  const on_out = (event: PointerEvent) => {
    if (!open || event.pointerType === "touch") return;
    const next = event.relatedTarget as Element | null;
    if (!next || !open.hover.contains(next)) hide();
  };

  const on_down = (event: PointerEvent) => {
    if (open && !open.hover.contains(event.target as Element)) hide();
  };

  node.addEventListener("pointerover", on_over);
  node.addEventListener("pointerout", on_out);
  document.addEventListener("pointerdown", on_down);
  // the popover is placed once, so any scroll would leave it behind.
  addEventListener("scroll", hide, { capture: true, passive: true });

  return () => {
    hide();
    node.removeEventListener("pointerover", on_over);
    node.removeEventListener("pointerout", on_out);
    document.removeEventListener("pointerdown", on_down);
    removeEventListener("scroll", hide, { capture: true });
  };
};
