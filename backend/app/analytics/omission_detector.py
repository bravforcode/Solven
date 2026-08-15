"""Omission detector — skip pattern detection, impact estimation."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class OmissionAnalysis:
    """Analysis of omitted/skipped questions."""

    omitted_indices: list[int]
    omitted_count: int
    total_questions: int
    omission_rate: float
    impact_estimate: str  # high, medium, low
    pattern: str  # random, sequential, clustered


class OmissionDetector:
    """Detects skipped/omitted questions and estimates impact.

    Based on Graider's omission impact analysis pattern.
    Analyzes submission text to find empty/skipped answers.
    """

    IMPACT_THRESHOLDS = {
        "high": 0.3,  # >30% omitted
        "medium": 0.15,  # 15-30% omitted
        "low": 0.05,  # <15% omitted
    }

    def detect(self, submission: str, total_questions: int) -> OmissionAnalysis:
        """Detect omitted questions in a submission."""
        lines = submission.strip().split("\n")
        omitted: list[int] = []

        for i, line in enumerate(lines, 1):
            # Check if answer is empty or only whitespace
            if ":" in line:
                answer = line.split(":", 1)[-1].strip()
            else:
                answer = line.strip()
            if not answer or answer == "" or answer == "-":
                omitted.append(i)

        omission_rate = len(omitted) / total_questions if total_questions > 0 else 0

        # Determine impact
        if omission_rate > self.IMPACT_THRESHOLDS["high"]:
            impact = "high"
        elif omission_rate > self.IMPACT_THRESHOLDS["medium"]:
            impact = "medium"
        else:
            impact = "low"

        # Detect pattern
        if len(omitted) <= 1:
            pattern = "random"
        elif omitted == list(range(omitted[0], omitted[0] + len(omitted))):
            pattern = "sequential"
        else:
            pattern = "clustered"

        return OmissionAnalysis(
            omitted_indices=omitted,
            omitted_count=len(omitted),
            total_questions=total_questions,
            omission_rate=omission_rate,
            impact_estimate=impact,
            pattern=pattern,
        )
