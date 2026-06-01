"""CustomTkinter GUI matching the website visual style."""

import os
import subprocess
import sys
import threading
import tkinter as tk
import time
from pathlib import Path
from tkinter import filedialog, messagebox

import customtkinter as ctk

from .config import PipelineOptions
from .dependencies import (
    deterministic_install,
    ffmpeg_available,
    install_ffmpeg_with_fallback,
    missing_python_packages,
)
from .errors import VideoCaptionerError
from .pipeline import VideoCaptionerPipeline


SOURCE_LANGUAGES = [
    ("Auto-detect", "auto"),
    ("Arabic", "ar"),
    ("Chinese", "zh"),
    ("English", "en"),
    ("French", "fr"),
    ("German", "de"),
    ("Hebrew", "he"),
    ("Hindi", "hi"),
    ("Italian", "it"),
    ("Japanese", "ja"),
    ("Korean", "ko"),
    ("Portuguese", "pt"),
    ("Russian", "ru"),
    ("Spanish", "es"),
]

TARGET_LANGUAGES = [
    ("Arabic", "ar"),
    ("Chinese (Simplified)", "zh-CN"),
    ("English", "en"),
    ("French", "fr"),
    ("German", "de"),
    ("Hebrew", "iw"),
    ("Hindi", "hi"),
    ("Indonesian", "id"),
    ("Italian", "it"),
    ("Japanese", "ja"),
    ("Korean", "ko"),
    ("Portuguese", "pt"),
    ("Russian", "ru"),
    ("Spanish", "es"),
    ("Turkish", "tr"),
    ("Vietnamese", "vi"),
]

MODEL_SIZES = ["tiny", "base", "small", "medium", "large"]
COMPUTE_TYPES = ["auto", "cpu", "cuda"]
QUALITY_PROFILES = ["fast", "balanced", "high"]
PRESET_CONFIGS = {
    "Fast Draft": {"model_size": "tiny", "quality_profile": "fast", "compute_type": "auto"},
    "Balanced": {"model_size": "base", "quality_profile": "balanced", "compute_type": "auto"},
    "High Quality": {"model_size": "medium", "quality_profile": "high", "compute_type": "auto"},
    "Social Translate": {
        "model_size": "base",
        "quality_profile": "balanced",
        "compute_type": "auto",
        "translate": True,
        "target_lang_display": "English",
    },
}

THEME = {
    "bg_main": "#0f1220",
    "bg_card": "#171b2e",
    "bg_card_alt": "#1d2338",
    "text_primary": "#e8eaf6",
    "text_muted": "#b8bfd8",
    "primary": "#6366f1",
    "primary_hover": "#4f46e5",
    "primary_light": "#818cf8",
    "border": "#2b3353",
    "success": "#22c55e",
    "danger": "#ef4444",
}
BRAND_LOGO_TEXT = "<G/>"
_STDOUT_FALLBACK = None
_STDERR_FALLBACK = None


def _ensure_standard_streams():
    """Ensure stdout/stderr exist for GUI launches (.pyw on Windows)."""
    global _STDOUT_FALLBACK, _STDERR_FALLBACK
    if sys.stdout is None:
        _STDOUT_FALLBACK = open(os.devnull, "w", encoding="utf-8")
        sys.stdout = _STDOUT_FALLBACK
    if sys.stderr is None:
        _STDERR_FALLBACK = open(os.devnull, "w", encoding="utf-8")
        sys.stderr = _STDERR_FALLBACK


