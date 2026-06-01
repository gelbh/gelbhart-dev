"""Subtitle formatting and readability post-processing."""

import re
import textwrap

from .translation import translate_text_with_fallback


def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def normalize_subtitle_text(text):
    """Normalize whitespace and punctuation for cleaner captions."""
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+([,.;!?])", r"\1", text)
    if text and text[-1].isalnum():
        text = f"{text}."
    return text


def _wrap_line_by_limits(text, max_chars=42):
    lines = textwrap.wrap(text, width=max_chars, break_long_words=False, break_on_hyphens=False)
    return "\n".join(lines) if lines else text


def _trim_for_cps(text, start_seconds, end_seconds, cps_limit=18):
    duration = max(end_seconds - start_seconds, 0.25)
    max_chars = int(duration * cps_limit)
    if max_chars <= 0 or len(text) <= max_chars:
        return text
    # Prefer preserving semantic start of subtitle; truncate softly.
    trimmed = text[: max_chars - 1].rstrip()
    return f"{trimmed}…"


def build_srt_entries(
    segments,
    target_lang,
    source_lang,
    google_translator_cls,
    cancel_check=None,
    progress_callback=None,
):
    entries = []
    total = max(len(segments), 1)
    for idx, segment in enumerate(segments, start=1):
        if cancel_check:
            cancel_check()
        raw = segment.get("text", "").strip()
        start_seconds = float(segment.get("start", 0))
        end_seconds = float(segment.get("end", start_seconds + 1))

        source_text = normalize_subtitle_text(raw)
        final_text = source_text
        if target_lang:
            translated = translate_text_with_fallback(
                source_text,
                source_lang=source_lang,
                target_lang=target_lang,
                google_translator_cls=google_translator_cls,
                cancel_check=cancel_check,
            )
            final_text = normalize_subtitle_text(translated)

        final_text = _trim_for_cps(final_text, start_seconds, end_seconds, cps_limit=18)
        final_text = _wrap_line_by_limits(final_text, max_chars=42)

        entries.append(
            {
                "index": idx,
                "start": format_timestamp(start_seconds),
                "end": format_timestamp(end_seconds),
                "text": final_text,
                "source_text": source_text,
            }
        )
        if progress_callback:
            progress_callback(idx / total)
    return entries


def write_srt(entries, output_path):
    with open(output_path, "w", encoding="utf-8") as handle:
        for entry in entries:
            handle.write(f"{entry['index']}\n")
            handle.write(f"{entry['start']} --> {entry['end']}\n")
            handle.write(f"{entry['text']}\n\n")


def write_bilingual_srt(entries, output_path):
    with open(output_path, "w", encoding="utf-8") as handle:
        for entry in entries:
            handle.write(f"{entry['index']}\n")
            handle.write(f"{entry['start']} --> {entry['end']}\n")
            handle.write(f"{entry['source_text']}\n{entry['text']}\n\n")
