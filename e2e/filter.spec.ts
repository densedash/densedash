import { expect, test } from "@playwright/test";

test("filter docs render the reusable example, preserve popup focus, and show its runnable source", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Filter", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Filter", exact: true })).toBeVisible();
  await expect(page.getByText(/a registry install is not available yet/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Inspect registry JSON", exact: false })).toHaveCount(
    0,
  );

  const frame = page.locator('[data-variant="filter"]');
  const count = frame.locator('[data-slot="frame-count"]');
  await expect(count).toHaveText("6 of 6 issues");
  const trigger = frame.getByRole("button", { name: "Filter F", exact: true });
  await trigger.click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(frame.getByRole("combobox", { name: "Search Status", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(count).toHaveText("2 of 6 issues");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(count).toHaveText("4 of 6 issues");
  await expect(frame.locator('[data-slot="filter-popup"]:popover-open')).toHaveCount(2);
  await page.keyboard.press("Enter");
  await expect(count).toHaveText("2 of 6 issues");
  await expect(frame.locator('[data-slot="filter-popup"]')).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.keyboard.press("f");
  for (let index = 0; index < 3; index++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(frame.getByRole("combobox", { name: "Search Due date", exact: true })).toBeFocused();
  await expect(frame.locator('[data-slot="filter-popup"]:popover-open')).toHaveCount(3);
  await page.keyboard.press("ArrowLeft");
  await expect(frame.getByRole("combobox", { name: "Search Dates", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();

  await page.getByRole("tab", { name: "Code", exact: true }).click();
  await expect(page.locator('[data-slot="source-code"]')).toContainText("<Filter.Root");
  await expect(page.locator('[data-slot="source-code"]')).toContainText("<Filter.Popup");
  await expect(
    page
      .getByRole("table", { name: "CSS variables", exact: true })
      .getByText("--dd-color-surface", { exact: true }),
  ).toBeVisible();
});

test("the opener shortcut ignores a hidden preview and resumes when the preview is shown", async ({
  page,
}) => {
  await page.goto("/filter");
  const frame = page.locator('[data-variant="filter"]');
  await expect(frame.locator('[data-slot="frame-count"]')).toHaveText("6 of 6 issues");
  await page.getByRole("tab", { name: "Code", exact: true }).click();
  await page.keyboard.press("f");
  await expect(frame.locator('[data-slot="filter-popup"]')).toHaveCount(0);
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await page.keyboard.press("f");
  await expect(
    frame.getByRole("combobox", { name: "Search Add filter", exact: true }),
  ).toBeFocused();
  await expect(frame.locator('[data-slot="filter-popup"]:popover-open')).toHaveCount(1);
});
