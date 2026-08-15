"""Tests for MOE/OBEC Integration Client (Task H1)."""

import pytest

from app.moe_client import MOEClient, StudentData, TeacherData, SchoolData


def test_moe_client_initializes():
    """Test MOEClient can be initialized."""
    client = MOEClient()
    assert client.base_url == "https://exchange-api.moe.go.th"


def test_moe_client_generates_auth_header():
    """Test HMAC authentication header generation."""
    client = MOEClient(api_key="test-key", api_secret="test-secret")
    header = client._generate_auth_header()
    
    assert "X-MOE-API-Key" in header
    assert "X-MOE-Timestamp" in header
    assert "X-MOE-Signature" in header
    assert header["X-MOE-API-Key"] == "test-key"


def test_moe_client_no_auth_without_keys():
    """Test that no auth header is generated without keys."""
    client = MOEClient()
    header = client._generate_auth_header()
    assert header == {}
