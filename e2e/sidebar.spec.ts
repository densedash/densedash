import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function bounds(element: Locator) {
  return element.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
}

async function finishMotion(root: Locator) {
  await root.evaluate(async (element) => {
    // A layout read materializes transitions; their finished promises signal completion.
    element.getBoundingClientRect();
    await Promise.all(
      element.getAnimations({ subtree: true }).map((animation) => animation.finished),
    );
  });
}

test("sidebar docs run the reusable composition with stationary controls, compact labels, and nested popup focus", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page
      .locator('[data-slot="registry-grid"]')
      .getByRole("link", { name: "Sidebar @densedash/react", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Desks", exact: true }).locator('[data-slot="frame-count"]'),
  ).toHaveText("9 rows");
  await page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Sidebar", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Sidebar", exact: true })).toBeVisible();
  await expect(page.locator('[data-slot="install-command"]')).toContainText(
    'import { Sidebar } from "@densedash/react"',
  );
  await expect(page.locator('[data-slot="install-command"]')).toContainText(
    "@densedash/css/components/sidebar.css",
  );
  await expect(page.getByRole("link", { name: "Inspect registry JSON", exact: false })).toHaveCount(
    0,
  );
  await page.evaluate(() => document.fonts.ready);

  const preview = page.getByRole("region", { name: "sidebar example", exact: true });
  const root = preview.locator('[data-slot="sidebar"]');
  const nav = root.getByRole("navigation", { name: "Workspace navigation" });
  const toggle = root.locator('[data-slot="sidebar-trigger"]');
  const sheet = root.getByRole("region", { name: "Workspace page" });
  await root.scrollIntoViewIfNeeded();
  const baseline = {
    toggle: await bounds(toggle),
    nav: await bounds(nav),
    sheet: await bounds(sheet),
    frame: await bounds(root),
  };
  const topInset = baseline.sheet.y - baseline.frame.y;
  expect(topInset).toBe(8);
  expect(baseline.frame.y + baseline.frame.height - baseline.sheet.y - baseline.sheet.height).toBe(
    topInset,
  );
  await expect(sheet.getByRole("heading", { name: "All issues", exact: true })).toBeVisible();
  await expect(sheet.locator("tbody tr")).toHaveCount(4);
  await toggle.press("Space");
  await expect(root).toHaveAttribute("data-collapsed", "");
  await finishMotion(root);
  expect(await bounds(toggle)).toEqual(baseline.toggle);
  expect(await bounds(nav)).toEqual(baseline.nav);

  const railEdge = (await bounds(sheet)).x;
  const captions = await nav
    .locator('[data-slot="sidebar-section-heading"]')
    .evaluateAll((headings) =>
      headings.map((heading) => {
        const label = heading.querySelector('[data-slot="sidebar-section-label"]')!;
        const range = document.createRange();
        range.selectNodeContents(label);
        const box = range.getBoundingClientRect();
        return {
          text: label.textContent,
          left: box.left,
          right: box.right,
          opacity: getComputedStyle(label).opacity,
          icons: heading.querySelectorAll("svg,img").length,
        };
      }),
    );
  expect(captions.map((caption) => caption.text)).toEqual(["Workspace", "Resources"]);
  for (const caption of captions) {
    const start = caption.left - baseline.frame.x;
    const end = railEdge - caption.right;
    expect(start).toBeGreaterThanOrEqual(8);
    expect(end).toBeGreaterThanOrEqual(8);
    expect(Math.abs(start - end)).toBeLessThanOrEqual(1);
    expect(caption.opacity).toBe("1");
    expect(caption.icons).toBe(0);
  }
  const overview = nav.getByRole("button", { name: "Overview", exact: true });
  await overview.click();
  await expect(overview).toHaveAttribute("aria-current", "page");
  expect((await bounds(overview)).width).toBe(32);
  await expect(sheet.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();

  const projects = nav.getByRole("button", { name: "Projects", exact: true });
  await projects.press("ArrowRight");
  const popup = nav.locator('[data-slot="sidebar-group-content"][data-popup-open]');
  await expect(popup).toBeVisible();
  const platform = nav.getByRole("button", { name: "Platform", exact: true });
  await expect(platform).toBeFocused();
  await platform.press("ArrowRight");
  await nav.getByRole("button", { name: "Issues", exact: true }).press("ArrowRight");
  await expect(nav.getByRole("button", { name: "All issues", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(sheet.getByRole("heading", { name: "Active cycle", exact: true })).toBeVisible();
  await expect(sheet.locator("tbody tr")).toHaveCount(2);
  await expect(popup).toHaveCount(0);
  await expect(projects).toBeFocused();
  await projects.press("Enter");
  await expect(popup).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(projects).toBeFocused();
  await toggle.press("Enter");
  await expect(root).not.toHaveAttribute("data-collapsed");
  await finishMotion(root);
  await expect(nav.getByRole("button", { name: "Issues", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(await bounds(toggle)).toEqual(baseline.toggle);
  expect(await bounds(nav)).toEqual(baseline.nav);

  await preview.getByRole("tab", { name: "Code", exact: true }).click();
  await expect(preview.locator('[data-slot="source-code"]')).toContainText(
    'import { Sidebar } from "@densedash/react"',
  );
  await expect(preview.locator('[data-slot="source-code"]')).toContainText("<Sidebar.Group");
  await expect(preview.locator('[data-slot="source-code"]')).toContainText("<Sidebar.Content");
  await expect(
    page
      .getByRole("table", { name: "CSS variables", exact: true })
      .getByText("--dd-sidebar-rail-width", { exact: true }),
  ).toBeVisible();
  await preview.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(sheet.getByRole("heading", { name: "Active cycle", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
