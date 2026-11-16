import io
from fastapi.testclient import TestClient
from PIL import Image

from app.config import settings
from app.engine import FakeOcrEngine
from app.main import app, get_engine

app.dependency_overrides[get_engine] = lambda: FakeOcrEngine()
client = TestClient(app)


def _make_test_image_bytes() -> bytes:
    img = Image.new("RGB", (400, 120), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_read_requires_api_key():
    res = client.post(
        "/v1/read",
        files={"image": ("page.jpg", _make_test_image_bytes(), "image/jpeg")},
    )
    assert res.status_code in (401, 422)


def test_read_page_with_fake_engine():
    res = client.post(
        "/v1/read",
        headers={"X-API-Key": settings.ocr_api_key},
        files={"image": ("page.jpg", _make_test_image_bytes(), "image/jpeg")},
        data={"mode": "page"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "Simulated handwritten English line" in body["text"]
    assert 0.0 <= body["confidence"] <= 1.0
    assert len(body["lines"]) == 1
