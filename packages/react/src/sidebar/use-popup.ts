import { useLayoutEffect } from "react";
import type { RefObject } from "react";

/** Position in viewport coordinates; no dependency on experimental CSS anchor positioning. */
export function placePopup({ trigger, popup }: { trigger: HTMLElement; popup: HTMLElement }): void {
  const view = popup.ownerDocument.defaultView;
  if (!view) return;
  // Anchor to the icon so popup placement stays stable while the rail button changes width.
  const anchor = (
    trigger.querySelector('[data-slot="sidebar-icon"]') ?? trigger
  ).getBoundingClientRect();
  const box = popup.getBoundingClientRect();
  const style = view.getComputedStyle(popup);
  const width = box.width || Number.parseFloat(style.width);
  // Match Filter's viewport collision boundary; these are placement mechanics, not styling.
  const spacing = 8;
  const edge = 12;
  const fitsRight = anchor.right + spacing + width <= view.innerWidth - edge;
  const left = fitsRight ? anchor.right + spacing : anchor.left - spacing - width;
  popup.style.left = `${Math.max(edge, Math.min(left, view.innerWidth - width - edge))}px`;
  popup.style.top = `${Math.max(edge, Math.min(anchor.top, view.innerHeight - box.height - edge))}px`;
}

/** An open rail popup owns its resize/scroll observers; inline directories own none. */
export function usePopup({
  open,
  trigger,
  popup,
}: {
  open: boolean;
  trigger: RefObject<HTMLElement | null>;
  popup: RefObject<HTMLDivElement | null>;
}): void {
  useLayoutEffect(() => {
    const anchor = trigger.current;
    const panel = popup.current;
    const view = panel?.ownerDocument.defaultView;
    if (!open || !anchor || !panel || !view) return;
    const position = () => placePopup({ trigger: anchor, popup: panel });
    position();
    const observer = new view.ResizeObserver(position);
    observer.observe(panel);
    view.addEventListener("resize", position);
    panel.ownerDocument.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      view.removeEventListener("resize", position);
      panel.ownerDocument.removeEventListener("scroll", position, true);
    };
  }, [open, trigger, popup]);
}
