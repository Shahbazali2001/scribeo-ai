from dataclasses import dataclass
from typing import List, Protocol
import httpx

from app.core.config import settings
from app.core.errors import AppError


@dataclass
class OcrLine:
    text: str
    confidence: float
    box: List[int]


@dataclass
class OcrServiceOutput:
    text: str
    confidence: float
    lines: List[OcrLine]
    model: str
    duration_ms: int


class OcrProvider(Protocol):
    async def read_image(self, image_bytes: bytes, filename: str = "page.jpg") -> OcrServiceOutput: ...


class HttpOcrProvider:
    """Calls the standalone ocr-service (/v1/read) with X-API-Key authentication."""

    async def read_image(self, image_bytes: bytes, filename: str = "page.jpg") -> OcrServiceOutput:
        url = f"{settings.ocr_service_url.rstrip('/')}/v1/read"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers={"X-API-Key": settings.ocr_service_key},
                    files={"image": (filename, image_bytes, "image/jpeg")},
                    data={"mode": "page"},
                )
        except httpx.RequestError:
            raise AppError(
                code="MODEL_BUSY",
                message="The handwriting recognition service is temporarily unreachable.",
                status_code=503,
            )

        if response.status_code == 503:
            raise AppError(
                code="MODEL_BUSY",
                message="The handwriting recognition service is busy. Please retry shortly.",
                status_code=503,
            )
        if response.status_code != 200:
            raise AppError(
                code="UNREADABLE",
                message="Could not process the uploaded image.",
                status_code=422,
            )

        data = response.json()
        return OcrServiceOutput(
            text=data.get("text", ""),
            confidence=float(data.get("confidence", 0.0)),
            lines=[
                OcrLine(
                    text=line["text"],
                    confidence=float(line["confidence"]),
                    box=list(line["box"]),
                )
                for line in data.get("lines", [])
            ],
            model=data.get("model", "microsoft/trocr-base-handwritten"),
            duration_ms=int(data.get("duration_ms", 0)),
        )


class FakeOcrProvider:
    """Deterministic fake provider for backend unit and integration tests."""

    def __init__(
        self,
        text: str = "Handwritten English notes recognized by Microsoft TrOCR.",
        confidence: float = 0.94,
    ):
        self.text = text
        self.confidence = confidence

    async def read_image(self, image_bytes: bytes, filename: str = "page.jpg") -> OcrServiceOutput:
        return OcrServiceOutput(
            text=self.text,
            confidence=self.confidence,
            lines=[OcrLine(text=self.text, confidence=self.confidence, box=[0, 0, 400, 80])],
            model="microsoft/trocr-base-handwritten",
            duration_ms=25,
        )
