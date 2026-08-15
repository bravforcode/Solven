"""Image preprocessor — binarize, deskew, noise removal for better OCR.

Based on Keranos Tech pipeline for Thai handwriting.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """Preprocess images for better OCR accuracy.

    Applies binarization, deskewing, and noise removal.
    Falls back gracefully if OpenCV is not installed.
    """

    def binarize(self, image):
        """Convert image to binary (black/white) for better OCR."""
        if image is None:
            return None
        try:
            import cv2

            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            # Apply adaptive threshold
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            return binary
        except ImportError:
            logger.warning("OpenCV not available, skipping binarization")
            return image

    def deskew(self, image):
        """Correct image skew/rotation."""
        if image is None:
            return None
        try:
            import cv2
            import numpy as np

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            coords = np.column_stack(np.where(gray > 0))
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
            )
            return rotated
        except ImportError:
            return image

    def remove_noise(self, image):
        """Remove noise from image."""
        if image is None:
            return None
        try:
            import cv2

            return cv2.medianBlur(image, 3)
        except ImportError:
            return image

    def preprocess(self, image):
        """Full preprocessing pipeline."""
        image = self.binarize(image)
        image = self.deskew(image)
        image = self.remove_noise(image)
        return image
