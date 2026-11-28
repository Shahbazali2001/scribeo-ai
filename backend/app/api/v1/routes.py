from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, Header, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import AuthenticatedUser, get_current_user
from app.db.session import get_db
from app.integrations.llm.provider import FakeSummaryProvider, GeminiSummaryProvider, SummaryProvider
from app.integrations.ocr.provider import FakeOcrProvider, HttpOcrProvider, OcrProvider
from app.integrations.storage.provider import (
    InMemoryStorageProvider,
    StorageProvider,
    SupabaseStorageProvider,
)
from app.models.models import Profile, Scan, ScanFeedback, Summary
from app.schemas.schemas import (
    CreateSummaryRequest,
    FeedbackRequest,
    MeResponse,
    ProfileResponse,
    ScanResponse,
    SummaryResponse,
    UpdateMeRequest,
    UpdateScanTextRequest,
    UsageStatsResponse,
    UserSettingsSchema,
)
from app.services.quota_service import (
    check_and_increment_scan_quota,
    get_or_create_usage,
    next_utc_midnight_iso,
)
from app.services.scan_service import process_scan_in_background
from app.services.summary_service import get_or_create_summary
from app.utils.image import validate_uploaded_image

router = APIRouter(prefix="/api/v1")

_storage_singleton = InMemoryStorageProvider()


def get_storage_provider() -> StorageProvider:
    if settings.supabase_service_key != "dev-service-key":
        return SupabaseStorageProvider()
    return _storage_singleton


def get_ocr_provider() -> OcrProvider:
    if settings.ocr_service_key != "dev-ocr-secret-key":
        return HttpOcrProvider()
    return FakeOcrProvider()


def get_summary_provider() -> SummaryProvider:
    if settings.gemini_api_key and not settings.gemini_api_key.startswith("your-"):
        return GeminiSummaryProvider()
    return FakeSummaryProvider()


async def _serialize_scan(scan: Scan, storage: StorageProvider) -> ScanResponse:
    signed_url = await storage.get_signed_url(scan.image_path)
    summaries_map = {}
    for s in scan.summaries:
        if s.text_version == scan.text_version:
            summaries_map[s.style] = SummaryResponse(
                id=s.id,
                scanId=s.scan_id,
                style=s.style,  # type: ignore[arg-type]
                text=s.text,
                textVersion=s.text_version,
                summaryModel=s.summary_model,
                createdAt=s.created_at,
            )
    return ScanResponse(
        id=scan.id,
        userId=scan.user_id,
        imageUrl=signed_url,
        imageWidth=scan.image_width,
        imageHeight=scan.image_height,
        text=scan.text,
        textVersion=scan.text_version,
        wordCount=scan.word_count,
        confidence=scan.confidence,
        ocrModelVersion=scan.ocr_model_version,
        language=scan.language,
        languageConfidence=scan.language_confidence,
        status=scan.status,  # type: ignore[arg-type]
        errorCode=scan.error_code,
        errorMessage=scan.error_message,
        idempotencyKey=scan.idempotency_key,
        summaries=summaries_map,
        createdAt=scan.created_at,
        updatedAt=scan.updated_at,
    )


@router.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@router.get("/me", response_model=MeResponse)
async def get_me(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage_provider),
):
    profile = (
        await db.execute(select(Profile).where(Profile.id == user.id))
    ).scalar_one_or_none()
    if profile is None:
        profile = Profile(id=user.id, display_name=user.resolved_display_name)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    elif (
        profile.display_name in {"Alex Morgan", "Scribeo User"}
        and user.email.lower() != "alex.morgan@example.com"
        and user.resolved_display_name not in {"Alex Morgan", "Scribeo User"}
    ):
        profile.display_name = user.resolved_display_name
        await db.commit()
        await db.refresh(profile)

    usage = await get_or_create_usage(db, user.id)
    scans_stmt = (
        select(Scan)
        .options(selectinload(Scan.summaries))
        .where(Scan.user_id == user.id, Scan.status == "done")
        .order_by(Scan.created_at.desc())
        .limit(5)
    )
    recent = (await db.execute(scans_stmt)).scalars().all()

    return MeResponse(
        profile=ProfileResponse(
            id=profile.id,
            email=user.email,
            displayName=profile.display_name,
            settings=UserSettingsSchema(**(profile.settings or {})),
            createdAt=profile.created_at,
        ),
        usage=UsageStatsResponse(
            day=usage.day.isoformat(),
            scansUsed=usage.scans,
            scansLimit=settings.daily_scan_limit,
            summariesUsed=usage.summaries,
            summariesLimit=settings.daily_summary_limit,
            resetsAt=next_utc_midnight_iso(),
        ),
        recentScans=[await _serialize_scan(s, storage) for s in recent],
    )


