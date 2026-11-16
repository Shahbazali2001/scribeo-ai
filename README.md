# Text Detector: Handwriting-to-Text Mobile App

A React Native mobile app (iOS and Android) that reads **handwritten English text** from a photo, lets the user **copy** it or **listen** to it, and offers an optional AI **summary** that can also be copied or listened to. Every scan is saved to a personal history with its photo, text and summary.

> Working title. Replace "Text Detector" with the final app name once chosen.

---

## Contents

1. [Status](#status)
2. [Features](#features)
3. [How it works](#how-it-works)
4. [Architecture](#architecture)
5. [Tech stack](#tech-stack)
6. [Repository layout](#repository-layout)
7. [Getting started](#getting-started)
8. [Configuration](#configuration)
9. [API overview](#api-overview)
10. [Data model](#data-model)
11. [Language and edge-case rules](#language-and-edge-case-rules)
12. [Model accuracy and fine-tuning](#model-accuracy-and-fine-tuning)
13. [Security and privacy](#security-and-privacy)
14. [Testing](#testing)
15. [Deployment](#deployment)
16. [Roadmap](#roadmap)
17. [Known limitations](#known-limitations)
18. [Data and model licensing](#data-and-model-licensing)
19. [Project documents](#project-documents)
20. [Contributing and license](#contributing-and-license)

---

## Status

| Part | State | Notes |
| --- | --- | --- |
| UI design (Figma) | Core done | 14 core screens. Still to design: forgot password, delete confirmations, offline and upload-failed states, splash screen, dark mode |
| Requirements (FRD v1.2) | Done | About 90 numbered requirements, 52 edge cases, acceptance criteria |
| OCR model service (`ocr-service/`) | Scaffolded | FastAPI + docTR line detection + TrOCR. Unit tests pass using a fake engine. Run it with the real model weights on your machine to validate accuracy and speed |
| Backend API (`backend/`) | Planned | FastAPI + Supabase. An earlier Express prototype exists but is superseded and not part of this design |
| Mobile app (`mobile/`) | Planned | React Native with Expo |

Sections below describe the **target design**. Commands for `backend/` and `mobile/` apply once those folders are generated.

---

## Features

- Sign up with email and password, or sign in with Google.
- Capture a page with the in-app live camera, or upload a photo from the gallery.
- AI handwriting recognition for **English** text, with a clear message for other languages.
- Result screen: view the text, **Copy**, **Listen** (text-to-speech), and edit mistakes.
- Optional **summary** suggested for longer text (never automatic): Short, Bullets or Detailed, each with **Copy** and **Listen**.
- Personal **history**: photo, text and summary for every scan, synced across devices, searchable, deletable.
- Settings: theme, speech speed, privacy links, log out, delete account.
- Edge-case handling: no text found, blurry or dark photos, permissions denied, offline, timeouts, quotas, duplicate submits, expired sessions, and more.

---

## How it works

**User journey**

1. Install the app, sign up or log in (email or Google).
2. Capture a photo of the handwritten page, or choose one from the gallery.
3. The app prepares the photo (orientation, resize, compress) and uploads it.
4. The server reads the handwriting and the app shows the text with **Copy** and **Listen**.
5. For text of 80 words or more, a dismissible popup offers a summary. If the user taps **Summarize**, the summary appears with **Copy** and **Listen**.
6. The scan is saved to history for later.

**Scan pipeline (server side)**

```
POST /scans (image + Idempotency-Key)
  -> verify token, check daily quota, validate image
  -> store image in Supabase Storage, create scan row (status: processing), return 202 + scan id
  -> [background] line detector finds text lines (docTR)
  -> [background] TrOCR reads each line, lines joined in order
  -> [background] langdetect + English-word check + confidence check
  -> scan updated to done (text, language, model version) or failed (reason)
App polls GET /scans/{id} until done or failed
```

Scans are processed in the background because the OCR model can take tens of seconds on a CPU.

---

## Architecture

```
┌──────────────────────┐        HTTPS + sign-in token
│  React Native app    │ ─────────────────────────────┐
│  (Expo, iOS/Android) │                              │
└──────────┬───────────┘                              ▼
           │ auth SDK                       ┌──────────────────────┐
           ▼                                │   FastAPI backend    │
┌──────────────────────┐   verify token     │  (business rules,    │
│    Supabase Auth     │ <───────────────── │   quotas, summaries) │
└──────────────────────┘                    └───┬──────┬───────┬───┘
                                                │      │       │
                          ┌─────────────────────┘      │       └─────────────────┐
                          ▼                            ▼                         ▼
                ┌───────────────────┐       ┌───────────────────┐     ┌──────────────────┐
                │ Supabase Postgres │       │ Supabase Storage  │     │ Google Gemini API│
                │ (scans, summaries)│       │ (private images)  │     │   (summaries)    │
                └───────────────────┘       └───────────────────┘     └──────────────────┘
                                                │
                                                ▼  HTTP, API key
                                     ┌─────────────────────────┐
                                     │  OCR model service      │
                                     │  docTR + TrOCR (+ lang  │
                                     │  detect), FastAPI       │
                                     └─────────────────────────┘
```

Key decisions:

- The app talks only to the **FastAPI backend** (plus the Supabase auth SDK). The database is not exposed directly to the app.
- The **OCR model runs in its own service**, so the lightweight API does not carry PyTorch and the model can be scaled or moved to a GPU host independently.
- Every third party (OCR, summaries, storage) sits behind an **interface**, so it can be swapped by configuration.
- Images are stored in a **private bucket** and shown through **short-lived signed URLs**.

---

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Mobile | React Native with **Expo** (development build), Expo Router, TypeScript | Google sign-in needs native code, so Expo Go is not enough |
| Mobile state and data | TanStack Query, Zustand, React Hook Form + Zod | |
| Mobile device features | `expo-camera`, `expo-image-picker`, `expo-image-manipulator`, `expo-secure-store`, `expo-clipboard`, `expo-speech`, `expo-haptics` | |
| UI | NativeWind (Tailwind) + custom components, or React Native Paper | Final choice open |
| Backend API | **FastAPI** (Python), Pydantic, async | OpenAPI schema generated automatically |
| Auth | **Supabase Auth** (email/password and Google) | The API verifies the sign-in token on each request |
| Database | **PostgreSQL** (Supabase) | SQLAlchemy (async) + Alembic planned |
| Image storage | **Supabase Storage** (private bucket, signed URLs) | Cloudinary is an accepted alternative behind the same interface |
| Handwriting OCR | Hugging Face **`microsoft/trocr-base-handwritten`** + docTR line detector | Open source, hosted in `ocr-service/`, can be fine-tuned |
| Language check | Python **`langdetect`** + English-word check | Skipped for very short text |
| Summaries | **Google Gemini API** | Called only from the backend |
| Speech | On-device text-to-speech (`expo-speech`) | Cloud voices are a later option |
| CI and delivery | GitHub Actions, Expo EAS, Docker | |

---

## Repository layout

```
text-detector/
├── README.md
├── backend/                     # FastAPI API (planned)
│   ├── app/
│   │   ├── main.py              # app factory, lifespan, routers
│   │   ├── core/                # config, security (token verification), errors, rate limits
│   │   ├── db/                  # database session
│   │   ├── models/              # SQLAlchemy models: profile, scan, summary, usage_counter
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── api/v1/              # me, scans, summaries, feedback, health
│   │   ├── services/            # scan_service, summary_service, quota_service
│   │   ├── integrations/
│   │   │   ├── ocr/             # OcrProvider interface + client for ocr-service
│   │   │   ├── llm/             # SummaryProvider interface + Gemini provider + prompts
│   │   │   ├── storage/         # StorageProvider interface + Supabase Storage
│   │   │   └── language/        # langdetect wrapper + English checks
│   │   └── utils/               # image validation, text helpers
│   ├── alembic/                 # database migrations
│   ├── tests/                   # unit and integration tests, fakes for providers
│   ├── Dockerfile
│   └── .env.example
├── ocr-service/                 # TrOCR + docTR model service (scaffolded)
│   ├── app/                     # config.py, lines.py, engine.py, main.py
│   ├── tests/                   # tests using a fake engine
│   ├── scripts/evaluate.py      # CER/WER evaluation on your labeled photos
│   ├── Dockerfile
│   └── requirements.txt
├── mobile/                      # React Native (Expo) app (planned)
│   ├── app/                     # routes: (auth), (tabs), scan/*
│   └── src/                     # api, features, components, hooks, lib, store
├── training/                    # fine-tuning notebooks and scripts (planned)
└── docs/                        # FRD, Figma link, architecture notes
```

---

## Getting started

### Prerequisites

- Node.js (LTS) and npm or pnpm
- Python 3.11 or newer
- Docker (optional, recommended for the model service)
- A phone or emulator, plus an Expo development build for Google sign-in
- Accounts: Supabase, Google Cloud (OAuth client IDs), Google AI Studio (Gemini API key), Expo (EAS builds)

### 1. Create the Supabase project

1. Create a project and note the project URL and the keys.
2. **Auth:** enable email/password and the Google provider.
3. **Storage:** create a **private** bucket (for example `scans`). Do not make it public.
4. **Database:** run the migrations from `backend/` (see below). Enable row-level security on every table.
5. Check the current free-tier limits, including pausing of inactive projects.

### 2. Google sign-in setup

Create OAuth client IDs in Google Cloud (web, Android and iOS) and add them to Supabase and to the mobile app configuration. On mobile, sign in with a native Google module and pass the ID token to Supabase. This needs a development build, not Expo Go.

### 3. Gemini API key

Create a key in Google AI Studio and keep it **only on the backend**. Use the free tier while developing. Move to a paid tier before real users send private text, because free-tier content may be used by Google to improve its products.

### 4. Run the OCR model service (available now)

```bash
cd ocr-service
python -m venv .venv && source .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
cp .env.example .env            # set OCR_API_KEY
export $(grep -v '^#' .env | xargs)
uvicorn app.main:app --port 8000
```

The first start downloads the models. Test it:

```bash
curl -H "X-API-Key: $OCR_API_KEY" -F image=@page.jpg http://localhost:8000/v1/read
curl -H "X-API-Key: $OCR_API_KEY" -F image=@line.jpg -F mode=line http://localhost:8000/v1/read   # one line only
```

Docker alternative:

```bash
docker build -t handwriting-ocr ocr-service
docker run -p 8000:8000 -e OCR_API_KEY=... handwriting-ocr
```

### 5. Run the backend (once `backend/` is generated)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # fill in the values from Configuration
alembic upgrade head
uvicorn app.main:app --reload --port 4000
```

Open `http://localhost:4000/docs` for the interactive API documentation.

### 6. Run the mobile app (once `mobile/` is generated)

```bash
cd mobile
npm install
cp .env.example .env            # API URL, Supabase URL and anon key, Google client IDs
npx expo start --dev-client     # after installing a development build on your device
```

Create a development build with Expo EAS (`eas build --profile development`) the first time.

---

## Configuration

### `ocr-service/.env`

| Variable | Purpose | Default |
| --- | --- | --- |
| `OCR_API_KEY` | Shared secret the backend sends in `X-API-Key` | required |
| `TROCR_MODEL` | Recognition model | `microsoft/trocr-small-handwritten` in the scaffold; set `microsoft/trocr-base-handwritten` for the planned primary model |
| `DOCTR_DET_ARCH` | Line detector | `db_mobilenet_v3_large` |
| `NUM_BEAMS`, `BATCH_SIZE` | Speed and accuracy trade-offs | 4, 8 |
| `MAX_IMAGE_SIDE`, `MAX_UPLOAD_MB` | Input limits | 2000, 10 |
| `MAX_CONCURRENCY`, `QUEUE_TIMEOUT_S` | Concurrent inferences and waiting time | 1, 30 |

### `backend/.env` (planned)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Server-side key for storage operations. **Never ship it in the app** |
| `SUPABASE_JWT_*` | Settings used to verify Supabase sign-in tokens (follow the current Supabase docs) |
| `STORAGE_BUCKET` | Private bucket name |
| `OCR_SERVICE_URL`, `OCR_SERVICE_KEY` | Where and how to call `ocr-service` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini access and model name (keep the model name configurable) |
| `DAILY_SCAN_LIMIT` | Scans per user per day (default 30) |
| `DAILY_SUMMARY_LIMIT` | Summaries per user per day (default 20) |
| `MIN_SUMMARY_WORDS` | Words needed before the summary suggestion appears (default 80) |
| `LANG_MIN_CHARS`, `ENGLISH_MIN_PROB` | Language-check thresholds |

### `mobile/.env` (planned)

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Backend base URL |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase settings for the auth SDK |
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | Google sign-in client IDs |

Anything prefixed `EXPO_PUBLIC_` is visible to users. Never put secrets there.

---

## API overview

Base path `/api/v1`. All endpoints except `/health` need `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/me` | Profile, stats and latest scans for the dashboard |
| PATCH | `/me` | Update display name and settings |
| DELETE | `/me` | Delete the account and all data (recent sign-in required) |
| POST | `/scans` | Upload an image. Returns **202** with a scan id and status `processing`. Send an `Idempotency-Key` header |
| GET | `/scans` | History with cursor pagination and optional search (`q`) |
| GET | `/scans/{id}` | One scan with status and a fresh image link |
| PATCH | `/scans/{id}` | Edit the text (version check) |
| DELETE | `/scans/{id}` | Delete a scan, its image and summaries |
| POST | `/scans/{id}/summary` | Create a summary (`style`: short, bullets, detailed) |
| GET | `/scans/{id}/summary` | Get a cached summary |
| POST | `/scans/{id}/feedback` | Send accuracy feedback (opt-in for training use) |
| GET | `/health` | Service status |

Conventions: JSON, UTC dates, one error shape with stable codes (`NOT_ENGLISH`, `NO_TEXT_FOUND`, `UNREADABLE`, `IMAGE_TOO_SMALL`, `UNSUPPORTED_FORMAT`, `QUOTA_EXCEEDED`, `MODEL_BUSY`), cursor pagination, an app-version header (outdated apps get an upgrade response), and rate-limit headers. The OpenAPI schema is used to generate the mobile app's typed client.

**OCR service endpoint**

`POST /v1/read` (header `X-API-Key`, multipart field `image`, optional `mode=page|line`) returns the text, an overall confidence (0 to 1), per-line text with boxes, the model name and the duration.

---

## Data model

PostgreSQL is the system of record. Credentials and sessions live in Supabase Auth.

| Table | Key fields |
| --- | --- |
| `profiles` | id (same as auth user id), display_name, settings, created_at |
| `scans` | id, user_id, image_path, image_width, image_height, text, text_version, word_count, confidence, ocr_model_version, language, language_confidence, status (processing, done, failed), idempotency_key, created_at, updated_at |
| `summaries` | id, scan_id, style, text, text_version, summary_model, created_at |
| `usage_counters` | user_id, day, scans, summaries |
| `scan_feedback` (optional) | scan_id, user_id, rating, corrected_text, consent_for_training, created_at |

Rules: users can access only their own rows (row-level security on every table); deleting a scan deletes its summaries and image; one scan per user and idempotency key; one summary per scan, style and text version; full-text search indexes on scan and summary text.

---

## Language and edge-case rules

The app reads **English handwriting only**. Highlights (the full list of 52 cases is in the FRD):

- **Other language:** the result is not saved and the app says: "Sorry, I can only read English handwriting right now." The model reads Latin letters only, so the app can say the text does not look like English but cannot name the language.
- **Short text:** `langdetect` is unreliable on very short text, so the language check is skipped below a minimum length.
- **No text or blank page:** friendly message with tips; nothing is saved.
- **Low confidence:** the text is shown with a "please review" banner.
- **Poor photo quality:** a warning before upload (Retake or Use anyway).
- **Permissions denied:** explanation, gallery fallback, and a shortcut to settings.
- **Offline, timeouts, duplicate taps:** retries with the same idempotency key; exactly one scan is created.
- **Quotas:** clear message with the reset time.
- **Session expiry:** silent token refresh, otherwise log in again while keeping the photo.
- **Summary or speech problems:** the text always stays available; clear messages for model errors, rate limits, missing voices and audio interruptions.

---

## Model accuracy and fine-tuning

**Primary model:** `microsoft/trocr-base-handwritten`, an open-source recognizer that reads **one line at a time**. A docTR line detector splits each page into lines first. Always check the model card license.

**Plan**

1. **Baseline:** measure the unchanged model on at least 100 labeled phone photos (character and word error rate) with `ocr-service/scripts/evaluate.py`. Put images and matching `.txt` files in one folder.
2. **Fix the pipeline first:** orientation, cropping, contrast and line detection often matter more than the model.
3. **Fine-tune if a clear gap remains**, using the Hugging Face training tools on a GPU (a free notebook GPU is enough to start). Promote a new model version only if it beats the current one on your phone-photo test set without getting worse on the IAM test split. Keep older versions for rollback.
4. **Collect better data over time** with explicit opt-in consent from users (accuracy feedback and corrected text).

**Data sources**

| Source | Use | Note |
| --- | --- | --- |
| IAM Handwriting Database | English handwritten lines | Free for non-commercial research only |
| CVL Database | English and German handwritten texts (use the English parts) | Non-commercial license |
| Synthetic lines (TextRecognitionDataGenerator, TRDG) | Handwriting-style fonts, varied backgrounds, blur, rotation, noise | Check each font license |
| Consented user corrections | Phone-photo-like real data | Best long-term source |

The base model was already fine-tuned on IAM, so IAM alone adds little. Phone-photo-like data helps most.

---

## Security and privacy

- Transport over TLS only. Passwords are handled by Supabase Auth, never by the API.
- Tokens are stored in secure device storage (Keychain or Keystore).
- Every API call checks the signed-in user against the record being accessed. Row-level security stays on as a safety net.
- Images are private and shown through short-lived signed links. Location metadata is removed on the device.
- All secrets (Gemini key, Supabase service key, OCR service key) stay on the server.
- Rate limiting and daily quotas protect against abuse and unexpected cost.
- Scanned text is treated as data in prompts, never as instructions (prompt-injection safeguard).
- Image content and text are never written to logs or error reports.
- Handwritten text is sent to Google when a summary is requested. Say so in the privacy policy, and use a paid Gemini tier for real users.
- Accounts can be deleted in the app, which removes the profile, scans, images and summaries. Both app stores require this.
- If Google sign-in is offered, check Apple's current sign-in rules for iOS (for example Sign in with Apple or an equivalent option) before submission.

---

## Testing

- **ocr-service:** `pip install -r requirements-dev.txt && pytest` (uses a fake engine, no model download).
- **backend (planned):** unit tests for services and utilities, integration tests for endpoints, fake OCR, summary and storage providers so tests never call real services.
- **mobile (planned):** component tests, plus manual test passes on real iOS and Android devices for camera, permissions, speech and Google sign-in.
- **Accuracy:** the CER/WER evaluation above is a release gate. The initial target is 15% character error rate on at least 100 labeled phone photos, measured on the full pipeline.
- **Acceptance criteria:** 11 end-to-end scenarios are in the FRD (sign up, Google sign-in, successful scan, non-English, no text, summary, listen, history sync, retry after network loss, quota limit, account deletion).

---

## Deployment

- **Backend:** a Docker container on a low-cost host. Verify current hosting prices.
- **OCR service:** a separate container with enough memory (a few GB). CPU-only is slow for full pages (roughly 45 seconds in the planning estimate); a GPU brings this to about 15 seconds. Both figures are estimates, so measure on your hardware.
- **Database, auth and storage:** Supabase.
- **Mobile:** Expo EAS builds, TestFlight and Google Play internal testing before store release.
- **CI:** GitHub Actions running lint and tests for backend, OCR service and mobile.
- **Monitoring:** structured logs, error tracking with personal data stripped, and metrics for scan success rate, latency, model cost and quota hits.

---

## Roadmap

1. **Foundations:** project setup, auth, database, CI.
2. **Core scan:** capture or upload, OCR, result screen, Copy.
3. **History and settings.**
4. **Summary and speech.**
5. **Hardening:** edge cases, tests, accessibility, privacy, quotas.
6. **Beta and release:** TestFlight and Google Play testing, accuracy gate, store submission.

An indicative effort for one developer working part time is 8 to 10 weeks.

**Later:** Urdu and other languages, multi-page scans, export to PDF or Word, cloud voices, a model improved with consented corrections, and a web app.

---

## Known limitations

- English handwriting only in v1.
- One page per scan.
- Detection and summaries need an internet connection.
- Messy cursive and very faint writing will have lower accuracy.
- The line detector is not specialized for handwriting, so tightly packed or slanted lines can be merged or split.
- The confidence score is the model's own estimate, not a guarantee.
- AI summaries can miss details. They are labeled as AI-generated.

---

## Data and model licensing

- Check the license of every model and dataset before using it commercially.
- IAM is for non-commercial research only, and CVL is under a non-commercial license. They suit learning and portfolio projects. Before charging for the app, get written permission or use consented own data and clearly licensed sets.
- A dataset copy on a model hub with a permissive label does not remove the original terms.

---

## Project documents

- **Functional Requirements Document (v1.2):** <https://docs.google.com/document/d/1RcBEM6mAaRk_a3orjlRN0aHq4UhbjVvZca6VXs-z0bs/edit?usp=sharing>
- **Figma UI design (14 core screens):** <https://www.figma.com/design/mKqpQZ8mmqdqATugOmiBYc>

---

## Contributing and license

- Contributions: open an issue first for large changes. Keep third-party services behind their interfaces and add tests with every change.
- License: _to be decided_. Add a `LICENSE` file and update this section. Remember that model and dataset licenses (above) can limit how the project may be used.
- Contact: _add a support email_.
