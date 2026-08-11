"""Build the Solven pitch deck PDF (JUMP THAILAND 2026, 10 slides).

Usage: python build_deck.py  ->  writes solven_pitch.pdf next to this file.
Fonts: docs/presentation/fonts/Sarabun-*.ttf (OFL license).
"""

import os
from reportlab.lib.pagesizes import landscape
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas as pdfcanvas

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
OUT = os.path.join(HERE, "solven_pitch.pdf")

PAGE_W, PAGE_H = 1280, 720

# palette
GREEN = HexColor("#0F6F5C")
GREEN_DARK = HexColor("#0A5748")
GREEN_DEEP = HexColor("#083D33")
GREEN_SOFT = HexColor("#E2F2EE")
CREAM = HexColor("#F7F5F0")
INK = HexColor("#16202B")
MUTED = HexColor("#5C6B7A")
AMBER = HexColor("#E8A33D")
WHITE = HexColor("#FFFFFF")
LINE = HexColor("#DDE3E8")
RED = HexColor("#C4363A")

# fonts
pdfmetrics.registerFont(TTFont("Sarabun", os.path.join(FONTS, "Sarabun-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Med", os.path.join(FONTS, "Sarabun-Medium.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Semi", os.path.join(FONTS, "Sarabun-SemiBold.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Bold", os.path.join(FONTS, "Sarabun-Bold.ttf")))
pdfmetrics.registerFontFamily(
    "Sarabun", normal="Sarabun", bold="Sarabun-Bold", italic="Sarabun", boldItalic="Sarabun-Bold"
)

BODY = ParagraphStyle("body", fontName="Sarabun", fontSize=20, leading=30,
                      textColor=INK, wordWrap="CJK")
BODY_SM = ParagraphStyle("body_sm", parent=BODY, fontSize=17, leading=26)
MUTED_P = ParagraphStyle("muted", parent=BODY, textColor=MUTED)
WHITE_P = ParagraphStyle("white", parent=BODY, textColor=WHITE)
WHITE_SM = ParagraphStyle("white_sm", parent=WHITE_P, fontSize=17, leading=26)


def p(style, text, x, y, w, h=200):
    para = Paragraph(text, style)
    para.wrap(w, h)
    para.drawOn(c, x, y)
    return para.height


def footer(n, total=10):
    c.setFillColor(MUTED)
    c.setFont("Sarabun", 13)
    c.drawString(48, 28, "Solven · JUMP THAILAND Hackathon 2026 · Empowering Teachers")
    c.drawRightString(PAGE_W - 48, 28, f"{n} / {total}")
    if n < total:
        c.showPage()


def bg(color=CREAM):
    c.setFillColor(color)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)


def heading(text, x=64, y=PAGE_H - 96, size=44, color=INK):
    c.setFillColor(color)
    c.setFont("Sarabun-Bold", size)
    c.drawString(x, y, text)


def kicker(text, x=64, y=PAGE_H - 148):
    c.setFillColor(GREEN)
    c.setFont("Sarabun-Semi", 17)
    c.drawString(x, y, text.upper())


def stat_card(x, y, w, h, number, label, number_size=58, fill=WHITE, num_color=GREEN):
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, 14, stroke=1, fill=1)
    c.setFillColor(num_color)
    c.setFont("Sarabun-Bold", number_size)
    c.drawString(x + 22, y + h - 78, number)
    c.setFillColor(INK)
    c.setFont("Sarabun", 17)
    # label with wrapping
    lbl = Paragraph(label, ParagraphStyle("lbl", fontName="Sarabun", fontSize=17,
                                          leading=24, textColor=INK, wordWrap="CJK"))
    lbl.wrap(w - 44, h - 110)
    lbl.drawOn(c, x + 22, y + 18)


def chip(x, y, text, fill=GREEN_SOFT, color=GREEN_DARK, font="Sarabun-Semi", size=15):
    c.setFillColor(fill)
    c.setStrokeColor(fill)
    w = pdfmetrics.stringWidth(text, font, size) + 34
    c.roundRect(x, y, w, 40, 20, stroke=0, fill=1)
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x + 17, y + 12, text)
    return w


def arrow(x1, y, x2, color=GREEN, width=4):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y, x2 - 16, y)
    # arrowhead as two diagonals
    c.line(x2 - 26, y + 9, x2 - 4, y)
    c.line(x2 - 26, y - 9, x2 - 4, y)


