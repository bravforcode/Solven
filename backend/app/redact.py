"""PDPA redaction for external LLM calls (AUD-C-04 / SEC-H-03 / T0-05).

Student text is untrusted + sensitive. Before ANY approved external provider
call, configured synthetic/real identifier patterns are replaced so raw PII
never leaves the controlled boundary. The original is kept in local storage
(teacher needs it); only the provider payload is redacted.

ASSUMPTION (documented in 02_implementation_plan.md): this is a technical
boundary for synthetic/demo data; the final legal PDPA redaction policy and
approved provider region are owner decisions. Patterns below cover Thai and
international formats found in the audit (guardrail.py:11-14 gap).
"""

import re

_PATTERNS: list[tuple[str, str]] = [
    # Thai mobile: 08X-XXXXXXX, 0812345678, +66 81 234 5678, 08X XXX XXXX
    (r"(?<!\d)(?:\+?66[\s-]?)?0\d{1,2}[\s-]?\d{3}[\s-]?\d{3,4}(?!\d)", "[PHONE]"),
    # Thai national ID: 13 digits (with optional dashes)
    (r"(?<!\d)\d{1}-\d{4}-\d{5}-\d{2}-\d{1}(?!\d)", "[THAI_ID]"),
    (r"(?<!\d)\d{13}(?!\d)", "[THAI_ID]"),
    # email
    (r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[EMAIL]"),
    # long digit runs (student numbers etc.)
    (r"(?<!\d)\d{8,}(?!\d)", "[ID_NUMBER]"),
]


def redact_pii(text: str) -> str:
    """Replace known identifier patterns with placeholders."""
    if not text:
        return text
    out = text
    for pattern, repl in _PATTERNS:
        out = re.sub(pattern, repl, out)
    return out
