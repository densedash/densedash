import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { changeDetails, dismissPopups, SidebarContext, useSidebar } from "./context.js";
import type { ChangeHandler, State } from "./context.js";

export interface RootProps extends ElementAttributes<HTMLDivElement>, PartProps<State> {
  readonly collapsed?: boolean;
  readonly defaultCollapsed?: boolean;
  readonly onCollapsedChange?: ChangeHandler;
  readonly children?: ReactNode;
}

/** Owns collapse only. Directory expansion and the app's current destination are independent. */
export function Root({
  collapsed: controlled,
  defaultCollapsed = false,
  onCollapsedChange,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: RootProps): ReactElement {
  const generated = useId();
  const navId = `${props.id ?? generated}-nav`;
  const nav = useRef<HTMLElement | null>(null);
  const triggers = useRef(new Set<HTMLElement>());
  const [uncontrolled, setUncontrolled] = useState(defaultCollapsed);
  const collapsed = controlled ?? uncontrolled;
  const previous = useRef(collapsed);
  function preserveFocus() {
    const active = nav.current?.ownerDocument.activeElement;
    if (active && nav.current?.contains(active)) {
      [...triggers.current]
        .find(
          (element) => element.isConnected && !element.matches(':disabled, [aria-disabled="true"]'),
        )
        ?.focus({ preventScroll: true });
    }
    dismissPopups(nav.current);
  }
  // Also cover controlled changes initiated outside a Trigger, such as an app shortcut.
  useLayoutEffect(() => {
    if (previous.current === collapsed) return;
    previous.current = collapsed;
    preserveFocus();
  }, [collapsed]);
  const element = useRender({
    render,
    ref,
    state: { collapsed },
    props: {
      ...mergeProps({ "data-slot": "sidebar", children }, props),
      className,
      style,
    },
  });
  return (
    <SidebarContext
      value={{
        collapsed,
        navId,
        nav,
        triggers,
        change({ collapsed: next, event }) {
          if (next === collapsed) return;
          const details = changeDetails(event);
          onCollapsedChange?.(next, details);
          if (details.canceled) return;
          // Focus moves before a commit hides the focused child or closes its popup.
          preserveFocus();
          if (controlled === undefined) setUncontrolled(next);
        },
      }}
    >
      {element}
    </SidebarContext>
  );
}

export interface LayoutProps extends ElementAttributes<HTMLDivElement>, PartProps<State> {
  readonly children?: ReactNode;
}

/** Always above the moving Viewport. Place all collapse Triggers here. */
export function Toolbar({ render, ref, className, style, ...props }: LayoutProps): ReactElement {
  const { collapsed } = useSidebar();
  return useRender({
    render,
    ref,
    state: { collapsed },
    props: {
      ...mergeProps({ "data-slot": "sidebar-toolbar" }, props),
      className,
      style,
    },
  });
}

/** Fixed-height stage shared by the stationary Nav underlay and foreground Content. */
export function Viewport({ render, ref, className, style, ...props }: LayoutProps): ReactElement {
  const { collapsed } = useSidebar();
  return useRender({
    render,
    ref,
    state: { collapsed },
    props: {
      ...mergeProps({ "data-slot": "sidebar-viewport" }, props),
      className,
      style,
    },
  });
}

/** Moves over the Nav; its inline size grows without changing the navigation's block size. */
export function Content({ render, ref, className, style, ...props }: LayoutProps): ReactElement {
  const { collapsed } = useSidebar();
  return useRender({
    render,
    ref,
    defaultTagName: "main",
    state: { collapsed },
    props: {
      ...mergeProps<"main">({ "data-slot": "sidebar-content" }, props),
      className,
      style,
    },
  });
}

export interface TriggerProps extends ElementAttributes<HTMLButtonElement>, PartProps<State> {
  readonly children?: ReactNode;
  readonly disabled?: boolean;
}

/** Native Enter/Space activation. Keep the visible contents constant in both states. */
export function Trigger({
  children,
  disabled = false,
  render,
  ref,
  className,
  style,
  ...props
}: TriggerProps): ReactElement {
  const context = useSidebar();
  const register = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;
      context.triggers.current.add(element);
      return () => {
        context.triggers.current.delete(element);
      };
    },
    [context.triggers],
  );
  return useRender({
    render,
    ref: [ref, register],
    defaultTagName: "button",
    state: { collapsed: context.collapsed },
    props: {
      ...mergeProps<"button">(
        {
          "data-slot": "sidebar-trigger",
          type: "button",
          disabled,
          "aria-label": context.collapsed ? "Expand navigation" : "Collapse navigation",
          "aria-expanded": !context.collapsed,
          "aria-controls": context.navId,
          onClick(event) {
            if (!disabled)
              context.change({ collapsed: !context.collapsed, event: event.nativeEvent });
          },
          children: children ?? <span data-slot="sidebar-trigger-icon" aria-hidden="true" />,
        },
        props,
      ),
      className,
      style,
    },
  });
}