def box(x, y, w, h, title, lines, fill=WHITE, border=GREEN, title_color=GREEN_DARK):
    c.setFillColor(fill)
    c.setStrokeColor(border)
    c.setLineWidth(2)
    c.roundRect(x, y, w, h, 12, stroke=1, fill=1)
    c.setFillColor(title_color)
    c.setFont("Sarabun-Bold", 19)
    c.drawString(x + 18, y + h - 42, title)
    c.setFillColor(INK)
    c.setFont("Sarabun", 15)
    ty = y + h - 72
    for ln in lines:
        c.drawString(x + 18, ty, ln)
        ty -= 24


c = pdfcanvas.Canvas(OUT, pagesize=(PAGE_W, PAGE_H))
c.setTitle("Solven — JUMP THAILAND 2026 Pitch")
c.setAuthor("Team Solven")

# ---------------------------------------------------------------- 1 TITLE
bg(GREEN_DEEP)
c.setFillColor(GREEN)
c.rect(0, PAGE_H - 10, PAGE_W, 10, stroke=0, fill=1)
c.setFillColor(AMBER)
c.setFont("Sarabun-Semi", 20)
c.drawString(64, PAGE_H - 110, "JUMP THAILAND Hackathon 2026 · AIS · AI for the Future of Thai Education")
c.setFillColor(WHITE)
c.setFont("Sarabun-Bold", 150)
c.drawString(64, PAGE_H - 330, "SOLVEN")
c.setFont("Sarabun", 44)
c.drawString(66, PAGE_H - 400, "คืนเวลาให้ครู — ด้วยผู้ช่วย multi-agent ที่ทำงานธุรการแทน")
c.setFillColor(HexColor("#BFD8D1"))
c.setFont("Sarabun", 22)
c.drawString(66, PAGE_H - 448, "ตรวจงาน · ร่างแผนการสอน · ร่างรายงาน — ครูอนุมัติทุกครั้ง (human-in-the-loop)")
c.setFillColor(WHITE)
c.setFont("Sarabun-Semi", 20)
c.drawString(64, 140, "[ชื่อสมาชิกทุกคน + คณะ]  ·  ที่ปรึกษา: [ชื่อ + ตำแหน่ง]")
c.drawString(64, 104, "github.com/bravforcode/Solven")
c.setFillColor(AMBER)
c.setFont("Sarabun-Semi", 18)
c.drawString(64, 60, "โจทย์: Empowering Teachers")
footer(1)

# ---------------------------------------------------------------- 2 PROBLEM
bg()
heading("เด็กไทยเรียนรู้ถดถอย และเหลื่อมล้ำมากขึ้นทุกปี")
kicker("The Problem · PISA 2022 (OECD)")
c.setFillColor(GREEN_DEEP)
c.setFont("Sarabun-Bold", 170)
c.drawString(64, 380, "394")
c.setFillColor(INK)
c.setFont("Sarabun-Semi", 24)
c.drawString(64, 330, "คะแนนเฉลี่ยคณิตศาสตร์ของนักเรียนไทยอายุ 15 ปี (PISA 2022)")
c.setFont("Sarabun", 20)
c.setFillColor(MUTED)
c.drawString(64, 296, "ค่าเฉลี่ย OECD = 472 · ลดลงจาก 419 คะแนนในปี 2018")
y = 214
for num, txt in [
    ("19 จุด%", "สัดส่วนนักเรียนต่ำกว่าเกณฑ์ขั้นพื้นฐาน (Level 2) เพิ่มขึ้น เทียบกับปี 2012"),
    ("สุดขั้ว", "กลุ่มยากจนที่สุด 25% แทบไม่มีใครถึงระดับสูงสุด ขณะที่กลุ่มรวยที่สุด 25% มีราว 1 ใน 5"),
]:
    c.setFillColor(AMBER)
    c.setFont("Sarabun-Bold", 30)
    c.drawString(80, y, num)
    c.setFillColor(INK)
    c.setFont("Sarabun", 19)
    c.drawString(80 + pdfmetrics.stringWidth(num, "Sarabun-Bold", 30) + 18, y + 4, txt)
    y -= 46
