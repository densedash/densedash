import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { useKernelFor } from "../context.js";
import { ScopeContext } from "../scope-context.js";
import type { ElementAttributes } from "../element-attributes.js";
import type { PartProps } from "../use-render.js";
import { menuItems, toggled, useFilterContext } from "./context.js";
import type { Item, MenuItem, OpenMenu, Page } from "./context.js";
import { Panel } from "./panel.js";
import type { VirtualOptions } from "../virtual/tanstack-virtual.js";

export interface PopupState {
  readonly depth: number;
  readonly active: boolean;
}
export interface PopupProps extends ElementAttributes<HTMLDivElement>, PartProps<PopupState> {
  /** Replaces an option's contents while preserving its interaction/ARIA wrapper. */
  readonly renderOption?: (state: {
    item: MenuItem;
    selected: boolean;
    highlighted: boolean;
  }) => ReactNode;
  readonly emptyLabel?: string;
  /** Lists over 100 options are windowed by default. False mounts all; options tune TanStack Virtual. */
  readonly virtual?: boolean | VirtualOptions;
}
export interface Layer {
  page: Page;
  anchor: HTMLElement;
  search: string;
  active: string | null;
}

/** Mounts one top-layer popup per level. Styling/render callbacks apply to every level; ref/id belong to the first. */
export function Popup(props: PopupProps): ReactElement | null {
  const { open } = useFilterContext();
  return open ? <Stack key={JSON.stringify(open.page)} menu={open} {...props} /> : null;
}
function Stack({ menu, ...props }: PopupProps & { menu: OpenMenu }): ReactElement {
  const context = useFilterContext();
  const kernel = useKernelFor("<Filter.Popup>");
  const parent = useContext(ScopeContext)?.name;
  const scope = useId();
  const [layers, setLayers] = useState<readonly Layer[]>([
    { page: menu.page, anchor: menu.anchor, search: "", active: null },
  ]);
  const [focusedDepth, setFocusedDepth] = useState(0);
  const [, layout] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const latest = useRef(context);
  useLayoutEffect(() => {
    latest.current = context;
  });
  useLayoutEffect(
    () =>
      kernel.commands.register(`filter${scope}`, [], {
        only: true,
        ...(parent === undefined ? {} : { parent }),
      }),
    [kernel, scope, parent],
  );
  useEffect(() => {
    const document = menu.anchor.ownerDocument;
    const view = document.defaultView;
    const dismiss = (event: Event) => {
      const target = event.target;
      if (
        view &&
        target instanceof view.Node &&
        !root.current?.contains(target) &&
        !menu.anchor.contains(target)
      )
        latest.current.close(false);
    };
    const reposition = () => layout((version) => version + 1);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    view?.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
      view?.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
    };
  }, [menu.anchor]);

  const update = useCallback(
    ({ depth, search, active }: { depth: number; search: string; active: string | null }) => {
      setLayers((current) =>
        current
          .slice(0, depth + 1)
          .map((layer, index) => (index === depth ? { ...layer, search, active } : layer)),
      );
    },
    [],
  );
  const enter = useCallback(
    ({
      depth,
      item,
      element,
      focus,
      selectFirst,
    }: {
      depth: number;
      item: MenuItem;
      element: HTMLElement;
      focus: boolean;
      selectFirst: boolean;
    }) => {
      if (item.kind !== "branch" || item.disabled) return;
      setLayers((current) => {
        if (JSON.stringify(current[depth + 1]?.page) === JSON.stringify(item.page)) return current;
        return [
          ...current.slice(0, depth + 1),
          { page: item.page, anchor: element, search: "", active: null },
        ];
      });
      if (focus) setFocusedDepth(depth + 1);
      // Panel selects the first enabled row on activation; Right leaves search without a cursor.
      if (selectFirst)
        setLayers((current) =>
          current.map((layer, index) =>
            index === depth + 1
              ? { ...layer, active: firstItem(latest.current.items, layer.page) }
              : layer,
          ),
        );
    },
    [],
  );
  const activate = useCallback(
    ({
      depth,
      item,
      element,
      close,
      selectFirst,
      event,
    }: {
      depth: number;
      item: MenuItem;
      element: HTMLElement;
      close: boolean;
      selectFirst: boolean;
      event: Event;
    }) => {
      if (item.disabled) return;
      if (item.kind === "branch") return enter({ depth, item, element, focus: true, selectFirst });
      const context = latest.current;
      const operatorField = menu.page.kind === "operator" ? menu.page.id : undefined;
      const next =
        item.kind === "operator" && operatorField !== undefined
          ? context.value.map((entry) =>
              entry.field === operatorField ? { ...entry, operator: item.id } : entry,
            )
          : item.kind === "value"
            ? toggled({ value: context.value, field: item.field, option: item.value })
            : context.value;
      const changed = context.change(
        next,
        event.type === "keydown" ? "keyboard" : "pointer",
        event,
      );
      if (changed && (close || item.kind === "operator")) context.close(true);
    },
    [enter, menu.page],
  );
  const preview = useCallback(
    (selection: { depth: number; item: MenuItem; element: HTMLElement }) =>
      enter({ ...selection, focus: false, selectFirst: false }),
    [enter],
  );
  const back = useCallback((depth: number) => {
    setLayers((current) => current.slice(0, depth));
    setFocusedDepth(depth - 1);
  }, []);
  return (
    <div ref={root} data-slot="filter-stack">
      {layers.map((layer, depth) => (
        <Panel
          key={`${depth}:${JSON.stringify(layer.page)}`}
          {...props}
          id={depth === 0 ? props.id : undefined}
          ref={depth === 0 ? props.ref : undefined}
          layer={layer}
          depth={depth}
          active={depth === focusedDepth}
          onLayerFocus={setFocusedDepth}
          onLayerChange={update}
          onPreview={preview}
          onActivate={activate}
          onBack={back}
        />
      ))}
    </div>
  );
}
function firstItem(items: readonly Item[], page: Page): string | null {
  return menuItems({ items, page, search: "" }).find((item) => !item.disabled)?.id ?? null;
}
