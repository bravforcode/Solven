"""Tests for Thai OCR integration (Task C1)."""

import pytest

from app.ocr.thai_ocr import OCRResult, ThaiOCR


def test_thai_ocr_mock_mode():
    """Test OCR in mock mode (no model loaded)."""
    ocr = ThaiOCR(mock=True)
    result = ocr.recognize("nonexistent_image.png")
    assert isinstance(result, OCRResult)
    assert result.text == "[OCR mock] ผลลัพธ์จำลอง"
    assert result.confidence == 0.5
    assert result.language == "th"
    assert result.processing_time_ms >= 0


def test_thai_ocr_language_detection():
    """Test language detection."""
    ocr = ThaiOCR(mock=True)
    assert ocr._detect_language("สวัสดีครับ") == "th"
    assert ocr._detect_language("hello world") == "en"
    assert ocr._detect_language("สวัสดี hello") == "mixed"
    assert ocr._detect_language("") == "unknown"
