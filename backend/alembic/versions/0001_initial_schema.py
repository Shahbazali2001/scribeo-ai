"""Initial schema with RLS and full-text search indexes

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-15
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("settings", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "scans",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(64), nullable=False, index=True),
        sa.Column("image_path", sa.String(512), nullable=False),
        sa.Column("image_width", sa.Integer(), nullable=False),
        sa.Column("image_height", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("text_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("word_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("ocr_model_version", sa.String(128), nullable=True),
        sa.Column("language", sa.String(16), nullable=True),
        sa.Column("language_confidence", sa.Float(), nullable=True),
        sa.Column("status", sa.String(24), nullable=False, index=True),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_scans_user_idempotency"),
    )

    op.create_table(
        "summaries",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "scan_id",
            sa.String(64),
            sa.ForeignKey("scans.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("style", sa.String(24), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("text_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("summary_model", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "scan_id", "style", "text_version", name="uq_summary_scan_style_version"
        ),
    )

    op.create_table(
        "usage_counters",
        sa.Column("user_id", sa.String(64), primary_key=True),
        sa.Column("day", sa.Date(), primary_key=True),
        sa.Column("scans", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("summaries", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "scan_feedback",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "scan_id",
            sa.String(64),
            sa.ForeignKey("scans.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("user_id", sa.String(64), nullable=False, index=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("corrected_text", sa.Text(), nullable=True),
        sa.Column("consent_for_training", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("scan_feedback")
    op.drop_table("usage_counters")
    op.drop_table("summaries")
    op.drop_table("scans")
    op.drop_table("profiles")
