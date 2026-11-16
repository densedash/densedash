import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function expectInViewport(option: Locator) {
  // Observe the browser's intersection update after virtual scroll reconciliation.
  await expect(option).toBeInViewport({ ratio: 1 });
}

test("virtual filter search and nested menus preserve distant keyboard targets, checkboxes and focus", async ({
  page,
}) => {
  await page.goto("/filter");
  const frame = page.getByRole("group", { name: "5,000 searchable projects", exact: true });
  await expect(frame.locator('[data-slot="frame-count"]')).toHaveText("5,000 projects");
  const trigger = frame.getByRole("button", { name: "Filter projects", exact: true });
  await trigger.click();
  const rootSearch = frame.getByRole("combobox", { name: "Search Add filter", exact: true });
  await rootSearch.fill("Project");
  const options = frame.getByRole("option");
  await expect(options.first()).toHaveAttribute("aria-setsize", "5000");
  expect(await options.count()).toBeLessThan(80);
  await rootSearch.press("ArrowUp");
  const last = frame.locator('[data-slot="filter-option"][data-highlighted]');
  await expect(last).toContainText("Project 04999");
  await expect(last).toHaveAttribute("aria-posinset", "5000");
  await expectInViewport(last);
  await rootSearch.press("Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(last).toContainText("Project 04997");
  await expect(last).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(rootSearch).toBeFocused();
  await rootSearch.press("Enter");
  await expect(trigger).toBeFocused();
  await expect(frame.locator('[data-slot="filter-popup"]')).toHaveCount(0);

  const edit = frame.getByRole("button", { name: "Edit Repository: Project 04997", exact: true });
  await edit.click();
  const values = frame.getByRole("combobox", { name: "Search Repository", exact: true });
  await values.press("End");
  await expect(last).toContainText("Project 04999");
  await expectInViewport(last);
  await values.press("Space");
  await expect(last.locator('input[type="checkbox"]')).toBeChecked();
  await values.press("Home");
  await values.press("Space");
  await expect(last).toContainText("Project 00000");
  await expect(last.locator('input[type="checkbox"]')).toBeChecked();
  await values.press("Tab");
  await page.keyboard.press("End");
  await expect(last).toContainText("Project 04999");
  await expect(last).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await values.fill("No matching project");
  await expect(frame.getByText("No matching options", { exact: true })).toBeVisible();
  await values.fill("Project");
  await expect(last).toContainText("Project 00000");
  await expectInViewport(last);
  await expect(values).toBeFocused();
  await values.press("Escape");
  await expect(frame.getByRole("button", { name: /^Edit Repository:/ })).toBeFocused();
  await frame.getByRole("button", { name: "Clear filters", exact: true }).click();

  await trigger.click();
  await rootSearch.press("End");
  const parent = frame.getByRole("option", { name: "Team 127", exact: true });
  await expect(parent).toHaveAttribute("data-highlighted", "true");
  await rootSearch.press("ArrowRight");
  const team = frame.getByRole("combobox", { name: "Search Team 127", exact: true });
  await team.press("ArrowDown");
  await team.press("ArrowRight");
  const owner = frame.getByRole("combobox", { name: "Search Owner", exact: true });
  await expect(owner).toBeFocused();
  await expect(frame.locator('[data-slot="filter-popup"]:popover-open')).toHaveCount(3);
  const parentList = frame.getByRole("listbox", { name: "Add filter", exact: true });
  await parentList.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(parentList.getByRole("option", { name: "Workspace", exact: true })).toBeVisible();
  await expect(parent).toHaveCount(1);
  expect(await parentList.getByRole("option").count()).toBeLessThan(80);
  await expect(owner).toBeFocused();
  await owner.press("ArrowLeft");
  await expect(team).toBeFocused();
  await team.press("ArrowLeft");
  await expect(rootSearch).toBeFocused();
  await expectInViewport(parent);
  await rootSearch.press("Escape");
  await expect(trigger).toBeFocused();
});
