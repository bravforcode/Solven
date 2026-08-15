"""Tests for deterministic pre-LLM router (Task A2)."""

import pytest

from app.router import DeterministicRouter, RoutingResult


def test_router_classifies_grading_request():
    router = DeterministicRouter()
    result = router.classify("ช่วยตรวจงานนักเรียน เรื่องการบวกเลข")
    assert result.agent == "grading"
    assert result.confidence > 0.5


def test_router_classifies_lesson_plan_request():
    router = DeterministicRouter()
    result = router.classify("ช่วยสร้างแผนการสอนคณิตศาสตร์ ป.3")
    assert result.agent == "lesson_plan"
    assert result.confidence > 0.5


def test_router_classifies_report_request():
    router = DeterministicRouter()
    result = router.classify("เขียนรายงานนักเรียนส่งผู้ปกครอง")
    assert result.agent == "reporting"
    assert result.confidence > 0.5


def test_router_defaults_to_grading_on_unknown():
    router = DeterministicRouter()
    result = router.classify("สวัสดีครับ")
    assert result.agent == "grading"
    assert result.confidence <= 0.5


def test_router_returns_reasoning():
    router = DeterministicRouter()
    result = router.classify("ตรวจข้อสอบคณิตศาสตร์")
    assert isinstance(result.reasoning, str)
    assert len(result.reasoning) > 0
