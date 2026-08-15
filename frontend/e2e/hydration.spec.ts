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

test("reload with active service worker has no hydration errors", async ({ page }) => {
  // SW registers only in production builds (ServiceWorkerRegister gates on
  // NODE_ENV) — against the dev server there is no SW, which is also the
  // expected dev behavior. This test guards the PROD path in CI (built app).
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto("/");
  await page.waitForTimeout(1500);
  const swState = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    return reg ? { scope: reg.scope, active: reg.active?.state ?? null } : null;
  });
  if (swState) {
    // SW active → second load goes through it (network-first static)
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(1200);
  }
  await expect(page.locator(".content").first()).toBeVisible();
  expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
});
