from dataclasses import dataclass
import re

from app.core.config import settings

COMMON_ENGLISH_WORDS = {
    "the", "and", "to", "of", "in", "is", "it", "that", "for", "on", "with", "as", "are",
    "this", "by", "be", "at", "or", "from", "an", "not", "have", "has", "was", "were",
    "but", "we", "you", "they", "he", "she", "his", "her", "their", "our", "can", "will",
    "would", "should", "could", "about", "into", "after", "before", "more", "other", "some",
    "time", "page", "notes", "lecture", "meeting", "study", "memory", "sleep", "work", "day",
}


@dataclass
class LanguageCheckResult:
    is_english: bool
    language: str
    confidence: float


def check_english_text(text: str) -> LanguageCheckResult:
    """
    Verifies that recognized text is English using langdetect + common English word check.
    Per README: skipped for very short text (< LANG_MIN_CHARS) because langdetect is unreliable on short strings.
    """
    cleaned = text.strip()
    if len(cleaned) < settings.lang_min_chars:
        return LanguageCheckResult(is_english=True, language="en", confidence=1.0)

    tokens = [w.lower() for w in re.findall(r"[A-Za-z']+", cleaned)]
    if not tokens:
        return LanguageCheckResult(is_english=False, language="unknown", confidence=0.0)

    english_hits = sum(1 for t in tokens if t in COMMON_ENGLISH_WORDS)
    word_ratio = english_hits / float(len(tokens))

    try:
        from langdetect import detect_langs

        langs = detect_langs(cleaned)
        top = langs[0]
        if top.lang == "en" and top.prob >= settings.english_min_prob:
            return LanguageCheckResult(is_english=True, language="en", confidence=round(top.prob, 4))
        if word_ratio >= 0.15:
            return LanguageCheckResult(is_english=True, language="en", confidence=0.75)
        return LanguageCheckResult(is_english=False, language=top.lang, confidence=round(top.prob, 4))
    except Exception:
        is_en = word_ratio >= 0.10
        return LanguageCheckResult(
            is_english=is_en,
            language="en" if is_en else "unknown",
            confidence=0.8 if is_en else 0.3,
        )
