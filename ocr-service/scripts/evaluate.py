"""
Evaluate Character Error Rate (CER) and Word Error Rate (WER) on labeled phone photos.

Usage:
    python scripts/evaluate.py --dataset ./labeled_photos --max-cer 0.15

Put images (.jpg, .png) and matching ground-truth .txt files in the dataset folder.
"""

import argparse
from pathlib import Path
from typing import List
from PIL import Image

from app.engine import FakeOcrEngine, TrOcrEngine


def edit_distance(seq1: List[str], seq2: List[str]) -> int:
    dp = list(range(len(seq2) + 1))
    for i, c1 in enumerate(seq1, start=1):
        prev = dp[0]
        dp[0] = i
        for j, c2 in enumerate(seq2, start=1):
            temp = dp[j]
            if c1 == c2:
                dp[j] = prev
            else:
                dp[j] = 1 + min(prev, dp[j], dp[j - 1])
            prev = temp
    return dp[-1]


def compute_cer(pred: str, truth: str) -> float:
    if not truth:
        return 0.0 if not pred else 1.0
    return edit_distance(list(pred), list(truth)) / float(len(truth))


def compute_wer(pred: str, truth: str) -> float:
    truth_words = truth.split()
    pred_words = pred.split()
    if not truth_words:
        return 0.0 if not pred_words else 1.0
    return edit_distance(pred_words, truth_words) / float(len(truth_words))


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate OCR CER and WER on labeled photos.")
    parser.add_argument("--dataset", type=Path, required=True, help="Folder with images and .txt files")
    parser.add_argument("--max-cer", type=float, default=0.15, help="Release gate CER threshold (default 0.15)")
    parser.add_argument("--fake", action="store_true", help="Use FakeOcrEngine for dry runs")
    args = parser.parse_args()

    engine = FakeOcrEngine() if args.fake else TrOcrEngine()
    image_files = sorted(
        p for p in args.dataset.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )

    if not image_files:
        print(f"No labeled images found in {args.dataset}")
        return 1

    cers: List[float] = []
    wers: List[float] = []

    for img_path in image_files:
        gt_path = img_path.with_suffix(".txt")
        if not gt_path.exists():
            continue
        truth = gt_path.read_text(encoding="utf-8").strip()
        with Image.open(img_path) as img:
            res = engine.read(img, mode="page")
        cer = compute_cer(res.text.strip(), truth)
        wer = compute_wer(res.text.strip(), truth)
        cers.append(cer)
        wers.append(wer)
        print(f"{img_path.name}: CER={cer:.2%}, WER={wer:.2%} ({res.duration_ms} ms)")

    mean_cer = sum(cers) / len(cers) if cers else 1.0
    mean_wer = sum(wers) / len(wers) if wers else 1.0
    print(f"\nEvaluated {len(cers)} samples -> Mean CER: {mean_cer:.2%}, Mean WER: {mean_wer:.2%}")

    if mean_cer > args.max_cer:
        print(f"FAIL: Mean CER {mean_cer:.2%} exceeds threshold {args.max_cer:.2%}")
        return 1

    print(f"PASS: Mean CER {mean_cer:.2%} is within threshold {args.max_cer:.2%}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
