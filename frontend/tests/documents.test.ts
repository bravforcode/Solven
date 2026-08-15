import { describe, expect, it } from "vitest";
import {
  esc,
  nl2p,
  buildWorksheetHtml,
  buildSummaryReportHtml,
  buildCertificateHtml,
  type WorksheetFields,
} from "@/lib/documents";
import { SCHOOL_DEFAULTS, type SchoolInfo } from "@/lib/school";
import type { Draft } from "@/lib/types";

const s: SchoolInfo = SCHOOL_DEFAULTS;

const ws: WorksheetFields = {
  number: "3",
  subject: "คณิตศาสตร์",
  grade: "ป.5",
  date: "15 ส.ค. 2569",
  instructions: "จงตอบคำถาม",
  body: "1) 1/2 + 1/2 = ?\n2) 3/5 + 1/5 = ?",
};

describe("esc (XSS guard — teacher data never raw-injected)", () => {
  it("escapes all HTML-sensitive chars", () => {
    expect(esc(`<b>"x" & 'y'</b>`)).toBe(
      "&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;"
    );
  });

  it("is null-safe (localStorage tampering must not crash)", () => {
    expect(esc(undefined as unknown as string)).toBe("");
  });
});

describe("nl2p", () => {
  it("splits on blank lines into paragraphs", () => {
    const html = nl2p("บรรทัดหนึ่ง\n\nบรรทัดสอง");
    expect(html).toBe('<p class="doc-p">บรรทัดหนึ่ง</p><p class="doc-p">บรรทัดสอง</p>');
  });

  it("single newline becomes <br/> inside a paragraph", () => {
    expect(nl2p("ก\nข")).toBe('<p class="doc-p">ก<br/>ข</p>');
  });

  it("empty/whitespace → empty string", () => {
    expect(nl2p("")).toBe("");
    expect(nl2p("\n\n  \n")).toBe("");
  });
});

describe("document builders", () => {
  it("worksheet includes school header, fields, and answer lines", () => {
    const html = buildWorksheetHtml(s, ws);
    expect(html).toContain(s.schoolName);
    expect(html).toContain("ใบงานที่ 3");
    expect(html).toContain("วิชา คณิตศาสตร์");
    expect(html).toContain("doc-lines"); // answer lines for handwriting
  });

  it("worksheet escapes injected field values", () => {
    const html = buildWorksheetHtml(s, { ...ws, subject: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("summary report counts approved drafts and labels agents", () => {
    const drafts: Draft[] = [
      { id: "a", agent: "grading", input: "i", output: "o", status: "approved", warnings: [], createdAt: "2026-08-15T00:00:00Z" },
      { id: "b", agent: "lesson-plan", input: "i", output: "o", status: "approved", warnings: [], createdAt: "2026-08-14T00:00:00Z" },
    ];
    const html = buildSummaryReportHtml(s, drafts);
    expect(html).toContain("2 รายการ");
    // agent labels pass through esc() — & becomes &amp;
    expect(html).toContain("Grading &amp; Feedback");
    expect(html).toContain("Lesson-Plan");
  });

  it("certificate is landscape (cross-browser print rule)", () => {
    const html = buildCertificateHtml(s, {
      studentName: "เด็กชายตัวอย่าง",
      detail: "รางวัลชนะเลิศ",
      directorName: s.directorName,
      date: "15 ส.ค. 2569",
    });
    expect(html).toContain("doc-landscape");
    expect(html).toContain("เกียรติบัตร");
    expect(html).toContain("เด็กชายตัวอย่าง");
  });
});
