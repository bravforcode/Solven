"""School hierarchy — multi-tenant district/school/classroom management.

Based on 6B Education, Plio, OpenFGA patterns for multi-tenant architecture.
Supports Thai school system: สำนักงานเขตพื้นที่การศึกษา > โรงเรียน > ห้องเรียน
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional


@dataclass
class District:
    """สำนักงานเขตพื้นที่การศึกษา (Education District Office)"""

    id: str
    name: str
    province: str
    created_at: str


@dataclass
class School:
    """โรงเรียน (School)"""

    id: str
    district_id: str
    name: str
    school_code: str  # รหัสโรงเรียน from MOE
    level: str  # อนุบาล, ประถม, มัธยม
    created_at: str


@dataclass
class Classroom:
    """ห้องเรียน (Classroom)"""

    id: str
    school_id: str
    name: str  # เช่น ป.3/1
    grade_level: str  # เช่น ป.3
    teacher_id: Optional[str]
    student_count: int
    created_at: str


class SchoolHierarchy:
    """Manages the Thai school hierarchy for multi-tenant operations."""

    def __init__(self, store):
        self.store = store

    def create_district(self, name: str, province: str) -> District:
        """Create a new education district."""
        district_id = str(uuid.uuid4())
        now = self.store.now_iso() if hasattr(self.store, "now_iso") else ""
        
        with self.store._c(platform=True) as conn:
            conn.execute(
                "INSERT INTO districts (id, name, province, created_at) VALUES (%s, %s, %s, %s)",
                (district_id, name, province, now),
            )
        
        return District(id=district_id, name=name, province=province, created_at=now)

    def create_school(
        self, district_id: str, name: str, school_code: str, level: str
    ) -> School:
        """Create a new school within a district."""
        school_id = str(uuid.uuid4())
        now = ""
        
        with self.store._c(platform=True) as conn:
            conn.execute(
                "INSERT INTO schools (id, district_id, name, school_code, level, created_at) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (school_id, district_id, name, school_code, level, now),
            )
        
        return School(
            id=school_id,
            district_id=district_id,
            name=name,
            school_code=school_code,
            level=level,
            created_at=now,
        )

    def create_classroom(
        self,
        school_id: str,
        name: str,
        grade_level: str,
        teacher_id: Optional[str] = None,
        student_count: int = 0,
    ) -> Classroom:
        """Create a new classroom within a school."""
        classroom_id = str(uuid.uuid4())
        now = ""
        
        with self.store._c(platform=True) as conn:
            conn.execute(
                "INSERT INTO classrooms (id, school_id, name, grade_level, teacher_id, student_count, created_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (classroom_id, school_id, name, grade_level, teacher_id, student_count, now),
            )
        
        return Classroom(
            id=classroom_id,
            school_id=school_id,
            name=name,
            grade_level=grade_level,
            teacher_id=teacher_id,
            student_count=student_count,
            created_at=now,
        )

    def get_school_hierarchy(self, school_id: str) -> dict:
        """Get the full hierarchy for a school (district + school + classrooms)."""
        with self.store._c(platform=True) as conn:
            school_row = conn.execute(
                "SELECT * FROM schools WHERE id = %s", (school_id,)
            ).fetchone()
            
            if not school_row:
                return {}
            
            district_row = conn.execute(
                "SELECT * FROM districts WHERE id = %s", (school_row["district_id"],)
            ).fetchone()
            
            classrooms = conn.execute(
                "SELECT * FROM classrooms WHERE school_id = %s", (school_id,)
            ).fetchall()
            
            return {
                "district": dict(district_row) if district_row else None,
                "school": dict(school_row),
                "classrooms": [dict(c) for c in classrooms],
            }
