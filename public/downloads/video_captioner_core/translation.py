"""Translation helpers with provider fallback and retries."""

import time


def normalize_language_code(code):
    mapping = {"he": "iw", "zh": "zh-CN", "jw": "jv"}
    return mapping.get(code, code)


def _build_translators(source_lang, target_lang, google_translator_cls):
    source = normalize_language_code(source_lang or "auto")
    target = normalize_language_code(target_lang)
    providers = [google_translator_cls(source=source, target=target)]

    try:
        from deep_translator import MyMemoryTranslator

        providers.append(MyMemoryTranslator(source=source, target=target))
    except Exception:
        pass

    return providers


def translate_text_with_fallback(text, source_lang, target_lang, google_translator_cls, retries=2, cancel_check=None):
    if not target_lang:
        return text

    providers = _build_translators(source_lang, target_lang, google_translator_cls)
    for provider in providers:
        for attempt in range(retries + 1):
            if cancel_check:
                cancel_check()
            try:
                translated = provider.translate(text)
                if translated:
                    return translated
            except Exception:
                if attempt < retries:
                    sleep_seconds = 0.3 * (attempt + 1)
                    sleep_step = 0.05
                    elapsed = 0.0
                    while elapsed < sleep_seconds:
                        if cancel_check:
                            cancel_check()
                        time.sleep(sleep_step)
                        elapsed += sleep_step
                continue
    return text