class DependencyInstallerWindow:
    def __init__(self, parent, packages, needs_ffmpeg, on_complete):
        self.parent = parent
        self.packages = packages
        self.needs_ffmpeg = needs_ffmpeg
        self.on_complete = on_complete
        self.is_installing = False
        self._pulse = 0.0
        self._pulse_dir = 0.08

        self.window = ctk.CTkToplevel(parent)
        self.window.title("Video Captioner - First Time Setup")
        self.window.geometry("760x600")
        self.window.resizable(False, False)
        self.window.grab_set()

        shell = ctk.CTkFrame(self.window, fg_color=THEME["bg_main"], corner_radius=0)
        shell.pack(fill=tk.BOTH, expand=True)

        card = ctk.CTkFrame(shell, fg_color=THEME["bg_card"], corner_radius=18, border_width=1, border_color=THEME["border"])
        card.pack(fill=tk.BOTH, expand=True, padx=18, pady=18)

        ctk.CTkLabel(
            card,
            text="Video Captioner Setup",
            text_color=THEME["text_primary"],
            font=("Segoe UI", 26, "bold"),
        ).pack(anchor=tk.W, padx=20, pady=(20, 4))
        ctk.CTkLabel(
            card,
            text="Installing everything needed for first run.",
            text_color=THEME["text_muted"],
            font=("Segoe UI", 14),
        ).pack(anchor=tk.W, padx=20, pady=(0, 12))

        packages_line = ", ".join(self.packages) if self.packages else "None"
        ffmpeg_line = (
            "Required for transcription and burn-in. The app will try automatic setup; "
            "you can also install FFmpeg manually if needed."
            if self.needs_ffmpeg
            else "Already available"
        )
        ctk.CTkLabel(
            card,
            text=f"Python packages: {packages_line}\nFFmpeg: {ffmpeg_line}",
            text_color=THEME["text_muted"],
            justify=tk.LEFT,
            wraplength=680,
            font=("Segoe UI", 12),
        ).pack(anchor=tk.W, padx=20, pady=(0, 12))

        self.log = ctk.CTkTextbox(
            card,
            height=280,
            fg_color=THEME["bg_card_alt"],
            text_color=THEME["text_primary"],
            border_width=1,
            border_color=THEME["border"],
            corner_radius=12,
            font=("Consolas", 12),
        )
        self.log.pack(fill=tk.BOTH, expand=True, padx=20, pady=(0, 12))
        self.log.configure(state="disabled")

        self.progress = ctk.CTkProgressBar(card, progress_color=THEME["primary"], fg_color=THEME["border"])
        self.progress.pack(fill=tk.X, padx=20)
        self.progress.set(0)

        row = ctk.CTkFrame(card, fg_color="transparent")
        row.pack(fill=tk.X, padx=20, pady=(14, 20))
        self.install_button = ctk.CTkButton(
            row,
            text="Install",
            command=self.start,
            fg_color=THEME["primary"],
            hover_color=THEME["primary_hover"],
            corner_radius=10,
        )
        self.install_button.pack(side=tk.RIGHT)
        ctk.CTkButton(
            row,
            text="Cancel",
            command=self.cancel,
            fg_color="transparent",
            border_width=1,
            border_color=THEME["border"],
            text_color=THEME["text_primary"],
            hover_color=THEME["bg_card_alt"],
            corner_radius=10,
        ).pack(side=tk.RIGHT, padx=(0, 10))

    def _append(self, text):
        self.log.configure(state="normal")
        self.log.insert(tk.END, f"{text}\n")
        self.log.see(tk.END)
        self.log.configure(state="disabled")
        self.window.update_idletasks()

    def _animate_progress(self):
        if not self.is_installing:
            return
        next_value = self._pulse + self._pulse_dir
        if next_value >= 1.0 or next_value <= 0:
            self._pulse_dir *= -1
            next_value = max(0.0, min(1.0, next_value))
        self._pulse = next_value
        self.progress.set(self._pulse)
        self.window.after(80, self._animate_progress)

    def start(self):
        self.install_button.configure(state="disabled")
        self.is_installing = True
        self._animate_progress()
        threading.Thread(target=self._install_worker, daemon=True).start()

    def _install_worker(self):
        try:
            total_steps = len(self.packages) + (1 if self.needs_ffmpeg else 0)
            completed_steps = 0

            for package in self.packages:
                self.window.after(0, self._append, f"Installing {package}...")
                deterministic_install([package], log_callback=lambda msg: self.window.after(0, self._append, msg))
                completed_steps += 1
                if total_steps:
                    self.window.after(0, self.progress.set, completed_steps / total_steps)

            if self.needs_ffmpeg:
                self.window.after(0, self._append, "Installing FFmpeg (best effort)...")
                ok = install_ffmpeg_with_fallback(log_callback=lambda msg: self.window.after(0, self._append, msg))
                if not ok:
                    self.window.after(
                        0, self._append, "FFmpeg install failed. Transcription may fail until FFmpeg is installed."
                    )
                completed_steps += 1
                if total_steps:
                    self.window.after(0, self.progress.set, completed_steps / total_steps)

            self.window.after(0, self.finish)
        except VideoCaptionerError as error:
            self.window.after(0, self.fail, f"{error}\nHint: {error.hint or 'Check logs and retry.'}")
        except Exception as error:
            self.window.after(0, self.fail, str(error))

    def finish(self):
        self.is_installing = False
        self.progress.set(1.0)
        messagebox.showinfo("Setup complete", "Dependencies installed. Starting Video Captioner.", parent=self.window)
        self.window.destroy()
        self.on_complete()

    def fail(self, message):
        self.is_installing = False
        self.progress.set(0)
        self.install_button.configure(state="normal")
        messagebox.showerror("Setup failed", message, parent=self.window)

    def cancel(self):
        self.window.destroy()
        sys.exit(0)


class VideoCaptionerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Video Captioner")
        self.root.geometry("1260x760")
        self.root.minsize(1200, 720)

        self.video_input = tk.StringVar()
        self.source_lang = tk.StringVar(value="auto")
        self.translate_var = tk.BooleanVar(value=False)
        self.target_lang = tk.StringVar(value="")
        self.burn_var = tk.BooleanVar(value=False)
        self.model_size = tk.StringVar(value="base")
        self.compute_type = tk.StringVar(value="auto")
        self.quality_profile = tk.StringVar(value="balanced")
        self.preset = tk.StringVar(value="Balanced")
        self.output_dir = tk.StringVar(value=str(Path.home() / "Downloads" / "Video Captioner"))

        self.is_processing = False
        self.pipeline = None
        self._progress_value = 0.0
        self._estimate_job = None
        self._estimate_started_at = None
        self._estimate_duration = None
        self._model_load_job = None
        self._model_load_value = 0.40
        self._model_load_active = False
        self._transcribe_heartbeat_job = None
        self._transcribe_started_at = None
        self._last_transcribe_log_second = -1
        self._estimated_end_time = None
        self._finalize_heartbeat_job = None

        self.source_display = {name: code for name, code in SOURCE_LANGUAGES}
        self.target_display = {name: code for name, code in TARGET_LANGUAGES}

        self._create_widgets()
        self._init_pipeline()
        self._bind_shortcuts()

    def _init_pipeline(self):
        import whisper
        from deep_translator import GoogleTranslator
        from yt_dlp import YoutubeDL

        self.pipeline = VideoCaptionerPipeline(
            whisper_module=whisper,
            youtube_dl_cls=YoutubeDL,
            google_translator_cls=GoogleTranslator,
        )

    def _section_card(self, parent, title, subtitle=None):
        card = ctk.CTkFrame(parent, fg_color=THEME["bg_card"], corner_radius=16, border_width=1, border_color=THEME["border"])
        ctk.CTkLabel(card, text=title, font=("Segoe UI", 18, "bold"), text_color=THEME["text_primary"]).pack(
            anchor=tk.W, padx=16, pady=(14, 2)
        )
        if subtitle:
            ctk.CTkLabel(card, text=subtitle, font=("Segoe UI", 12), text_color=THEME["text_muted"]).pack(
                anchor=tk.W, padx=16, pady=(0, 10)
            )
        return card

    def _bind_shortcuts(self):
        self.root.bind("<Control-Return>", lambda _: self._start_processing())
        self.root.bind("<Escape>", lambda _: self._cancel_processing() if self.is_processing else None)

    def _create_widgets(self):
        self.root.configure(fg_color=THEME["bg_main"])
        container = ctk.CTkFrame(self.root, fg_color=THEME["bg_main"])
        container.pack(fill=tk.BOTH, expand=True, padx=12, pady=12)

        header = ctk.CTkFrame(container, fg_color=THEME["bg_card_alt"], corner_radius=18, border_width=1, border_color=THEME["border"])
        header.pack(fill=tk.X, pady=(0, 10))
        header_row = ctk.CTkFrame(header, fg_color="transparent")
        header_row.pack(fill=tk.X, padx=20, pady=(16, 16))

        logo_badge = ctk.CTkFrame(
            header_row,
            fg_color=THEME["bg_main"],
            border_width=1,
            border_color=THEME["border"],
            corner_radius=12,
            width=84,
            height=56,
        )
        logo_badge.pack(side=tk.LEFT)
        logo_badge.pack_propagate(False)
        ctk.CTkLabel(
            logo_badge,
            text=BRAND_LOGO_TEXT,
            text_color=THEME["primary"],
            font=("Courier New", 28, "bold"),
        ).pack(expand=True)

        title_col = ctk.CTkFrame(header_row, fg_color="transparent")
        title_col.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(14, 0))
        ctk.CTkLabel(
            title_col, text="Video Captioner", font=("Segoe UI", 30, "bold"), text_color=THEME["primary_light"]
        ).pack(anchor=tk.W, pady=(0, 2))
        ctk.CTkLabel(
            title_col,
            text="Modern AI transcription and translation with private local processing",
            font=("Segoe UI", 13),
            text_color=THEME["text_muted"],
        ).pack(anchor=tk.W)

        body = ctk.CTkFrame(container, fg_color="transparent")
        body.pack(fill=tk.BOTH, expand=True)
        body.grid_columnconfigure(0, weight=1)
        body.grid_columnconfigure(1, weight=1)
        body.grid_rowconfigure(0, weight=1)

        left_col = ctk.CTkFrame(body, fg_color="transparent")
        left_col.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        right_col = ctk.CTkFrame(body, fg_color="transparent")
        right_col.grid(row=0, column=1, sticky="nsew", padx=(6, 0))

        self._input_section(left_col)
        self._language_section(left_col)
        self._output_section(left_col)
        self._run_section(right_col)

    def _input_section(self, parent):
        card = self._section_card(parent, "1) Input", "YouTube URL or local video file")
        card.pack(fill=tk.X, pady=(0, 8))
        row = ctk.CTkFrame(card, fg_color="transparent")
        row.pack(fill=tk.X, padx=16, pady=(0, 14))
        self.video_entry = ctk.CTkEntry(
            row,
            textvariable=self.video_input,
            fg_color=THEME["bg_card_alt"],
            border_color=THEME["border"],
            text_color=THEME["text_primary"],
            height=38,
        )
        self.video_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        ctk.CTkButton(
            row,
            text="Browse",
            command=self._browse_file,
            fg_color=THEME["primary"],
            hover_color=THEME["primary_hover"],
            width=110,
            height=38,
            corner_radius=10,
        ).pack(side=tk.RIGHT, padx=(10, 0))

    def _language_section(self, parent):
        card = self._section_card(parent, "2) Language")
        card.pack(fill=tk.X, pady=(0, 8))

        language_row = ctk.CTkFrame(card, fg_color="transparent")
        language_row.pack(fill=tk.X, padx=16, pady=(0, 10))

        source_col = ctk.CTkFrame(language_row, fg_color="transparent")
        source_col.pack(side=tk.LEFT, fill=tk.X, expand=True)

        ctk.CTkLabel(source_col, text="Source language", text_color=THEME["text_muted"]).pack(anchor=tk.W, pady=(0, 6))
        self.source_menu = ctk.CTkOptionMenu(
            source_col,
            values=[name for name, _ in SOURCE_LANGUAGES],
            command=lambda value: self.source_lang.set(self.source_display[value]),
            fg_color=THEME["bg_card_alt"],
            button_color=THEME["primary"],
            button_hover_color=THEME["primary_hover"],
            text_color=THEME["text_primary"],
            height=34,
        )
        self.source_menu.set("Auto-detect")
        self.source_menu.pack(anchor=tk.W, fill=tk.X)

        self.translate_check = ctk.CTkCheckBox(
            card,
            text="Translate captions",
            variable=self.translate_var,
            command=self._toggle_translation,
            text_color=THEME["text_primary"],
            fg_color=THEME["primary"],
            hover_color=THEME["primary_hover"],
            border_color=THEME["border"],
        )
        self.translate_check.pack(anchor=tk.W, padx=16, pady=(0, 10))

        self.target_lang_container = ctk.CTkFrame(language_row, fg_color="transparent")
        self.target_lang_container.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(12, 0))

        ctk.CTkLabel(self.target_lang_container, text="Target language", text_color=THEME["text_muted"]).pack(
            anchor=tk.W, pady=(0, 6)
        )
        self.target_menu = ctk.CTkOptionMenu(
            self.target_lang_container,
            values=[name for name, _ in TARGET_LANGUAGES],
            command=lambda value: self.target_lang.set(self.target_display[value]),
            fg_color=THEME["bg_card_alt"],
            button_color=THEME["primary"],
            button_hover_color=THEME["primary_hover"],
            text_color=THEME["text_primary"],
            height=34,
            state="disabled",
        )
        self.target_menu.pack(anchor=tk.W, fill=tk.X)
        self.target_lang_container.pack_forget()

    def _output_section(self, parent):
        card = self._section_card(parent, "3) Output")
        card.pack(fill=tk.BOTH, expand=True)

        ctk.CTkLabel(card, text="Quick preset", text_color=THEME["text_muted"]).pack(anchor=tk.W, padx=16, pady=(0, 6))
        ctk.CTkSegmentedButton(
            card,
            values=list(PRESET_CONFIGS.keys()),
            variable=self.preset,
            command=self._apply_preset,
            fg_color=THEME["bg_card_alt"],
            selected_color=THEME["primary"],
            selected_hover_color=THEME["primary_hover"],
            unselected_color=THEME["bg_card_alt"],
            unselected_hover_color=THEME["border"],
            text_color=THEME["text_primary"],
            height=34,
        ).pack(fill=tk.X, padx=16, pady=(0, 10))

        ctk.CTkCheckBox(
            card,
            text="Burn captions into video (requires FFmpeg)",
            variable=self.burn_var,
            text_color=THEME["text_primary"],
            fg_color=THEME["primary"],
            hover_color=THEME["primary_hover"],
            border_color=THEME["border"],
        ).pack(anchor=tk.W, padx=16, pady=(0, 10))

        profile_row = ctk.CTkFrame(card, fg_color="transparent")
        profile_row.pack(fill=tk.X, padx=16, pady=(0, 10))

        ctk.CTkLabel(profile_row, text="Model", text_color=THEME["text_muted"]).pack(side=tk.LEFT)
        ctk.CTkOptionMenu(
            profile_row,
            values=MODEL_SIZES,
            variable=self.model_size,
            width=120,
            fg_color=THEME["bg_card_alt"],
            button_color=THEME["primary"],
            button_hover_color=THEME["primary_hover"],
            text_color=THEME["text_primary"],
            height=32,
        ).pack(side=tk.LEFT, padx=(8, 16))

        ctk.CTkLabel(profile_row, text="Compute", text_color=THEME["text_muted"]).pack(side=tk.LEFT)
        ctk.CTkOptionMenu(
            profile_row,
            values=COMPUTE_TYPES,
            variable=self.compute_type,
            width=110,
            fg_color=THEME["bg_card_alt"],
            button_color=THEME["primary"],
            button_hover_color=THEME["primary_hover"],
            text_color=THEME["text_primary"],
            height=32,
        ).pack(side=tk.LEFT, padx=(8, 16))

        ctk.CTkLabel(card, text="Quality profile", text_color=THEME["text_muted"]).pack(anchor=tk.W, padx=16, pady=(0, 6))
        ctk.CTkSegmentedButton(
            card,
            values=QUALITY_PROFILES,
            variable=self.quality_profile,
            fg_color=THEME["bg_card_alt"],
            selected_color=THEME["primary"],
            selected_hover_color=THEME["primary_hover"],
            unselected_color=THEME["bg_card_alt"],
            unselected_hover_color=THEME["border"],
            text_color=THEME["text_primary"],
            height=34,
        ).pack(fill=tk.X, padx=16, pady=(0, 10))

        dir_row = ctk.CTkFrame(card, fg_color="transparent")
        dir_row.pack(fill=tk.X, padx=16, pady=(0, 14))
        self.output_entry = ctk.CTkEntry(
            dir_row,
            textvariable=self.output_dir,
            fg_color=THEME["bg_card_alt"],
            border_color=THEME["border"],
            text_color=THEME["text_primary"],
            height=36,
        )
        self.output_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        ctk.CTkButton(
            dir_row,
            text="Change",
            command=self._browse_directory,
            fg_color="transparent",
            border_width=1,
            border_color=THEME["border"],
            text_color=THEME["text_primary"],
            hover_color=THEME["bg_card_alt"],
            width=100,
            height=36,
            corner_radius=10,
        ).pack(side=tk.RIGHT, padx=(10, 0))

    def _run_section(self, parent):
        card = self._section_card(parent, "4) Run and Results")
        card.pack(fill=tk.BOTH, expand=True)
        self.status_label = ctk.CTkLabel(card, text="Ready", text_color=THEME["text_muted"], font=("Segoe UI", 13, "bold"))
        self.status_label.pack(anchor=tk.W, padx=16, pady=(0, 6))

        self.progress = ctk.CTkProgressBar(card, progress_color=THEME["primary"], fg_color=THEME["border"], height=14)
        self.progress.pack(fill=tk.X, padx=16, pady=(0, 10))
        self.progress.set(0)

        self.log = ctk.CTkTextbox(
            card,
            height=420,
            fg_color=THEME["bg_card_alt"],
            border_width=1,
            border_color=THEME["border"],
            text_color=THEME["text_primary"],
            font=("Consolas", 12),
        )
        self.log.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 10))
        self.log.configure(state="disabled")

        row = ctk.CTkFrame(card, fg_color="transparent")
        row.pack(fill=tk.X, padx=16, pady=(0, 16))
        ctk.CTkButton(
            row,
            text="Clear Log",
            command=self._clear_log,
            fg_color="transparent",
            border_width=1,
            border_color=THEME["border"],
            text_color=THEME["text_primary"],
            hover_color=THEME["bg_card_alt"],
            width=110,
            height=38,
            corner_radius=10,
        ).pack(side=tk.LEFT)

        self.cancel_button = ctk.CTkButton(
            row,
            text="Cancel",
            state="disabled",
            command=self._cancel_processing,
            fg_color="transparent",
            border_width=1,
            border_color=THEME["border"],
            text_color=THEME["text_primary"],
            hover_color=THEME["bg_card_alt"],
            width=110,
            height=38,
            corner_radius=10,
        )
        self.cancel_button.pack(side=tk.RIGHT)

        self.run_button = ctk.CTkButton(
            row,
            text="Generate Captions",
            command=self._start_processing,
            fg_color=THEME["primary"],
            hover_color=THEME["primary_hover"],
            text_color="#ffffff",
            width=180,
            height=38,
            corner_radius=10,
            font=("Segoe UI", 13, "bold"),
        )
        self.run_button.pack(side=tk.RIGHT, padx=(0, 10))

    def _toggle_translation(self):
        if self.translate_var.get():
            self.target_menu.configure(state="normal")
            self.target_lang_container.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(12, 0))
        else:
            self.target_menu.configure(state="disabled")
            self.target_lang.set("")
            self.target_lang_container.pack_forget()

    def _apply_preset(self, preset_name):
        config = PRESET_CONFIGS.get(preset_name)
        if not config:
            return

        self.model_size.set(config["model_size"])
        self.quality_profile.set(config["quality_profile"])
        self.compute_type.set(config["compute_type"])
        # Preserve translation unless preset explicitly controls it.
        if "translate" in config:
            self.translate_var.set(bool(config["translate"]))
            self._toggle_translation()

        if config.get("target_lang_display") and self.translate_var.get():
            display = config["target_lang_display"]
            if not self.target_lang.get():
                self.target_menu.set(display)
                self.target_lang.set(self.target_display[display])
        self._append_log(f"Applied preset: {preset_name}")

    def _browse_file(self):
        selected = filedialog.askopenfilename(
            title="Select video file",
            filetypes=[("Video files", "*.mp4 *.avi *.mov *.mkv *.flv *.wmv"), ("All files", "*.*")],
        )
        if selected:
            self.video_input.set(selected)

    def _browse_directory(self):
        selected = filedialog.askdirectory(title="Select output directory")
        if selected:
            self.output_dir.set(selected)

    def _append_log(self, text):
        self.log.configure(state="normal")
        self.log.insert(tk.END, f"{text}\n")
        self.log.see(tk.END)
        self.log.configure(state="disabled")

    def _clear_log(self):
        self.log.configure(state="normal")
        self.log.delete("1.0", tk.END)
        self.log.configure(state="disabled")

    def _set_progress(self, value):
        self._progress_value = max(self._progress_value, max(0.0, min(1.0, value)))
        self.progress.set(self._progress_value)

    def _start_estimated_progress(self, estimated_seconds):
        self._estimate_duration = max(estimated_seconds, 5)
        self._estimate_started_at = time.monotonic()
        self._tick_estimated_progress()

    def _stop_estimated_progress(self):
        if self._estimate_job is not None:
            self.root.after_cancel(self._estimate_job)
            self._estimate_job = None
        self._estimate_started_at = None
        self._estimate_duration = None

    def _start_model_load_progress(self):
        self._model_load_active = True
        self._model_load_value = max(self._progress_value, 0.40)
        self._tick_model_load_progress()

    def _stop_model_load_progress(self):
        self._model_load_active = False
        if self._model_load_job is not None:
            self.root.after_cancel(self._model_load_job)
            self._model_load_job = None

    def _tick_model_load_progress(self):
        if not self.is_processing or not self._model_load_active:
            return
        # Advance smoothly through a reserved range while Whisper model loads.
        self._model_load_value = min(self._model_load_value + 0.01, 0.50)
        self._set_progress(self._model_load_value)
        if self._model_load_value >= 0.50:
            self._model_load_value = 0.46
        self._model_load_job = self.root.after(120, self._tick_model_load_progress)

    def _tick_estimated_progress(self):
        if not self.is_processing or self._estimate_started_at is None or self._estimate_duration is None:
            return
        elapsed = time.monotonic() - self._estimate_started_at
        fraction = max(0.0, min(1.0, elapsed / self._estimate_duration))
        estimated_value = 0.40 + (fraction * 0.45)
        # Keep visible movement even for long estimates (e.g. 20+ min jobs).
        estimated_value = max(estimated_value, min(self._progress_value + 0.0015, 0.85))
        self._set_progress(estimated_value)
        remaining_seconds = max(0, int(self._estimate_duration - elapsed))
        self._estimated_end_time = time.monotonic() + remaining_seconds
        self._estimate_job = self.root.after(250, self._tick_estimated_progress)

    def _start_transcribe_heartbeat(self):
        self._transcribe_started_at = time.monotonic()
        self._last_transcribe_log_second = -1
        self._tick_transcribe_heartbeat()

    def _stop_transcribe_heartbeat(self):
        if self._transcribe_heartbeat_job is not None:
            self.root.after_cancel(self._transcribe_heartbeat_job)
            self._transcribe_heartbeat_job = None
        self._transcribe_started_at = None
        self._last_transcribe_log_second = -1

    def _start_finalize_heartbeat(self, stage_name):
        self._stop_finalize_heartbeat()
        self._tick_finalize_heartbeat(stage_name)

    def _stop_finalize_heartbeat(self):
        if self._finalize_heartbeat_job is not None:
            self.root.after_cancel(self._finalize_heartbeat_job)
            self._finalize_heartbeat_job = None

    def _tick_finalize_heartbeat(self, stage_name):
        if not self.is_processing:
            return
        self.status_label.configure(text="Saving outputs...", text_color=THEME["primary_light"])
        self._set_progress(min(self._progress_value + 0.0010, 0.985))
        self._finalize_heartbeat_job = self.root.after(250, self._tick_finalize_heartbeat, stage_name)

    def _tick_transcribe_heartbeat(self):
        if not self.is_processing or self._transcribe_started_at is None:
            return
        elapsed_seconds = int(time.monotonic() - self._transcribe_started_at)
        mins, secs = divmod(elapsed_seconds, 60)
        self.status_label.configure(text=f"Transcribing ({mins:02d}:{secs:02d})", text_color=THEME["primary_light"])

        # Write occasional heartbeat to log so users know work is ongoing.
        if elapsed_seconds >= 15 and elapsed_seconds % 15 == 0 and elapsed_seconds != self._last_transcribe_log_second:
            self._last_transcribe_log_second = elapsed_seconds
            self._append_log(f"[transcribe] Still working... elapsed {mins}m {secs}s")

        # Also nudge bar inside transcribe window to avoid visual stall.
        self._set_progress(min(self._progress_value + 0.0008, 0.86))
        self._transcribe_heartbeat_job = self.root.after(1000, self._tick_transcribe_heartbeat)

    def _cancel_processing(self):
        if self.pipeline:
            self.pipeline.cancel()
        self.status_label.configure(text="Cancelling...", text_color=THEME["danger"])
        self.cancel_button.configure(state="disabled")
        self._append_log("Cancellation requested. Waiting for current stage to finish safely.")

    def _start_processing(self):
        if self.is_processing:
            return
        if not self.video_input.get().strip():
            messagebox.showerror("Missing input", "Choose a video file or paste a YouTube URL.")
            return
        if self.translate_var.get() and not self.target_lang.get():
            messagebox.showerror("Missing target language", "Select a target language for translation.")
            return

        self.is_processing = True
        if self.pipeline is not None:
            self.pipeline.reset_cancel()
        self.run_button.configure(state="disabled")
        self.cancel_button.configure(state="normal")
        self.status_label.configure(text="Running", text_color=THEME["primary_light"])
        self._estimated_end_time = None
        self._clear_log()
        self._progress_value = 0.0
        self.progress.set(0)
        self._stop_estimated_progress()
        self._stop_model_load_progress()
        self._stop_transcribe_heartbeat()
        self._stop_finalize_heartbeat()
        self._last_download_log_bucket = -1
        self._last_subtitle_log_bucket = -1

        threading.Thread(target=self._process_worker, daemon=True).start()

    def _process_worker(self):
        options = PipelineOptions(
            video_input=self.video_input.get().strip(),
            output_dir=self.output_dir.get().strip(),
            source_lang=self.source_lang.get(),
            target_lang=self.target_lang.get() if self.translate_var.get() else None,
            burn_captions=self.burn_var.get(),
            model_size=self.model_size.get(),
            compute_type=self.compute_type.get(),
            quality_profile=self.quality_profile.get(),
        )

        def progress_callback(stage, message, metadata):
            metadata = metadata or {}
            progress_value = metadata.get("progress")
            if isinstance(progress_value, (int, float)):
                self.root.after(0, self._set_progress, float(progress_value))

            if stage == "download":
                percent = metadata.get("download_percent")
                if isinstance(percent, (int, float)):
                    bucket = int(float(percent) * 10)
                    # Log at 10% intervals to avoid noisy output.
                    if not hasattr(self, "_last_download_log_bucket"):
                        self._last_download_log_bucket = -1
                    if bucket > self._last_download_log_bucket:
                        self._last_download_log_bucket = bucket
                        self.root.after(0, self._append_log, f"[{stage}] {message}")
                stage_label = f"Downloading {int((percent or 0) * 100)}%"
                self.root.after(0, lambda: self.status_label.configure(text=stage_label, text_color=THEME["primary_light"]))
                return

            if stage == "subtitle_build_progress":
                percent = metadata.get("subtitle_percent")
                if isinstance(percent, (int, float)):
                    bucket = int(float(percent) * 10)
                    if bucket > self._last_subtitle_log_bucket:
                        self._last_subtitle_log_bucket = bucket
                        self.root.after(0, self._append_log, f"[subtitle_build] {message}")
                    stage_label = f"Building subtitles {int((percent or 0) * 100)}%"
                    self.root.after(
                        0, lambda: self.status_label.configure(text=stage_label, text_color=THEME["primary_light"])
                    )
                return

            self.root.after(0, self._append_log, f"[{stage}] {message}")
            stage_label = stage.replace("_", " ").title()
            eta_suffix = ""
            if self._estimated_end_time:
                remaining = int(max(0, self._estimated_end_time - time.monotonic()))
                if remaining > 0:
                    mins, secs = divmod(remaining, 60)
                    eta_suffix = f" (~{mins:02d}:{secs:02d} left)"
            if stage == "estimate":
                eta_suffix = " (rough)"
                self.root.after(
                    0, lambda: self.status_label.configure(text=f"{stage_label}{eta_suffix}", text_color=THEME["primary_light"])
                )
            else:
                self.root.after(
                    0,
                    lambda: self.status_label.configure(text=f"{stage_label}{eta_suffix}", text_color=THEME["primary_light"]),
                )
            if stage == "estimate":
                estimated_seconds = metadata.get("estimated_seconds")
                is_rough_estimate = bool(metadata.get("estimate_is_rough", False))
                if isinstance(estimated_seconds, (int, float)) and estimated_seconds > 0:
                    self.root.after(0, self._start_estimated_progress, int(estimated_seconds))
                    if is_rough_estimate:
                        self.root.after(0, self._append_log, "[estimate] Timing is approximate and may vary by hardware.")
            if stage == "model_load":
                self.root.after(0, self._start_model_load_progress)
            if stage == "model_ready":
                self.root.after(0, self._stop_model_load_progress)
            if stage == "transcribe_start":
                self.root.after(0, self._start_transcribe_heartbeat)
            if stage == "subtitle_build_start":
                self.root.after(0, self._stop_transcribe_heartbeat)
                self.root.after(
                    0, lambda: self.status_label.configure(text="Building subtitles...", text_color=THEME["primary_light"])
                )
            if stage == "save_output_start":
                self.root.after(0, self._start_finalize_heartbeat, "save")
            if stage in ("subtitle_build", "save_output", "complete"):
                self.root.after(0, self._stop_finalize_heartbeat)
            if stage in ("transcribe", "subtitle_build", "save_output", "complete"):
                self.root.after(0, self._stop_estimated_progress)
            if metadata and metadata.get("timings"):
                for key, value in metadata["timings"].items():
                    self.root.after(0, self._append_log, f"  - {key}: {value:.2f}s")

        try:
            if self.pipeline is None:
                raise RuntimeError("Processing pipeline is not initialized.")
            result = self.pipeline.process(options, progress_callback=progress_callback)
            self.root.after(0, self._on_success, result["output_paths"])
        except VideoCaptionerError as error:
            message = f"{error}\n\nCategory: {error.category}"
            if error.hint:
                message += f"\nHint: {error.hint}"
            self.root.after(0, self._on_failure, message)
        except Exception as error:
            self.root.after(0, self._on_failure, str(error))

    def _on_success(self, output_paths):
        self.is_processing = False
        self._stop_estimated_progress()
        self._stop_model_load_progress()
        self._stop_transcribe_heartbeat()
        self._stop_finalize_heartbeat()
        self.progress.set(1.0)
        self.run_button.configure(state="normal")
        self.cancel_button.configure(state="disabled")
        has_srt = any(path.lower().endswith(".srt") for path in output_paths)
        has_video = any(path.lower().endswith((".mp4", ".mkv", ".avi", ".mov", ".webm")) for path in output_paths)
        if has_srt and has_video:
            summary = "Completed (Subtitles + Video)"
        elif has_srt:
            summary = "Completed (Subtitles only)"
        else:
            summary = "Completed"
        self.status_label.configure(text=summary, text_color=THEME["success"])
        self._append_log("Done.")
        self._append_log("Output:")
        for path in output_paths:
            self._append_log(f"- {path}")

        output_dir = os.path.dirname(output_paths[0]) if output_paths else self.output_dir.get()
        if messagebox.askyesno("Success", "Processing completed. Open output folder?"):
            if sys.platform == "win32":
                os.startfile(output_dir)  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.run(["open", output_dir])
            else:
                subprocess.run(["xdg-open", output_dir])

    def _on_failure(self, message):
        self.is_processing = False
        self._stop_estimated_progress()
        self._stop_model_load_progress()
        self._stop_transcribe_heartbeat()
        self._stop_finalize_heartbeat()
        self.progress.set(0)
        self.run_button.configure(state="normal")
        self.cancel_button.configure(state="disabled")
        if "cancel" in message.lower():
            self.status_label.configure(text="Cancelled", text_color=THEME["text_muted"])
            self._append_log("Cancelled by user.")
            self._append_log(message)
            return
        self.status_label.configure(text="Failed", text_color=THEME["danger"])
        self._append_log(f"Failed: {message}")
        messagebox.showerror("Processing failed", message)


def launch_app():
    _ensure_standard_streams()
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")

    root = ctk.CTk()
    root.configure(fg_color=THEME["bg_main"])

    missing = missing_python_packages()
    needs_ffmpeg = not ffmpeg_available()

    def start_main_app():
        root.deiconify()
        VideoCaptionerApp(root)

    if missing or needs_ffmpeg:
        root.withdraw()
        DependencyInstallerWindow(root, missing, needs_ffmpeg, start_main_app)
    else:
        start_main_app()

    root.mainloop()
