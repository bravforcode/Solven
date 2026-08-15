import { test, expect } from "@playwright/test";

// Smoke E2E — demo mode, no backend, no Clerk: the deterministic local mock
// path drives the full teacher workflow (create → review → approve → docs).

test.describe("teacher workflow (demo mode)", () => {
  test("home loads with Thai-first shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "สร้างงาน" })).toBeVisible();
    await expect(page.getByText("ทุกผลลัพธ์เป็นร่าง")).toBeVisible();
  });

  test("create a grading draft and approve it in the queue", async ({ page }) => {
    await page.goto("/");

    // create view (default): grading agent is preselected
    const submit = page.getByRole("button", { name: /ส่งให้ Coordinator/ });
    // Dev-mode hydration race guard: if React hydrates AFTER the fill, the
    // controlled value is wiped — re-fill until the value sticks and the
    // submit button enables.
    await expect(async () => {
      const answers = page.locator("#answers");
      if ((await answers.inputValue()) !== "2+2=4 เพราะนับนิ้วรวมกันได้ 4") {
        await answers.fill("2+2=4 เพราะนับนิ้วรวมกันได้ 4");
      }
      const rubric = page.locator("#rubric");
      if ((await rubric.inputValue()) !== "ความถูกต้อง 4 คะแนน, การแสดงวิธีทำ 4 คะแนน") {
        await rubric.fill("ความถูกต้อง 4 คะแนน, การแสดงวิธีทำ 4 คะแนน");
      }
      await expect(submit).toBeEnabled();
    }).toPass({ timeout: 20_000 });
    await submit.click();

    // success toast + auto-navigation to the review queue
    await expect(page.getByText(/สร้างร่างแล้ว|ไปตรวจที่คิว/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "คิวตรวจ" })).toBeVisible();

    // at least one pending draft with a review action exists
    const pendingRow = page.locator("article").filter({ hasText: "รออนุมัติ" }).first();
    await expect(pendingRow).toBeVisible();

    // teacher approves → the row flips (human-in-the-loop checkpoint).
    // After approval the row leaves the "รออนุมัติ" filter set (re-sorted),
    // so track it by a unique output snippet instead of the status text.
    const marker = ((await pendingRow.locator(".draft-out").textContent()) ?? "").slice(0, 40);
    await pendingRow.getByRole("button", { name: "อนุมัติ", exact: true }).click();
    await expect(page.getByText(/อนุมัติแล้ว/).first()).toBeVisible();
    await expect(
      page.locator("article").filter({ hasText: marker }).first()
    ).toContainText("อนุมัติแล้ว");
  });

  test("document studio shows all 5 templates", async ({ page }) => {
    await page.goto("/");
    await page.locator(".sidebar-nav").getByRole("button", { name: "เอกสาร" }).click();

    for (const label of [
      /ใบงาน/,
      /บันทึกหลังสอน/,
      /หนังสือราชการ/,
      /เกียรติบัตร/,
      /รายงานสรุป/,
    ]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }

    // worksheet template renders its form + export action
    await page.getByRole("button", { name: /ใบงาน/ }).click();
    await expect(page.locator("#ws-subject")).toBeVisible();
    await expect(page.getByRole("button", { name: "🖨 พิมพ์ / บันทึก PDF" })).toBeVisible();
  });

  test("settings page loads and persists school info", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "ตั้งค่า" })).toBeVisible();
    const input = page.locator('input[placeholder*="โรงเรียน"]').first();
    if (await input.isVisible()) {
      await input.fill("โรงเรียนบ้านสวนฝั่งสุข");
      await expect(input).toHaveValue("โรงเรียนบ้านสวนฝั่งสุข");
    }
  });
});
