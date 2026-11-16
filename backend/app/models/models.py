from datetime import date, datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120), default="Scribeo User")
    settings: Mapped[dict] = mapped_column(
        JSON,
        default=lambda: {
            "theme": "system",
            "speechSpeed": 1.0,
            "consentForTraining": False,
        },
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Scan(Base):
    __tablename__ = "scans"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_scans_user_idempotency"),
    )

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: f"scan-{uuid.uuid4().hex[:12]}"
    )
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    image_path: Mapped[str] = mapped_column(String(512), nullable=False)
    image_width: Mapped[int] = mapped_column(Integer, default=0)
    image_height: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    text_version: Mapped[int] = mapped_column(Integer, default=1)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ocr_model_version: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    language_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="processing", index=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    summaries: Mapped[list["Summary"]] = relationship(
        "Summary", back_populates="scan", cascade="all, delete-orphan"
    )


class Summary(Base):
    __tablename__ = "summaries"
    __table_args__ = (
        UniqueConstraint(
            "scan_id", "style", "text_version", name="uq_summary_scan_style_version"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: f"sum-{uuid.uuid4().hex[:12]}"
    )
    scan_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("scans.id", ondelete="CASCADE"), index=True
    )
    style: Mapped[str] = mapped_column(String(24), nullable=False)  # short | bullets | detailed
    text: Mapped[str] = mapped_column(Text, nullable=False)
    text_version: Mapped[int] = mapped_column(Integer, default=1)
    summary_model: Mapped[str] = mapped_column(String(64), default="gemini-2.5-flash")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    scan: Mapped["Scan"] = relationship("Scan", back_populates="summaries")


class UsageCounter(Base):
    __tablename__ = "usage_counters"

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    scans: Mapped[int] = mapped_column(Integer, default=0)
    summaries: Mapped[int] = mapped_column(Integer, default=0)


class ScanFeedback(Base):
    __tablename__ = "scan_feedback"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: f"fb-{uuid.uuid4().hex[:12]}"
    )
    scan_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("scans.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    corrected_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    consent_for_training: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
