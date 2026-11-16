// @vitest-environment happy-dom
import { act, StrictMode } from "react";
import type { MouseEvent, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, onTestFinished, test, vi } from "vitest";
import { createKernel } from "@densedash/core";
import { Densedash, Filter } from "../index.js";
import type { DensedashEvent } from "../index.js";

const items = [
  {
    type: "group",
    id: "work",
    label: "Workflow",
    items: [
      {
        type: "field",
        id: "stage",
        label: "Stage",
        options: [
          { value: "todo", label: "Todo" },
          { value: "blocked", label: "Blocked", disabled: true },
          { value: "progress", label: "In Progress" },
        ],
      },
    ],
  },
] as const satisfies readonly Filter.Item<"stage">[];

async function mount(content: ReactNode) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const kernel = createKernel();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  async function render(next: ReactNode) {
    await act(() =>
      root.render(
        <StrictMode>
          <Densedash.Provider kernel={kernel}>{next}</Densedash.Provider>
        </StrictMode>,
      ),
    );
  }
  onTestFinished(async () => {
    await act(() => root.unmount());
    kernel.dispose();
    container.remove();
    vi.unstubAllGlobals();
  });
  await render(content);
  return { container, render, kernel };
}
function get({ container, selector }: { container: HTMLElement; selector: string }): HTMLElement {
  const element = container.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
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
function Example(props: Partial<Filter.RootProps<"stage">>) {
  return (
    <Filter.Root items={items} {...props}>
      <Filter.Trigger />
      <Filter.Chips />
      <Filter.Popup />
    </Filter.Root>
  );
}
async function enterValues(container: HTMLElement) {
  await click(get({ container, selector: '[data-slot="filter-trigger"]' }));
  for (const value of ["ArrowDown", "ArrowRight", "ArrowDown", "ArrowRight"]) await key(value);
}

test("Space accumulates enabled values across nested popups; Enter applies and restores the opener", async () => {
  const { container } = await mount(<Example />);
  await enterValues(container);
  await key("ArrowDown");
  await key(" ");
  await key("ArrowDown");
  await key(" ");
  expect(container.querySelectorAll('[data-slot="filter-popup"]')).toHaveLength(3);
  const list = get({ container, selector: '[data-slot="filter-popup"][data-depth="2"]' });
  expect(list.querySelectorAll('[aria-selected="true"]')).toHaveLength(2);
  expect(list.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(2);
  expect(get({ container, selector: '[data-slot="filter-chip-value"]' }).textContent).toBe(
    "Todo, In Progress",
  );
  await key("Tab");
  expect(document.activeElement?.getAttribute("role")).toBe("option");
  await key("Tab");
  expect(document.activeElement?.getAttribute("role")).toBe("combobox");
  await key("ArrowUp");
  await key("Enter");
  expect(container.querySelector('[data-slot="filter-popup"]')).toBeNull();
  expect(get({ container, selector: '[data-slot="filter-chip-value"]' }).textContent).toBe(
    "In Progress",
  );
  expect(document.activeElement).toBe(get({ container, selector: '[data-slot="filter-trigger"]' }));
});

test("clicking a native checkbox toggles exactly once and preserves search focus", async () => {
  const changes: (readonly Filter.Value[])[] = [];
  const { container } = await mount(<Example onValueChange={(value) => changes.push(value)} />);
  await enterValues(container);
  const checkbox = get({ container, selector: '[data-depth="2"] input[type="checkbox"]' });
  await click(checkbox);
  expect(changes).toEqual([[{ field: "stage", values: ["todo"], operator: "in" }]]);
  expect((checkbox as HTMLInputElement).checked).toBe(true);
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Search Stage");
  await click(checkbox);
  expect(changes[1]).toEqual([]);
  expect((checkbox as HTMLInputElement).checked).toBe(false);
  expect(container.querySelectorAll('[data-slot="filter-popup"]')).toHaveLength(3);
});

test("controlled selections stay at the consumer value until new props arrive", async () => {
  const requests: (readonly Filter.Value<"stage">[])[] = [];
  const { container, render } = await mount(
    <Example value={[]} onValueChange={(value) => requests.push(value)} />,
  );
  await enterValues(container);
  await key("ArrowDown");
  await key(" ");
  expect(requests).toEqual([[{ field: "stage", values: ["todo"], operator: "in" }]]);
  expect(container.querySelector('[data-slot="filter-chip"]')).toBeNull();
  await render(<Example value={requests[0]!} onValueChange={(value) => requests.push(value)} />);
  expect(get({ container, selector: '[data-slot="filter-chip-value"]' }).textContent).toBe("Todo");
  await key("ArrowDown");
  await key(" ");
  expect(requests[1]).toEqual([{ field: "stage", values: ["todo", "progress"], operator: "in" }]);
});

test("an open popup reflects replaced definitions and option rendering without losing input focus", async () => {
  const updated = [
    {
      type: "field" as const,
      id: "stage",
      label: "Stage",
      options: [{ value: "todo", label: "Ready" }],
    },
  ];
  const example = (fields: readonly Filter.Item[], prefix: string) => (
    <Filter.Root items={fields}>
      <Filter.Trigger />
      <Filter.Popup
        render={(props) => (prefix === "Updated" ? <section {...props} /> : <div {...props} />)}
        renderOption={({ item }) => `${prefix}: ${item.label}`}
      />
    </Filter.Root>
  );
  const { container, render } = await mount(example(items, "First"));
  await enterValues(container);
  await render(example(updated, "First"));
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Search Stage");
  expect(get({ container, selector: '[data-depth="2"] [role="option"]' }).textContent).toBe(
    "First: Ready",
  );
  await render(example(updated, "Updated"));
  expect(get({ container, selector: '[data-depth="2"] [role="option"]' }).textContent).toBe(
    "Updated: Ready",
  );
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Search Stage");
});

test("canceling a change preserves selection and leaves the popup open", async () => {
  const { container } = await mount(<Example onValueChange={(_, details) => details.cancel()} />);
  await enterValues(container);
  await key("ArrowDown");
  await key("Enter");
  expect(container.querySelector('[data-slot="filter-chip"]')).toBeNull();
  expect(container.querySelectorAll('[data-slot="filter-popup"]')).toHaveLength(3);
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Search Stage");
});

test("empty-search Left restores the parent's query and cursor; Escape restores the original trigger", async () => {
  const { container } = await mount(<Example />);
  await click(get({ container, selector: '[data-slot="filter-trigger"]' }));
  const input = document.activeElement as HTMLInputElement;
  await act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, "Stage");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await key("Enter");
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Search Stage");
  await key("ArrowLeft");
  expect((document.activeElement as HTMLInputElement).value).toBe("Stage");
  expect(container.querySelectorAll('[data-slot="filter-popup"]')).toHaveLength(1);
  await key("Escape");
  expect(document.activeElement).toBe(get({ container, selector: '[data-slot="filter-trigger"]' }));
});

test("separate roots keep their configuration and values independent, and release exclusivity on unmount", async () => {
  const other = [
    { type: "field", id: "kind", label: "Kind", options: [{ value: "note", label: "Note" }] },
  ] as const;
  const { container, render, kernel } = await mount(
    <>
      <Example defaultValue={[{ field: "stage", values: ["todo"], operator: "in" }]} />
      <Filter.Root items={other}>
        <Filter.Trigger>Filter notes</Filter.Trigger>
        <Filter.Chips />
        <Filter.Popup />
      </Filter.Root>
    </>,
  );
  const triggers = container.querySelectorAll<HTMLElement>('[data-slot="filter-trigger"]');
  await click(triggers[0]!);
  await click(triggers[1]!);
  expect(triggers[0]!.getAttribute("aria-expanded")).toBe("false");
  await key("ArrowDown");
  await key("ArrowRight");
  await key("ArrowDown");
  await key(" ");
  expect(
    [...container.querySelectorAll('[data-slot="filter-chip-value"]')].map(
      (node) => node.textContent,
    ),
  ).toEqual(["Todo", "Note"]);
  expect(kernel.commands.keymap.get()).toEqual([]);
  await render(<button>Outside</button>);
  let count = 0;
  const release = kernel.commands.register("after-filter", [
    {
      id: "next",
      label: "Next",
      run: () => {
        count++;
      },
    },
  ]);
  get({ container, selector: "button" }).focus();
  await key("ArrowDown");
  expect(count).toBe(1);
  release();
});

test("render props merge refs and consumer handlers can suppress the trigger action", async () => {
  const ref = { current: null as HTMLButtonElement | null };
  const { container } = await mount(
    <Filter.Root items={items}>
      <Filter.Trigger
        ref={ref}
        render={(props, state) => <button {...props} data-open={String(state.open)} />}
        onClick={(event: DensedashEvent<MouseEvent<HTMLButtonElement>>) => {
          event.preventDensedashHandler();
        }}
      />
      <Filter.Popup />
    </Filter.Root>,
  );
  expect(ref.current).toBe(get({ container, selector: "button" }));
  await click(ref.current!);
  expect(container.querySelector('[data-slot="filter-popup"]')).toBeNull();
});

test("an opted-in opener shortcut respects a disabled trigger", async () => {
  const { container } = await mount(
    <Filter.Root
      items={items}
      keys={{ label: "Disabled filters", preset: { "filter.open": ["F"] } }}
    >
      <Filter.Trigger disabled />
      <Filter.Popup />
      <button>Outside</button>
    </Filter.Root>,
  );
  // Happy DOM has no layout engine; model the browser's rendered-box boundary.
  const trigger = get({ container, selector: '[data-slot="filter-trigger"]' });
  const rect = new DOMRect(0, 0, 100, 30);
  const layout = vi
    .spyOn(trigger, "getClientRects")
    .mockReturnValue(
      Object.assign([rect], { item: (index: number) => (index === 0 ? rect : null) }),
    );
  onTestFinished(() => layout.mockRestore());
  get({ container, selector: "button:not(:disabled)" }).focus();
  await key("f");
  expect(container.querySelector('[data-slot="filter-popup"]')).toBeNull();
});
