from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.models import UsageCounter


def next_utc_midnight_iso() -> str:
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return tomorrow.isoformat()


async def get_or_create_usage(db: AsyncSession, user_id: str) -> UsageCounter:
    today = datetime.now(timezone.utc).date()
    stmt = select(UsageCounter).where(
        UsageCounter.user_id == user_id, UsageCounter.day == today
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        row = UsageCounter(user_id=user_id, day=today, scans=0, summaries=0)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


async def check_and_increment_scan_quota(db: AsyncSession, user_id: str) -> UsageCounter:
    usage = await get_or_create_usage(db, user_id)
    if usage.scans >= settings.daily_scan_limit:
        raise AppError(
            code="QUOTA_EXCEEDED",
            message=f"Daily scan limit ({settings.daily_scan_limit}) exceeded.",
            status_code=429,
            reset_at=next_utc_midnight_iso(),
        )
    usage.scans += 1
    await db.commit()
    await db.refresh(usage)
    return usage


async def check_and_increment_summary_quota(db: AsyncSession, user_id: str) -> UsageCounter:
    usage = await get_or_create_usage(db, user_id)
    if usage.summaries >= settings.daily_summary_limit:
        raise AppError(
            code="QUOTA_EXCEEDED",
            message=f"Daily summary limit ({settings.daily_summary_limit}) exceeded.",
            status_code=429,
            reset_at=next_utc_midnight_iso(),
        )
    usage.summaries += 1
    await db.commit()
    await db.refresh(usage)
    return usage
