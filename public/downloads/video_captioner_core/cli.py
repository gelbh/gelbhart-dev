"""CLI entrypoint for shared Video Captioner core."""

import sys
from pathlib import Path

from .config import PipelineOptions
from .dependencies import missing_python_packages, run_preflight
from .errors import VideoCaptionerError
from .pipeline import VideoCaptionerPipeline


def _prompt(prompt, default=None):
    if default is None:
        return input(f"{prompt}: ").strip()
    result = input(f"{prompt} [{default}]: ").strip()
    return result or default


def main():
    print("=" * 64)
    print("Video Captioner - CLI")
    print("=" * 64)

    missing = missing_python_packages()
    if missing:
        print(f"Missing Python packages: {', '.join(missing)}")
        print(f"Install via: {sys.executable} -m pip install {' '.join(missing)}")
        sys.exit(1)

    import whisper
    from deep_translator import GoogleTranslator
    from yt_dlp import YoutubeDL

    video_input = _prompt("Enter YouTube URL or local video path")
    source_lang = _prompt("Source language code (auto/en/es/...)", "auto")
    translate = _prompt("Translate captions? (y/n)", "n").lower() == "y"
    target_lang = _prompt("Target language code", "en") if translate else None
    burn = _prompt("Burn subtitles into video? (y/n)", "n").lower() == "y"
    model_size = _prompt("Model size (tiny/base/small/medium/large)", "base")
    compute_type = _prompt("Compute type (auto/cpu/cuda)", "auto")
    quality_profile = _prompt("Quality profile (fast/balanced/high)", "balanced")
    output_dir = _prompt("Output directory", str(Path.home() / "Downloads" / "Video Captioner"))

    options = PipelineOptions(
        video_input=video_input,
        output_dir=output_dir,
        source_lang=source_lang,
        target_lang=target_lang,
        burn_captions=burn,
        model_size=model_size,
        compute_type=compute_type,
        quality_profile=quality_profile,
    )

    pipeline = VideoCaptionerPipeline(
        whisper_module=whisper,
        youtube_dl_cls=YoutubeDL,
        google_translator_cls=GoogleTranslator,
    )

    def log_stage(stage, message, metadata):
        print(f"[{stage}] {message}")
        if metadata and metadata.get("timings"):
            for key, value in metadata["timings"].items():
                print(f"  - {key}: {value:.2f}s")

    try:
        run_preflight(options.video_input, options.output_dir, require_ffmpeg=options.burn_captions)
        result = pipeline.process(options, progress_callback=log_stage)
    except VideoCaptionerError as error:
        print(f"Error ({error.category}): {error}")
        if error.hint:
            print(f"Hint: {error.hint}")
        sys.exit(1)
    except Exception as error:
        print(f"Unexpected error: {error}")
        sys.exit(1)

    print("\nOutput files:")
    for path in result["output_paths"]:
        print(f"- {path}")
    print("Done.")


if __name__ == "__main__":
    main()
