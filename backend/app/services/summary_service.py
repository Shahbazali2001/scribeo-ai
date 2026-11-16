from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.integrations.llm.provider import SummaryProvider
from app.models.models import Scan, Summary
from app.services.quota_service import check_and_increment_summary_quota


async def get_or_create_summary(
    db: AsyncSession,
    scan: Scan,
    user_id: str,
    style: str,
    summary_provider: SummaryProvider,
) -> Summary:
    if scan.status != "done" or not scan.text:
        raise AppError(
            code="NO_TEXT_FOUND",
            message="Scan must be completed with readable text before summarizing.",
            status_code=400,
        )

    stmt = select(Summary).where(
        Summary.scan_id == scan.id,
        Summary.style == style,
        Summary.text_version == scan.text_version,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing is not None:
        return existing

    await check_and_increment_summary_quota(db, user_id)
    summary_text, model_name = await summary_provider.summarize(scan.text, style)

    new_summary = Summary(
        scan_id=scan.id,
        style=style,
        text=summary_text,
        text_version=scan.text_version,
        summary_model=model_name,
    )
    db.add(new_summary)
    await db.commit()
    await db.refresh(new_summary)
    return new_summary
