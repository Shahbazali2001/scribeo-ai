from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.integrations.language.detector import check_english_text
from app.integrations.ocr.provider import OcrProvider
from app.integrations.storage.provider import StorageProvider
from app.models.models import Scan


async def process_scan_in_background(
    db: AsyncSession,
    scan_id: str,
    image_bytes: bytes,
    ocr_provider: OcrProvider,
    storage_provider: StorageProvider,
) -> Scan:
    """
    Runs OCR line detection + TrOCR + langdetect check and updates the Scan row.
    Per README:
    - If no text is found -> status='failed', error_code='NO_TEXT_FOUND'
    - If language is not English -> status='failed', error_code='NOT_ENGLISH'
    """
    stmt = (
        select(Scan)
        .options(selectinload(Scan.summaries))
        .where(Scan.id == scan_id)
    )
    scan = (await db.execute(stmt)).scalar_one_or_none()
    if scan is None:
        raise ValueError(f"Scan {scan_id} not found")

    try:
        ocr_out = await ocr_provider.read_image(image_bytes)
    except Exception as exc:
        scan.status = "failed"
        scan.error_code = getattr(exc, "code", "MODEL_BUSY")
        scan.error_message = str(exc)
        await db.commit()
        await db.refresh(scan)
        return scan

    cleaned_text = (ocr_out.text or "").strip()
    if not cleaned_text:
        scan.status = "failed"
        scan.error_code = "NO_TEXT_FOUND"
        scan.error_message = "No handwritten text was detected on this page."
        await storage_provider.delete_image(scan.image_path)
        await db.commit()
        await db.refresh(scan)
        return scan

    lang_res = check_english_text(cleaned_text)
    if not lang_res.is_english:
        scan.status = "failed"
        scan.language = lang_res.language
        scan.language_confidence = lang_res.confidence
        scan.error_code = "NOT_ENGLISH"
        scan.error_message = "Sorry, I can only read English handwriting right now."
        await storage_provider.delete_image(scan.image_path)
        await db.commit()
        await db.refresh(scan)
        return scan

    scan.status = "done"
    scan.text = cleaned_text
    scan.word_count = len(cleaned_text.split())
    scan.confidence = ocr_out.confidence
    scan.ocr_model_version = ocr_out.model
    scan.language = "en"
    scan.language_confidence = lang_res.confidence
    await db.commit()
    await db.refresh(scan)
    return scan
