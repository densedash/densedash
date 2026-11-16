import { useId, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ChangeDetails, KeyLayer } from "@densedash/core";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { useCommands } from "../use-commands.js";
import { FilterContext, findItem, operatorLabel, useFilterContext } from "./context.js";
import type {
  ChangeReason,
  FilterContextValue,
  Item,
  OpenMenu,
  Value,
  ValueChange,
} from "./context.js";

export interface RootState {
  readonly open: boolean;
  readonly count: number;
}
export interface RootProps<Id extends string>
  extends ElementAttributes<HTMLDivElement>, PartProps<RootState> {
  readonly items: readonly Item<Id>[];
  readonly value?: readonly Value<NoInfer<Id>>[];
  readonly defaultValue?: readonly Value<NoInfer<Id>>[];
  readonly onValueChange?: ValueChange<NoInfer<Id>>;
  /** Optional page-wide opener command. Supply filter.open in the layer's preset/overrides. */
  readonly keys?: KeyLayer;
  readonly children?: ReactNode;
}
function OpenKeys({ keys }: { keys: KeyLayer }): null {
  const context = useFilterContext();
  useCommands(
    [
      {
        id: "filter.open",
        label: "Open filters",
        enabled: () => !context.open && context.trigger.current?.matches(":disabled") !== true,
        run: () => {
          const anchor = context.trigger.current;
          // Layout can change without a command update (for example a hidden docs preview).
          if (anchor && anchor.getClientRects().length > 0)
            context.openMenu({ anchor, page: { kind: "root" } });
        },
      },
    ],
    { keys },
  );
  return null;
}

/** Owns definitions, selections and one popup stack. Popup and keys require Densedash.Provider. */
export function Root<const Id extends string>({
  items,
  value,
  defaultValue = [],
  onValueChange,
  keys,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: RootProps<Id>): ReactElement {
  const id = useId();
  const trigger = useRef<HTMLElement | null>(null);
  const [uncontrolled, setUncontrolled] = useState<readonly Value[]>(defaultValue);
  const [open, setOpen] = useState<OpenMenu | null>(null);
  const selected = value ?? uncontrolled;
  const context: FilterContextValue = {
    id,
    items,
    value: selected,
    open,
    trigger,
    openMenu: setOpen,
    close(restore) {
      setOpen(null);
      if (restore) {
        const target = open?.anchor.isConnected ? open.anchor : trigger.current;
        target?.focus({ preventScroll: true });
      }
    },
    change(next, reason, event) {
      let canceled = false;
      const details: ChangeDetails<ChangeReason> = {
        reason,
        event,
        cancel() {
          canceled = true;
        },
        get canceled() {
          return canceled;
        },
      };
      // Only ids from these trusted definitions reach the change path.
      onValueChange?.(next as readonly Value<Id>[], details);
      if (canceled) return false;
      if (value === undefined) setUncontrolled(next);
      return true;
    },
  };
  const rendered = useRender({
    render,
    ref,
    state: { open: open !== null, count: selected.length },
    props: {
      ...mergeProps(
        {
          "data-slot": "filter",
          children: (
            <>
              {keys && <OpenKeys keys={keys} />}
              {children}
            </>
          ),
        },
        props,
      ),
      className,
      style,
    },
  });
  return <FilterContext value={context}>{rendered}</FilterContext>;
}

export interface TriggerProps extends ElementAttributes<HTMLButtonElement>, PartProps<RootState> {
  readonly children?: ReactNode;
  readonly disabled?: boolean;
}
/** Enter/Space use native button semantics to open the stack and focus search. */
export function Trigger({
  children = "Filter",
  disabled = false,
  render,
  ref,
  className,
  style,
  ...props
}: TriggerProps): ReactElement {
  const context = useFilterContext();
  const state = { open: context.open !== null, count: context.value.length };
  return useRender({
    render,
    ref: [
      ref,
      (element) => {
        context.trigger.current = element;
      },
    ],
    defaultTagName: "button",
    state,
    props: {
      ...mergeProps<"button">(
        {
          "data-slot": "filter-trigger",
          type: "button",
          disabled,
          "aria-haspopup": "listbox",
          "aria-expanded": state.open,
          "aria-controls": state.open ? `${context.id}-list-0` : undefined,
          onClick: (event) => {
            if (disabled) return;
            if (state.open) context.close(true);
            else context.openMenu({ anchor: event.currentTarget, page: { kind: "root" } });
          },
        },
        props,
        { children },
      ),
      className,
      style,
    },
  });
}

export interface ChipsProps
  extends ElementAttributes<HTMLDivElement>, PartProps<{ readonly count: number }> {
  readonly children?: ReactNode;
}
/** Editable field/operator/value chips, removal and clear controls. */
export function Chips({
  children,
  render,
  ref,
  className,
  style,
  ...props
}: ChipsProps): ReactElement {
  const context = useFilterContext();
  const chips = context.value.map((entry) => {
    const definition = findItem({ items: context.items, id: entry.field });
    const label = definition?.label ?? entry.field;
    const labels = entry.values.map((selected) =>
      definition?.type === "field"
        ? (definition.options.find((option) => option.value === selected)?.label ?? selected)
        : selected,
    );
    return (
      <div data-slot="filter-chip" key={entry.field}>
        <span data-slot="filter-chip-field">
          {definition?.icon} {label}
        </span>
        <button
          type="button"
          data-slot="filter-chip-operator"
          aria-label={`Change ${label} operator`}
          onClick={(event) =>
            context.openMenu({
              anchor: event.currentTarget,
              page: { kind: "operator", id: entry.field },
            })
          }
        >
          {operatorLabel(entry)}
        </button>
        <button
          type="button"
          data-slot="filter-chip-value"
          aria-label={`Edit ${label}: ${labels.join(", ")}`}
          onClick={(event) =>
            context.openMenu({
              anchor: event.currentTarget,
              page: { kind: "item", id: entry.field },
            })
          }
        >
          {labels.join(", ")}
        </button>
        <button
          type="button"
          data-slot="filter-remove"
          aria-label={`Remove ${label} filter`}
          onClick={(event) => {
            if (
              context.change(
                context.value.filter((value) => value.field !== entry.field),
                "remove",
                event.nativeEvent,
              )
            )
              context.close(true);
          }}
        >
          ×
        </button>
      </div>
    );
  });
  return useRender({
    render,
    ref,
    state: { count: context.value.length },
    props: {
      ...mergeProps({ "data-slot": "filter-chips", "aria-label": "Active filters" }, props, {
        children: children ?? (
          <>
            {chips}
            {context.value.length > 0 && (
              <button
                type="button"
                data-slot="filter-clear"
                onClick={(event) => {
                  if (context.change([], "clear", event.nativeEvent)) context.close(true);
                }}
              >
                Clear filters
              </button>
            )}
          </>
        ),
      }),
      className,
      style,
    },
  });
}
