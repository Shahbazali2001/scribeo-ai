a"""
Fine-tuning script for microsoft/trocr-base-handwritten on phone-photo line crops.

Usage:
    python training/finetune_trocr.py \
        --train-dir ./data/train_lines \
        --val-dir ./data/val_lines \
        --output-dir ./checkpoints/trocr-finetuned \
        --epochs 5 \
        --batch-size 8

Each directory should contain line crop images (.jpg/.png) and matching .txt ground-truth files.
"""

import argparse
from pathlib import Path
from typing import Dict, List
from PIL import Image


def load_line_pairs(folder: Path) -> List[Dict[str, str]]:
    pairs: List[Dict[str, str]] = []
    if not folder.exists():
        return pairs
    for img_path in sorted(folder.iterdir()):
        if img_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        txt_path = img_path.with_suffix(".txt")
        if not txt_path.exists():
            continue
        label = txt_path.read_text(encoding="utf-8").strip()
        if label:
            pairs.append({"image_path": str(img_path), "text": label})
    return pairs


def main() -> int:
    parser = argparse.ArgumentParser(description="Fine-tune Microsoft TrOCR on handwritten lines")
    parser.add_argument("--base-model", type=str, default="microsoft/trocr-base-handwritten")
    parser.add_argument("--train-dir", type=Path, required=True)
    parser.add_argument("--val-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("./checkpoints/trocr-handwritten-v2"))
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=5e-5)
    args = parser.parse_args()

    train_items = load_line_pairs(args.train_dir)
    val_items = load_line_pairs(args.val_dir)
    print(f"Loaded {len(train_items)} training lines and {len(val_items)} validation lines.")

    if not train_items or not val_items:
        print("Ensure both --train-dir and --val-dir contain paired image + .txt files.")
        return 1

    import torch
    from torch.utils.data import Dataset
    from transformers import (
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
        TrOCRProcessor,
        VisionEncoderDecoderModel,
        default_data_collator,
    )

    processor = TrOCRProcessor.from_pretrained(args.base_model)
    model = VisionEncoderDecoderModel.from_pretrained(args.base_model)

    model.config.decoder_start_token_id = processor.tokenizer.cls_token_id
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.vocab_size = model.config.decoder.vocab_size
    model.config.eos_token_id = processor.tokenizer.sep_token_id
    model.config.max_length = 128
    model.config.early_stopping = True
    model.config.no_repeat_ngram_size = 3
    model.config.length_penalty = 2.0
    model.config.num_beams = 4

    class HandwritingLineDataset(Dataset):
        def __init__(self, items: List[Dict[str, str]], max_target_length: int = 128):
            self.items = items
            self.max_target_length = max_target_length

        def __len__(self) -> int:
            return len(self.items)

        def __getitem__(self, idx: int):
            item = self.items[idx]
            image = Image.open(item["image_path"]).convert("RGB")
            pixel_values = processor(image, return_tensors="pt").pixel_values.squeeze()
            labels = processor.tokenizer(
                item["text"],
                padding="max_length",
                max_length=self.max_target_length,
                truncation=True,
            ).input_ids
            labels = [
                label if label != processor.tokenizer.pad_token_id else -100
                for label in labels
            ]
            return {
                "pixel_values": pixel_values,
                "labels": torch.tensor(labels, dtype=torch.long),
            }

    train_ds = HandwritingLineDataset(train_items)
    val_ds = HandwritingLineDataset(val_items)

    training_args = Seq2SeqTrainingArguments(
        output_dir=str(args.output_dir),
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        predict_with_generate=True,
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_steps=20,
        num_train_epochs=args.epochs,
        learning_rate=args.lr,
        fp16=torch.cuda.is_available(),
        load_best_model_at_end=True,
    )

    trainer = Seq2SeqTrainer(
        model=model,
        tokenizer=processor.feature_extractor,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=default_data_collator,
    )

    trainer.train()
    model.save_pretrained(args.output_dir)
    processor.save_pretrained(args.output_dir)
    print(f"Saved fine-tuned TrOCR model and processor to {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
