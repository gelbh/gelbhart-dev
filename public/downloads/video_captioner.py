#!/usr/bin/env python3
"""Video Captioner GUI launcher (.py variant).

This launcher can bootstrap missing core modules when users download only this
single script from the website.
"""

from pathlib import Path
import importlib.util
import os
import subprocess
import sys
import urllib.request
from urllib.error import URLError, HTTPError


CORE_FILES = [
    "__init__.py",
    "cli.py",
    "config.py",
    "dependencies.py",
    "errors.py",
    "gui_app.py",
    "logging_utils.py",
    "media.py",
    "pipeline.py",
    "subtitles.py",
    "translation.py",
]
CORE_VERSION = "2026-05-30-modern-ui-v9-no-subtitle-status-flicker"
CORE_VERSION_FILE = ".core_version"
DEFAULT_CORE_BASE_URLS = [
    "http://127.0.0.1:3000/downloads/video_captioner_core",
    "http://localhost:3000/downloads/video_captioner_core",
    "https://gelbhart.dev/downloads/video_captioner_core",
]


def _core_base_urls():
    env_url = os.environ.get("VIDEO_CAPTIONER_CORE_BASE_URL", "").strip()
    if env_url:
        return [env_url.rstrip("/")] + DEFAULT_CORE_BASE_URLS
    return DEFAULT_CORE_BASE_URLS


def _bootstrap_core_if_missing():
    script_dir = Path(__file__).resolve().parent
    core_dir = script_dir / "video_captioner_core"
    core_init = core_dir / "__init__.py"
    version_file = core_dir / CORE_VERSION_FILE
    local_version = version_file.read_text(encoding="utf-8").strip() if version_file.exists() else ""
    needs_refresh = local_version != CORE_VERSION

    if core_init.exists() and not needs_refresh:
        return

    core_dir.mkdir(parents=True, exist_ok=True)
    for filename in CORE_FILES:
        target = core_dir / filename
        if target.exists() and not needs_refresh:
            continue

        downloaded = False
        last_error = None
        for base_url in _core_base_urls():
            try:
                urllib.request.urlretrieve(f"{base_url}/{filename}", target)
                downloaded = True
                break
            except (URLError, HTTPError, TimeoutError) as exc:
                last_error = exc

        if not downloaded:
            raise RuntimeError(
                f"Failed to download required file '{filename}' during first-run setup. "
                "Please check internet access and try again."
            ) from last_error

    version_file.write_text(CORE_VERSION, encoding="utf-8")


def _ensure_customtkinter():
    if importlib.util.find_spec("customtkinter") is not None:
        return
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "customtkinter"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            "Failed to install required dependency 'customtkinter'. "
            "Please ensure internet access and Python package installation permissions."
        )


if __name__ == "__main__":
    try:
        _bootstrap_core_if_missing()
        _ensure_customtkinter()
        # Ensure script directory is importable after bootstrap.
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from video_captioner_core.gui_app import launch_app

        launch_app()
    except Exception as exc:
        print(f"Video Captioner failed to start: {exc}")
        print("Try re-downloading the GUI script and run again.")
        print("First run requires internet access for automatic support-file setup.")
        raise SystemExit(1)
