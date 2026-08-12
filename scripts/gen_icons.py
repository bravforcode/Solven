"""Generate PWA icons for Solven (blue square + white S).

Outputs to frontend/public/: icon-192.png, icon-512.png,
maskable-512.png (content kept in the central safe zone), apple-touch-icon.png.
"""
import os
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as pdfcanvas

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONTS = os.path.join(ROOT, "docs", "presentation", "fonts")
OUTDIR = os.path.join(ROOT, "frontend", "public")

pdfmetrics.registerFont(TTFont("Sarabun", os.path.join(FONTS, "Sarabun-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Sarabun-Bold", os.path.join(FONTS, "Sarabun-Bold.ttf")))

BLUE = HexColor("#635bff")  # brand accent (Stripe-grammar indigo)
NAVY = HexColor("#0a2540")
SOFT = HexColor("#eef0ff")


def render(size: int, out: str, style: str) -> None:
    c = pdfcanvas.Canvas(out, pagesize=(size, size))
    # background
    if style == "soft":
        c.setFillColor(SOFT)
        c.roundRect(0, 0, size, size, size * 0.22, stroke=0, fill=1)
    else:
        c.setFillColor(BLUE)
        c.roundRect(0, 0, size, size, size * 0.22, stroke=0, fill=1)
    # S glyph (maskable keeps glyph inside the 80% safe zone)
    pad = size * (0.18 if style == "maskable" else 0.14)
    fs = size * 0.62
    c.setFillColor(white if style != "soft" else NAVY)
    c.setFont("Sarabun-Bold", fs)
    c.drawCentredString(size / 2, size / 2 - fs * 0.36, "S")
    c.showPage()
    c.save()
    print(f"OK {out}")


render(192, os.path.join(OUTDIR, "icon-192.png"), "normal")
render(512, os.path.join(OUTDIR, "icon-512.png"), "normal")
render(512, os.path.join(OUTDIR, "icon-maskable-512.png"), "maskable")
render(180, os.path.join(OUTDIR, "apple-touch-icon.png"), "soft")
