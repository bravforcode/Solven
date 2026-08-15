"""Tests for Spoke-and-Wheel multi-agent architecture (Task A1)."""

import pytest

from app.agents.grading_agent import GradingAgent, GradingReport
from app.agents.lesson_plan_agent import LessonPlan, LessonPlanAgent
from app.agents.reporting_agent import ReportingAgent, StudentReport
from app.agents.synthesizer import Synthesizer, SynthesizedOutput


def test_grading_agent_returns_structured_report():
    agent = GradingAgent(llm=None)
    result = agent.grade(
        student_work="คำตอบของนักเรียน",
        rubric="เกณฑ์การให้คะแนน",
        subject="คณิตศาสตร์",
    )
    assert hasattr(result, "rubric_scores")
    assert hasattr(result, "omission_analysis")
    assert hasattr(result, "weaknesses")
    assert isinstance(result.rubric_scores, dict)
    assert len(result.rubric_scores) > 0
    assert result.confidence > 0


def test_lesson_plan_agent_generates_structured_plan():
    agent = LessonPlanAgent(llm=None)
    result = agent.generate(
        subject="คณิตศาสตร์",
        grade_level="ป.3",
        topic="การบวกเลขหลักหน่วย",
        duration=60,
        student_count=35,
    )
    assert hasattr(result, "objectives")
    assert hasattr(result, "activities")
    assert hasattr(result, "assessment")
    assert len(result.objectives) > 0
    assert len(result.activities) > 0


def test_reporting_agent_generates_parent_report():
    agent = ReportingAgent(llm=None)
    result = agent.generate_report(
        student_name="ด.ช.สมชาย",
        subject="คณิตศาสตร์",
        period="เทอม 1/2569",
        grades={"คณิต": 75, "วิทย์": 80},
        behavior={"ความรับผิดชอบ": "ดีมาก", "ความมีวินัย": "ดี"},
    )
    assert hasattr(result, "report_text")
    assert hasattr(result, "recommendations")
    assert len(result.report_text) > 0
    assert len(result.recommendations) > 0


def test_synthesizer_merges_parallel_reports():
    synth = Synthesizer()

    grading = GradingReport(
        rubric_scores={"ข้อ 1": 8, "ข้อ 2": 6},
        omission_analysis=["ไม่ได้ทำข้อ 3"],
        weaknesses=["การคิดคำนวณ"],
        strengths=["ความเข้าใจทฤษฎี"],
        total_score=14,
        max_score=20,
        feedback="ดี",
        confidence=0.9,
    )
    lesson = LessonPlan(
        objectives=["เข้าใจการบวก"],
        activities=[],
        assessment={"method": "แบบทดสอบ"},
        differentiation={},
        materials=[],
        standards_alignment=[],
    )
    report = StudentReport(
        report_text="รายงาน",
        recommendations=["ฝึกเพิ่ม"],
        parent_message="สวัสดีค่ะ",
        tone="positive",
    )

    result = synth.merge(grading, lesson, report)
    assert hasattr(result, "final_output")
    assert hasattr(result, "teacher_action_items")
    assert len(result.teacher_action_items) > 0
    assert "จัดการเรียนรู้เสริม: การคิดคำนวณ" in result.teacher_action_items
    assert "ทบทวนเนื้อหาที่ข้าม: ไม่ได้ทำข้อ 3" in result.teacher_action_items
    assert "ฝึกเพิ่ม" in result.teacher_action_items
    assert isinstance(result.agent_reports, dict)
    assert "grading" in result.agent_reports
    assert "lesson_plan" in result.agent_reports
    assert "report" in result.agent_reports
