import { test, expect } from "@playwright/test";

// Hydration regression check: fresh loads of every route must produce ZERO
// console errors (React hydration failures surface as console errors).
const ROUTES = ["/", "/settings", "/about"];

for (const route of ROUTES) {
  test(`no hydration/console errors on ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto(route);
    await page.waitForTimeout(1200); // let hydration + effects settle
    await expect(page.locator(".content, .shell, main").first()).toBeVisible();

    expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  });
}

test("avatar menu reflects saved school profile without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  // save a distinct teacher name first
  await page.goto("/settings");
  await page.locator("#settings-teacherName").fill("ครูสมชาย ทดสอบ");
  await page.getByRole("button", { name: "บันทึกข้อมูล" }).click();
  await expect(page.getByText("บันทึกข้อมูลโรงเรียนแล้ว")).toBeVisible();

  // home avatar menu shows the saved name (post-hydration sync)
  await page.goto("/");
  await page.waitForTimeout(800);
  await page.locator(".profile-menu button.avatar").click();
  await expect(page.getByRole("menu")).toContainText("ครูสมชาย ทดสอบ");
  expect(errors).toEqual([]);
});
