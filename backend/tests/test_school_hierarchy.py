"""Tests for multi-tenant school hierarchy (Task F1)."""

import pytest

from app.school_hierarchy import SchoolHierarchy, District, School, Classroom


def test_create_district():
    """Test creating a district."""
    # Create a mock store
    class MockStore:
        def now_iso(self):
            return "2026-01-01T00:00:00Z"
        
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
    hierarchy = SchoolHierarchy(store)
    
    district = hierarchy.create_district("เขตพื้นที่การศึกษาประถมศึกษากรุงเทพมหานคร", "กรุงเทพมหานคร")
    
    assert isinstance(district, District)
    assert district.name == "เขตพื้นที่การศึกษาประถมศึกษากรุงเทพมหานคร"
    assert district.province == "กรุงเทพมหานคร"
    assert len(district.id) > 0


def test_create_school():
    """Test creating a school."""
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
    hierarchy = SchoolHierarchy(store)
    
    school = hierarchy.create_school(
        district_id="test-district-id",
        name="โรงเรียนวัดพระศรีมหาธาตุ",
        school_code="100001",
        level="ประถม"
    )
    
    assert isinstance(school, School)
    assert school.name == "โรงเรียนวัดพระศรีมหาธาตุ"
    assert school.school_code == "100001"
    assert school.level == "ประถม"


def test_create_classroom():
    """Test creating a classroom."""
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
    hierarchy = SchoolHierarchy(store)
    
    classroom = hierarchy.create_classroom(
        school_id="test-school-id",
        name="ป.3/1",
        grade_level="ป.3",
        teacher_id="teacher-123",
        student_count=35
    )
    
    assert isinstance(classroom, Classroom)
    assert classroom.name == "ป.3/1"
    assert classroom.grade_level == "ป.3"
    assert classroom.student_count == 35
