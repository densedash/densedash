import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { KeyboardEvent } from "react";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import { menuItems, pageLabel, useFilterContext } from "./context.js";
import type { MenuItem } from "./context.js";
import type { Layer, PopupProps } from "./popup.js";
import { Option } from "./option.js";
import type { Choice, Hover } from "./option.js";
import { useOptionWindow } from "./use-option-window.js";

interface Props extends PopupProps {
  layer: Layer;
  depth: number;
  active: boolean;
  onLayerFocus(depth: number): void;
  onLayerChange(change: { depth: number; search: string; active: string | null }): void;
  onPreview(selection: { depth: number; item: MenuItem; element: HTMLElement }): void;
  onActivate(selection: {
    depth: number;
    item: MenuItem;
    element: HTMLElement;
    close: boolean;
    selectFirst: boolean;
    event: Event;
  }): void;
  onBack(depth: number): void;
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
  virtual = true,
  render,
  ref,
  className,
  style,
  ...props
}: Props) {
  const context = useFilterContext();
  const popup = useRef<HTMLElement | null>(null);
  const focusedPopup = useRef<HTMLElement | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const keepOptionFocus = useRef(false);
  const options = useRef(new Map<string, HTMLDivElement>());
  const items = useMemo(
    () => menuItems({ items: context.items, page: layer.page, search: layer.search }),
    [context.items, layer.page, layer.search],
  );
  const enabled = useMemo(() => items.filter((item) => !item.disabled), [items]);
  const selectedValues = useMemo(() => {
    const fields = new Map<string, Set<string>>();
    for (const entry of context.value) {
      const values = fields.get(entry.field) ?? new Set<string>();
      for (const value of entry.values) values.add(value);
      fields.set(entry.field, values);
    }
    return fields;
  }, [context.value]);
  const activeIndex = items.findIndex((item) => !item.disabled && item.id === layer.active);
  const activeItem = items[activeIndex];
  const optionWindow = useOptionWindow({
    items,
    pinned: activeIndex < 0 ? items.findIndex((item) => !item.disabled) : activeIndex,
    active,
    viewport,
    virtual,
  });
  const operatorField = layer.page.kind === "operator" ? layer.page.id : undefined;
  const label = pageLabel({ items: context.items, page: layer.page });
  const listId = `${context.id}-list-${depth}`;
  const optionId = (index: number) => `${listId}-option-${index}`;
  const change = useCallback(
    (change: { search: string; active: string | null }) => onLayerChange({ depth, ...change }),
    [depth, onLayerChange],
  );
  const hover = useCallback(
    ({ item, element, highlighted }: Hover) => {
      if (!highlighted) {
        keepOptionFocus.current =
          popup.current?.contains(popup.current.ownerDocument.activeElement) === true &&
          popup.current.ownerDocument.activeElement?.getAttribute("role") === "option";
        onLayerFocus(depth);
        change({ search: layer.search, active: item.id });
      }
      if (item.kind === "branch") onPreview({ depth, item, element });
    },
    [depth, onLayerFocus, change, layer.search, onPreview],
  );
  const chooseOption = useCallback(
    ({ item, element, event }: Choice) => {
      onLayerFocus(depth);
      onActivate({ depth, item, element, close: false, selectFirst: true, event });
    },
    [depth, onLayerFocus, onActivate],
  );

  // Mount-order layout effects place ancestors before descendants, including after a resize.
  useLayoutEffect(() => {
    const element = popup.current;
    if (!element) return;
    if (typeof element.showPopover === "function" && !element.matches(":popover-open"))
      element.showPopover();
    const view = element.ownerDocument.defaultView;
    if (!view) return;
    element.style.maxWidth = `${Math.max(0, view.innerWidth - 24)}px`;
    const availableHeight = Math.max(0, view.innerHeight - 24);
    element.style.maxHeight = `min(var(--dd-filter-max-height, ${availableHeight}px), ${availableHeight}px)`;
    // Popover contents have no box until shown. Bind and measure only after entering the top layer.
    if (optionWindow) {
      optionWindow.instance._willUpdate();
      optionWindow.instance.measureElement(null);
      if (optionWindow.measure)
        for (const option of options.current.values()) optionWindow.instance.measureElement(option);
    }
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
    const searchHeight =
      element.querySelector('[data-slot="filter-search"]')?.getBoundingClientRect().height ?? 36;
    const inset = viewport.current
      ? Number.parseFloat(view.getComputedStyle(viewport.current).paddingBlockStart) || 0
      : 0;
    const preferredTop = depth === 0 ? rect.bottom + 8 : rect.top - searchHeight - inset;
    element.style.top = `${Math.max(12, Math.min(preferredTop, view.innerHeight - height - 12))}px`;
  });
  useLayoutEffect(() => {
    if (active && focusedPopup.current !== popup.current)
      input.current?.focus({ preventScroll: true });
    focusedPopup.current = active ? popup.current : null;
  });
  useLayoutEffect(() => {
    if (!active || !activeItem) return;
    const element = popup.current;
    if (optionWindow)
      optionWindow.instance.scrollToIndex(activeIndex, { align: "auto", behavior: "instant" });
    const option = options.current.get(activeItem.id);
    if (!optionWindow) option?.scrollIntoView?.({ block: "nearest" });
    if (
      keepOptionFocus.current ||
      (element?.ownerDocument.activeElement?.getAttribute("role") === "option" &&
        element.contains(element.ownerDocument.activeElement))
    )
      option?.focus({ preventScroll: true });
    keepOptionFocus.current = false;
  }, [activeItem?.id, activeIndex, active, items, optionWindow?.instance]);

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
    if (item && option) onActivate({ depth, item, element: option, close, selectFirst, event });
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
      keepOptionFocus.current = event.target !== input.current;
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
      change({ search: layer.search, active: enabled[next]?.id ?? null });
      return;
    }
    if (event.key === "ArrowLeft" && !layer.search && depth > 0) {
      stop();
      onBack(depth);
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
        keepOptionFocus.current = true;
        change({ search: layer.search, active: item.id });
        options.current.get(item.id)?.focus();
      } else {
        keepOptionFocus.current = false;
        input.current?.focus();
      }
      return;
    }
    if (event.target !== input.current && (event.key.length === 1 || event.key === "Backspace")) {
      stop();
      const search =
        event.key === "Backspace" ? layer.search.slice(0, -1) : layer.search + event.key;
      const matches = menuItems({ items: context.items, page: layer.page, search });
      change({ search, active: matches.find((item) => !item.disabled)?.id ?? null });
      input.current?.focus();
    }
  }
  const mounted = optionWindow
    ? optionWindow.instance.getVirtualItems().map((row) => ({ index: row.index, start: row.start }))
    : items.map((_, index) => ({ index, start: undefined }));
  const rows = mounted.map(({ index, start }) => {
    const item = items[index]!;
    const selected =
      item.kind === "value"
        ? selectedValues.get(item.field)?.has(item.value) === true
        : item.kind === "operator" &&
          layer.page.kind === "operator" &&
          context.value.some(
            (entry) => entry.field === operatorField && entry.operator === item.id,
          );
    return (
      <Option
        key={item.id}
        item={item}
        id={optionId(index)}
        index={index}
        count={items.length}
        selected={selected}
        highlighted={activeIndex === index}
        showContext={layer.page.kind === "root"}
        options={options.current}
        renderOption={renderOption}
        onHover={hover}
        onChoose={chooseOption}
        start={start}
      />
    );
  });
  const children = (
    <>
      <div data-slot="filter-search">
        {depth > 0 && (
          <button
            type="button"
            data-slot="filter-back"
            aria-label={`Back from ${label}`}
            onClick={() => onBack(depth)}
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
          aria-activedescendant={activeItem ? optionId(activeIndex) : undefined}
          value={layer.search}
          placeholder={depth === 0 ? "Add filter…" : `Filter ${label.toLowerCase()}…`}
          onFocus={() => {
            keepOptionFocus.current = false;
            onLayerFocus(depth);
          }}
          onChange={(event) => {
            const search = event.target.value;
            const matches = menuItems({ items: context.items, page: layer.page, search });
            change({ search, active: matches.find((item) => !item.disabled)?.id ?? null });
          }}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div
        ref={viewport}
        data-slot="filter-options"
        id={listId}
        role="listbox"
        aria-label={label}
        aria-multiselectable={items.some((item) => item.kind === "value") || undefined}
      >
        {items.length === 0 && <div data-slot="filter-empty">{emptyLabel}</div>}
        {optionWindow ? (
          <div
            data-slot="filter-window"
            style={{ position: "relative", blockSize: optionWindow.instance.getTotalSize() }}
          >
            {rows}
          </div>
        ) : (
          rows
        )}
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
    ref: [ref, popup],
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
