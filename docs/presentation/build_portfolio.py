"""Build the Solven team Portfolio/Evidence PDF (JUMP THAILAND 2026, form item 7).

Usage: python build_portfolio.py  ->  writes Solven-Portfolio.pdf to the user's Downloads folder.
Fonts: docs/presentation/fonts/Sarabun-*.ttf (OFL license) — same set used by build_deck.py.
"""

import io
import os
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas as pdfcanvas

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
DOWNLOADS = os.path.join(os.path.expanduser("~"), "Downloads")
OUT = os.path.join(DOWNLOADS, "Solven-Portfolio.pdf")

PAGE_W, PAGE_H = 595, 842  # A4 portrait
MARGIN = 48
CONTENT_W = PAGE_W - 2 * MARGIN
BOTTOM = 56  # reserve for footer

GREEN = HexColor("#0F6F5C")
GREEN_DARK = HexColor("#0A5748")
GREEN_SOFT = HexColor("#E2F2EE")
INK = HexColor("#16202B")
MUTED = HexColor("#5C6B7A")
WHITE = HexColor("#FFFFFF")
LINE = HexColor("#DDE3E8")

pdfmetrics.registerFont(TTFont("Sarabun", os.path.join(FONTS, "Sarabun-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Med", os.path.join(FONTS, "Sarabun-Medium.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Semi", os.path.join(FONTS, "Sarabun-SemiBold.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Bold", os.path.join(FONTS, "Sarabun-Bold.ttf")))

BODY = ParagraphStyle("body", fontName="Sarabun", fontSize=12, leading=18.5,
                      textColor=INK, wordWrap="CJK")
MUTED_P = ParagraphStyle("muted", parent=BODY, fontSize=10.5, leading=15.5, textColor=MUTED)

STRENGTHS = [
    "<b>AI agent orchestration ระดับ production คืองานที่ทำอยู่แล้ว</b> — มีประสบการณ์ตรงในการออกแบบ/สร้างระบบ multi-agent "
    "สำหรับงานอัตโนมัติระดับองค์กรมาก่อน (enterprise-agent-os, adminmate-ai) ด้วย pattern สถาปัตยกรรมเดียวกับที่ใช้ใน Solven "
    "(coordinator + sub-agents + guardrail + audit log)",
    "<b>Full-stack ครบวงจรคนเดียว</b> — Next.js/TypeScript (frontend), Python/FastAPI + LangGraph (backend), PostgreSQL, "
    "deploy จริงบน Vercel — prototype รันได้จริงตั้งแต่ต้น ไม่ใช่ mockup นิ่ง",
    "<b>พื้นหลัง Data/Systems/AI ด้านสุขภาพ</b> — เข้าใจข้อจำกัดจริงของการเอา AI ไปวางในระบบที่มีข้อมูลอ่อนไหวและกำกับด้วยกฎหมาย "
    "(data sovereignty, PDPA, human-in-the-loop) ซึ่งเป็นข้อจำกัดเดียวกับที่ Solven ต้องรับมือในระบบการศึกษาไทย",
    "<b>ลงพื้นที่คุยกับครูจริงก่อนออกแบบ</b> — พูดคุยกับครูโรงเรียนขนาดเล็ก 2 แห่งในจังหวัดแพร่ด้วยตัวเอง ไม่ได้ออกแบบจากสมมติฐานลอย ๆ",
]

NOTE = ("หมายเหตุความซื่อสัตย์: prototype ปัจจุบันมี mock agents จริงสำหรับสาธิต flow, backend หลักกำลังพัฒนาต่อเนื่อง — "
        "ไม่มีข้อมูลครู/นักเรียนจริงในระบบ (PDPA) และไม่มีการอ้างสถิติ/ความสามารถเกินสิ่งที่ตรวจสอบได้จริงในโค้ด")


def measure(style, text, w):
    para = Paragraph(text, style)
    _, h = para.wrap(w, 2000)
    return para, h


def render(dest, total_pages):
    c = pdfcanvas.Canvas(dest, pagesize=(PAGE_W, PAGE_H))
    c.setTitle("Solven — Team Portfolio & Evidence")
    c.setAuthor("Phirawit Jitnarong (bravforcode)")
    page_num = [1]

    def footer():
        c.setFillColor(MUTED)
        c.setFont("Sarabun", 9)
        c.drawString(MARGIN, 26, "Solven · JUMP THAILAND Hackathon 2026 · ข้อ 7 — Portfolio/หลักฐานความสามารถของทีม")
        c.drawRightString(PAGE_W - MARGIN, 26, f"{page_num[0]} / {total_pages}")

    def new_page():
        footer()
        c.showPage()
        page_num[0] += 1

    def ensure_space(y, needed):
        if y - needed < BOTTOM:
            new_page()
            return PAGE_H - MARGIN
        return y

    def section_label(y, text):
        y = ensure_space(y, 26)
        c.setFillColor(GREEN)
        c.setFont("Sarabun-Semi", 13)
        c.drawString(MARGIN, y, text)
        return y - 24

    def link_row(y, label, url, desc):
        h = 62
        y = ensure_space(y, h + 12)
        top = y
        c.setFillColor(WHITE)
        c.setStrokeColor(LINE)
        c.setLineWidth(1)
        c.roundRect(MARGIN, top - h, CONTENT_W, h, 8, stroke=1, fill=1)
        c.setFillColor(GREEN_DARK)
        c.setFont("Sarabun-Semi", 13)
        c.drawString(MARGIN + 16, top - 22, label)
        c.setFillColor(GREEN)
        c.setFont("Sarabun-Med", 11.5)
        c.drawString(MARGIN + 16, top - 38, url)
        c.setFillColor(MUTED)
        c.setFont("Sarabun", 10.5)
        c.drawString(MARGIN + 16, top - h + 12, desc)
        c.linkURL(url, (MARGIN, top - h, MARGIN + CONTENT_W, top), relative=0, thickness=0)
        return top - h - 12

    def bullet(y, text):
        para, h = measure(BODY, text, CONTENT_W - 20)
        y = ensure_space(y, h + 14)
        c.setFillColor(GREEN)
        c.circle(MARGIN + 4, y - 7, 2.4, stroke=0, fill=1)
        para.drawOn(c, MARGIN + 18, y - h)
        return y - h - 14

    def note_box(y, text):
        para, h = measure(MUTED_P, text, CONTENT_W - 32)
        box_h = h + 24
        y = ensure_space(y, box_h)
        c.setFillColor(GREEN_SOFT)
        c.roundRect(MARGIN, y - box_h, CONTENT_W, box_h, 8, stroke=0, fill=1)
        para.drawOn(c, MARGIN + 16, y - box_h + 12)
        return y - box_h

    # ---- header band
    c.setFillColor(GREEN_DARK)
    c.rect(0, PAGE_H - 118, PAGE_W, 118, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Sarabun-Bold", 21)
    c.drawString(MARGIN, PAGE_H - 52, "Solven — Portfolio & หลักฐานความสามารถของทีม")
    c.setFillColor(HexColor("#CFEAE2"))
    c.setFont("Sarabun-Med", 12.5)
    c.drawString(MARGIN, PAGE_H - 76, "JUMP THAILAND Hackathon 2026 · AIS · ข้อ 7 — Portfolio ของทีม")
    c.setFillColor(HexColor("#A9D6C9"))
    c.setFont("Sarabun", 11)
    c.drawString(MARGIN, PAGE_H - 96, "Phirawit Jitnarong (bravforcode) — ทีมคนเดียว (Solo)")

    y = PAGE_H - 148

    y = section_label(y, "ทดลองใช้งานจริง — Live Demo")
    y = link_row(y, "Solven — Web App (PWA)", "https://solven.vercel.app",
                 "prototype ที่รันได้จริง — ไม่ใช่ mockup นิ่ง เข้าใช้งานได้ทันทีผ่านเบราว์เซอร์")
    y = link_row(y, "About / Architecture & Evidence", "https://solven.vercel.app/about",
                 "ตารางหลักฐาน สถาปัตยกรรม และสถานะการพัฒนาแบบเปิดเผย (ตรวจสอบได้)")
    y -= 16

    y = section_label(y, "โค้ดจริง ตรวจสอบได้ — GitHub")
    y = link_row(y, "github.com/bravforcode/Solven — โปรเจกต์หลัก",
                 "https://github.com/bravforcode/Solven",
                 "Next.js UI · Python/FastAPI + LangGraph backend · 3 README · 12 automated tests ผ่าน · audit log ครบ")
    y = link_row(y, "github.com/bravforcode/enterprise-agent-os — Prior art",
                 "https://github.com/bravforcode/enterprise-agent-os",
                 "ระบบ multi-agent orchestration ระดับ production ที่สร้างมาก่อน Solven ด้วยสถาปัตยกรรมเดียวกัน")
    y = link_row(y, "github.com/bravforcode/adminmate-ai — Prior art",
                 "https://github.com/bravforcode/adminmate-ai",
                 "ระบบ AI agent สำหรับงานอัตโนมัติระดับองค์กร อีกหนึ่งตัวอย่างประสบการณ์ตรงด้าน agent orchestration")
    y -= 16

    y = section_label(y, "จุดแข็งของทีม")
    for s in STRENGTHS:
        y = bullet(y, s)

    y -= 8
    y = note_box(y, NOTE)

    footer()
    c.showPage()
    c.save()
    return page_num[0]


# pass 1: dry run into an in-memory buffer to learn the real page count
dry_buf = io.BytesIO()
actual_pages = render(dry_buf, total_pages=1)

# pass 2: real render with the correct "x / N" footer
render(OUT, total_pages=actual_pages)

print(f"OK: {OUT} ({actual_pages} pages)")