@router.patch("/me", response_model=ProfileResponse)
async def update_me(
    payload: UpdateMeRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = (
        await db.execute(select(Profile).where(Profile.id == user.id))
    ).scalar_one_or_none()
    if profile is None:
        profile = Profile(id=user.id, display_name=user.resolved_display_name)
        db.add(profile)

    if payload.displayName is not None:
        profile.display_name = payload.displayName.strip()
    if payload.settings is not None:
        merged = dict(profile.settings or {})
        merged.update(payload.settings)
        profile.settings = merged

    await db.commit()
    await db.refresh(profile)

    return ProfileResponse(
        id=profile.id,
        email=user.email,
        displayName=profile.display_name,
        settings=UserSettingsSchema(**(profile.settings or {})),
        createdAt=profile.created_at,
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage_provider),
):
    scans = (
        await db.execute(select(Scan).where(Scan.user_id == user.id))
    ).scalars().all()
    for s in scans:
        await storage.delete_image(s.image_path)
        await db.delete(s)

    profile = (
        await db.execute(select(Profile).where(Profile.id == user.id))
    ).scalar_one_or_none()
    if profile:
        await db.delete(profile)

    await db.commit()
    return None


@router.post("/scans", response_model=ScanResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_scan(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage_provider),
    ocr: OcrProvider = Depends(get_ocr_provider),
):
    # Idempotency check
    existing_stmt = (
        select(Scan)
        .options(selectinload(Scan.summaries))
        .where(Scan.user_id == user.id, Scan.idempotency_key == idempotency_key)
    )
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing is not None:
        return await _serialize_scan(existing, storage)

    raw_bytes = await image.read()
    width, height, content_type = validate_uploaded_image(raw_bytes)
    await check_and_increment_scan_quota(db, user.id)

    scan = Scan(
        user_id=user.id,
        image_path="",
        image_width=width,
        image_height=height,
        status="processing",
        idempotency_key=idempotency_key,
    )
    db.add(scan)
    await db.flush()
    scan.image_path = f"{user.id}/{scan.id}.jpg"
    await storage.upload_private_image(scan.image_path, raw_bytes, content_type)
    await db.commit()

    # Run OCR pipeline in background (or immediately in async task)
    await process_scan_in_background(db, scan.id, raw_bytes, ocr, storage)

    refreshed = (
        await db.execute(
            select(Scan).options(selectinload(Scan.summaries)).where(Scan.id == scan.id)
        )
    ).scalar_one()
    return await _serialize_scan(refreshed, storage)


