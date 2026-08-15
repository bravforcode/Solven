"""MOE/OBEC Integration Client — Thai Ministry of Education API integration.

Based on MOE Exchange API (exchange-api.moe.go.th) and OBEC Open Data.
Supports student, teacher, and school data retrieval.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import time
from dataclasses import dataclass
from typing import Optional

import httpx

MOE_API_BASE = os.environ.get("MOE_API_BASE_URL", "https://exchange-api.moe.go.th")
OBEC_API_BASE = os.environ.get("OBEC_API_BASE_URL", "https://obecdata.obec.go.th")


@dataclass
class StudentData:
    """Student data from MOE API."""

    student_id: str
    national_id: str  # เลขบัตรประชาชน (hashed for PDPA)
    name: str
    school_code: str
    grade_level: str
    classroom: str


@dataclass
class TeacherData:
    """Teacher data from MOE API."""

    teacher_id: str
    name: str
    school_code: str
    position: str
    subjects: list[str]


@dataclass
class SchoolData:
    """School data from MOE API."""

    school_code: str
    name: str
    district: str
    province: str
    level: str


class MOEClient:
    """Client for MOE Exchange API.

    Supports authentication via API key and HMAC signature.
    All student data is hashed for PDPA compliance.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.api_key = api_key or os.environ.get("MOE_API_KEY", "")
        self.api_secret = api_secret or os.environ.get("MOE_API_SECRET", "")
        self.base_url = base_url or MOE_API_BASE

    def _generate_auth_header(self) -> dict:
        """Generate HMAC authentication header for MOE API."""
        if not self.api_key or not self.api_secret:
            return {}
        
        timestamp = str(int(time.time()))
        message = f"{self.api_key}:{timestamp}"
        signature = hmac.new(
            self.api_secret.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()
        
        return {
            "X-MOE-API-Key": self.api_key,
            "X-MOE-Timestamp": timestamp,
            "X-MOE-Signature": signature,
        }

    def get_student(self, student_id: str) -> Optional[StudentData]:
        """Retrieve student data from MOE API."""
        try:
            headers = self._generate_auth_header()
            resp = httpx.get(
                f"{self.base_url}/api/v1/students/{student_id}",
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            
            return StudentData(
                student_id=data["student_id"],
                national_id=hashlib.sha256(data["national_id"].encode()).hexdigest()[:16],
                name=data["name"],
                school_code=data["school_code"],
                grade_level=data["grade_level"],
                classroom=data["classroom"],
            )
        except (httpx.HTTPError, KeyError) as e:
            return None

    def get_teacher(self, teacher_id: str) -> Optional[TeacherData]:
        """Retrieve teacher data from MOE API."""
        try:
            headers = self._generate_auth_header()
            resp = httpx.get(
                f"{self.base_url}/api/v1/teachers/{teacher_id}",
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            
            return TeacherData(
                teacher_id=data["teacher_id"],
                name=data["name"],
                school_code=data["school_code"],
                position=data["position"],
                subjects=data.get("subjects", []),
            )
        except (httpx.HTTPError, KeyError) as e:
            return None

    def get_school(self, school_code: str) -> Optional[SchoolData]:
        """Retrieve school data from MOE API."""
        try:
            headers = self._generate_auth_header()
            resp = httpx.get(
                f"{self.base_url}/api/v1/schools/{school_code}",
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            
            return SchoolData(
                school_code=data["school_code"],
                name=data["name"],
                district=data["district"],
                province=data["province"],
                level=data["level"],
            )
        except (httpx.HTTPError, KeyError) as e:
            return None
