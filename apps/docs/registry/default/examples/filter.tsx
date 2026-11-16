import { useState } from "react";
import { Frame } from "../docs/frame.js";
import { Filter } from "../ui/filter.js";

type Field = "status" | "priority" | "due";
const items = [
  {
    type: "field",
    id: "status",
    label: "Status",
    icon: "◌",
    options: [
      { value: "Todo", label: "Todo" },
      { value: "In Progress", label: "In Progress" },
      { value: "Done", label: "Done" },
    ],
  },
  {
    type: "field",
    id: "priority",
    label: "Priority",
    icon: "▥",
    options: [
      { value: "High", label: "High" },
      { value: "Medium", label: "Medium" },
      { value: "Low", label: "Low" },
    ],
  },
  {
    type: "group",
    id: "dates",
    label: "Dates",
    icon: "▦",
    items: [
      {
        type: "field",
        id: "due",
        label: "Due date",
        options: [
          { value: "This week", label: "This week" },
          { value: "Later", label: "Later" },
        ],
      },
    ],
  },
] as const satisfies readonly Filter.Item<Field>[];
const keys = { label: "Issue filters", preset: { "filter.open": ["F"] } } as const;
const issues = [
  {
    id: "DD-108",
    title: "Add keyboard navigation",
    status: "Todo",
    priority: "High",
    due: "This week",
  },
  {
    id: "DD-109",
    title: "Keep focus between layers",
    status: "In Progress",
    priority: "High",
    due: "This week",
  },
  {
    id: "DD-110",
    title: "Build the command palette",
    status: "Todo",
    priority: "Medium",
    due: "Later",
  },
  {
    id: "DD-111",
    title: "Document selection behavior",
    status: "Done",
    priority: "Low",
    due: "Later",
  },
  {
    id: "DD-112",
    title: "Fix popup clipping",
    status: "In Progress",
    priority: "Medium",
    due: "This week",
  },
  {
    id: "DD-113",
    title: "Add a compact density preset",
    status: "Done",
    priority: "Low",
    due: "This week",
  },
];

export default function FilterExample() {
  const [value, setValue] = useState<readonly Filter.Value<Field>[]>([]);
  // The component owns interaction. The application decides how clauses match its data.
  const visible = issues.filter((issue) =>
    value.every((clause) => {
      const selected = clause.values.includes(issue[clause.field]);
      return clause.operator === "in" ? selected : !selected;
    }),
  );
  return (
    <Frame
      title="Component library"
      count={`${visible.length} of ${issues.length} issues`}
      variant="filter"
      status="Space to toggle · Enter to apply"
    >
      <Filter.Root items={items} value={value} onValueChange={setValue} keys={keys}>
        <div data-slot="filter-demo-toolbar">
          <span>All issues</span>
          <Filter.Trigger>
            Filter <kbd>F</kbd>
          </Filter.Trigger>
        </div>
        <Filter.Chips />
        <div data-slot="filter-demo-results">
          <table aria-label="Filtered issues">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <span data-slot="filter-demo-id">{issue.id}</span>
                    {issue.title}
                  </td>
                  <td>{issue.status}</td>
                  <td>{issue.priority}</td>
                  <td>{issue.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p role="status">No issues match these filters. Clear a chip to try again.</p>
          )}
        </div>
        <Filter.Popup />
      </Filter.Root>
    </Frame>
  );
}