@router.get("/scans")
async def list_scans(
    q: Optional[str] = Query(default=None),
    cursor: Optional[str] = Query(default=None),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage_provider),
):
    stmt = (
        select(Scan)
        .options(selectinload(Scan.summaries))
        .where(Scan.user_id == user.id, Scan.status == "done")
        .order_by(Scan.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    if q:
        needle = q.strip().lower()
        rows = [
            s
            for s in rows
            if (s.text and needle in s.text.lower())
            or any(needle in sum_item.text.lower() for sum_item in s.summaries)
        ]

    items = [await _serialize_scan(s, storage) for s in rows]
    return {"items": items, "nextCursor": None, "totalCount": len(items)}


@router.get("/scans/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage_provider),
):
    stmt = (
        select(Scan)
        .options(selectinload(Scan.summaries))
        .where(Scan.id == scan_id, Scan.user_id == user.id)
    )
    scan = (await db.execute(stmt)).scalar_one_or_none()
    if scan is None:
        raise AppError(code="NOT_FOUND", message="Scan not found.", status_code=404)
    return await _serialize_scan(scan, storage)


@router.patch("/scans/{scan_id}", response_model=ScanResponse)
async def update_scan_text(
    scan_id: str,
    payload: UpdateScanTextRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage_provider),
):
    stmt = (
        select(Scan)
        .options(selectinload(Scan.summaries))
        .where(Scan.id == scan_id, Scan.user_id == user.id)
    )
    scan = (await db.execute(stmt)).scalar_one_or_none()
    if scan is None:
        raise AppError(code="NOT_FOUND", message="Scan not found.", status_code=404)

    if scan.text_version != payload.textVersion:
        raise AppError(
            code="VERSION_CONFLICT",
            message="Text version conflict. Refresh the scan before editing.",
            status_code=409,
        )

    cleaned = payload.text.strip()
    scan.text = cleaned
    scan.text_version += 1
    scan.word_count = len(cleaned.split())
    await db.commit()
    await db.refresh(scan)
    return await _serialize_scan(scan, storage)


@router.delete("/scans/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan(
    scan_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage_provider),
):
    stmt = select(Scan).where(Scan.id == scan_id, Scan.user_id == user.id)
    scan = (await db.execute(stmt)).scalar_one_or_none()
    if scan is None:
        raise AppError(code="NOT_FOUND", message="Scan not found.", status_code=404)

    await storage.delete_image(scan.image_path)
    await db.delete(scan)
    await db.commit()
    return None


@router.post("/scans/{scan_id}/summary", response_model=SummaryResponse)
async def create_scan_summary(
    scan_id: str,
    payload: CreateSummaryRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    summary_provider: SummaryProvider = Depends(get_summary_provider),
):
    stmt = select(Scan).where(Scan.id == scan_id, Scan.user_id == user.id)
    scan = (await db.execute(stmt)).scalar_one_or_none()
    if scan is None:
        raise AppError(code="NOT_FOUND", message="Scan not found.", status_code=404)

    summary = await get_or_create_summary(db, scan, user.id, payload.style, summary_provider)
    return SummaryResponse(
        id=summary.id,
        scanId=summary.scan_id,
        style=summary.style,  # type: ignore[arg-type]
        text=summary.text,
        textVersion=summary.text_version,
        summaryModel=summary.summary_model,
        createdAt=summary.created_at,
    )


@router.get("/scans/{scan_id}/summary", response_model=SummaryResponse)
async def get_scan_summary(
    scan_id: str,
    style: str = Query(default="short"),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Scan).where(Scan.id == scan_id, Scan.user_id == user.id)
    scan = (await db.execute(stmt)).scalar_one_or_none()
    if scan is None:
        raise AppError(code="NOT_FOUND", message="Scan not found.", status_code=404)

    sum_stmt = select(Summary).where(
        Summary.scan_id == scan.id,
        Summary.style == style,
        Summary.text_version == scan.text_version,
    )
    summary = (await db.execute(sum_stmt)).scalar_one_or_none()
    if summary is None:
        raise AppError(code="NOT_FOUND", message="Summary not generated yet.", status_code=404)

    return SummaryResponse(
        id=summary.id,
        scanId=summary.scan_id,
        style=summary.style,  # type: ignore[arg-type]
        text=summary.text,
        textVersion=summary.text_version,
        summaryModel=summary.summary_model,
        createdAt=summary.created_at,
    )


@router.post("/scans/{scan_id}/feedback", status_code=status.HTTP_201_CREATED)
async def create_scan_feedback(
    scan_id: str,
    payload: FeedbackRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Scan).where(Scan.id == scan_id, Scan.user_id == user.id)
    scan = (await db.execute(stmt)).scalar_one_or_none()
    if scan is None:
        raise AppError(code="NOT_FOUND", message="Scan not found.", status_code=404)

    fb = ScanFeedback(
        scan_id=scan.id,
        user_id=user.id,
        rating=payload.rating,
        corrected_text=payload.correctedText,
        consent_for_training=payload.consentForTraining,
    )
    db.add(fb)
    await db.commit()
    return {"status": "recorded"}
