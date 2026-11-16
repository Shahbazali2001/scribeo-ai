import asyncio
import io
from typing import List, Literal, Optional
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel

from .config import settings
from .engine import FakeOcrEngine, OcrEngine, TrOcrEngine

app = FastAPI(
    title="Handwriting OCR Service",
    version="1.0.0",
    description="docTR line detection + Microsoft TrOCR handwriting recognition service",
)

_semaphore = asyncio.Semaphore(settings.max_concurrency)
_engine: Optional[OcrEngine] = None


def get_engine() -> OcrEngine:
    global _engine
    if _engine is None:
        _engine = FakeOcrEngine() if settings.use_fake_engine else TrOcrEngine()
    return _engine


def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")) -> None:
    if x_api_key != settings.ocr_api_key:
        raise HTTPException(status_code=401, detail="Invalid X-API-Key")


class LineItemResponse(BaseModel):
    text: str
    confidence: float
    box: List[int]


class ReadResponse(BaseModel):
    text: str
    confidence: float
    lines: List[LineItemResponse]
    model: str
    duration_ms: int


@app.get("/health")
async def health():
    return {"status": "ok", "model": settings.trocr_model}


@app.post(
    "/v1/read",
    response_model=ReadResponse,
    dependencies=[Depends(verify_api_key)],
)
async def read_handwriting(
    image: UploadFile = File(...),
    mode: Literal["page", "line"] = Form("page"),
    engine: OcrEngine = Depends(get_engine),
):
    raw = await image.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(status_code=413, detail="Image exceeds maximum upload size")

    try:
        pil_image = Image.open(io.BytesIO(raw))
        pil_image.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Unsupported or corrupted image file")

    try:
        await asyncio.wait_for(_semaphore.acquire(), timeout=settings.queue_timeout_s)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=503, detail="MODEL_BUSY")

    try:
        result = await asyncio.to_thread(engine.read, pil_image, mode)
    finally:
        _semaphore.release()

    return ReadResponse(
        text=result.text,
        confidence=result.confidence,
        lines=[
            LineItemResponse(text=l.text, confidence=l.confidence, box=list(l.box))
            for l in result.lines
        ],
        model=result.model,
        duration_ms=result.duration_ms,
    )
