"""Synthesizer — merges parallel agent outputs into teacher-facing output."""

from __future__ import annotations

from dataclasses import dataclass

from app.agents.grading_agent import GradingReport
from app.agents.lesson_plan_agent import LessonPlan
from app.agents.reporting_agent import StudentReport


@dataclass
class SynthesizedOutput:
    """Combined output from all agents for teacher review."""

    final_output: str  # combined output for teacher review
    teacher_action_items: list[str]
    agent_reports: dict  # individual agent outputs
    confidence_scores: dict[str, float]


class Synthesizer:
    """Merges parallel agent outputs into single teacher-facing output.

    Extracts action items from weaknesses, omissions, and recommendations.
    """

    def merge(
        self,
        grading: GradingReport,
        lesson: LessonPlan,
        report: StudentReport,
    ) -> SynthesizedOutput:
        """Merge outputs from all 3 specialist agents."""
        action_items: list[str] = []

        # From grading weaknesses -> action items
        for weakness in grading.weaknesses:
            action_items.append(f"จัดการเรียนรู้เสริม: {weakness}")

        # From omission analysis
        for omission in grading.omission_analysis:
            action_items.append(f"ทบทวนเนื้อหาที่ข้าม: {omission}")

        # From report recommendations
        action_items.extend(report.recommendations)

        # Build final output
        strengths_str = ", ".join(grading.strengths) if grading.strengths else "ไม่มี"
        weaknesses_str = ", ".join(grading.weaknesses) if grading.weaknesses else "ไม่มี"
        omissions_str = ", ".join(grading.omission_analysis) if grading.omission_analysis else "ไม่มี"
        objectives_str = ", ".join(lesson.objectives[:3]) if lesson.objectives else "ไม่มี"
        action_items_str = "\n".join(f"- {item}" for item in action_items) if action_items else "- ไม่มี"

        final_output = f"""## ผลการวิเคราะห์

### ผลการตรวจงาน
คะแนนรวม: {grading.total_score}/{grading.max_score}
จุดแข็ง: {strengths_str}
จุดอ่อน: {weaknesses_str}
ข้ามทำ: {omissions_str}

### แผนการสอนแนะนำ
วัตถุประสงค์: {objectives_str}

### รายงานผู้ปกครอง
{report.report_text}

### สิ่งที่ครูต้องทำ
{action_items_str}"""

        return SynthesizedOutput(
            final_output=final_output,
            teacher_action_items=action_items,
            agent_reports={
                "grading": grading,
                "lesson_plan": lesson,
                "report": report,
            },
            confidence_scores={
                "grading": grading.confidence,
                "lesson_plan": 0.8,
                "report": 0.85,
            },
        )
