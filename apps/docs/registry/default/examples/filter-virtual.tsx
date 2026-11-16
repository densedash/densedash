import { useState } from "react";
import { Frame } from "../docs/frame.js";
import { Filter } from "../ui/filter.js";

const projects = Array.from({ length: 5000 }, (_, index) => ({
  value: String(index),
  label: `Project ${String(index).padStart(5, "0")}${index === 4999 ? " — a longer project name that wraps across several lines" : ""}`,
  disabled: index === 4998,
}));
const items: readonly Filter.Item[] = [
  {
    type: "group",
    id: "workspace",
    label: "Workspace",
    items: [{ type: "field", id: "project", label: "Repository", options: projects }],
  },
  ...Array.from({ length: 128 }, (_, index): Filter.Group => ({
    type: "group",
    id: `team-${index}`,
    label: `Team ${String(index).padStart(3, "0")}`,
    items: [
      {
        type: "field",
        id: `owner-${index}`,
        label: "Owner",
        options: [
          { value: "me", label: "Me" },
          { value: "unassigned", label: "Unassigned" },
        ],
      },
    ],
  })),
];

export default function VirtualFilterExample() {
  const [value, setValue] = useState<readonly Filter.Value[]>([]);
  const selected = value.reduce((count, clause) => count + clause.values.length, 0);
  return (
    <Frame
      title="5,000 searchable projects"
      count="5,000 projects"
      variant="filter"
      status={`${selected} selected`}
    >
      <Filter.Root items={items} value={value} onValueChange={setValue}>
        <div data-slot="filter-demo-toolbar">
          <span>Projects and teams</span>
          <Filter.Trigger>Filter projects</Filter.Trigger>
        </div>
        <Filter.Chips />
        <p data-slot="filter-demo-summary">
          Search for “Project” to explore 5,000 results, or open Workspace → Repository. Team menus
          demonstrate nested filters inside a virtualized parent.
        </p>
        <Filter.Popup />
      </Filter.Root>
    </Frame>
  );
}
