"""PDPA Compliance Engine — Thailand Personal Data Protection Act.

Based on PDPA (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562) requirements.
Manages consent, audit logging, and data export for student data.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional


@dataclass
class ConsentResult:
    """Result of a consent operation."""

    consent_id: str
    student_id: str
    purpose: str
    granted: bool
    created_at: str


@dataclass
class AuditResult:
    """Result of an audit log operation."""

    audit_id: str
    action: str
    actor: str
    target: str
    details: str
    created_at: str


class ConsentManager:
    """Manages PDPA consent for student data processing.

    Records consent, checks consent status, and handles revocation.
    """

    def __init__(self, store):
        self.store = store

    def record_consent(
        self,
        student_id: str,
        purpose: str,
        granted: bool,
        guardian_id: Optional[str] = None,
    ) -> ConsentResult:
        """Record consent for student data processing."""
        consent_id = str(uuid.uuid4())
        now = ""
        
        with self.store._c(platform=True) as conn:
            conn.execute(
                "INSERT INTO consents (id, student_id, purpose, granted, guardian_id, created_at) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (consent_id, student_id, purpose, granted, guardian_id, now),
            )
        
        return ConsentResult(
            consent_id=consent_id,
            student_id=student_id,
            purpose=purpose,
            granted=granted,
            created_at=now,
        )

    def check_consent(self, student_id: str, purpose: str) -> bool:
        """Check if consent exists and is granted for a purpose."""
        with self.store._c(platform=True) as conn:
            row = conn.execute(
                "SELECT granted FROM consents WHERE student_id = %s AND purpose = %s "
                "ORDER BY created_at DESC LIMIT 1",
                (student_id, purpose),
            ).fetchone()
            
            if row is None:
                return False
            return row["granted"]

    def revoke_consent(self, student_id: str, purpose: str) -> bool:
        """Revoke consent for a specific purpose."""
        with self.store._c(platform=True) as conn:
            conn.execute(
                "UPDATE consents SET granted = false WHERE student_id = %s AND purpose = %s",
                (student_id, purpose),
            )
            return True

    def export_consents(self, student_id: str) -> list[dict]:
        """Export all consent records for a student (PDPA right to access)."""
        with self.store._c(platform=True) as conn:
            rows = conn.execute(
                "SELECT * FROM consents WHERE student_id = %s ORDER BY created_at",
                (student_id,),
            ).fetchall()
            return [dict(r) for r in rows]


class AuditLogger:
    """Audit logger for PDPA compliance.

    Records all data access and processing activities.
    """

    def __init__(self, store):
        self.store = store

    def log_action(
        self,
        action: str,
        actor: str,
        target: str,
        details: str = "",
    ) -> AuditResult:
        """Log an audit action."""
        audit_id = str(uuid.uuid4())
        now = ""
        
        with self.store._c(platform=True) as conn:
            conn.execute(
                "INSERT INTO audit_log (id, action, actor, target, details, created_at) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (audit_id, action, actor, target, details, now),
            )
        
        return AuditResult(
            audit_id=audit_id,
            action=action,
            actor=actor,
            target=target,
            details=details,
            created_at=now,
        )

    def get_audit_trail(
        self,
        student_id: Optional[str] = None,
        actor: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict]:
        """Get audit trail with optional filters."""
        with self.store._c(platform=True) as conn:
            query = "SELECT * FROM audit_log WHERE 1=1"
            params: list = []
            
            if student_id:
                query += " AND target = %s"
                params.append(student_id)
            if actor:
                query += " AND actor = %s"
                params.append(actor)
            
            query += " ORDER BY created_at DESC LIMIT %s"
            params.append(limit)
            
            rows = conn.execute(query, params).fetchall()
            return [dict(r) for r in rows]

    def export_audit_log(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> list[dict]:
        """Export audit log for compliance reporting."""
        with self.store._c(platform=True) as conn:
            query = "SELECT * FROM audit_log WHERE 1=1"
            params: list = []
            
            if start_date:
                query += " AND created_at >= %s"
                params.append(start_date)
            if end_date:
                query += " AND created_at <= %s"
                params.append(end_date)
            
            query += " ORDER BY created_at"
            
            rows = conn.execute(query, params).fetchall()
            return [dict(r) for r in rows]
