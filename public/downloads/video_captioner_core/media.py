"""Media helpers: source fetch, metadata, and file naming."""

import os
import shutil
import subprocess
from pathlib import Path

from .errors import InputError


def safe_stem(title):
    clean = "".join(c for c in title if c.isalnum() or c in (" ", "-", "_")).strip()
    return clean.replace(" ", "_") or "video"


def download_youtube_video(url, output_dir, youtube_dl_cls, progress_callback=None):
    def hook(download_status):
        if not progress_callback:
            return
        if download_status.get("status") != "downloading":
            return
        downloaded = float(download_status.get("downloaded_bytes") or 0.0)
        total = float(download_status.get("total_bytes") or download_status.get("total_bytes_estimate") or 0.0)
        if total <= 0:
            return
        percent = max(0.0, min(1.0, downloaded / total))
        progress_callback(percent)

    ydl_opts = {
        "format": "18",
        "outtmpl": os.path.join(output_dir, "%(title)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "progress_hooks": [hook],
    }
    try:
        with youtube_dl_cls(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            metadata_duration = info.get("duration", 0) or 0
            actual_duration = probe_duration_seconds(filename)
            duration = actual_duration if actual_duration > 0 else metadata_duration
            return filename, info.get("title", "video"), duration
    except Exception:
        ydl_opts["format"] = "best[height<=720]/best"
        with youtube_dl_cls(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            metadata_duration = info.get("duration", 0) or 0
            actual_duration = probe_duration_seconds(filename)
            duration = actual_duration if actual_duration > 0 else metadata_duration
            return filename, info.get("title", "video"), duration


def resolve_video_input(video_input, temp_dir, youtube_dl_cls, progress_callback=None):
    if video_input.startswith("http://") or video_input.startswith("https://"):
        return download_youtube_video(video_input, temp_dir, youtube_dl_cls, progress_callback=progress_callback)

    path = Path(video_input).expanduser()
    if not path.exists():
        raise InputError(f"File not found: {video_input}", hint="Choose an existing local video file.")
    return str(path), path.stem, probe_duration_seconds(str(path))


def probe_duration_seconds(video_path):
    if not shutil.which("ffprobe"):
        return 0
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return 0
    try:
        return int(float(result.stdout.strip()))
    except ValueError:
        return 0
