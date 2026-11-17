import { useState } from "react";
import { Sidebar } from "@densedash/react";
import "@densedash/css/components/sidebar.css";
import "../docs/sidebar.css";

const paths = {
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3Z",
  inbox: "M3 4h18v16H3ZM3 14h5l2 3h4l2-3h5",
  folder: "M3 6h7l2 2h9v12H3ZM3 12h18",
  layers: "m12 3 10 6-10 6L2 9Zm-10 10 10 6 10-6M2 17l10 6 10-6",
  list: "M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1",
  team: "M15 21v-4a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v4M17 13a4 4 0 0 1 4 4v4M13 5a4 4 0 1 1 0 6M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  document: "M4 3h11l5 5v13H4ZM14 3v6h6M8 13h8M8 17h6",
  settings:
    "M12 3v3m0 12v3M3 12h3m12 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
} as const;

function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const destinations = {
  overview: ["Overview", "home"],
  inbox: ["Inbox", "inbox"],
  all: ["All issues", "list"],
  cycle: ["Active cycle", "list"],
  backlog: ["Backlog", "list"],
  roadmap: ["Roadmap", "layers"],
  design: ["Design system", "layers"],
  engineering: ["Engineering", "team"],
  documents: ["Documents", "document"],
  settings: ["Settings", "settings"],
} as const;
type Destination = keyof typeof destinations;

const issues = [
  { id: "DD-142", title: "Unify workspace navigation", status: "In progress", owner: "JD" },
  { id: "DD-141", title: "Add keyboard shortcuts", status: "In progress", owner: "AK" },
  { id: "DD-139", title: "Improve empty states", status: "Todo", owner: "ML" },
  { id: "DD-138", title: "Support directory navigation", status: "Backlog", owner: "JD" },
];

export default function SidebarExample() {
  const [selected, setSelected] = useState<Destination>("all");
  const item = (id: Destination) => (
    <Sidebar.Item
      label={destinations[id][0]}
      icon={<Icon name={destinations[id][1]} />}
      current={selected === id}
      onClick={() => setSelected(id)}
    />
  );
  const visible = issues.filter((issue) =>
    selected === "cycle"
      ? issue.status === "In progress"
      : selected === "backlog"
        ? issue.status === "Backlog"
        : true,
  );

  return (
    <Sidebar.Root className="sidebar-example">
      <Sidebar.Toolbar>
        <Sidebar.Trigger title="Toggle navigation" />
        <span data-slot="sidebar-demo-title">Acme workspace</span>
      </Sidebar.Toolbar>
      <Sidebar.Viewport>
        <Sidebar.Nav
          label="Workspace navigation"
          header={
            <div data-slot="sidebar-demo-identity">
              <span data-slot="sidebar-demo-avatar">A</span>
              <span data-slot="sidebar-demo-name">Acme</span>
            </div>
          }
          footer={item("settings")}
        >
          {item("overview")}
          {item("inbox")}
          <Sidebar.Section label="Workspace">
            <Sidebar.Group label="Projects" icon={<Icon name="folder" />} defaultExpanded>
              <Sidebar.Group label="Platform" icon={<Icon name="layers" />} defaultExpanded>
                <Sidebar.Group label="Issues" icon={<Icon name="list" />} defaultExpanded>
                  {item("all")}
                  {item("cycle")}
                  {item("backlog")}
                </Sidebar.Group>
                {item("roadmap")}
              </Sidebar.Group>
              {item("design")}
            </Sidebar.Group>
            <Sidebar.Group label="Teams" icon={<Icon name="team" />}>
              {item("engineering")}
            </Sidebar.Group>
          </Sidebar.Section>
          <Sidebar.Section label="Resources">{item("documents")}</Sidebar.Section>
        </Sidebar.Nav>
        <Sidebar.Content render={<section aria-label="Workspace page" />}>
          <div data-slot="sidebar-demo-page-heading">
            <Icon name={destinations[selected][1]} />
            <div>
              <h3>{destinations[selected][0]}</h3>
              <p>Platform · November cycle</p>
            </div>
          </div>
          <div data-slot="sidebar-demo-results">
            <div data-slot="sidebar-demo-summary">Issues · {visible.length}</div>
            <table aria-label="Workspace issues">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <span>{issue.id}</span>
                      {issue.title}
                    </td>
                    <td>{issue.status}</td>
                    <td>{issue.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p data-slot="sidebar-demo-note">
              Expand Projects → Platform → Issues. Collapse the navigation to explore the same
              directories from the icon rail.
            </p>
          </div>
          <div data-slot="sidebar-demo-status">
            ↑ ↓ move · → expand · ← parent · Enter / Space open
          </div>
        </Sidebar.Content>
      </Sidebar.Viewport>
    </Sidebar.Root>
  );
}
