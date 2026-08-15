"""Deterministic pre-LLM router — zero-cost keyword-based agent classification.

Based on Studeia pattern: deterministic routing before any LLM call.
No API cost for routing decisions.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class RoutingResult:
    """Result of deterministic routing."""

    agent: str  # grading, lesson_plan, reporting
    confidence: float
    reasoning: str


class DeterministicRouter:
    """Zero-cost deterministic router using keyword matching.

    No LLM call needed — pure Python logic.
    Routes to the appropriate specialist agent based on input text analysis.
    """

    PATTERNS: dict[str, dict] = {
        "grading": {
            "keywords": [
                "ตรวจ", "ให้คะแนน", "คะแนน", "rubric", "เกณฑ์",
                "ตรวจงาน", "ให้เกรด", "ประเมิน", "สอบ", "แบบทดสอบ",
                "คำตอบ", "ข้อสอบ", "งานนักเรียน", "ตรวจข้อสอบ",
                "ให้คะแนนนักเรียน", "evaluat",
            ],
            "weight": 1.0,
        },
        "lesson_plan": {
            "keywords": [
                "แผนการสอน", "lesson plan", "สอน", "วัตถุประสงค์",
                "กิจกรรม", "การสอน", "เตรียมสอน", "สื่อการสอน",
                "differentiated", "จัดการเรียนรู้", "เตรียมการสอน",
                "ทำแผน", "เขียนแผน",
            ],
            "weight": 1.0,
        },
        "reporting": {
            "keywords": [
                "รายงาน", "ผู้ปกครอง", "พ่อแม่", "ปพ.1",
                "รายงานผล", "สรุปผล", "พัฒนาการ", "พฤติกรรม",
                "ข้อเสนอแนะ", "comment", "เขียนรายงาน",
                "ส่งผู้ปกครอง", "รายงานนักเรียน",
            ],
            "weight": 1.0,
        },
    }

    def classify(self, text: str) -> RoutingResult:
        """Classify input text to determine which agent should handle it."""
        text_lower = text.lower()
        scores: dict[str, tuple[float, list[str]]] = {}

        for agent, config in self.PATTERNS.items():
            score = 0.0
            matches: list[str] = []
            for keyword in config["keywords"]:
                if keyword in text_lower:
                    score += config["weight"]
                    matches.append(keyword)
            scores[agent] = (score, matches)

        # Get best match
        best_agent = max(scores, key=lambda k: scores[k][0])
        best_score, best_matches = scores[best_agent]

        # Normalize confidence
        total_possible = len(self.PATTERNS[best_agent]["keywords"])
        confidence = min(best_score / max(total_possible * 0.3, 1), 1.0)

        if best_score == 0:
            return RoutingResult(
                agent="grading",  # default
                confidence=0.3,
                reasoning="ไม่พบ keyword ชัดเจน ใช้ค่าเริ่มต้น",
            )

        return RoutingResult(
            agent=best_agent,
            confidence=confidence,
            reasoning=f"พบ keyword: {', '.join(best_matches)}",
        )