c.setFillColor(MUTED)
c.setFont("Sarabun", 15)
c.drawString(64, 42, "ที่มา: OECD PISA 2022 Thailand country note / Education GPS")
footer(2)

# ---------------------------------------------------------------- 3 ROOT CAUSE
bg()
heading("ต้นตอ: ครูไม่พอ — แต่ไม่พอแบบกระจุกตัว")
kicker("Root Cause · สพฐ. + TDRI")
cards = [
    ("15,089", "โรงเรียนขนาดเล็ก (นักเรียน < 120 คน) — 50% ของโรงเรียนสพฐ. ทั้งหมด 30,112 แห่ง"),
    ("~12,000", "โรงที่มีครูไม่ครบชั้น (น้อยกว่า 1 คนต่อระดับชั้น)"),
    ("43,000", "ครูที่โรงเรียนกลุ่มนี้ขาดแคลนรวมกัน — มากกว่าค่าเฉลี่ยทั้งระบบราว 5 เท่า"),
    ("1 : N", "ครู 1 คน ต้องสอนหลายวิชา/หลายชั้นพร้อมกัน + งานธุรการ"),
]
x0 = 64
cw = 282
gap = 14
for i, (num, lbl) in enumerate(cards):
    stat_card(x0 + i * (cw + gap), 330, cw, 250, num, lbl, number_size=52)
c.setFillColor(GREEN_DARK)
c.setFont("Sarabun-Bold", 24)
c.drawString(64, 230, "ผล: งานเตรียมสอน ตรวจงาน และเอกสารธุรการทวีคูณตามวิชา/ชั้นที่ครูต้องรับผิดชอบ")
c.setFillColor(MUTED)
c.setFont("Sarabun", 17)
c.drawString(64, 192, "ปัญหาไม่ใช่ “ครูไม่พอ” ในภาพรวม แต่คือการขาดแคลนที่กระจุกตัวในโรงเรียนที่เปราะบางที่สุด — ภาคเหนือตอนบน อีสาน ชายแดนใต้")
c.setFillColor(MUTED)
c.setFont("Sarabun", 15)
c.drawString(64, 42, "ที่มา: ข้อมูล สพฐ. ปีการศึกษา 2561 ผ่าน Workpoint Today (2563) · TDRI ผ่าน ThaiPublica (2558) — ตรวจสอบตัวเลขล่าสุดก่อนส่งจริง")
footer(3)

# ---------------------------------------------------------------- 4 WHY IT MATTERS
bg()
heading("การคืนเวลาให้ครู = ผลการเรียนที่ดีขึ้นจริง")
kicker("Why It Matters · World Bank (2015)")
c.setFillColor(GREEN_DEEP)
c.setFont("Sarabun-Bold", 210)
c.drawString(64, 330, "15%")
c.setFillColor(INK)
c.setFont("Sarabun-Semi", 26)
c.drawString(64, 268, "ผลการเรียนของนักเรียนเพิ่มขึ้น เมื่อโรงเรียนกลุ่มผลการเรียนต่ำสุด")
c.setFont("Sarabun", 22)
c.drawString(64, 230, "และครูไม่ครบชั้นได้รับครูเพิ่ม 1 คนต่อ 1 ห้อง (งานวิจัยธนาคารโลก)")
c.setFillColor(GREEN_DARK)
c.setFont("Sarabun-Bold", 26)
c.drawString(64, 150, "เราเพิ่มครูไม่ได้ทุกโรงเรียนในคืนเดียว — แต่เราคืนเวลาให้ครูคนเดิมได้")
c.setFillColor(MUTED)
c.setFont("Sarabun", 20)
c.drawString(64, 108, "กลไกเดียวกัน: เพิ่ม “เวลาสอนที่ใช้ได้จริง” ต่อครู 1 คน = เพิ่มศักยภาพต่อหัว")
footer(4)

