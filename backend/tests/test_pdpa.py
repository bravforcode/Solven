"""Tests for PDPA Compliance Engine (Task G1)."""

import pytest

from app.pdpa import ConsentManager, AuditLogger, ConsentResult, AuditResult


def test_consent_manager_records_consent():
    """Test recording consent."""
    class MockStore:
        def _c(self, platform=False):
            class MockConn:
                def __enter__(self):
                    return self
                def __exit__(self, *args):
                    pass
                def execute(self, *args, **kwargs):
                    pass
            return MockConn()
    
    store = MockStore()
    manager = ConsentManager(store)
    
    result = manager.record_consent(
        student_id="student-123",
        purpose="grading",
        granted=True,
        guardian_id="guardian-456"
    )
    
    assert isinstance(result, ConsentResult)
    assert result.student_id == "student-123"
    assert result.purpose == "grading"
    assert result.granted is True


def test_audit_log_records_action():
    """Test recording audit action."""
    class MockStore:
        def _c(self, platform=False):
            class MockConn:
                def __enter__(self):
                    return self
                def __exit__(self, *args):
                    pass
                def execute(self, *args, **kwargs):
                    pass
            return MockConn()
    
    store = MockStore()
    logger = AuditLogger(store)
    
    result = logger.log_action(
        action="view_draft",
        actor="teacher-789",
        target="student-123",
        details="Viewed grading draft"
    )
    
    assert isinstance(result, AuditResult)
    assert result.action == "view_draft"
    assert result.actor == "teacher-789"
    assert result.target == "student-123"
