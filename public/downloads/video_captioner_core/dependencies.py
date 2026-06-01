"""Dependency checks and deterministic preflight validation."""

import importlib
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

from .errors import DependencyError, PreflightError


REQUIRED_PYTHON_MODULES = {
    "whisper": "openai-whisper",
    "yt_dlp": "yt-dlp",
    "deep_translator": "deep-translator",
}


def get_ffmpeg_hint_text():
    system = platform.system()
    if system == "Windows":
        return (
            "Install FFmpeg and ensure it is on PATH (or run `pip install imageio-ffmpeg` for fallback runtime). "
            "Burned captions require FFmpeg."
        )
    if system == "Darwin":
        return (
            "Install FFmpeg (for example, `brew install ffmpeg`) or run `pip install imageio-ffmpeg`. "
            "Burned captions require FFmpeg."
        )
    return (
        "Install FFmpeg (for example, `sudo apt-get install ffmpeg`) or run `pip install imageio-ffmpeg`. "
        "Burned captions require FFmpeg."
    )


def missing_python_packages():
    missing = []
    for module_name, package_name in REQUIRED_PYTHON_MODULES.items():
        try:
            importlib.import_module(module_name)
        except ImportError:
            missing.append(package_name)
    return missing


def ffmpeg_available():
    ffmpeg_cmd = shutil.which("ffmpeg")
    if not ffmpeg_cmd:
        return False
    return ffmpeg_works(ffmpeg_cmd)


def ffmpeg_works(ffmpeg_cmd):
    try:
        result = subprocess.run(
            [str(ffmpeg_cmd), "-version"],
            capture_output=True,
            text=True,
            timeout=8,
        )
        return result.returncode == 0
    except Exception:
        return False


def _imageio_ffmpeg_executable():
    try:
        import imageio_ffmpeg

        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        if ffmpeg_exe and Path(ffmpeg_exe).exists():
            return str(Path(ffmpeg_exe))
    except Exception:
        return None
    return None


def ensure_ffmpeg_runtime_available():
    """Ensure ffmpeg is callable by tools that expect `ffmpeg` on PATH."""
    if ffmpeg_available():
        return True

    fallback_exe = _imageio_ffmpeg_executable()
    if not fallback_exe:
        return False

    ffmpeg_dir = str(Path(fallback_exe).parent)
    current_path = os.environ.get("PATH", "")
    if ffmpeg_dir not in current_path.split(os.pathsep):
        os.environ["PATH"] = f"{ffmpeg_dir}{os.pathsep}{current_path}" if current_path else ffmpeg_dir

    # imageio may ship versioned binaries (not named ffmpeg.exe).
    # Create a stable shim file name and prepend that directory to PATH.
    shim_dir = Path.home() / ".video_captioner" / "bin"
    shim_dir.mkdir(parents=True, exist_ok=True)
    is_windows = platform.system() == "Windows"
    shim_name = "ffmpeg.exe" if is_windows else "ffmpeg"
    shim_path = shim_dir / shim_name
    if not shim_path.exists():
        shutil.copy2(fallback_exe, shim_path)
        if not is_windows:
            shim_path.chmod(0o755)

    shim_dir_str = str(shim_dir)
    current_path = os.environ.get("PATH", "")
    if shim_dir_str not in current_path.split(os.pathsep):
        os.environ["PATH"] = f"{shim_dir_str}{os.pathsep}{current_path}" if current_path else shim_dir_str

    # Help libraries that look for explicit ffmpeg environment variables.
    os.environ.setdefault("IMAGEIO_FFMPEG_EXE", str(shim_path))
    os.environ.setdefault("FFMPEG_BINARY", str(shim_path))

    return ffmpeg_works(shim_path) and ffmpeg_available()


def deterministic_install(packages, log_callback=None):
    """Install missing packages one-by-one with strict error reporting."""
    for package in packages:
        if log_callback:
            log_callback(f"Installing {package}...")
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", package],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise DependencyError(
                f"Failed to install {package}.",
                hint=result.stderr.strip() or "Check internet and Python permissions.",
            )


def install_ffmpeg_with_fallback(log_callback=None):
    """Try common OS package managers, then imageio-ffmpeg fallback."""
    import platform

    system = platform.system()
    commands = []
    if system == "Windows":
        if shutil.which("choco"):
            commands.append(["choco", "install", "ffmpeg", "-y"])
    elif system == "Darwin":
        if shutil.which("brew"):
            commands.append(["brew", "install", "ffmpeg"])
    elif system == "Linux":
        if shutil.which("apt-get"):
            commands.append(["sudo", "apt-get", "install", "-y", "ffmpeg"])
        elif shutil.which("yum"):
            commands.append(["sudo", "yum", "install", "-y", "ffmpeg"])

    for command in commands:
        if log_callback:
            log_callback(f"Running {' '.join(command)}")
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode == 0 and ffmpeg_available():
            return True

    fallback = subprocess.run(
        [sys.executable, "-m", "pip", "install", "imageio-ffmpeg"],
        capture_output=True,
        text=True,
    )
    if fallback.returncode != 0:
        return False
    return ensure_ffmpeg_runtime_available()


def run_preflight(video_input, output_dir, require_ffmpeg=False):
    """Validate source path/URL, output location, disk space, and dependencies."""
    missing = missing_python_packages()
    if missing:
        raise DependencyError(
            "Missing required Python packages.",
            hint=f"Install: {', '.join(missing)}",
        )

    ffmpeg_runtime_ready = ensure_ffmpeg_runtime_available()
    if not ffmpeg_runtime_ready:
        raise DependencyError(
            "FFmpeg is required for transcription but is not available.",
            hint="Install FFmpeg (or imageio-ffmpeg) and retry. On first run, internet access is required.",
        )

    if require_ffmpeg and not ffmpeg_available():
        raise DependencyError(
            "FFmpeg is required for burning captions into video.",
            hint=get_ffmpeg_hint_text(),
        )

    if not video_input or not video_input.strip():
        raise PreflightError("No video input provided.", hint="Choose a local file or paste a URL.")

    is_url = video_input.startswith("http://") or video_input.startswith("https://")
    if not is_url and not Path(video_input).exists():
        raise PreflightError(
            f"Input file not found: {video_input}",
            hint="Verify the file exists and is accessible.",
        )

    out_dir = Path(output_dir).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)

    if not os.access(out_dir, os.W_OK):
        raise PreflightError(
            f"Output directory is not writable: {out_dir}",
            hint="Choose a writable folder.",
        )

    free_bytes = shutil.disk_usage(out_dir).free
    min_required_bytes = 200 * 1024 * 1024
    if free_bytes < min_required_bytes:
        raise PreflightError(
            "Not enough free disk space for processing.",
            hint="Free at least 200MB and try again.",
        )