# ---------------------------------------------------------------- 5 SOLUTION
bg()
heading("Solven: ผู้ช่วยครูแบบ multi-agent — ครูเป็นคนตัดสินใจเสมอ")
kicker("Solution")
# flow: teacher -> coordinator -> agents -> guardrail -> draft -> approve
box(64, 300, 250, 150, "ครู", ["ส่งงาน/ข้อมูล + rubric", "ตรวจและอนุมัติผลลัพธ์"], fill=GREEN_SOFT)
arrow(330, 375, 396)
box(396, 300, 250, 150, "Coordinator", ["LangGraph state machine", "route งาน + audit ทุก call"], fill=GREEN_DEEP, title_color=WHITE)
arrow(662, 375, 728)
c.setFillColor(WHITE)
c.setStrokeColor(LINE)
c.setLineWidth(2)
c.roundRect(728, 210, 488, 330, 12, stroke=1, fill=1)
c.setFillColor(GREEN_DARK)
c.setFont("Sarabun-Bold", 19)
c.drawString(748, 468, "3 Sub-Agents")
sub = [
    ("Grading & Feedback", "ตรวจตาม rubric + feedback รายบุคคล"),
    ("Lesson-Plan", "ร่างแผนตรงหลักสูตร ปรับตามห้องจริง"),
    ("Reporting & Comm.", "รายงานผู้บริหาร + ข้อความหาผู้ปกครอง"),
]
sy = 420
for t, d in sub:
    c.setFillColor(GREEN_SOFT)
    c.roundRect(748, sy - 34, 448, 64, 8, stroke=0, fill=1)
    c.setFillColor(GREEN_DARK)
    c.setFont("Sarabun-Bold", 18)
    c.drawString(766, sy, t)
    c.setFillColor(MUTED)
    c.setFont("Sarabun", 15)
    c.drawString(766, sy - 26, d)
    sy -= 86
# vertical arrow: sub-agents -> guardrail
c.setStrokeColor(GREEN)
c.setLineWidth(4)
c.line(972, 210, 972, 164)
c.line(962, 178, 972, 160)
c.line(982, 178, 972, 160)
c.setFillColor(AMBER)
c.setFont("Sarabun-Bold", 19)
c.drawString(748, 112, "Guardrail")
c.setFillColor(INK)
c.setFont("Sarabun", 16)
c.drawString(748 + pdfmetrics.stringWidth("Guardrail", "Sarabun-Bold", 19) + 14, 114, "ตรวจ PII / ข้อมูลหลอน / ตรงหลักสูตร → ร่าง + คำเตือน")
# bottom line
box(64, 130, 582, 60, "", [], fill=GREEN_SOFT)
c.setFillColor(GREEN_DARK)
c.setFont("Sarabun-Bold", 18)
c.drawString(84, 148, "ทุกผลลัพธ์เป็น “ร่าง” → ครูอนุมัติ/ปฏิเสธในคิวตรวจ — ไม่มี agent ตัดสินใจแทนครู")
footer(5)

