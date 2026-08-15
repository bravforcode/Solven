"""Tests for diagnostic analytics (Task B1)."""

import pytest

from app.analytics.omission_detector import OmissionAnalysis, OmissionDetector
from app.analytics.rubric_analyzer import RubricAnalyzer, RubricDiagnostic


def test_rubric_analyzer_identifies_weakest_criterion():
    analyzer = RubricAnalyzer()
    scores = {
        "ความเข้าใจเนื้อหา": 8,
        "การคิดวิเคราะห์": 4,
        "การสื่อสาร": 7,
        "ความถูกต้อง": 3,
    }
    result = analyzer.analyze(scores)
    assert result.weakest_criterion == "ความถูกต้อง"
    assert result.gap_from_mean > 0
    assert result.strongest_criterion == "ความเข้าใจเนื้อหา"
    assert isinstance(result.mastery_probabilities, dict)
    assert len(result.mastery_probabilities) == 4


def test_rubric_analyzer_empty_scores():
    analyzer = RubricAnalyzer()
    result = analyzer.analyze({})
    assert result.overall_health == "critical"
    assert result.weakest_criterion == ""


def test_omission_detector_finds_skipped_questions():
    detector = OmissionDetector()
    submission = """ข้อ 1: คำตอบ A
ข้อ 2: คำตอบ B
ข้อ 3: 
ข้อ 4: คำตอบ D
ข้อ 5: """
    result = detector.detect(submission, total_questions=5)
    assert result.omitted_count == 2
    assert 3 in result.omitted_indices
    assert 5 in result.omitted_indices
    assert result.omission_rate == 0.4


def test_omission_detector_no_omissions():
    detector = OmissionDetector()
    submission = """ข้อ 1: คำตอบ A
ข้อ 2: คำตอบ B
ข้อ 3: คำตอบ C"""
    result = detector.detect(submission, total_questions=3)
    assert result.omitted_count == 0
    assert result.omission_rate == 0.0
    assert result.impact_estimate == "low"
