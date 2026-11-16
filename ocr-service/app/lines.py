from dataclasses import dataclass
from typing import List, Tuple
from PIL import Image, ImageOps


@dataclass
class DetectedLine:
    box: Tuple[int, int, int, int]  # (x1, y1, x2, y2) in pixels
    crop: Image.Image


def normalize_image(image: Image.Image, max_side: int = 2000) -> Image.Image:
    """Apply EXIF transpose, convert to RGB, and downscale if larger than max_side."""
    img = ImageOps.exif_transpose(image).convert("RGB")
    w, h = img.size
    if max(w, h) > max_side:
        scale = max_side / float(max(w, h))
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return img


class DocTrLineDetector:
    """Splits a full page image into ordered horizontal line crops using docTR."""

    def __init__(self, arch: str = "db_mobilenet_v3_large"):
        self.arch = arch
        self._predictor = None

    def _load(self):
        if self._predictor is None:
            from doctr.models import detection_predictor

            self._predictor = detection_predictor(arch=self.arch, pretrained=True)

    def detect_lines(self, image: Image.Image) -> List[DetectedLine]:
        self._load()
        import numpy as np

        arr = np.asarray(image)
        h, w = arr.shape[:2]
        result = self._predictor([arr])[0]
        words = result.get("words", [])
        if len(words) == 0:
            return []

        boxes: List[Tuple[int, int, int, int]] = []
        for row in words:
            xmin, ymin, xmax, ymax = row[:4]
            x1 = max(0, int(xmin * w) - 4)
            y1 = max(0, int(ymin * h) - 4)
            x2 = min(w, int(xmax * w) + 4)
            y2 = min(h, int(ymax * h) + 4)
            if x2 > x1 and y2 > y1:
                boxes.append((x1, y1, x2, y2))

        # Sort top-to-bottom, left-to-right and merge overlapping vertical intervals into lines
        boxes.sort(key=lambda b: (b[1], b[0]))
        merged_lines: List[Tuple[int, int, int, int]] = []
        for box in boxes:
            if not merged_lines:
                merged_lines.append(box)
                continue
            prev = merged_lines[-1]
            prev_center_y = (prev[1] + prev[3]) / 2.0
            curr_center_y = (box[1] + box[3]) / 2.0
            prev_h = max(1, prev[3] - prev[1])
            if abs(curr_center_y - prev_center_y) < prev_h * 0.6:
                merged_lines[-1] = (
                    min(prev[0], box[0]),
                    min(prev[1], box[1]),
                    max(prev[2], box[2]),
                    max(prev[3], box[3]),
                )
            else:
                merged_lines.append(box)

        return [DetectedLine(box=b, crop=image.crop(b)) for b in merged_lines]
