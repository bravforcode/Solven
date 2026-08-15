"""Tests: /api/documents/render — PDF generation (reportlab, Thai font).

NOTE (review pass 2): reportlab embeds TTF as subset CID font — content
streams carry hex-encoded CIDs, so literal Thai text never appears in the
PDF bytes. Assertions are therefore integration-level (%PDF + font resource)
plus pure-function unit tests on the escaping helper.
"""

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.documents import _esc
from app.main import create_app

TOKEN = "test-token"


@pytest.fixture()
def client(db_url):
    """Postgres-backed app (merged test convention — see conftest.py)."""
    app = create_app(Settings(api_token=TOKEN, database_url=db_url))
    return TestClient(app)


def auth() -> dict:
    return {"Authorization": f"Bearer {TOKEN}"}


def test_escape_helper_escapes_markup():
    """REVIEW FIX 2 unit level: raw teacher text cannot reach Paragraph markup."""
    assert _esc("3 < 5 และ 7 & 8") == "3 &lt; 5 และ 7 &amp; 8"
    assert _esc('a "b" c') == "a &quot;b&quot; c"


def test_render_worksheet_returns_pdf(client):
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "worksheet",
            "fields": {
                "number": "1",
                "subject": "คณิตศาสตร์",
                "grade": "ป.5",
                "date": "15 ส.ค. 2569",
                "instructions": "จงตอบ",
                "body": "1+1 = ?",
            },
        },
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")


def test_render_certificate_landscape(client):
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "certificate",
            "fields": {"studentName": "เด็กชายดี", "detail": "ชนะเลิศ", "directorName": "นายใหญ่", "date": "15 ส.ค. 2569"},
        },
    )
    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")


def test_render_embeds_thai_font(client):
    """Smoke: Thai font is registered and embedded (CID-subset PDFs cannot be
    text-searched). The school-header flow itself is covered end-to-end by the
    BFF contract (route forwards `school` verbatim) + manual E2E check — this
    test guards the renderer/font pipeline, not the header content."""
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "worksheet",
            "school": {"schoolName": "โรงเรียนบ้านสวนฝั่งสุข", "address": "12 หมู่ 3", "district": "สพป."},
            "fields": {"subject": "คณิต", "grade": "ป.5", "body": "โจทย์"},
        },
    )
    assert r.status_code == 200
    assert b"NotoSansThai" in r.content


def test_render_official_letter_smoke(client):
    """F10: most markup-heavy kind (`<b>`/`<br/>` structural tags)."""
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "official-letter",
            "school": {"schoolName": "โรงเรียนบ้านสวนฝั่งสุข", "refNo": "12/2569"},
            "fields": {
                "refNo": "",
                "date": "15 ส.ค. 2569",
                "subject": "รายงานความก้าวหน้า",
                "to": "ผู้ปกครอง",
                "body": "เด็กดีขึ้นมาก",
                "teacherName": "นางสาวสมหญิง",
                "position": "ครูผู้สอน",
            },
        },
    )
    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")


def test_render_lesson_record_smoke(client):
    """F10: table layout kind."""
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "lesson-record",
            "fields": {
                "subject": "คณิตศาสตร์",
                "unit": "เศษส่วน",
                "grade": "ป.5",
                "students": "30",
                "date": "15 ส.ค. 2569",
                "indicators": "ค 1.1",
                "results": "นักเรียนเข้าใจ",
                "problems": "เวลาน้อย",
                "fixes": "แบ่งกลุ่ม",
                "teacherName": "นางสาวสมหญิง",
            },
        },
    )
    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")


def test_render_summary_smoke(client):
    """F10: summary kind (multi-draft body)."""
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "summary",
            "fields": {"body": "งานที่ 1 ...\n\nงานที่ 2 ..."},
        },
    )
    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")


def test_render_escapes_markup_in_body(client):
    """REVIEW FIX 2 integration level: `<`/`&` in body must render, not 500."""
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "worksheet",
            "fields": {"subject": "คณิต", "grade": "ป.5", "body": "3 < 5 และ 7 & 8 ≥ 10"},
        },
    )
    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")


def test_render_unknown_kind_400(client):
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={"kind": "spaceship", "fields": {}},
    )
    assert r.status_code == 400


def test_render_missing_required_field_400(client):
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={"kind": "worksheet", "fields": {"number": "1"}},  # subject/body missing
    )
    assert r.status_code == 400


def test_render_requires_auth(client):
    r = client.post("/api/documents/render", json={"kind": "worksheet", "fields": {}})
    assert r.status_code == 401
