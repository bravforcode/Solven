"""Rubric analyzer — z-score analysis, mastery probabilities (DCM-based)."""

from __future__ import annotations

import statistics
from dataclasses import dataclass


@dataclass
class RubricDiagnostic:
    """Diagnostic output from rubric analysis."""

    weakest_criterion: str
    strongest_criterion: str
    gap_from_mean: float
    score_distribution: dict[str, float]  # criterion -> z-score
    mastery_probabilities: dict[str, float]  # criterion -> P(mastery)
    overall_health: str  # good, warning, critical


class RubricAnalyzer:
    """Analyzes rubric scores to identify patterns and weaknesses.

    Based on DCM (Diagnostic Classification Models) research.
    Identifies weakest/strongest criteria, calculates mastery probabilities.
    """

    MASTERY_THRESHOLD = 0.7  # 70% of max = mastery

    def analyze(self, scores: dict[str, float]) -> RubricDiagnostic:
        """Analyze rubric scores and return diagnostic report."""
        if not scores:
            return RubricDiagnostic(
                weakest_criterion="",
                strongest_criterion="",
                gap_from_mean=0,
                score_distribution={},
                mastery_probabilities={},
                overall_health="critical",
            )

        values = list(scores.values())
        mean = statistics.mean(values)
        stdev = statistics.stdev(values) if len(values) > 1 else 1

        # Find weakest and strongest
        weakest = min(scores, key=scores.get)
        strongest = max(scores, key=scores.get)

        # Calculate z-scores
        z_scores: dict[str, float] = {}
        for criterion, score in scores.items():
            z_scores[criterion] = (score - mean) / stdev if stdev > 0 else 0

        # Mastery probabilities (sigmoid-like)
        mastery_probs: dict[str, float] = {}
        for criterion, score in scores.items():
            # Normalize to 0-1 assuming max score is 10
            normalized = score / 10
            # Sigmoid-like probability
            mastery_probs[criterion] = min(normalized / self.MASTERY_THRESHOLD, 1.0)

        # Overall health
        below_threshold = sum(1 for p in mastery_probs.values() if p < 0.5)
        if below_threshold == 0:
            health = "good"
        elif below_threshold <= 1:
            health = "warning"
        else:
            health = "critical"

        return RubricDiagnostic(
            weakest_criterion=weakest,
            strongest_criterion=strongest,
            gap_from_mean=mean - scores[weakest],
            score_distribution=z_scores,
            mastery_probabilities=mastery_probs,
            overall_health=health,
        )
