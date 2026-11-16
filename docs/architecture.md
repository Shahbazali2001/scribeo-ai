# Architecture & FRD Implementation Notes

This document summarizes how the codebase implements the architecture, data model, and edge-case rules defined in `README.md`.

## 1. Service Boundaries

| Component | Folder | Responsibilities |
|---|---|---|
| **Mobile App** | `src/` | Expo Router navigation (`(auth)`, `(tabs)`, `scan/[id]`, `privacy`), camera/gallery capture, TTS (`Listen`), clipboard (`Copy`), inline text editing, summary UI, and personal history. |
| **Backend API** | `backend/` | FastAPI service handling Supabase JWT verification, daily scan/summary quotas, idempotency deduplication, private Supabase Storage signed URLs, `langdetect` + English dictionary checks, and Google Gemini summarization. |
| **OCR Service** | `ocr-service/` | Stateless FastAPI wrapper around `docTR` (`db_mobilenet_v3_large` line detection) and Hugging Face `microsoft/trocr-base-handwritten` line recognition. |
| **Model Training** | `training/` | Fine-tuning scripts for `microsoft/trocr-base-handwritten` and opt-in consented feedback exporter. |

## 2. Error Code Catalog

All backend error responses follow the shape:
```json
{
  "error": {
    "code": "NOT_ENGLISH",
    "message": "Sorry, I can only read English handwriting right now."
  }
}
```

| Code | HTTP Status | Trigger Condition |
|---|---|---|
| `NOT_ENGLISH` | 200 (scan status `failed`) | `langdetect` and English word-ratio check indicate non-English text (`>= 25` chars). Image is deleted and not saved to history. |
| `NO_TEXT_FOUND` | 200 (scan status `failed`) | No lines detected by `docTR` or empty output from `TrOCR`. Image is deleted and not saved to history. |
| `IMAGE_TOO_SMALL` | 400 | Uploaded image width or height is below minimum threshold. |
| `UNSUPPORTED_FORMAT` | 400 | File is not JPEG, PNG, or WebP. |
| `QUOTA_EXCEEDED` | 429 | User exceeded `DAILY_SCAN_LIMIT` (30) or `DAILY_SUMMARY_LIMIT` (20). Includes `reset_at` (UTC midnight). |
| `MODEL_BUSY` | 503 | OCR service concurrency queue timed out. |
| `VERSION_CONFLICT` | 409 | `PATCH /api/v1/scans/{id}` sent an outdated `textVersion`. |
| `UPGRADE_REQUIRED` | 426 | Client `X-App-Version` header is older than `MIN_APP_VERSION`. |
