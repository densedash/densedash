import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { ChangeDetails } from "@densedash/core";

export interface Option {
  readonly value: string;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly count?: number;
  readonly disabled?: boolean;
}
interface Definition {
  /** Stable and unique throughout this root. */
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
}
export interface Field<Id extends string = string> extends Definition {
  readonly type: "field";
  readonly id: Id;
  readonly options: readonly Option[];
}
export interface Group<Id extends string = string> extends Definition {
  readonly type: "group";
  readonly items: readonly Item<Id>[];
}
export type Item<Id extends string = string> = Field<Id> | Group<Id>;
export type Operator = "in" | "not-in";
export interface Value<Id extends string = string> {
  readonly field: Id;
  readonly values: readonly string[];
  readonly operator: Operator;
}
export type ChangeReason = "keyboard" | "pointer" | "remove" | "clear";
export type Page = { kind: "root" } | { kind: "item" | "operator"; id: string };
export type MenuItem =
  | { kind: "branch"; id: string; label: string; icon: ReactNode; page: Page; disabled: boolean }
  | {
      kind: "value";
      id: string;
      label: string;
      icon: ReactNode;
      field: string;
      value: string;
      context: string;
      count: number | undefined;
      disabled: boolean;
    }
  | { kind: "operator"; id: Operator; label: string; disabled: false };
export interface OpenMenu {
  readonly anchor: HTMLElement;
  readonly page: Page;
}
export interface FilterContextValue {
  readonly id: string;
  readonly items: readonly Item[];
  readonly value: readonly Value[];
  readonly open: OpenMenu | null;
  readonly trigger: { current: HTMLElement | null };
  openMenu(menu: OpenMenu): void;
  close(restore: boolean): void;
  change(value: readonly Value[], reason: ChangeReason, event: Event | undefined): boolean;
}
export const FilterContext = createContext<FilterContextValue | null>(null);
export function useFilterContext(): FilterContextValue {
  const context = useContext(FilterContext);
  if (!context) throw new Error("densedash: Filter parts must be rendered inside <Filter.Root>.");
  return context;
}

export function findItem({ items, id }: { items: readonly Item[]; id: string }): Item | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.type === "group") {
      const found = findItem({ items: item.items, id });
      if (found) return found;
    }
  }
}
function flatten(items: readonly Item[]): readonly Item[] {
  return items.flatMap((item) =>
    item.type === "group" && !item.disabled ? [item, ...flatten(item.items)] : [item],
  );
}
function branch(item: Item): MenuItem {
  return {
    kind: "branch",
    id: item.id,
    label: item.label,
    icon: item.icon,
    page: { kind: "item", id: item.id },
    disabled: item.disabled === true,
  };
}
function values(field: Field): MenuItem[] {
  return field.options.map((option) => ({
    kind: "value",
    id: JSON.stringify([field.id, option.value]),
    label: option.label,
    icon: option.icon ?? field.icon,
    field: field.id,
    value: option.value,
    context: field.label,
    count: option.count,
    disabled: field.disabled === true || option.disabled === true,
  }));
}
export function pageLabel({ items, page }: { items: readonly Item[]; page: Page }): string {
  return page.kind === "root"
    ? "Add filter"
    : page.kind === "operator"
      ? "Operator"
      : (findItem({ items, id: page.id })?.label ?? "Filter");
}
export function menuItems({
  items,
  page,
  search,
}: {
  items: readonly Item[];
  page: Page;
  search: string;
}): readonly MenuItem[] {
  const query = search.trim().toLowerCase();
  if (page.kind === "operator") {
    const operators: readonly MenuItem[] = [
      { kind: "operator", id: "in", label: "is any of", disabled: false },
      { kind: "operator", id: "not-in", label: "is not", disabled: false },
    ];
    return operators.filter((item) => item.label.includes(query));
  }
  const item = page.kind === "root" ? undefined : findItem({ items, id: page.id });
  if (item?.disabled) return [];
  if (item?.type === "field")
    return values(item).filter((entry) => entry.label.toLowerCase().includes(query));
  const children = item?.type === "group" ? item.items : page.kind === "root" ? items : [];
  if (!query) return children.map(branch);
  const descendants = flatten(children);
  const branches = descendants
    .filter((entry) => entry.label.toLowerCase().includes(query))
    .map(branch);
  const matches = descendants.flatMap((entry) =>
    entry.type === "field" && !entry.disabled ? values(entry) : [],
  );
  return [...branches, ...matches.filter((entry) => entry.label.toLowerCase().includes(query))];
}

export function toggled({
  value,
  field,
  option,
}: {
  value: readonly Value[];
  field: string;
  option: string;
}): readonly Value[] {
  const current = value.find((entry) => entry.field === field);
  if (!current) return [...value, { field, values: [option], operator: "in" }];
  const selected = current.values.includes(option)
    ? current.values.filter((entry) => entry !== option)
    : [...current.values, option];
  return value.flatMap((entry) =>
    entry.field !== field ? [entry] : selected.length ? [{ ...entry, values: selected }] : [],
  );
}
export function operatorLabel(value: Value): string {
  return value.operator === "not-in" ? "is not" : value.values.length > 1 ? "is any of" : "is";
}
export type ValueChange<Id extends string> = (
  value: readonly Value<Id>[],
  details: ChangeDetails<ChangeReason>,
) => void;
