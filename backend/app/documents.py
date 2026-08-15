"""Server-side PDF rendering for Solven documents (reportlab + Noto Sans Thai).

Client-side print is the primary path (works offline). This endpoint is an
enhancement: when reportlab is unavailable the route returns 503 and the UI
hides the download button — never a hard failure.

Known limitations (review R2):
- The vendored font is the variable NotoSansThai instanced at default axes
  (wght=400); it covers Thai base+marks, Latin, digits and the punctuation
  used by the templates (asserted by test_font_covers_required_glyphs).
- reportlab does not apply OpenType GSUB/GPOS shaping: Thai combining marks
  are emitted as separate glyphs with raw advances, so tone/vowel placement
  is approximate. The browser print path (proper shaping) remains the
  high-fidelity output.
"""

import logging
from html import escape as _esc
from pathlib import Path

_FONT_DIR = Path(__file__).parent / "static" / "fonts"
_FONT_PATH = _FONT_DIR / "NotoSansThai-Regular.ttf"

log = logging.getLogger("solven.documents")

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    pdfmetrics.registerFont(TTFont("NotoSansThai", str(_FONT_PATH)))
    _AVAILABLE = True
except Exception as exc:  # pragma: no cover - import guard
    log.warning("reportlab/Thai font unavailable: %s", exc)
    _AVAILABLE = False

_KINDS = {"worksheet", "lesson-record", "official-letter", "certificate", "summary"}

_REQUIRED: dict[str, set[str]] = {
    "worksheet": {"subject", "grade", "body"},
    "lesson-record": {"subject", "results"},
    "official-letter": {"subject", "to", "body"},
    "certificate": {"studentName", "detail"},
    "summary": set(),  # body comes from school + draft text in `body`
}


