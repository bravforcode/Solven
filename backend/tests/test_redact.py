"""Tests: PDPA redaction boundary (T0-05) — raw identifiers never reach providers."""

import os

import pytest

from app.db import Store
from app.redact import redact_pii


class _Capture:
    def __init__(self):
        self.args = None

    def __call__(self, llm, agent, user_input, rubric=None):
        self.args = (agent, user_input, rubric)
        return "output"


@pytest.mark.parametrize(
    ("raw", "must_not_contain"),
    [
        ("โทร 0812345678", "0812345678"),
        ("โทร +66812345678", "66812345678"),
        ("ID 1103700123456", "1103700123456"),
        ("อีเมล student@example.com", "student@example.com"),
        ("เลขประจำตัว 12345678", "12345678"),
    ],
)
def test_redact_pii_removes_identifiers(raw, must_not_contain):
    assert must_not_contain not in redact_pii(raw)


def test_redact_pii_keeps_plain_text():
    text = "เด็กเรียนดีมาก ส่งการบ้านครบ"
    assert redact_pii(text) == text


def test_redact_marks_placeholders():
    out = redact_pii("โทร 0812345678")
    assert "[PHONE]" in out


def test_provider_call_receives_redacted_input(monkeypatch):
    """Real-provider path must receive redacted text; mock path keeps originals."""
    monkeypatch.setenv("SOLVEN_LLM", "anthropic")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    capture = _Capture()
    monkeypatch.setattr("app.coordinator.run_sub_agent", capture)

    store = Store(":memory:")
    from app.coordinator import run_task

    run_task(store, "grading", "คำตอบ: โทร 0812345678", rubric="เกณฑ์", fail_closed=True)
    agent, provider_input, provider_rubric = capture.args
    assert "0812345678" not in provider_input
    assert "[PHONE]" in provider_input

    # mock path (local, deterministic) keeps the original text
    monkeypatch.setenv("SOLVEN_LLM", "mock")
    capture2 = _Capture()
    monkeypatch.setattr("app.coordinator.run_sub_agent", capture2)
    run_task(Store(":memory:"), "grading", "คำตอบ: โทร 0812345678", rubric="เกณฑ์")
    agent, provider_input, provider_rubric = capture2.args
    assert "0812345678" in provider_input
