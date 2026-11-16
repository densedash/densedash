import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import { menuItems, pageLabel, useFilterContext } from "./context.js";
import type { MenuItem } from "./context.js";
import type { Layer, PopupProps } from "./popup.js";

interface Props extends PopupProps {
  layer: Layer;
  depth: number;
  active: boolean;
  onLayerFocus(): void;
  onLayerChange(change: { search: string; active: string | null }): void;
  onPreview(item: MenuItem, element: HTMLElement): void;
  onActivate(selection: {
    item: MenuItem;
    element: HTMLElement;
    close: boolean;
    selectFirst: boolean;
    event: Event;
  }): void;
  onBack(): void;
}
export function Panel({
  layer,
  depth,
  active,
  onLayerFocus,
  onLayerChange,
  onPreview,
  onActivate,
  onBack,
  renderOption,
  emptyLabel = "No matching options",
  render,
  ref,
  className,
  style,
  ...props
}: Props) {
  const context = useFilterContext();
  const [element, setElement] = useState<HTMLElement | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const options = useRef(new Map<string, HTMLDivElement>());
  const items = menuItems({ items: context.items, page: layer.page, search: layer.search });
  const enabled = items.filter((item) => !item.disabled);
  const activeItem = enabled.find((item) => item.id === layer.active);
  const operatorField = layer.page.kind === "operator" ? layer.page.id : undefined;
  const label = pageLabel({ items: context.items, page: layer.page });
  const listId = `${context.id}-list-${depth}`;
  const optionId = (item: MenuItem) => `${listId}-option-${items.indexOf(item)}`;

  // Mount-order layout effects place ancestors before descendants, including after a resize.
  useLayoutEffect(() => {
    if (!element) return;
    if (typeof element.showPopover === "function" && !element.matches(":popover-open"))
      element.showPopover();
    const view = element.ownerDocument.defaultView;
    if (!view) return;
    element.style.maxWidth = `${Math.max(0, view.innerWidth - 24)}px`;
    element.style.maxHeight = `${Math.max(0, view.innerHeight - 24)}px`;
    const rect = layer.anchor.getBoundingClientRect();
    const width = element.offsetWidth || 260;
    const height = element.offsetHeight || 300;
    const parent = layer.anchor.closest('[data-slot="filter-popup"]');
    const previous = parent?.previousElementSibling;
    const continuesLeft =
      parent &&
      previous &&
      parent.getBoundingClientRect().left < previous.getBoundingClientRect().left;
    const right = rect.right + 5;
    const leftCandidate = rect.left - width - 5;
    const placeLeft =
      (continuesLeft && leftCandidate >= 12) || right + width >= view.innerWidth - 12;
    const preferredLeft = depth === 0 ? rect.left : placeLeft ? leftCandidate : right;
    element.style.position = "fixed";
    element.style.margin = "0";
    element.style.left = `${Math.max(12, Math.min(preferredLeft, view.innerWidth - width - 12))}px`;
    const preferredTop = depth === 0 ? rect.bottom + 8 : rect.top - 49;
    element.style.top = `${Math.max(12, Math.min(preferredTop, view.innerHeight - height - 12))}px`;
  });
  useLayoutEffect(() => {
    if (active) input.current?.focus({ preventScroll: true });
  }, [active, element]);
  useLayoutEffect(() => {
    const option = activeItem && options.current.get(activeItem.id);
    option?.scrollIntoView?.({ block: "nearest" });
    if (
      element?.ownerDocument.activeElement?.getAttribute("role") === "option" &&
      element.contains(element.ownerDocument.activeElement)
    )
      option?.focus();
  }, [activeItem?.id, element]);

  function choose({
    close,
    selectFirst = true,
    event,
  }: {
    close: boolean;
    selectFirst?: boolean;
    event: Event;
  }) {
    const item = activeItem ?? enabled[0];
    const option = item && options.current.get(item.id);
    if (item && option) onActivate({ item, element: option, close, selectFirst, event });
  }
  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    const stop = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    if (event.key === "Escape") {
      stop();
      context.close(true);
      return;
    }
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      ((event.key === "Home" || event.key === "End") && !layer.search)
    ) {
      stop();
      const index = enabled.findIndex((item) => item.id === activeItem?.id);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? enabled.length - 1
            : index < 0
              ? event.key === "ArrowDown"
                ? 0
                : enabled.length - 1
              : (index + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length;
      onLayerChange({ search: layer.search, active: enabled[next]?.id ?? null });
      return;
    }
    if (event.key === "ArrowLeft" && !layer.search && depth > 0) {
      stop();
      onBack();
      return;
    }
    if (event.key === "ArrowRight" && !layer.search && activeItem?.kind === "branch") {
      stop();
      choose({ close: false, selectFirst: false, event: event.nativeEvent });
      return;
    }
    if (event.key === "Enter" || (event.key === " " && !layer.search)) {
      stop();
      choose({ close: event.key === "Enter", event: event.nativeEvent });
      return;
    }
    if (event.key === "Tab") {
      stop();
      if (event.target === input.current && enabled.length) {
        const item = activeItem ?? enabled[0]!;
        onLayerChange({ search: layer.search, active: item.id });
        options.current.get(item.id)?.focus();
      } else input.current?.focus();
      return;
    }
    if (event.target !== input.current && (event.key.length === 1 || event.key === "Backspace")) {
      stop();
      const search =
        event.key === "Backspace" ? layer.search.slice(0, -1) : layer.search + event.key;
      const matches = menuItems({ items: context.items, page: layer.page, search });
      onLayerChange({ search, active: matches.find((item) => !item.disabled)?.id ?? null });
      input.current?.focus();
    }
  }
  const children = (
    <>
      <div data-slot="filter-search">
        {depth > 0 && (
          <button
            type="button"
            data-slot="filter-back"
            aria-label={`Back from ${label}`}
            onClick={onBack}
          >
            ‹
          </button>
        )}
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label={`Search ${label}`}
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
          value={layer.search}
          placeholder={depth === 0 ? "Add filter…" : `Filter ${label.toLowerCase()}…`}
          onFocus={onLayerFocus}
          onChange={(event) => {
            const search = event.target.value;
            const matches = menuItems({ items: context.items, page: layer.page, search });
            onLayerChange({ search, active: matches.find((item) => !item.disabled)?.id ?? null });
          }}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div
        data-slot="filter-options"
        id={listId}
        role="listbox"
        aria-label={label}
        aria-multiselectable={items.some((item) => item.kind === "value") || undefined}
      >
        {items.length === 0 && <div data-slot="filter-empty">{emptyLabel}</div>}
        {items.map((item) => {
          const selected =
            item.kind === "value"
              ? context.value.some(
                  (entry) => entry.field === item.field && entry.values.includes(item.value),
                )
              : item.kind === "operator" &&
                layer.page.kind === "operator" &&
                context.value.some(
                  (entry) => entry.field === operatorField && entry.operator === item.id,
                );
          const highlighted = activeItem?.id === item.id;
          return (
            <div
              key={item.id}
              ref={(node) => {
                if (node) options.current.set(item.id, node);
                else options.current.delete(item.id);
              }}
              id={optionId(item)}
              data-slot="filter-option"
              role="option"
              aria-selected={selected}
              aria-disabled={item.disabled || undefined}
              data-highlighted={highlighted || undefined}
              data-disabled={item.disabled || undefined}
              tabIndex={highlighted ? 0 : -1}
              aria-label={
                item.kind === "value" && layer.page.kind === "root"
                  ? `${item.context}: ${item.label}`
                  : item.label
              }
              onPointerMove={(event) => {
                if (item.disabled) return;
                if (!highlighted) {
                  onLayerFocus();
                  onLayerChange({ search: layer.search, active: item.id });
                }
                if (item.kind === "branch") onPreview(item, event.currentTarget);
              }}
              onPointerDown={(event) => event.preventDefault()}
              onClick={(event) => {
                onLayerFocus();
                onActivate({
                  item,
                  element: event.currentTarget,
                  close: false,
                  selectFirst: true,
                  event: event.nativeEvent,
                });
              }}
            >
              {renderOption ? (
                renderOption({ item, selected, highlighted })
              ) : (
                <>
                  <span data-slot="filter-option-icon" aria-hidden="true">
                    {selected ? "✓" : item.kind === "operator" ? "" : item.icon}
                  </span>
                  <span data-slot="filter-option-label">
                    {item.label}
                    {item.kind === "value" && layer.page.kind === "root" && (
                      <small>{item.context}</small>
                    )}
                  </span>
                  {item.kind === "branch" ? (
                    <span aria-hidden="true">›</span>
                  ) : item.kind === "value" && item.count !== undefined ? (
                    <span data-slot="filter-option-count">{item.count}</span>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div data-slot="filter-hint">
        {items.some((item) => item.kind === "value")
          ? "Space toggle · Enter apply"
          : "↑ ↓ navigate · → open"}{" "}
        · Esc close
      </div>
    </>
  );
  return useRender({
    render,
    ref: [ref, setElement],
    state: { depth, active },
    props: {
      ...mergeProps(
        { "data-slot": "filter-popup", popover: "manual", onKeyDown: handleKeys },
        props,
        { children },
      ),
      className,
      style,
    },
  });
}
