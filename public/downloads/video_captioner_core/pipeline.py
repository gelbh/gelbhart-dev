"""Shared processing pipeline for GUI and CLI entrypoints."""

import os
import shutil
import subprocess
import tempfile
import time
from dataclasses import asdict
from pathlib import Path

from .config import PipelineOptions
from .dependencies import ffmpeg_available, run_preflight
from .errors import ProcessingError
from .logging_utils import configure_logger
from .media import resolve_video_input, safe_stem
from .subtitles import build_srt_entries, write_bilingual_srt, write_srt


class VideoCaptionerPipeline:
    _model_cache = {}

    def __init__(self, whisper_module, youtube_dl_cls, google_translator_cls):
        self.whisper = whisper_module
        self.youtube_dl_cls = youtube_dl_cls
        self.google_translator_cls = google_translator_cls
        self.cancel_requested = False

    def cancel(self):
        self.cancel_requested = True

    def reset_cancel(self):
        self.cancel_requested = False

    def _check_cancel(self):
        if self.cancel_requested:
            raise ProcessingError("Request cancelled.")

    def _emit(self, callback, stage, message, metadata=None):
        payload = {"stage": stage}
        if metadata:
            payload.update(metadata)
        if callback:
            callback(stage, message, payload)

    def _load_model(self, options, callback):
        cache_key = options.model_size
        if cache_key in self._model_cache:
            self._emit(callback, "model_load", f"Using cached Whisper model ({options.model_size}).")
            return self._model_cache[cache_key]

        self._emit(callback, "model_load", f"Loading Whisper model ({options.model_size})...")
        model = self.whisper.load_model(options.model_size)
        self._model_cache[cache_key] = model
        return model

    def estimate_runtime_seconds(self, duration_seconds, options):
        # Coarse estimate by model profile; tuned for typical desktop CPU usage.
        speed_map = {"tiny": 0.12, "base": 0.25, "small": 0.45, "medium": 0.9, "large": 1.8}
        ratio = speed_map.get(options.model_size, 1.0)
        return max(int(duration_seconds * ratio), 5)

    def _unique_output_path(self, path_obj):
        candidate = Path(path_obj)
        if not candidate.exists():
            return candidate
        stem = candidate.stem
        suffix = candidate.suffix
        parent = candidate.parent
        counter = 2
        while True:
            next_candidate = parent / f"{stem}_{counter}{suffix}"
            if not next_candidate.exists():
                return next_candidate
            counter += 1

    def process(self, options: PipelineOptions, progress_callback=None):
        if self.cancel_requested:
            raise ProcessingError("Request cancelled before start.")

        stage_timings = {}
        output_root_dir = options.normalized_output_dir()
        logger = configure_logger(output_root_dir / ".video_captioner_logs")
        logger.info("Processing started", extra={"event": "start", "metadata": asdict(options)})

        preflight_start = time.monotonic()
        run_preflight(options.video_input, str(output_root_dir), require_ffmpeg=options.burn_captions)
        stage_timings["preflight"] = time.monotonic() - preflight_start
        self._emit(progress_callback, "preflight", "Preflight checks passed.", {"progress": 0.05})

        with tempfile.TemporaryDirectory() as temp_dir:
            self._check_cancel()

            source_start = time.monotonic()
            is_remote_source = options.video_input.startswith("http://") or options.video_input.startswith("https://")

            def on_download_progress(percent):
                self._check_cancel()
                self._emit(
                    progress_callback,
                    "download",
                    f"Downloading source video ({int(percent * 100)}%)",
                    {
                        "download_percent": percent,
                        "progress": 0.05 + (percent * 0.30),
                    },
                )

            source_progress_callback = on_download_progress if is_remote_source else None
            video_path, video_title, duration = resolve_video_input(
                options.video_input,
                temp_dir,
                self.youtube_dl_cls,
                progress_callback=source_progress_callback,
            )
            stage_timings["source"] = time.monotonic() - source_start
            self._check_cancel()
            self._emit(
                progress_callback,
                "source",
                f"Input ready: {video_title}",
                {"duration_seconds": duration, "progress": 0.35},
            )

            estimate = self.estimate_runtime_seconds(duration, options)
            self._emit(
                progress_callback,
                "estimate",
                f"Estimated processing time: ~{estimate}s (rough).",
                {"estimated_seconds": estimate, "estimate_is_rough": True, "progress": 0.40},
            )

            model_start = time.monotonic()
            model = self._load_model(options, progress_callback)
            stage_timings["model_load"] = time.monotonic() - model_start
            logger.info("Model ready", extra={"event": "model_ready", "metadata": {"model_size": options.model_size}})
            self._emit(progress_callback, "model_ready", "Model ready.", {"progress": 0.50})

            self._check_cancel()

            transcribe_start = time.monotonic()
            self._emit(
                progress_callback,
                "transcribe_start",
                "Transcribing audio... this can take a while for long videos.",
                {"progress": 0.52},
            )
            transcribe_kwargs = self._transcribe_kwargs(options)
            try:
                result = model.transcribe(video_path, **transcribe_kwargs)
            except FileNotFoundError as error:
                raise ProcessingError(
                    "FFmpeg runtime is missing while starting transcription.",
                    hint="Re-run first-time setup or install FFmpeg, then try again.",
                ) from error
            stage_timings["transcribe"] = time.monotonic() - transcribe_start
            self._check_cancel()
            detected_lang = result.get("language", "unknown")
            self._emit(
                progress_callback,
                "transcribe",
                f"Transcription complete (detected: {detected_lang}).",
                {"progress": 0.82},
            )

            subtitle_start = time.monotonic()
            self._emit(
                progress_callback,
                "subtitle_build_start",
                "Building subtitle files...",
                {"progress": 0.84},
            )
            segments = result.get("segments", [])

            def on_subtitle_progress(fraction):
                self._check_cancel()
                self._emit(
                    progress_callback,
                    "subtitle_build_progress",
                    f"Building subtitle files ({int(fraction * 100)}%)",
                    {"subtitle_percent": fraction, "progress": 0.84 + (fraction * 0.05)},
                )

            entries = build_srt_entries(
                segments,
                target_lang=options.target_lang,
                source_lang=detected_lang,
                google_translator_cls=self.google_translator_cls,
                cancel_check=self._check_cancel,
                progress_callback=on_subtitle_progress,
            )
            stage_timings["subtitle_build"] = time.monotonic() - subtitle_start
            self._emit(progress_callback, "subtitle_build", "Subtitle formatting complete.", {"progress": 0.90})

            base_name = safe_stem(video_title)
            lang_suffix = f"_{options.target_lang}" if options.target_lang else ""
            srt_temp_path = os.path.join(temp_dir, f"{base_name}{lang_suffix}.srt")
            self._check_cancel()
            write_srt(entries, srt_temp_path)

            bilingual_path = None
            if options.target_lang:
                bilingual_path = os.path.join(temp_dir, f"{base_name}{lang_suffix}_bilingual.srt")
                self._check_cancel()
                write_bilingual_srt(entries, bilingual_path)

            output_root_dir.mkdir(parents=True, exist_ok=True)
            output_paths = []

            # Store each run in its own folder for cleaner outputs.
            run_output_dir = output_root_dir / base_name
            run_output_dir.mkdir(parents=True, exist_ok=True)

            # Always emit SRT to output (even when burn is enabled).
            srt_out = self._unique_output_path(run_output_dir / f"{base_name}{lang_suffix}.srt")
            self._check_cancel()
            shutil.copy2(srt_temp_path, srt_out)
            output_paths.append(str(srt_out))

            save_start = time.monotonic()
            self._emit(
                progress_callback,
                "save_output_start",
                "Saving output files...",
                {"progress": 0.92},
            )
            if options.burn_captions:
                output_video = self._unique_output_path(run_output_dir / f"{base_name}{lang_suffix}_captioned.mp4")
                burned_ok = self._burn_captions(video_path, srt_temp_path, str(output_video), cancel_check=self._check_cancel)
                if burned_ok:
                    output_paths.append(str(output_video))
                else:
                    self._check_cancel()
                    original_out = self._unique_output_path(
                        run_output_dir / f"{base_name}_original{Path(video_path).suffix or '.mp4'}"
                    )
                    shutil.copy2(video_path, original_out)
                    output_paths.append(str(original_out))
            else:
                # For YouTube sources, also save the downloaded video by default.
                if is_remote_source:
                    self._check_cancel()
                    source_video_out = self._unique_output_path(
                        run_output_dir / f"{base_name}{Path(video_path).suffix or '.mp4'}"
                    )
                    shutil.copy2(video_path, source_video_out)
                    output_paths.append(str(source_video_out))

            if bilingual_path:
                self._check_cancel()
                bilingual_out = self._unique_output_path(run_output_dir / f"{base_name}_bilingual{lang_suffix}.srt")
                shutil.copy2(bilingual_path, bilingual_out)
                output_paths.append(str(bilingual_out))

            stage_timings["save_output"] = time.monotonic() - save_start
            stage_timings["total"] = sum(stage_timings.values())

            logger.info("Processing completed", extra={"event": "complete", "metadata": {"timings": stage_timings}})
            self._emit(progress_callback, "complete", "Processing completed.", {"timings": stage_timings, "progress": 1.0})
            return {
                "output_paths": output_paths,
                "detected_language": detected_lang,
                "timings": stage_timings,
                "duration_seconds": duration,
            }

    def _transcribe_kwargs(self, options):
        kwargs = {}
        if options.source_lang and options.source_lang != "auto":
            kwargs["language"] = options.source_lang

        # Profile-driven decoding defaults for predictable behavior.
        if options.quality_profile == "fast":
            kwargs["temperature"] = 0.0
            kwargs["best_of"] = 1
            kwargs["beam_size"] = 1
        elif options.quality_profile == "high":
            kwargs["temperature"] = 0.0
            kwargs["best_of"] = 5
            kwargs["beam_size"] = 5
        else:
            kwargs["temperature"] = 0.0
            kwargs["best_of"] = 3
            kwargs["beam_size"] = 3

        if options.compute_type and options.compute_type in ("cpu", "cuda"):
            kwargs["fp16"] = options.compute_type == "cuda"

        return kwargs

    def _burn_captions(self, video_path, srt_path, output_path, cancel_check=None):
        if not ffmpeg_available():
            return False

        escaped_srt = srt_path.replace("\\", "/").replace(":", "\\:")
        cmd = [
            "ffmpeg",
            "-i",
            video_path,
            "-vf",
            f"subtitles='{escaped_srt}'",
            "-c:a",
            "copy",
            "-y",
            output_path,
        ]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        while True:
            if cancel_check:
                try:
                    cancel_check()
                except ProcessingError:
                    process.terminate()
                    try:
                        process.wait(timeout=2)
                    except Exception:
                        process.kill()
                    raise
            if process.poll() is not None:
                break
            time.sleep(0.1)
        return process.returncode == 0
