// @vitest-environment happy-dom
import { act, StrictMode } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, onTestFinished, test, vi } from "vitest";
import { Sidebar } from "../index.js";

async function mount(children: ReactNode) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = async (content: ReactNode) => {
    await act(() => root.render(<StrictMode>{content}</StrictMode>));
  };
  onTestFinished(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  await render(children);
  const get = (selector: string) => {
    const element = container.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing ${selector}`);
    return element;
  };
  return { container, get, render };
}
async function key(value: string) {
  await act(() =>
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }),
    ),
  );
}
async function click(element: HTMLElement) {
  await act(() => element.click());
}

function Example({
  root,
  directory,
}: {
  root?: Partial<Sidebar.RootProps>;
  directory?: Partial<Sidebar.GroupProps>;
}) {
  return (
    <Sidebar.Root {...root}>
      <Sidebar.Toolbar>
        <Sidebar.Trigger>Navigation</Sidebar.Trigger>
        <Sidebar.Trigger>Second toggle</Sidebar.Trigger>
      </Sidebar.Toolbar>
      <Sidebar.Viewport>
        <Sidebar.Nav label="Main">
          <Sidebar.Group label="Projects" defaultExpanded {...directory}>
            <Sidebar.Group label="Platform">
              <Sidebar.Group label="Issues">
                <Sidebar.Item label="Unavailable" disabled />
                <Sidebar.Item label="All issues" current />
                <Sidebar.Item label="Backlog" />
              </Sidebar.Group>
            </Sidebar.Group>
          </Sidebar.Group>
          <Sidebar.Item label="Activity" />
        </Sidebar.Nav>
        <Sidebar.Content>Page</Sidebar.Content>
      </Sidebar.Viewport>
    </Sidebar.Root>
  );
}

test("directory keys traverse recursive groups, skip disabled items, and keep the current destination separate from focus", async () => {
  const { get } = await mount(<Example />);
  get('[aria-label="Platform"]').focus();
  await key("ArrowRight");
  await key("ArrowRight");
  expect(document.activeElement).toBe(get('[aria-label="Issues"]'));
  await key("ArrowRight");
  await key("ArrowRight");
  expect(document.activeElement).toBe(get('[aria-label="All issues"]'));
  await key("ArrowDown");
  expect(document.activeElement).toBe(get('[aria-label="Backlog"]'));
  expect(get('[aria-label="All issues"]').getAttribute("aria-current")).toBe("page");
  await key("ArrowLeft");
  expect(document.activeElement).toBe(get('[aria-label="Issues"]'));
  await key("ArrowLeft");
  expect(get('[aria-label="Issues"]').getAttribute("aria-expanded")).toBe("false");
  await key("End");
  expect(document.activeElement).toBe(get('[aria-label="Activity"]'));
  await key("ArrowDown");
  expect(document.activeElement).toBe(get('[aria-label="Projects"]'));
});

test("collapsing the rail restores a stationary toggle and preserves every directory's expanded state", async () => {
  const { get } = await mount(<Example />);
  await click(get('[aria-label="Platform"]'));
  await click(get('[aria-label="Issues"]'));
  get('[aria-label="All issues"]').focus();
  await click(get('[data-slot="sidebar-trigger"]'));
  expect(document.activeElement).toBe(get('[data-slot="sidebar-trigger"]'));
  expect(get('[data-slot="sidebar"]').hasAttribute("data-collapsed")).toBe(true);
  await click(get('[data-slot="sidebar-trigger"]'));
  expect(get('[aria-label="Projects"]').getAttribute("aria-expanded")).toBe("true");
  expect(get('[aria-label="Platform"]').getAttribute("aria-expanded")).toBe("true");
  expect(get('[aria-label="Issues"]').getAttribute("aria-expanded")).toBe("true");
});

test("controlled collapse and directory expansion wait for consumer props", async () => {
  const changes: string[] = [];
  const example = ({ collapsed, expanded }: { collapsed: boolean; expanded: boolean }) => (
    <Example
      root={{ collapsed, onCollapsedChange: (value) => changes.push(`rail:${value}`) }}
      directory={{ expanded, onExpandedChange: (value) => changes.push(`directory:${value}`) }}
    />
  );
  const { get, render } = await mount(example({ collapsed: false, expanded: true }));
  await click(get('[data-slot="sidebar-trigger"]'));
  await click(get('[aria-label="Projects"]'));
  expect(changes).toEqual(["rail:true", "directory:false"]);
  expect(get('[data-slot="sidebar"]').hasAttribute("data-collapsed")).toBe(false);
  expect(get('[aria-label="Projects"]').getAttribute("aria-expanded")).toBe("true");
  await render(example({ collapsed: false, expanded: false }));
  expect(get('[aria-label="Projects"]').getAttribute("aria-expanded")).toBe("false");
  await render(example({ collapsed: true, expanded: false }));
  expect(get('[data-slot="sidebar"]').hasAttribute("data-collapsed")).toBe(true);
});

test("canceled requests preserve state and the focused directory child", async () => {
  const cancel: Sidebar.ChangeHandler = (_, details) => details.cancel();
  const { get } = await mount(
    <Example root={{ onCollapsedChange: cancel }} directory={{ onExpandedChange: cancel }} />,
  );
  get('[aria-label="Platform"]').focus();
  await click(get('[data-slot="sidebar-trigger"]'));
  expect(document.activeElement).toBe(get('[aria-label="Platform"]'));
  expect(get('[data-slot="sidebar"]').hasAttribute("data-collapsed")).toBe(false);
  await click(get('[aria-label="Projects"]'));
  expect(get('[aria-label="Projects"]').getAttribute("aria-expanded")).toBe("true");
  expect(document.activeElement).toBe(get('[aria-label="Platform"]'));
});

test.each(["rail", "directory"] as const)(
  "an external controlled %s collapse restores focus before hiding descendants",
  async (scope) => {
    const example = (closed: boolean) => (
      <Example
        root={{ collapsed: scope === "rail" && closed }}
        directory={{ expanded: !(scope === "directory" && closed) }}
      />
    );
    const { get, render } = await mount(example(false));
    get('[aria-label="Platform"]').focus();
    await render(example(true));
    expect(document.activeElement).toBe(
      get(scope === "rail" ? '[data-slot="sidebar-trigger"]' : '[aria-label="Projects"]'),
    );
  },
);

test("independent sidebar roots keep their collapse and directory state scoped", async () => {
  const { container, get } = await mount(
    <>
      <Example />
      <Example />
    </>,
  );
  const roots = container.querySelectorAll('[data-slot="sidebar"]');
  await click(get('[data-slot="sidebar-trigger"]'));
  expect(roots[0]?.hasAttribute("data-collapsed")).toBe(true);
  expect(roots[1]?.hasAttribute("data-collapsed")).toBe(false);
});

test("Space activates a consumer link destination without scrolling the page", async () => {
  let selected = false;
  const { get } = await mount(
    <Sidebar.Root>
      <Sidebar.Toolbar>
        <Sidebar.Trigger />
      </Sidebar.Toolbar>
      <Sidebar.Viewport>
        <Sidebar.Nav label="Main">
          <Sidebar.Item
            label="Issues"
            render={
              <a
                href="#issues"
                onClick={(event) => {
                  event.preventDefault();
                  selected = true;
                }}
              />
            }
          />
        </Sidebar.Nav>
        <Sidebar.Content />
      </Sidebar.Viewport>
    </Sidebar.Root>,
  );
  get('[aria-label="Issues"]').focus();
  await key(" ");
  expect(selected).toBe(true);
  expect(get('[aria-label="Issues"]').tagName).toBe("A");
});
