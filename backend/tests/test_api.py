import io
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


def _make_jpeg_bytes(width: int = 360, height: int = 240) -> bytes:
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_end_to_end_scan_and_summary():
    with TestClient(app) as client:
        headers = {"Authorization": "Bearer sb-demo-jwt-token"}

        # 1. Health check
        health = client.get("/api/v1/health")
        assert health.status_code == 200

        # 2. Upload scan with Idempotency-Key
        create_res = client.post(
            "/api/v1/scans",
            headers={**headers, "Idempotency-Key": "test-idem-key-1"},
            files={"image": ("note.jpg", _make_jpeg_bytes(), "image/jpeg")},
        )
        assert create_res.status_code == 202
        scan = create_res.json()
        assert scan["status"] == "done"
        assert "Handwritten English notes" in scan["text"]
        scan_id = scan["id"]

        # 3. Duplicate upload with same Idempotency-Key returns same scan
        dup_res = client.post(
            "/api/v1/scans",
            headers={**headers, "Idempotency-Key": "test-idem-key-1"},
            files={"image": ("note.jpg", _make_jpeg_bytes(), "image/jpeg")},
        )
        assert dup_res.status_code == 202
        assert dup_res.json()["id"] == scan_id

        # 4. Generate summary
        sum_res = client.post(
            f"/api/v1/scans/{scan_id}/summary",
            headers=headers,
            json={"style": "bullets"},
        )
        assert sum_res.status_code == 200
        assert sum_res.json()["style"] == "bullets"

        # 5. Edit scan text with optimistic version check
        edit_res = client.patch(
            f"/api/v1/scans/{scan_id}",
            headers=headers,
            json={"text": "Updated handwritten English text.", "textVersion": 1},
        )
        assert edit_res.status_code == 200
        assert edit_res.json()["textVersion"] == 2

        # 6. Verify Google Sign-In token works with /api/v1/me
        google_headers = {
            "Authorization": "Bearer sb-google-jwt-123::user-google-1::alex.morgan@gmail.com"
        }
        me_res = client.get("/api/v1/me", headers=google_headers)
        assert me_res.status_code == 200
        assert me_res.json()["profile"]["id"] == "user-google-1"
        assert me_res.json()["profile"]["email"] == "alex.morgan@gmail.com"
