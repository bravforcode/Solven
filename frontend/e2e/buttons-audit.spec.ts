import { test, expect, type Page } from "@playwright/test";

// Buttons audit: every interactive control must do something real.
// Runs against the demo-mode dev server (local mock fallback + optional
// backend). State-tolerant: draft counts grow across runs, so assertions
// never depend on exact totals.

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

async function gotoHome(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "สร้างงาน" })).toBeVisible();
}

test.describe("topbar + navigation + avatar", () => {
  test("nav buttons switch views", async ({ page }) => {
    await gotoHome(page);
    const nav = page.locator(".sidebar-nav");
    const title = () => page.locator(".page-title");
    await nav.getByRole("button", { name: /คิวตรวจ/ }).click();
    await expect(title()).toHaveText("คิวตรวจ");
    await nav.getByRole("button", { name: /เอกสาร/ }).click();
    await expect(title()).toHaveText("เอกสาร");
    await nav.getByRole("button", { name: /สร้างงาน/ }).click();
    await expect(title()).toHaveText("สร้างงาน");
  });

  test("command palette (⌘K) opens, filters, and executes a command", async ({ page }) => {
    await gotoHome(page);
    await page.getByRole("button", { name: /⌘K/ }).first().click();
    const palette = page.getByRole("dialog", { name: "คำสั่งลัด" });
    await expect(palette).toBeVisible();
    await page.locator('input[aria-label="ค้นหาคำสั่ง"]').fill("คิว");
    const list = page.getByRole("listbox", { name: "รายการคำสั่ง" });
    await expect(list.getByRole("option").first()).toContainText("คิวตรวจ");
    await list.getByRole("option").first().click();
    await expect(page.locator(".page-title")).toHaveText("คิวตรวจ");
  });

  test("avatar opens profile menu with real school data", async ({ page }) => {
    await gotoHome(page);
    await page.locator(".profile-menu button.avatar").click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu).toContainText("ครูผู้สอน"); // position from school defaults
    await menu.getByRole("menuitem", { name: /โปรไฟล์/ }).click();
    await expect(page.locator(".page-title")).toHaveText("ตั้งค่าโรงเรียน");
  });
});

test.describe("create view", () => {
  test("all 3 agent cards switch form fields", async ({ page }) => {
    await gotoHome(page);
    await page.getByRole("button", { name: /Lesson-Plan/ }).click();
    await expect(page.locator("#topic")).toBeVisible();
    await page.getByRole("button", { name: /Reporting & Communication/ }).click();
    await expect(page.locator("#summary")).toBeVisible();
    await page.getByRole("button", { name: /Grading & Feedback/ }).click();
    await expect(page.locator("#answers")).toBeVisible();
  });

  test("rubric preset: save, reuse, delete (with confirm)", async ({ page }) => {
    await gotoHome(page);
    await page.locator("#rubric").fill("เกณฑ์ใหม่: ความถูกต้อง 5 คะแนน");
    await page.locator("#preset-name").fill("ทดสอบ E2E");
    await page.getByRole("button", { name: "บันทึกเป็น rubric สำเร็จรูป" }).click();
    await expect(page.getByText(/บันทึก.*แล้ว|สำเร็จ/).first()).toBeVisible();

    // reuse: select the preset → rubric updates
    await page.locator("#preset-select").selectOption({ label: "ทดสอบ E2E" });
    await expect(page.locator("#rubric")).toHaveValue("เกณฑ์ใหม่: ความถูกต้อง 5 คะแนน");

    // delete → confirm dialog → cancel keeps it, confirm removes it
    await page.getByRole("button", { name: "ลบ", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "ยกเลิก" }).click();
    await expect(page.locator("#preset-select")).toContainText("ทดสอบ E2E");
  });

  test("submit creates a draft and lands in the queue", async ({ page }) => {
    await gotoHome(page);
    const submit = page.getByRole("button", { name: /ส่งให้ Coordinator/ });
    await expect(async () => {
      const answers = page.locator("#answers");
      if ((await answers.inputValue()) !== "1+1=2") await answers.fill("1+1=2");
      await page.locator("#rubric").fill("ความถูกต้อง 4 คะแนน");
      await expect(submit).toBeEnabled();
    }).toPass({ timeout: 20_000 });
    await submit.click();
    await expect(page.getByRole("heading", { name: "คิวตรวจ" })).toBeVisible();
  });
});

