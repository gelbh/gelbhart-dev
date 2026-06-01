import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from video_captioner_core.subtitles import build_srt_entries, write_bilingual_srt, write_srt


class FakeTranslator:
    def __init__(self, source, target):
        self.source = source
        self.target = target

    def translate(self, text):
        return f"{text} translated"


class SubtitlesTest(unittest.TestCase):
    def test_build_entries_normalizes_and_wraps(self):
        segments = [{"start": 0.0, "end": 1.0, "text": "hello   world this is a long subtitle chunk"}]
        entries = build_srt_entries(segments, target_lang=None, source_lang="en", google_translator_cls=FakeTranslator)
        self.assertEqual(len(entries), 1)
        self.assertIn("Hello".lower(), entries[0]["text"].lower())
        self.assertLessEqual(len(entries[0]["text"]), 42)

    def test_writes_srt_and_bilingual(self):
        entries = [
            {
                "index": 1,
                "start": "00:00:00,000",
                "end": "00:00:01,000",
                "text": "Bonjour.",
                "source_text": "Hello.",
            }
        ]
        with tempfile.TemporaryDirectory() as tmp:
            srt_path = Path(tmp) / "out.srt"
            bilingual_path = Path(tmp) / "out_bilingual.srt"
            write_srt(entries, srt_path)
            write_bilingual_srt(entries, bilingual_path)

            self.assertIn("Bonjour.", srt_path.read_text(encoding="utf-8"))
            self.assertIn("Hello.", bilingual_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
