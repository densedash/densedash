import { createContext, useContext } from "react";
import type { RefObject } from "react";
import type { ChangeDetails } from "@densedash/core";

export interface State {
  readonly collapsed: boolean;
}
export type ChangeReason = "keyboard" | "pointer";
export type ChangeHandler = (value: boolean, details: ChangeDetails<ChangeReason>) => void;

interface SidebarContextValue extends State {
  readonly navId: string;
  readonly nav: RefObject<HTMLElement | null>;
  readonly triggers: RefObject<Set<HTMLElement>>;
  change(options: { collapsed: boolean; event: Event }): void;
}
export const SidebarContext = createContext<SidebarContextValue | null>(null);
export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("densedash: Sidebar parts must be inside <Sidebar.Root>.");
  return context;
}

export interface DirectoryContextValue {
  closePopup(restore: boolean): void;
}
export const DirectoryContext = createContext<DirectoryContextValue | null>(null);

export function changeDetails(event: Event): ChangeDetails<ChangeReason> {
  let canceled = false;
  return {
    reason:
      event.type === "keydown" || ("detail" in event && event.detail === 0)
        ? "keyboard"
        : "pointer",
    event,
    cancel() {
      canceled = true;
    },
    get canceled() {
      return canceled;
    },
  };
}

export function dismissPopups(nav: HTMLElement | null): void {
  nav
    ?.querySelectorAll<HTMLElement>('[data-slot="sidebar-group-content"][popover]')
    .forEach((element) => element.hidePopover?.());
}

/** Hidden directories stay mounted so expansion and consumer state survive rail collapse. */
export function visibleItems(element: HTMLElement): HTMLElement[] {
  return [
    ...element.querySelectorAll<HTMLElement>(
      '[data-slot="sidebar-item"], [data-slot="sidebar-group-trigger"]',
    ),
  ].filter((item) => {
    const popup = item.closest("[popover]");
    return (
      !item.matches(':disabled, [aria-disabled="true"]') &&
      !item.closest("[hidden], [inert]") &&
      (!popup ||
        popup === element ||
        popup.hasAttribute("data-popup-open") ||
        popup.matches(":popover-open"))
    );
  });
}
