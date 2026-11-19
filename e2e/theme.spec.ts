import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function palette(page: Page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    return {
      background: body.backgroundColor,
      foreground: body.color,
      scheme: root.colorScheme,
      codeString: root.getPropertyValue("--dd-code-token-string"),
      frameShadow: root.getPropertyValue("--dd-docs-frame-shadow"),
      hintSurface: root.getPropertyValue("--dd-docs-hint-surface"),
      previewSurface: root.getPropertyValue("--dd-color-surface"),
    };
  });
}

test("the docs follow the machine before hydration and live updates, with explicit theme overrides", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("The production docs URL must be configured.");
  const staticContext = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: "dark",
    baseURL,
  });
  try {
    const staticPage = await staticContext.newPage();
    await staticPage.goto("/sidebar");
    await expect(staticPage.locator("body")).toHaveCSS("background-color", "rgb(23, 27, 22)");
    expect((await palette(staticPage)).scheme).toBe("dark");
  } finally {
    await staticContext.close();
  }

  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(
    page.getByRole("group", { name: "Desks", exact: true }).locator('[data-slot="frame-count"]'),
  ).toHaveText("9 rows");
  const theme = page.getByRole("combobox", { name: "Theme", exact: true });
  await expect(theme).toHaveValue("system");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 27, 22)");
  const systemDark = await palette(page);

  await theme.selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 247, 242)");
  const explicitLight = await palette(page);
  await page.emulateMedia({ colorScheme: "light" });
  expect(await palette(page)).toEqual(explicitLight);
  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await palette(page)).toEqual(systemDark);

  await theme.selectOption("system");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  expect(await palette(page)).toEqual(explicitLight);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 27, 22)");
  expect(await palette(page)).toEqual(systemDark);

  await theme.selectOption("light");
  await page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Sidebar", exact: true })
    .click();
  await expect(theme).toHaveValue("light");
  expect(await palette(page)).toEqual(explicitLight);
  await page.reload();
  await expect(theme).toHaveValue("system");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 27, 22)");
  expect(errors).toEqual([]);
});
