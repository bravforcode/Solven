"""OCR modules — Thai handwriting recognition and image preprocessing."""

from .preprocessor import ImagePreprocessor
from .thai_ocr import OCRResult, ThaiOCR

__all__ = [
    "ThaiOCR",
    "OCRResult",
    "ImagePreprocessor",
]