def render_document(kind: str, fields: dict, school: dict | None = None) -> bytes:
    """Render one document to PDF bytes. Raises ValueError on invalid input,
    RuntimeError when reportlab is unavailable."""
    if not _AVAILABLE:
        raise RuntimeError("pdf renderer unavailable")
    if kind not in _KINDS:
        raise ValueError(f"unknown kind: {kind}")
    missing = _REQUIRED[kind] - set(fields or {})
    if missing:
        raise ValueError(f"missing fields: {sorted(missing)}")
    school = school or {}

    def _s(key: str, default: str = "") -> str:
        # escape before it ever reaches Paragraph markup (REVIEW FIX 2):
        # raw `<`, `&`, `>` from teacher text would break reportlab parsing
        return _esc(str(fields.get(key) or default))

    from io import BytesIO

    bio = BytesIO()

    def _para(text: str, style: ParagraphStyle) -> Paragraph:
        # Python str.replace replaces ALL occurrences (REVIEW FIX 3) —
        # newlines → <br/> across the whole text
        return Paragraph(text.replace("\n", "<br/>"), style)

    styles = {
        "head": ParagraphStyle("head", fontName="NotoSansThai", fontSize=15, leading=20, alignment=1),
        "sub": ParagraphStyle("sub", fontName="NotoSansThai", fontSize=10, leading=14, alignment=1),
        "title": ParagraphStyle("title", fontName="NotoSansThai", fontSize=13, leading=17, alignment=1, spaceAfter=8),
        "body": ParagraphStyle("body", fontName="NotoSansThai", fontSize=10.5, leading=16),
        "label": ParagraphStyle("label", fontName="NotoSansThai", fontSize=10, leading=15),
        "value": ParagraphStyle("value", fontName="NotoSansThai", fontSize=10, leading=15),
    }

    def _school_header(flow, school: dict):
        flow.append(_para(_esc(str(school.get("schoolName") or "โรงเรียน")), styles["head"]))
        flow.append(_para(_esc(str(school.get("address") or "")), styles["sub"]))
        flow.append(_para(_esc(str(school.get("district") or "")), styles["sub"]))
        flow.append(Spacer(1, 4 * mm))

    doc = SimpleDocTemplate(
        bio,
        pagesize=landscape(A4) if kind == "certificate" else A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    flow = []
    _school_header(flow, school)

    if kind == "worksheet":
        flow.append(_para(f"ใบงานที่ {_s('number') or '___'}", styles["title"]))
        flow.append(_para(f"วิชา {_s('subject')} · ชั้น {_s('grade')} · วันที่ {_s('date')}", styles["sub"]))
        flow.append(Spacer(1, 3 * mm))
        flow.append(_para("ชื่อ-สกุล ______________________________ เลขที่ ______", styles["value"]))
        flow.append(Spacer(1, 3 * mm))
        flow.append(_para(f"คำชี้แจง: {_s('instructions') or 'จงตอบคำถามต่อไปนี้'}", styles["value"]))
        flow.append(Spacer(1, 3 * mm))
        flow.append(_para(_s("body"), styles["body"]))
    elif kind == "lesson-record":
        flow.append(_para("บันทึกหลังสอน", styles["title"]))
        rows = [
            ("วิชา / หน่วยการเรียนรู้", f"{_s('subject')} / {_s('unit')}"),
            ("ระดับชั้น / จำนวนนักเรียน", f"{_s('grade')} / {_s('students')} คน"),
            ("วันที่สอน", _s("date")),
            ("มาตรฐาน / ตัวชี้วัด", _s("indicators")),
            ("ผลที่เกิดขึ้นจริง", _s("results")),
            ("ปัญหา / อุปสรรค", _s("problems")),
            ("แนวทางแก้ไข / พัฒนา", _s("fixes")),
        ]
        data = [[_para(label, styles["label"]), _para(value, styles["value"])] for label, value in rows]
        table = Table(data, colWidths=[52 * mm, 118 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ("BACKGROUND", (0, 0), (0, -1), colors.Color(0.96, 0.96, 0.96)),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        flow.append(table)
        flow.append(Spacer(1, 8 * mm))
        flow.append(_para(f"ลงชื่อ ____________________ ครูผู้สอน   ( {_s('teacherName')} )", styles["value"]))
    elif kind == "official-letter":
        flow.append(_para(f"ที่ {_s('refNo') or _esc(str(school.get('refNo') or '')) or '____/2569'} วันที่ {_s('date')}", styles["value"]))
        flow.append(_para(f"<b>เรื่อง</b> {_s('subject')}", styles["value"]))
        flow.append(_para(f"<b>เรียน</b> {_s('to')}", styles["value"]))
        flow.append(Spacer(1, 4 * mm))
        flow.append(_para(_s("body"), styles["body"]))
        flow.append(Spacer(1, 8 * mm))
        flow.append(
            _para(
                f"ลงชื่อ ____________________<br/>( {_s('teacherName')} )<br/>{_s('position')}<br/>{_esc(str(school.get('schoolName') or ''))}",
                styles["value"],
            )
        )
    elif kind == "certificate":
        flow.append(_para("เกียรติบัตร", ParagraphStyle("cert", parent=styles["title"], fontSize=26, leading=32, spaceBefore=30)))
        flow.append(_para("ขอประกาศว่า", styles["sub"]))
        flow.append(
            _para(
                _s("studentName"),
                ParagraphStyle("name", parent=styles["head"], fontSize=22, leading=28, spaceBefore=8, spaceAfter=8),
            )
        )
        flow.append(_para(_s("detail"), styles["body"]))
        flow.append(Spacer(1, 14 * mm))
        flow.append(
            _para(
                f"ลงชื่อ ____________________<br/>( {_s('directorName')} )<br/>ผู้อำนวยการ",
                ParagraphStyle("sign", parent=styles["value"], alignment=2),
            )
        )
    elif kind == "summary":
        flow.append(_para("รายงานสรุปผลงานที่อนุมัติแล้ว", styles["title"]))
        flow.append(_para(_s("body"), styles["body"]))

    doc.build(flow)
    return bio.getvalue()
