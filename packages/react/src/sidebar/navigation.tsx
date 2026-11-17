import { useContext, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { changeDetails, DirectoryContext, useSidebar, visibleItems } from "./context.js";
import type { ChangeHandler, State } from "./context.js";
import { placePopup, usePopup } from "./use-popup.js";

export interface NavProps extends ElementAttributes<HTMLElement>, PartProps<State> {
  readonly label: string;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly children?: ReactNode;
}

/** Fixed-width underlay: its middle scrolls, while header/footer keep their vertical anchors. */
export function Nav({
  label,
  header,
  footer,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: NavProps): ReactElement {
  const context = useSidebar();
  return useRender({
    render,
    ref: [ref, context.nav],
    defaultTagName: "nav",
    state: { collapsed: context.collapsed },
    props: {
      ...mergeProps<"nav">(
        {
          "data-slot": "sidebar-nav",
          "aria-label": label,
          onKeyDown(event) {
            if (
              event.defaultPrevented ||
              event.altKey ||
              event.metaKey ||
              event.ctrlKey ||
              !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
            )
              return;
            const target = event.target;
            if (
              !(target instanceof HTMLElement) ||
              !target.matches('[data-slot="sidebar-item"], [data-slot="sidebar-group-trigger"]')
            )
              return;
            const popup = target.closest<HTMLElement>(
              '[data-slot="sidebar-group-content"][popover]',
            );
            const items = visibleItems(popup ?? event.currentTarget);
            const index = items.indexOf(target);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
            event.preventDefault();
            items[next]?.focus({ preventScroll: true });
            items[next]?.scrollIntoView({ block: "nearest" });
          },
          children: (
            <>
              <div data-slot="sidebar-header">{header}</div>
              <div data-slot="sidebar-items">{children}</div>
              <div data-slot="sidebar-footer">{footer}</div>
            </>
          ),
        },
        props,
        { id: context.navId },
      ),
      className,
      style,
    },
  });
}

export interface ItemState extends State {
  readonly current: boolean;
  readonly disabled: boolean;
}
export interface ItemProps extends ElementAttributes<HTMLElement>, PartProps<ItemState> {
  readonly label: string;
  readonly icon?: ReactNode;
  readonly current?: boolean;
  readonly disabled?: boolean;
  /** Trailing content, such as a count. The label remains the accessible name. */
  readonly children?: ReactNode;
}

/** A destination. Use render={<a href=... />} or a router Link; the app owns navigation. */
export function Item({
  label,
  icon,
  current = false,
  disabled = false,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: ItemProps): ReactElement {
  const { collapsed } = useSidebar();
  const directory = useContext(DirectoryContext);
  const compact = collapsed && !directory;
  return useRender({
    render,
    ref,
    defaultTagName: "button",
    state: { collapsed: compact, current, disabled },
    props: {
      ...mergeProps<"button">(
        {
          "data-slot": "sidebar-item",
          type: "button",
          disabled,
          "aria-label": label,
          "aria-current": current ? "page" : undefined,
          "aria-disabled": disabled || undefined,
          tabIndex: disabled ? -1 : undefined,
          title: compact ? label : undefined,
          onClick(event) {
            if (disabled) {
              event.preventDefault();
              return;
            }
            directory?.closePopup(true);
          },
          onKeyDown(event) {
            if (event.key === " " && event.currentTarget.tagName !== "BUTTON") {
              event.preventDefault();
              if (!disabled) event.currentTarget.click();
            }
          },
          children: (
            <>
              <span data-slot="sidebar-icon" aria-hidden="true">
                {icon ?? label.slice(0, 1)}
              </span>
              <span data-slot="sidebar-label">{label}</span>
              <span data-slot="sidebar-extra">{children}</span>
            </>
          ),
        },
        props,
      ),
      className,
      style,
    },
  });
}

export interface GroupState {
  readonly expanded: boolean;
  readonly rail: boolean;
  readonly disabled: boolean;
}
export interface GroupProps extends ElementAttributes<HTMLDivElement>, PartProps<GroupState> {
  readonly label: string;
  readonly icon?: ReactNode;
  readonly expanded?: boolean;
  readonly defaultExpanded?: boolean;
  readonly onExpandedChange?: ChangeHandler;
  readonly disabled?: boolean;
  readonly children?: ReactNode;
}

/** A directory, recursively nestable. Inline children and rail popup share the same subtree. */
export function Group({
  label,
  icon,
  expanded: controlled,
  defaultExpanded = false,
  onExpandedChange,
  disabled = false,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: GroupProps): ReactElement {
  const { collapsed } = useSidebar();
  const parent = useContext(DirectoryContext);
  const id = useId();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded);
  const [popupOpen, setPopupOpen] = useState(false);
  const expanded = controlled ?? uncontrolled;
  const rail = collapsed && !parent;
  usePopup({ open: rail && popupOpen, trigger, popup: content });
  function closePopup(restore: boolean) {
    content.current?.hidePopover?.();
    setPopupOpen(false);
    if (restore) trigger.current?.focus({ preventScroll: true });
  }
  function change({ next, event }: { next: boolean; event: Event }) {
    if (disabled || next === expanded) return;
    const details = changeDetails(event);
    onExpandedChange?.(next, details);
    if (details.canceled) return;
    if (!next && content.current?.contains(content.current.ownerDocument.activeElement))
      trigger.current?.focus({ preventScroll: true });
    if (controlled === undefined) setUncontrolled(next);
  }
  useLayoutEffect(() => {
    if (
      !rail &&
      !expanded &&
      content.current?.contains(content.current.ownerDocument.activeElement)
    )
      trigger.current?.focus({ preventScroll: true });
  }, [rail, expanded]);
  const rendered = useRender({
    render,
    ref,
    state: { expanded, rail, disabled },
    props: {
      ...mergeProps(
        {
          "data-slot": "sidebar-group",
          children: (
            <>
              <button
                ref={trigger}
                data-slot="sidebar-group-trigger"
                data-rail={rail ? "" : undefined}
                id={`${id}-trigger`}
                type="button"
                disabled={disabled}
                aria-label={label}
                aria-expanded={rail ? popupOpen : expanded}
                aria-controls={id}
                title={rail ? label : undefined}
                popoverTarget={rail ? id : undefined}
                onClick={(event) => {
                  if (!rail) change({ next: !expanded, event: event.nativeEvent });
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    event.stopPropagation();
                    if (rail && !popupOpen) event.currentTarget.click();
                    else if (!rail && !expanded) change({ next: true, event: event.nativeEvent });
                    else if (content.current) visibleItems(content.current)[0]?.focus();
                  } else if (event.key === "ArrowLeft" && !rail && expanded) {
                    event.preventDefault();
                    event.stopPropagation();
                    change({ next: false, event: event.nativeEvent });
                  }
                }}
              >
                <span data-slot="sidebar-icon" aria-hidden="true">
                  {icon ?? label.slice(0, 1)}
                </span>
                <span data-slot="sidebar-label">{label}</span>
                <span data-slot="sidebar-chevron" aria-hidden="true" />
              </button>
              <div
                ref={content}
                id={id}
                data-slot="sidebar-group-content"
                data-rail={rail ? "" : undefined}
                data-popup-open={popupOpen && rail ? "" : undefined}
                role="group"
                aria-label={label}
                popover={rail ? "auto" : undefined}
                hidden={!rail && !expanded}
                inert={rail && !popupOpen}
                onBeforeToggle={(event) => {
                  if (event.newState === "open" && trigger.current) {
                    // Closed rail contents remain in layout for their exit fade, but inert.
                    event.currentTarget.inert = false;
                    placePopup({ trigger: trigger.current, popup: event.currentTarget });
                  }
                }}
                onToggle={(event) => {
                  const open = event.newState === "open";
                  event.currentTarget.inert = rail && !open;
                  setPopupOpen(open);
                  if (open && trigger.current)
                    placePopup({ trigger: trigger.current, popup: event.currentTarget });
                  if (
                    open &&
                    !event.currentTarget.contains(event.currentTarget.ownerDocument.activeElement)
                  ) {
                    visibleItems(event.currentTarget)[0]?.focus({ preventScroll: true });
                  }
                }}
                onBlur={(event) => {
                  if (rail && !event.currentTarget.contains(event.relatedTarget)) closePopup(false);
                }}
                onKeyDown={(event) => {
                  if ((event.key === "Escape" && rail) || event.key === "ArrowLeft") {
                    event.preventDefault();
                    event.stopPropagation();
                    if (rail) closePopup(true);
                    else trigger.current?.focus({ preventScroll: true });
                  }
                }}
              >
                <div data-slot="sidebar-group-items">
                  <div data-slot="sidebar-popup-heading" hidden={!rail}>
                    {label}
                  </div>
                  {children}
                </div>
              </div>
            </>
          ),
        },
        props,
      ),
      className,
      style,
    },
  });
  return (
    <DirectoryContext
      value={{
        closePopup: rail ? closePopup : (parent?.closePopup ?? (() => {})),
      }}
    >
      {rendered}
    </DirectoryContext>
  );
}
