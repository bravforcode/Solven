"""Generate public/og.png (1200x630) for Solven — brand card in theme colors."""
import os
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as pdfcanvas

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONTS = os.path.join(ROOT, "docs", "presentation", "fonts")
OUT = os.path.join(ROOT, "frontend", "public", "og.png")
W, H = 1200, 630

pdfmetrics.registerFont(TTFont("Sarabun", os.path.join(FONTS, "Sarabun-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Bold", os.path.join(FONTS, "Sarabun-Bold.ttf")))

c = pdfcanvas.Canvas(OUT, pagesize=(W, H))
# deep blue field
c.setFillColor(HexColor("#1e3a8a"))
c.rect(0, 0, W, H, stroke=0, fill=1)
# brand square
c.setFillColor(white)
c.roundRect(96, 400, 110, 110, 26, stroke=0, fill=1)
c.setFillColor(HexColor("#1e3a8a"))
c.setFont("Sarabun-Bold", 72)
c.drawCentredString(151, 428, "S")
# name
c.setFillColor(white)
c.setFont("Sarabun-Bold", 92)
c.drawString(244, 428, "Solven")
# tagline
c.setFillColor(HexColor("#bfdbfe"))
c.setFont("Sarabun", 44)
c.drawString(100, 320, "คืนเวลาให้ครูได้สอน")
# sub
c.setFillColor(HexColor("#93c5fd"))
c.setFont("Sarabun", 30)
c.drawString(100, 252, "ตรวจงาน · ร่างแผนการสอน · ร่างรายงาน — ครูอนุมัติทุกครั้ง")
# footer
c.setFillColor(HexColor("#dbeafe"))
c.setFont("Sarabun", 24)
c.drawString(100, 96, "JUMP THAILAND Hackathon 2026 · Empowering Teachers · github.com/bravforcode/Solven")
c.showPage()
c.save()
print(f"OK: {OUT}")
