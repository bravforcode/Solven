"""Tests for Thai LLM integration (Task E1)."""

import pytest

from app.llm import ThaiLLM, MockLLM, get_llm


def test_thai_llm_initialization():
    """Test ThaiLLM can be initialized."""
    llm = ThaiLLM()
    assert llm.model == "typhoon2-8b" or "openthai" in llm.model.lower() or "typhoon" in llm.model.lower()


def test_thai_llm_fallback_to_mock():
    """Test that get_llm falls back to mock when no Thai LLM key is set."""
    import os
    # Clear any Thai LLM env vars
    env_backup = {}
    for key in ["THAI_LLM_API_KEY", "SOLVEN_LLM", "ANTHROPIC_API_KEY", 
                "OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"]:
        env_backup[key] = os.environ.pop(key, None)
    
    try:
        llm = get_llm()
        assert isinstance(llm, MockLLM)
    finally:
        # Restore env vars
        for key, val in env_backup.items():
            if val is not None:
                os.environ[key] = val


def test_get_llm_explicit_thai():
    """Test that SOLVEN_LLM=thai selects ThaiLLM when key is set."""
    import os
    # Clear other keys and set Thai
    env_backup = {}
    for key in ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", 
                "GROQ_API_KEY", "OPENROUTER_API_KEY"]:
        env_backup[key] = os.environ.pop(key, None)
    
    os.environ["SOLVEN_LLM"] = "thai"
    os.environ["THAI_LLM_API_KEY"] = "test-key"
    
    try:
        llm = get_llm()
        assert isinstance(llm, ThaiLLM)
    finally:
        # Restore env vars
        os.environ.pop("SOLVEN_LLM", None)
        os.environ.pop("THAI_LLM_API_KEY", None)
        for key, val in env_backup.items():
            if val is not None:
                os.environ[key] = val
