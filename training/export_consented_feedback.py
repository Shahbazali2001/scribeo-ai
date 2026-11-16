"""
Export consented user corrections (`consent_for_training = true`) for TrOCR fine-tuning.

Only exports rows where the user explicitly opted into model training consent.
"""

import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))


async def export_consented_samples(output_file: Path) -> int:
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.models.models import Scan, ScanFeedback

    async with AsyncSessionLocal() as session:
        stmt = (
            select(ScanFeedback, Scan)
            .join(Scan, Scan.id == ScanFeedback.scan_id)
            .where(
                ScanFeedback.consent_for_training.is_(True),
                ScanFeedback.corrected_text.is_not(None),
            )
        )
        rows = (await session.execute(stmt)).all()

    records = [
        {
            "scan_id": scan.id,
            "image_path": scan.image_path,
            "ocr_text": scan.text,
            "corrected_text": fb.corrected_text,
            "rating": fb.rating,
        }
        for fb, scan in rows
    ]

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Exported {len(records)} consented training samples to {output_file}")
    return 0


if __name__ == "__main__":
    out = Path("./training/data/consented_corrections.json")
    raise SystemExit(asyncio.run(export_consented_samples(out)))