# ---------------------------------------------------------------- 6 HOW IT WORKS
bg()
heading("ทำงานยังไง — ตั้งแต่ส่งงานจนถึงครูอนุมัติ")
kicker("How It Works")
steps = [
    ("1", "ครูส่งงานบนมือถือ/เว็บ (offline ได้ — PWA)"),
    ("2", "Coordinator (LangGraph) เลือก agent + ประกอบ context"),
    ("3", "Sub-agent สร้างร่างผลลัพธ์"),
    ("4", "Guardrail ตรวจ PII / ข้อมูลหลอน / ตรงหลักสูตร"),
    ("5", "บันทึก audit ทุก agent call (ตาราง agent_runs)"),
    ("6", "ครูตรวจร่าง → อนุมัติหรือแก้ไข → จบงาน"),
]
y = 470
for n, t in steps:
    c.setFillColor(GREEN)
    c.circle(84, y, 22, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Sarabun-Bold", 19)
    c.drawString(76, y - 8, n)
    c.setFillColor(INK)
    c.setFont("Sarabun", 20)
    c.drawString(128, y - 8, t)
    y -= 56
y = 470
chips = [
    ("Next.js PWA + offline-first", 430),
    ("FastAPI + LangGraph", 374),
    ("SQLite audit log (agent_runs)", 318),
    ("Thai LLM self-host (target: Typhoon2)", 262),
]
for t, cy in chips:
    chip(720, cy, t)
c.setFillColor(MUTED)
c.setFont("Sarabun", 16)
p(MUTED_P, "LLM: ระหว่างพัฒนาใช้ API (Anthropic/OpenAI) · สเกลจริงใช้ open-source Thai model บน AIS Cloud — ต้นทุนต่ำ + ข้อมูลไม่หลุดนอกประเทศ (PDPA)", 720, 200, 500)
footer(6)

# ---------------------------------------------------------------- 7 AIS INTEGRATION
bg()
heading("ใช้เทคโนโลยี AIS เป็น core ของระบบจริง — ไม่ใช่แค่กล่าวถึง")
kicker("AIS Technology")
ais = [
    ("AIS 5G", "ครูในพื้นที่ห่างไกลใช้ผ่านมือถือได้โดยตรง + กลยุทธ์ offline-first / background sync", GREEN_DARK),
    ("AIS Cloud / EEC", "รัน backend + GPU inference + ฐานข้อมูลทั้งหมดในไทย — ข้อมูลนักเรียนไม่ออกนอกประเทศ (PDPA)", GREEN),
    ("AIS LearnDi", "integrate เป็นโมดูลเสริมบนแพลตฟอร์มที่ AIS Academy สร้างไว้แล้ว — ลดแรงเสียดทานการ adopt ของครู", GREEN_DEEP),
]
x0 = 64
cw = 378
for i, (t, d, col) in enumerate(ais):
    x = x0 + i * (cw + 18)
    c.setFillColor(col)
    c.roundRect(x, 330, cw, 210, 14, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Sarabun-Bold", 26)
    c.drawString(x + 26, 470, t)
    c.setFont("Sarabun", 18)
    p(WHITE_SM, d, x + 26, 430, cw - 52, 90)
c.setFillColor(AMBER)
c.setFont("Sarabun-Bold", 22)
c.drawString(64, 220, "AIS NB-IoT / Magellan — ต่อยอดระยะยาว (อุปกรณ์/เซนเซอร์โรงเรียนห่างไกล)")
c.setFillColor(MUTED)
c.setFont("Sarabun", 17)
c.drawString(64, 186, "ไม่ใช่ core ของเวอร์ชันแรก — ออกแบบให้พร้อมขยาย")
footer(7)

# ---------------------------------------------------------------- 8 TARGET
bg()
heading("กลุ่มเป้าหมาย: ครูที่แบกภาระเกินอัตรากำลังที่สุด")
kicker("Target Users")
stat_card(64, 360, 290, 220, "12,000", "โรงในกลุ่มขาดแคลน (ข้อมูลอ้างอิง TDRI/สพฐ. ปี 2561)", number_size=56)
stat_card(368, 360, 290, 220, "หมื่น+", "ครูที่แบกภาระเกินอัตรากำลัง", number_size=56)
stat_card(672, 360, 290, 220, "3 ภูมิภาค", "เหนือตอนบน · อีสาน · ชายแดนใต้", number_size=56)
c.setFillColor(INK)
c.setFont("Sarabun-Bold", 22)
c.drawString(64, 280, "โปรไฟล์ครูเป้าหมาย")
c.setFont("Sarabun", 19)
c.setFillColor(INK)
p(BODY, "• อายุ 25–55 · สอนหลายวิชา/หลายชั้นในห้องเดียว\n• พื้นที่ชนบท — เน็ตบ้าน/ไฟเบอร์จำกัด แต่มีสัญญาณมือถือ\n• ไม่มีเวลาอบรมระบบซับซ้อน — ต้องใช้งานบนมือถือได้ทันที", 64, 180, 1100)
c.setFillColor(GREEN_DARK)
c.setFont("Sarabun-Semi", 18)
c.drawString(64, 60, "กลุ่มรอง: ผู้บริหารสถานศึกษา/เขตพื้นที่ — ได้รายงานครบถ้วนตรงเวลา")
footer(8)

# ---------------------------------------------------------------- 9 IMPACT & SCALE
bg()
heading("ผลกระทบและการขยายผล — 3 ระยะ")
kicker("Impact & Scale")
phases = [
    ("P1 · Pilot", "เดือน 1–4", "10–20 โรง ผ่านเครือข่าย สพฐ./NIA", "KPI: ชั่วโมงครูที่ประหยัด/สัปดาห์ · ความแม่นยำเทียบครู (Kappa ≥ 0.8)"),
    ("P2 · District", "เดือน 5–12", "3–5 เขตพื้นที่ (~1,000 ครู)", "KPI: adoption รายสัปดาห์ · เวลาตอบสนองผู้ปกครอง"),
    ("P3 · Scale", "ปี 2", "Integrate ใน AIS LearnDi + IoT ขยาย", "KPI: ครู active · ผลสำรวจภาระงาน · ผลสัมฤทธิ์ระยะยาว"),
]
x0 = 64
cw = 378
for i, (t, when, who, kpi) in enumerate(phases):
    x = x0 + i * (cw + 18)
    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.setLineWidth(2)
    c.roundRect(x, 300, cw, 300, 14, stroke=1, fill=1)
    c.setFillColor(GREEN)
    c.setFont("Sarabun-Bold", 26)
    c.drawString(x + 24, 540, t)
    c.setFillColor(AMBER)
    c.setFont("Sarabun-Semi", 18)
    c.drawString(x + 24, 508, when)
    c.setFillColor(INK)
    c.setFont("Sarabun", 18)
    p(BODY, who, x + 24, 462, cw - 48, 80)
    c.setFillColor(GREEN_DARK)
    c.setFont("Sarabun", 15)
    p(BODY_SM, kpi, x + 24, 330, cw - 48, 100)
c.setFillColor(MUTED)
c.setFont("Sarabun", 17)
c.drawString(64, 240, "โมเดลความยั่งยืน: ระยะแรกเน้นผลกระทบเชิงระบบกับภาครัฐ — พิจารณาโมเดลรายได้ในระยะถัดไป")
c.setFillColor(GREEN_DEEP)
c.setFont("Sarabun-Bold", 22)
c.drawString(64, 120, "วัดผลด้วยหลักฐาน ไม่ใช่คำโฆษณา: บันทึกเวลาที่ประหยัดได้จริง + ความแม่นยำเทียบครูจริง")
footer(9)

# ---------------------------------------------------------------- 10 TEAM & ASK
bg()
heading("ทีม — และสิ่งที่เราขอ")
kicker("Team & Ask")
c.setFillColor(GREEN_SOFT)
c.setStrokeColor(LINE)
c.setLineWidth(2)
c.roundRect(64, 380, 560, 230, 14, stroke=1, fill=1)
c.setFillColor(GREEN_DARK)
c.setFont("Sarabun-Bold", 24)
c.drawString(88, 548, "ทีม Solven")
c.setFillColor(INK)
c.setFont("Sarabun", 19)
p(BODY, "• [ชื่อพี่] — AI / full-stack engineering, multi-agent orchestration (LangGraph)\n• [สมาชิก 2 — คณะ] — [ความถนัด]\n• [สมาชิก 3 — คณะ] — [ความถนัด]\n• [สมาชิก 4 — คณะ] — [ความถนัด เช่น เคยฝึกสอน]\n• ที่ปรึกษา: [ชื่อ + ตำแหน่ง]", 88, 396, 520)
c.setFillColor(WHITE)
c.setStrokeColor(GREEN)
c.setLineWidth(2)
c.roundRect(660, 380, 556, 230, 14, stroke=1, fill=1)
c.setFillColor(GREEN_DARK)
c.setFont("Sarabun-Bold", 24)
c.drawString(684, 548, "สิ่งที่เราขอจากเวทีนี้")
c.setFillColor(INK)
c.setFont("Sarabun", 19)
p(BODY, "1. โอกาส pilot ร่วมกับ สพฐ./AIS ในโรงเรียนขนาดเล็ก\n2. คำแนะนำ/ mentorship จากกรรมการด้านการศึกษา\n3. คำปรึกษาด้านโมเดลความยั่งยืนและการขยายผล", 684, 396, 500)
c.setFillColor(GREEN_DEEP)
c.setFont("Sarabun-Bold", 22)
c.drawString(64, 300, "ทำไมทีมนี้: มี prior art จริง — prototype ที่รันได้ + สถาปัตยกรรม production ครบ (docs/appendix-a)")
c.setFillColor(GREEN)
c.setFont("Sarabun-Semi", 20)
c.drawString(64, 250, "github.com/bravforcode/Solven — โค้ดจริง ตรวจได้ 12 tests ผ่าน · audit log ครบ")
c.setFillColor(MUTED)
c.setFont("Sarabun", 17)
c.drawString(64, 210, "ขอขอบคุณ AIS · กระทรวงศึกษาธิการ · สพฐ. · NIA — ครูไทยควรได้เวลาคืน")
footer(10)

c.save()
print(f"OK: {OUT} — {c.getPageNumber()} pages")
