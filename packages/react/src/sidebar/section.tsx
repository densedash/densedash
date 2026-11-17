import { useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ElementAttributes } from "../element-attributes.js";
import { mergeProps } from "../merge-props.js";
import { useRender } from "../use-render.js";
import type { PartProps } from "../use-render.js";
import { DirectoryContext, useSidebar } from "./context.js";
import type { State } from "./context.js";

export interface SectionProps extends ElementAttributes<HTMLDivElement>, PartProps<State> {
  readonly label: string;
  readonly children?: ReactNode;
}

/** Named navigation section; its heading stays visible without changing its block size. */
export function Section({
  label,
  children,
  render,
  ref,
  className,
  style,
  ...props
}: SectionProps): ReactElement {
  const { collapsed } = useSidebar();
  const directory = useContext(DirectoryContext);
  const compact = collapsed && !directory;
  return useRender({
    render,
    ref,
    state: { collapsed: compact },
    props: {
      ...mergeProps(
        {
          "data-slot": "sidebar-section",
          role: "group",
          "aria-label": label,
          children: (
            <>
              <div data-slot="sidebar-section-heading" title={compact ? label : undefined}>
                <span data-slot="sidebar-section-label">{label}</span>
              </div>
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
}
