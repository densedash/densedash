import { memo } from "react";
import type { MenuItem } from "./context.js";
import type { PopupProps } from "./popup.js";

export interface Hover {
  item: MenuItem;
  element: HTMLElement;
  highlighted: boolean;
}
export interface Choice {
  item: MenuItem;
  element: HTMLElement;
  event: Event;
}
interface Props {
  item: MenuItem;
  id: string;
  selected: boolean;
  highlighted: boolean;
  showContext: boolean;
  options: Map<string, HTMLDivElement>;
  renderOption: PopupProps["renderOption"];
  onHover(hover: Hover): void;
  onChoose(choice: Choice): void;
}

// Stable menu entries and event callbacks let cursor moves update only the affected rows.
export const Option = memo(function Option({
  item,
  id,
  selected,
  highlighted,
  showContext,
  options,
  renderOption,
  onHover,
  onChoose,
}: Props) {
  return (
    <div
      ref={(node) => {
        if (node) options.set(item.id, node);
        else options.delete(item.id);
      }}
      id={id}
      data-slot="filter-option"
      role="option"
      aria-selected={selected}
      aria-disabled={item.disabled || undefined}
      data-highlighted={highlighted || undefined}
      data-disabled={item.disabled || undefined}
      tabIndex={highlighted ? 0 : -1}
      aria-label={
        item.kind === "value" && showContext ? `${item.context}: ${item.label}` : item.label
      }
      onPointerMove={(event) => {
        if (!item.disabled) onHover({ item, element: event.currentTarget, highlighted });
      }}
      onPointerDown={(event) => event.preventDefault()}
      onClick={(event) =>
        onChoose({ item, element: event.currentTarget, event: event.nativeEvent })
      }
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
            {item.kind === "value" && showContext && <small>{item.context}</small>}
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
});