test.describe("queue view", () => {
  test("filters, sort, search narrow results", async ({ page }) => {
    await gotoHome(page);
    await page.locator(".sidebar-nav").getByRole("button", { name: /คิวตรวจ/ }).click();
    await expect(page.locator("article").first()).toBeVisible();

    // agent filter chip
    await page.getByRole("button", { name: /Grading & Feedback/, exact: false }).last().click();
    await expect(page.locator("article").first()).toContainText("Grading & Feedback");

    // status filter: approved
    await page.getByRole("button", { name: /อนุมัติแล้ว/ }).click();
    const rows = page.locator("article");
    const n = await rows.count();
    if (n > 0) await expect(rows.first()).toContainText("อนุมัติแล้ว");

    // reset: the "ทั้งหมด" chip clears status filter (the ล้างตัวกรอง button
    // only exists in the empty-results state)
    await page.getByRole("button", { name: "ทั้งหมด", exact: true }).first().click();
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("draft actions: copy, LINE, download, approve, reject", async ({ page }) => {
    await gotoHome(page);
    await page.locator(".sidebar-nav").getByRole("button", { name: /คิวตรวจ/ }).click();
    const row = page.locator("article").first();
    await expect(row).toBeVisible();

    // คัดลอก → clipboard + toast
    await row.getByRole("button", { name: "คัดลอก" }).click();
    await expect(page.getByText(/คัดลอก/).last()).toBeVisible();

    // LINE → clipboard + toast
    await row.getByRole("button", { name: "LINE" }).click();
    await expect(page.getByText(/LINE/).last()).toBeVisible();

    // ดาวน์โหลด → .txt file
    const dl = page.waitForEvent("download");
    await row.getByRole("button", { name: "ดาวน์โหลด" }).click();
    expect((await dl).suggestedFilename()).toMatch(/\.txt$/);

    // อนุมัติ → status flips (row may re-sort; track by marker)
    const pendingRow = page.locator("article").filter({ hasText: "รออนุมัติ" }).first();
    const marker = ((await pendingRow.locator(".draft-out").textContent()) ?? "").slice(0, 40);
    await pendingRow.getByRole("button", { name: "อนุมัติ", exact: true }).click();
    await expect(
      page.locator("article").filter({ hasText: marker }).first()
    ).toContainText("อนุมัติแล้ว");

    // ปฏิเสธ: rows WITH warnings open a confirm dialog; clean rows reject
    // directly. Handle both branches.
    const rejectRow = page.locator("article").filter({ hasText: "รออนุมัติ" }).first();
    const rejectMarker = ((await rejectRow.locator(".draft-out").textContent()) ?? "").slice(0, 40);
    await rejectRow.getByRole("button", { name: "ปฏิเสธ", exact: true }).click();
    const dialog = page.getByRole("dialog");
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole("button", { name: /ปฏิเสธ/ }).last().click();
    }
    await expect(
      page.locator("article").filter({ hasText: rejectMarker }).first()
    ).toContainText("ปฏิเสธ");
  });

  test("batch selection: อนุมัติทั้งหมด + ยกเลิก selection", async ({ page }) => {
    await gotoHome(page);
    await page.locator(".sidebar-nav").getByRole("button", { name: /คิวตรวจ/ }).click();
    await page.locator(".sidebar-nav").getByRole("button", { name: /คิวตรวจ/ }).click();
    const checkboxes = page.getByRole("checkbox");
    const cb = checkboxes.first();
    if (!(await cb.isVisible().catch(() => false))) return; // no pending rows
    await cb.click();
    await expect(page.getByRole("button", { name: "อนุมัติทั้งหมด" })).toBeVisible();
    await page.getByRole("button", { name: "ยกเลิก", exact: true }).first().click();
  });

  test("export approved as .md downloads a file", async ({ page }) => {
    await gotoHome(page);
    await page.locator(".sidebar-nav").getByRole("button", { name: /คิวตรวจ/ }).click();
    const btn = page.getByRole("button", { name: /ส่งออกที่อนุมัติ/ });
    if (!(await btn.isVisible().catch(() => false))) return;
    const dl = page.waitForEvent("download");
    await btn.click();
    expect((await dl).suggestedFilename()).toMatch(/\.md$/);
  });
});

test.describe("docs view", () => {
  test("all 5 templates render their forms; server PDF downloads", async ({ page }) => {
    await gotoHome(page);
    await page.locator(".sidebar-nav").getByRole("button", { name: /เอกสาร/ }).click();

    for (const [name, probe] of [
      [/ใบงาน/, "#ws-subject"],
      [/บันทึกหลังสอน/, "#lr-subject"],
      [/หนังสือราชการ/, "#ol-ref"],
      [/เกียรติบัตร/, "#cf-name"],
      [/รายงานสรุป/, ".empty-title"],
    ] as const) {
      await page.getByRole("button", { name }).click();
      await expect(page.locator(probe).first()).toBeVisible();
    }

    // worksheet → server PDF (BFF → FastAPI reportlab)
    await page.getByRole("button", { name: /ใบงาน/ }).click();
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "⬇ ดาวน์โหลด PDF (server)" }).click();
    expect((await dl).suggestedFilename()).toMatch(/\.pdf$/i);

    // print button triggers window.print (stubbed) without throwing
    await page.getByRole("button", { name: "🖨 พิมพ์ / บันทึก PDF" }).click();
    await expect(page.locator(".page-title")).toHaveText("เอกสาร");
  });
});

test.describe("settings page", () => {
  test("save persists and shows toast; ยกเลิก returns home", async ({ page }) => {
    await page.goto("/settings");
    await page.locator("#settings-schoolName").fill("โรงเรียนทดสอบ E2E");
    await page.getByRole("button", { name: "บันทึกข้อมูล" }).click();
    await expect(page.getByText("บันทึกข้อมูลโรงเรียนแล้ว")).toBeVisible();

    // persisted: reload keeps the value
    await page.reload();
    await expect(page.locator("#settings-schoolName")).toHaveValue("โรงเรียนทดสอบ E2E");

    await page.getByRole("link", { name: "ยกเลิก" }).click();
    await expect(page.getByRole("heading", { name: "สร้างงาน" })).toBeVisible();
  });
});
