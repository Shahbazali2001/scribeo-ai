import time
from dataclasses import dataclass
from typing import List, Protocol, Tuple
from PIL import Image

from .config import settings
from .lines import DocTrLineDetector, normalize_image


@dataclass
class LinePrediction:
    text: str
    confidence: float
    box: Tuple[int, int, int, int]


@dataclass
class OcrResult:
    text: str
    confidence: float
    lines: List[LinePrediction]
    model: str
    duration_ms: int


class OcrEngine(Protocol):
    def read(self, image: Image.Image, mode: str = "page") -> OcrResult: ...


class FakeOcrEngine:
    """Deterministic fake OCR engine for fast unit tests without downloading model weights."""

    def __init__(self, model_name: str = "fake/trocr-handwritten"):
        self.model_name = model_name

    def read(self, image: Image.Image, mode: str = "page") -> OcrResult:
        w, h = image.size
        line = LinePrediction(
            text="Simulated handwritten English line from fake engine.",
            confidence=0.93,
            box=(0, 0, w, h),
        )
        return OcrResult(
            text=line.text,
            confidence=0.93,
            lines=[line],
            model=self.model_name,
            duration_ms=12,
        )


class TrOcrEngine:
    """Production handwriting OCR engine using docTR line detection + Hugging Face TrOCR."""

    def __init__(self):
        self.model_name = settings.trocr_model
        self.detector = DocTrLineDetector(arch=settings.doctr_det_arch)
        self._processor = None
        self._model = None

    def _load(self):
        if self._processor is None or self._model is None:
            from transformers import TrOCRProcessor, VisionEncoderDecoderModel

            self._processor = TrOCRProcessor.from_pretrained(self.model_name)
            self._model = VisionEncoderDecoderModel.from_pretrained(self.model_name)
            self._model.eval()

    def _recognize_crops(self, crops: List[Image.Image]) -> List[Tuple[str, float]]:
        self._load()
        import torch

        results: List[Tuple[str, float]] = []
        batch_size = settings.batch_size
        for i in range(0, len(crops), batch_size):
            batch = crops[i : i + batch_size]
            pixel_values = self._processor(images=batch, return_tensors="pt").pixel_values
            with torch.no_grad():
                outputs = self._model.generate(
                    pixel_values,
                    num_beams=settings.num_beams,
                    return_dict_in_generate=True,
                    output_scores=True,
                    max_new_tokens=128,
                )
            texts = self._processor.batch_decode(outputs.sequences, skip_special_tokens=True)
            for idx, txt in enumerate(texts):
                cleaned = txt.strip()
                conf = 0.88 if cleaned else 0.0
                results.append((cleaned, conf))
        return results

    def read(self, image: Image.Image, mode: str = "page") -> OcrResult:
        start = time.perf_counter()
        norm = normalize_image(image, max_side=settings.max_image_side)
        w, h = norm.size

        if mode == "line":
            preds = self._recognize_crops([norm])
            text, conf = preds[0] if preds else ("", 0.0)
            lines = [LinePrediction(text=text, confidence=conf, box=(0, 0, w, h))] if text else []
        else:
            detected = self.detector.detect_lines(norm)
            if not detected:
                lines = []
            else:
                preds = self._recognize_crops([d.crop for d in detected])
                lines = [
                    LinePrediction(text=txt, confidence=conf, box=d.box)
                    for d, (txt, conf) in zip(detected, preds)
                    if txt
                ]

        full_text = "\n".join(line.text for line in lines)
        avg_conf = (
            sum(line.confidence for line in lines) / len(lines) if lines else 0.0
        )
        duration_ms = int((time.perf_counter() - start) * 1000)

        return OcrResult(
            text=full_text,
            confidence=round(avg_conf, 4),
            lines=lines,
            model=self.model_name,
            duration_ms=duration_ms,
        )
