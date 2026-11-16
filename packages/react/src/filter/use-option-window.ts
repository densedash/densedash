import { useLayoutEffect, useMemo, useReducer, useRef } from "react";
import type { RefObject } from "react";
import { flushSync } from "react-dom";
import {
  Virtualizer,
  defaultRangeExtractor,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from "@tanstack/virtual-core";
import type { VirtualOptions } from "../virtual/tanstack-virtual.js";
import { readRowHeight } from "../virtual/row-height.js";
import type { MenuItem } from "./context.js";

interface Options {
  items: readonly MenuItem[];
  pinned: number;
  active: boolean;
  viewport: RefObject<HTMLDivElement | null>;
  virtual: boolean | VirtualOptions;
}

/** Each popup owns its window. Pinning keeps distant cursors and child-popup anchors in the DOM. */
export function useOptionWindow({ items, pinned, active, viewport, virtual }: Options) {
  const enabled = virtual !== false && items.length > 100;
  const options = typeof virtual === "object" ? virtual : undefined;
  const measure = options?.measure !== false;
  const [, changed] = useReducer((version: number) => version + 1, 0);
  const rowHeight = useRef(28);
  const committing = useRef(false);
  const latest = useRef({ pinned, active });
  useLayoutEffect(() => {
    latest.current = { pinned, active };
  });
  // A measurement-mode change gets a fresh cache and observer lifetime, as in Tree.Viewport.
  const instance = useMemo(
    () =>
      new Virtualizer<HTMLDivElement, HTMLElement>({
        count: 0,
        getScrollElement: () => viewport.current,
        estimateSize: () => rowHeight.current,
        scrollToFn: elementScroll,
        observeElementOffset,
        observeElementRect(virtualizer, notify) {
          const element = virtualizer.scrollElement;
          const view = element?.ownerDocument.defaultView;
          const measureDensity = () => {
            if (!element) return;
            const height = readRowHeight(element);
            if (height === rowHeight.current) return;
            rowHeight.current = height;
            virtualizer.measure();
          };
          measureDensity();
          const density = view ? new view.MutationObserver(measureDensity) : undefined;
          if (element)
            density?.observe(element.ownerDocument.documentElement, {
              attributes: true,
              attributeFilter: ["data-dd-density"],
              subtree: true,
            });
          const release = observeElementRect(virtualizer, (rect) => {
            const before = virtualizer.scrollRect;
            measureDensity();
            notify(rect);
            const current = latest.current;
            if (before && before.height !== rect.height && current.active && current.pinned >= 0)
              virtualizer.scrollToIndex(current.pinned, { align: "auto", behavior: "instant" });
          });
          return () => {
            density?.disconnect();
            release?.();
          };
        },
        onChange(_instance, sync) {
          // Scroll/resize corrections need their new sizer in the same frame. Layout
          // synchronization already runs at commit priority and cannot flush recursively.
          if (sync && !committing.current) flushSync(changed);
          else changed();
        },
      }),
    [measure, viewport],
  );
  const getItemKey = useMemo(() => (index: number) => items[index]?.id ?? index, [items]);
  const estimateSize = useMemo(
    () => (index: number) => options?.estimateSize?.(index) ?? rowHeight.current,
    [options?.estimateSize],
  );
  const rangeExtractor = useMemo(
    () => (range: Parameters<typeof defaultRangeExtractor>[0]) => {
      const indexes = defaultRangeExtractor(range);
      if (pinned < 0 || indexes.includes(pinned)) return indexes;
      return [...indexes, pinned].sort((first, second) => first - second);
    },
    [pinned],
  );

  // TanStack's React adapter configures the instance during render as well: a new cursor must
  // be mounted in this commit, before layout effects reveal it and restore option focus.
  instance.setOptions({
    ...instance.options,
    enabled,
    count: items.length,
    getItemKey,
    rangeExtractor,
    overscan: options?.overscan ?? 8,
    estimateSize,
    initialRect: { width: 0, height: 280 },
  });
  useLayoutEffect(() => {
    if (!enabled) return;
    return instance._didMount();
  }, [instance, enabled]);
  useLayoutEffect(() => {
    // As in the collection virtualizer, retired measurements never grow past the list size.
    if (instance.itemSizeCache.size <= items.length) return;
    const live = new Set(items.map((item) => item.id));
    for (const key of instance.itemSizeCache.keys())
      if (!live.has(String(key))) instance.itemSizeCache.delete(key);
  }, [instance, items]);
  function sync(elements: Iterable<HTMLElement>) {
    committing.current = true;
    try {
      instance._willUpdate();
      instance.measureElement(null);
      if (measure) for (const element of elements) instance.measureElement(element);
    } finally {
      committing.current = false;
    }
  }
  return enabled ? { instance, sync } : null;
}
