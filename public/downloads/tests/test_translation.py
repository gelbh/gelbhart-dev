import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from video_captioner_core.translation import normalize_language_code, translate_text_with_fallback


class FailingTranslator:
    def __init__(self, source, target):
        pass

    def translate(self, text):
        raise RuntimeError("boom")


class EchoTranslator:
    def __init__(self, source, target):
        pass

    def translate(self, text):
        return f"{text}-ok"


class TranslationTest(unittest.TestCase):
    def test_normalize_language_code(self):
        self.assertEqual(normalize_language_code("he"), "iw")
        self.assertEqual(normalize_language_code("en"), "en")

    def test_translation_fallback_returns_original_when_all_fail(self):
        output = translate_text_with_fallback(
            "hello",
            source_lang="en",
            target_lang="fr",
            google_translator_cls=FailingTranslator,
            retries=0,
        )
        self.assertEqual(output, "hello")

    def test_translation_success(self):
        output = translate_text_with_fallback(
            "hello",
            source_lang="en",
            target_lang="fr",
            google_translator_cls=EchoTranslator,
            retries=0,
        )
        self.assertEqual(output, "hello-ok")


if __name__ == "__main__":
    unittest.main()
