#!/usr/bin/env python3
"""
Video Captioner - Desktop Application
A user-friendly GUI tool for generating video captions

Just double-click this file to run!
No terminal knowledge required.

Author: gelbhart.dev
"""

import os
import sys
import subprocess
import json
import tempfile
import shutil
import threading
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext

# Check and install dependencies
def check_and_install_dependencies():
    """Check if required packages are installed, install if missing"""
    required_packages = {
        'whisper': 'openai-whisper',
        'yt_dlp': 'yt-dlp',
        'deep_translator': 'deep-translator'
    }

    missing_packages = []
    for module_name, package_name in required_packages.items():
        try:
            __import__(module_name)
        except ImportError:
            missing_packages.append(package_name)

    return missing_packages

def check_ffmpeg():
    """Check if FFmpeg is installed"""
    return shutil.which('ffmpeg') is not None

def install_ffmpeg():
    """Install FFmpeg automatically based on platform"""
    import platform
    system = platform.system()

    try:
        if system == 'Windows':
            # Use chocolatey if available, otherwise provide instructions
            choco_available = subprocess.run(['choco', '--version'],
                                           capture_output=True).returncode == 0
            if choco_available:
                subprocess.check_call(['choco', 'install', 'ffmpeg', '-y'])
                return True
            else:
                # Install using pip package that includes ffmpeg binaries
                subprocess.check_call([sys.executable, "-m", "pip", "install", "imageio-ffmpeg"])
                return True

        elif system == 'Darwin':  # macOS
            # Try homebrew
            brew_available = subprocess.run(['brew', '--version'],
                                          capture_output=True).returncode == 0
            if brew_available:
                subprocess.check_call(['brew', 'install', 'ffmpeg'])
                return True
            else:
                # Fallback to imageio-ffmpeg
                subprocess.check_call([sys.executable, "-m", "pip", "install", "imageio-ffmpeg"])
                return True

        elif system == 'Linux':
            # Try apt-get (Debian/Ubuntu)
            apt_available = subprocess.run(['apt-get', '--version'],
                                         capture_output=True).returncode == 0
            if apt_available:
                subprocess.check_call(['sudo', 'apt-get', 'install', '-y', 'ffmpeg'])
                return True
            # Try yum (RedHat/CentOS)
            yum_available = subprocess.run(['yum', '--version'],
                                         capture_output=True).returncode == 0
            if yum_available:
                subprocess.check_call(['sudo', 'yum', 'install', '-y', 'ffmpeg'])
                return True
            # Fallback to imageio-ffmpeg
            subprocess.check_call([sys.executable, "-m", "pip", "install", "imageio-ffmpeg"])
            return True

    except:
        # If all else fails, install imageio-ffmpeg
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "imageio-ffmpeg"])
            return True
        except:
            return False

    return False


class DependencyInstallerWindow:
    """Window to guide users through dependency installation"""

    def __init__(self, parent, packages, on_complete_callback, install_ffmpeg=False):
        self.packages = packages
        self.parent = parent  # Store parent for after() calls
        self.on_complete_callback = on_complete_callback
        self.install_ffmpeg = install_ffmpeg
        self.window = tk.Toplevel(parent)
        self.window.title("First Time Setup")
        self.window.geometry("600x500")
        self.window.resizable(False, False)

        # Don't make it transient yet - we'll withdraw parent later
        # self.window.transient(parent)
        self.window.grab_set()

        # Center window
        self.window.update_idletasks()
        x = (self.window.winfo_screenwidth() // 2) - (600 // 2)
        y = (self.window.winfo_screenheight() // 2) - (500 // 2)
        self.window.geometry(f"+{x}+{y}")

        self.create_widgets()

    def create_widgets(self):
        # Title
        title_frame = ttk.Frame(self.window, padding="20")
        title_frame.pack(fill=tk.X)

        ttk.Label(
            title_frame,
            text="🚀 Welcome to Video Captioner!",
            font=("Arial", 16, "bold")
        ).pack()

        ttk.Label(
            title_frame,
            text="First time setup - Installing required components...",
            font=("Arial", 10)
        ).pack(pady=5)

        # Info text
        info_frame = ttk.Frame(self.window, padding="20")
        info_frame.pack(fill=tk.BOTH, expand=True)

        packages_list = ', '.join(self.packages)
        if self.install_ffmpeg:
            packages_list += ', FFmpeg (video processing)'

        info_text = (
            "The following packages need to be installed:\n\n"
            f"• {packages_list}\n\n"
            "This is a one-time setup and may take 5-10 minutes.\n"
            "The app will download AI models and dependencies.\n\n"
            "Click 'Install' to begin."
        )

        ttk.Label(
            info_frame,
            text=info_text,
            justify=tk.LEFT,
            wraplength=550
        ).pack()

        # Progress area
        self.progress_frame = ttk.Frame(self.window, padding="20")
        self.progress_frame.pack(fill=tk.BOTH, expand=True)

        self.progress_label = ttk.Label(
            self.progress_frame,
            text="Ready to install",
            font=("Arial", 9)
        )
        self.progress_label.pack()

        self.progress_bar = ttk.Progressbar(
            self.progress_frame,
            mode='indeterminate',
            length=400
        )
        self.progress_bar.pack(pady=10)

        # Buttons
        button_frame = ttk.Frame(self.window, padding="20")
        button_frame.pack(fill=tk.X)

        ttk.Button(
            button_frame,
            text="Cancel",
            command=self.cancel
        ).pack(side=tk.RIGHT, padx=5)

        self.install_btn = ttk.Button(
            button_frame,
            text="Install",
            command=self.start_installation
        )
        self.install_btn.pack(side=tk.RIGHT, padx=5)

    def start_installation(self):
        self.install_btn.config(state='disabled')
        self.progress_bar.start(10)
        self.progress_label.config(text="Installing packages...")
        self.window.update_idletasks()

        # Install packages synchronously with UI updates
        try:
            total_items = len(self.packages) + (1 if self.install_ffmpeg else 0)
            current = 0

            # Install Python packages
            for package in self.packages:
                current += 1
                self.progress_label.config(text=f"Installing {package}... ({current}/{total_items})")
                self.window.update_idletasks()
                self.window.update()

                result = subprocess.run(
                    [sys.executable, "-m", "pip", "install", package],
                    capture_output=True,
                    text=True
                )

                if result.returncode != 0:
                    raise Exception(f"Failed to install {package}: {result.stderr}")

                self.window.update_idletasks()
                self.window.update()

            # Install FFmpeg if needed
            if self.install_ffmpeg:
                current += 1
                self.progress_label.config(text=f"Installing FFmpeg... ({current}/{total_items})")
                self.window.update_idletasks()
                self.window.update()

                success = install_ffmpeg()
                if not success:
                    # Don't fail completely, just warn
                    self.progress_label.config(text="⚠ FFmpeg installation skipped (optional)")

                self.window.update_idletasks()
                self.window.update()

            self.installation_complete()

        except Exception as e:
            self.installation_failed(str(e))

    def installation_complete(self):
        self.progress_bar.stop()
        self.progress_label.config(text="✓ Installation complete!")
        messagebox.showinfo(
            "Success",
            "All dependencies installed successfully!\nThe app will now start.",
            parent=self.window
        )
        self.window.destroy()
        # Call the callback to start the main app
        self.on_complete_callback()

    def installation_failed(self, error):
        self.progress_bar.stop()
        self.progress_label.config(text="✗ Installation failed")
        messagebox.showerror(
            "Installation Failed",
            f"Failed to install dependencies:\n{error}\n\n"
            "Please check your internet connection and try again.",
            parent=self.window
        )
        self.install_btn.config(state='normal')

    def cancel(self):
        if messagebox.askyesno(
            "Cancel Setup",
            "Are you sure? The app cannot run without these dependencies.",
            parent=self.window
        ):
            sys.exit(0)


class VideoCaptionerApp:
    """Main application window"""

    def __init__(self, root):
        self.root = root
        self.root.title("Video Captioner")
        self.root.geometry("900x700")
        self.root.resizable(False, True)  # Lock width, allow height resize

        # Center window (accounting for taskbar)
        self.root.update_idletasks()
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = (screen_width // 2) - (900 // 2)
        # Adjust y position to account for taskbar (subtract ~30px from center)
        y = ((screen_height - 50) // 2) - (700 // 2)
        self.root.geometry(f"+{x}+{y}")

        # Variables
        self.video_input = tk.StringVar()
        self.source_lang = tk.StringVar(value="auto")
        self.translate_var = tk.BooleanVar(value=False)
        self.target_lang = tk.StringVar()
        self.burn_var = tk.BooleanVar(value=False)
        self.model_size = tk.StringVar(value="base")
        self.output_dir = tk.StringVar(value=str(Path.home() / "Desktop" / "Captions"))

        self.is_processing = False

        # Language lists
        self.source_languages = [
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

        self.target_languages = [
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

        self.create_widgets()

        # Import here after dependencies are checked
        global whisper, YoutubeDL, GoogleTranslator
        import whisper
        from yt_dlp import YoutubeDL
        from deep_translator import GoogleTranslator

    def create_widgets(self):
        # Create main container with scrollbar
        main_canvas = tk.Canvas(self.root, highlightthickness=0, bg='#f0f0f0')
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=main_canvas.yview)
        scrollable_frame = ttk.Frame(main_canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: main_canvas.configure(scrollregion=main_canvas.bbox("all"))
        )

        canvas_window = main_canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", width=900)
        main_canvas.configure(yscrollcommand=scrollbar.set)

        # Bind mousewheel for scrolling
        def on_mousewheel(event):
            main_canvas.yview_scroll(int(-1*(event.delta/120)), "units")

        main_canvas.bind_all("<MouseWheel>", on_mousewheel)

        # Header
        header_frame = ttk.Frame(scrollable_frame, padding="20")
        header_frame.pack(fill=tk.X)

        ttk.Label(
            header_frame,
            text="🎬 Video Captioner",
            font=("Arial", 20, "bold")
        ).pack()

        ttk.Label(
            header_frame,
            text="Generate AI-powered captions for your videos",
            font=("Arial", 10)
        ).pack()

        # Video Input Section
        input_frame = ttk.LabelFrame(scrollable_frame, text="📹 Video Input", padding="15")
        input_frame.pack(fill=tk.X, padx=20, pady=10)

        ttk.Label(input_frame, text="YouTube URL or Local Video File:").pack(anchor=tk.W, pady=5)

        input_row = ttk.Frame(input_frame)
        input_row.pack(fill=tk.X, pady=5)

        ttk.Entry(input_row, textvariable=self.video_input).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        ttk.Button(input_row, text="Browse...", command=self.browse_file).pack(side=tk.RIGHT)

        # Language Settings Section
        lang_frame = ttk.LabelFrame(scrollable_frame, text="🌍 Language Settings", padding="15")
        lang_frame.pack(fill=tk.X, padx=20, pady=10)

        ttk.Label(lang_frame, text="Source Language:", font=("Arial", 10, "bold")).pack(anchor=tk.W, pady=(0, 5))

        # Create mapping for display
        self.source_lang_display = {name: code for name, code in self.source_languages}
        self.source_lang_reverse = {code: name for name, code in self.source_languages}

        source_combo = ttk.Combobox(
            lang_frame,
            values=[name for name, code in self.source_languages],
            state="readonly",
            width=30,
            font=("Arial", 10)
        )
        source_combo.set("Auto-detect")
        source_combo.bind("<<ComboboxSelected>>", lambda e: self.on_source_lang_change(source_combo.get()))
        source_combo.pack(anchor=tk.W, pady=5)

        # Translation Section
        trans_frame = ttk.Frame(lang_frame)
        trans_frame.pack(fill=tk.X, pady=10)

        ttk.Checkbutton(
            trans_frame,
            text="Translate captions to another language",
            variable=self.translate_var,
            command=self.toggle_translation
        ).pack(anchor=tk.W)

        self.target_lang_frame = ttk.Frame(lang_frame)
        self.target_lang_frame.pack(fill=tk.X, pady=5)

        ttk.Label(self.target_lang_frame, text="Target Language:", font=("Arial", 10, "bold")).pack(anchor=tk.W, pady=(10, 5))

        # Create mapping for display
        self.target_lang_display = {name: code for name, code in self.target_languages}
        self.target_lang_reverse = {code: name for name, code in self.target_languages}

        self.target_combo = ttk.Combobox(
            self.target_lang_frame,
            values=[name for name, code in self.target_languages],
            state="disabled",
            width=30,
            font=("Arial", 10)
        )
        self.target_combo.bind("<<ComboboxSelected>>", lambda e: self.on_target_lang_change(self.target_combo.get()))
        self.target_combo.pack(anchor=tk.W, pady=5)

        # Output Settings Section
        output_frame = ttk.LabelFrame(scrollable_frame, text="💾 Output Settings", padding="15")
        output_frame.pack(fill=tk.X, padx=20, pady=10)

        ttk.Checkbutton(
            output_frame,
            text="Burn captions into video (requires FFmpeg)",
            variable=self.burn_var
        ).pack(anchor=tk.W, pady=5)

        ttk.Label(output_frame, text="Model Size:").pack(anchor=tk.W, pady=5)
        model_combo = ttk.Combobox(
            output_frame,
            textvariable=self.model_size,
            values=["tiny", "base", "small", "medium", "large"],
            state="readonly",
            width=15
        )
        model_combo.pack(anchor=tk.W, pady=5)
        ttk.Label(
            output_frame,
            text="(larger = more accurate but slower)",
            font=("Arial", 8)
        ).pack(anchor=tk.W)

        ttk.Label(output_frame, text="Output Directory:").pack(anchor=tk.W, pady=(10, 5))

        dir_row = ttk.Frame(output_frame)
        dir_row.pack(fill=tk.X, pady=5)

        ttk.Entry(dir_row, textvariable=self.output_dir, state="readonly").pack(
            side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5)
        )
        ttk.Button(dir_row, text="Change...", command=self.browse_directory).pack(side=tk.RIGHT)

        # Progress Section
        self.progress_frame = ttk.LabelFrame(scrollable_frame, text="📊 Progress", padding="15")
        self.progress_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        self.progress_text = scrolledtext.ScrolledText(
            self.progress_frame,
            height=10,
            state='disabled',
            wrap=tk.WORD,
            font=("Courier", 9)
        )
        self.progress_text.pack(fill=tk.BOTH, expand=True)

        self.progress_bar = ttk.Progressbar(self.progress_frame, mode='indeterminate')
        self.progress_bar.pack(fill=tk.X, pady=(10, 0))

        # Buttons
        button_frame = ttk.Frame(scrollable_frame, padding="20")
        button_frame.pack(fill=tk.X)

        self.process_btn = ttk.Button(
            button_frame,
            text="Generate Captions",
            command=self.start_processing
        )
        self.process_btn.pack(side=tk.RIGHT, padx=5)

        ttk.Button(
            button_frame,
            text="Clear",
            command=self.clear_log
        ).pack(side=tk.RIGHT)

        # Pack canvas and scrollbar
        main_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def on_source_lang_change(self, display_name):
        code = self.source_lang_display[display_name]
        self.source_lang.set(code)

    def on_target_lang_change(self, display_name):
        code = self.target_lang_display[display_name]
        self.target_lang.set(code)

    def toggle_translation(self):
        if self.translate_var.get():
            self.target_combo.config(state="readonly")
        else:
            self.target_combo.config(state="disabled")

    def browse_file(self):
        filename = filedialog.askopenfilename(
            title="Select Video File",
            filetypes=[
                ("Video Files", "*.mp4 *.avi *.mov *.mkv *.flv *.wmv"),
                ("All Files", "*.*")
            ]
        )
        if filename:
            self.video_input.set(filename)

    def browse_directory(self):
        directory = filedialog.askdirectory(title="Select Output Directory")
        if directory:
            self.output_dir.set(directory)

    def log_message(self, message):
        self.progress_text.config(state='normal')
        self.progress_text.insert(tk.END, message + "\n")
        self.progress_text.see(tk.END)
        self.progress_text.config(state='disabled')
        self.root.update()

    def clear_log(self):
        self.progress_text.config(state='normal')
        self.progress_text.delete(1.0, tk.END)
        self.progress_text.config(state='disabled')

    def start_processing(self):
        if self.is_processing:
            return

        # Validation
        if not self.video_input.get():
            messagebox.showerror("Error", "Please enter a YouTube URL or select a video file.")
            return

        if self.translate_var.get() and not self.target_lang.get():
            messagebox.showerror("Error", "Please select a target language for translation.")
            return

        self.is_processing = True
        self.process_btn.config(state='disabled', text="Processing...")
        self.progress_bar.start(10)
        self.clear_log()

        # Run processing in background thread
        thread = threading.Thread(target=self.process_video, daemon=True)
        thread.start()

    def process_video(self):
        try:
            self.run_video_processing()
        except Exception as e:
            self.root.after(0, lambda: self.processing_failed(str(e)))

    def run_video_processing(self):
        """Main video processing logic"""
        video_input = self.video_input.get()
        is_youtube = video_input.startswith('http')

        with tempfile.TemporaryDirectory() as temp_dir:
            # Download or load video
            if is_youtube:
                self.root.after(0, lambda: self.log_message("📥 Downloading video from YouTube..."))
                video_path, video_title, duration = self.download_youtube(video_input, temp_dir)
                self.root.after(0, lambda: self.log_message(f"✓ Downloaded: {video_title}"))
            else:
                if not os.path.exists(video_input):
                    raise Exception(f"File not found: {video_input}")
                video_path = video_input
                video_title = Path(video_path).stem
                self.root.after(0, lambda: self.log_message(f"✓ Using local file: {video_title}"))

            # Load model
            model_size = self.model_size.get()
            self.root.after(0, lambda: self.log_message(f"🤖 Loading Whisper model ({model_size})..."))
            model = whisper.load_model(model_size)
            self.root.after(0, lambda: self.log_message("✓ Model loaded"))

            # Transcribe
            self.root.after(0, lambda: self.log_message("🎙️  Transcribing audio..."))
            source_lang = self.source_lang.get()
            if source_lang == "auto":
                result = model.transcribe(video_path)
            else:
                result = model.transcribe(video_path, language=source_lang)

            detected_lang = result.get('language', 'unknown')
            self.root.after(0, lambda: self.log_message(f"✓ Transcription complete (detected: {detected_lang})"))

            # Generate SRT
            segments = result['segments']
            video_name = Path(video_path).stem
            srt_path = os.path.join(temp_dir, f"{video_name}.srt")

            target_lang = self.target_lang.get() if self.translate_var.get() else None
            if target_lang:
                self.root.after(0, lambda: self.log_message(f"🌍 Translating to {target_lang}..."))

            self.generate_srt(segments, srt_path, target_lang, detected_lang)
            self.root.after(0, lambda: self.log_message("✓ SRT file generated"))

            # Save output
            output_dir = self.output_dir.get()
            os.makedirs(output_dir, exist_ok=True)

            safe_title = "".join(c for c in video_title if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_title = safe_title.replace(' ', '_')

            language_suffix = f"_{target_lang}" if target_lang else ""

            if self.burn_var.get():
                output_filename = f"{safe_title}{language_suffix}_captioned.mp4"
                output_path = os.path.join(output_dir, output_filename)

                self.root.after(0, lambda: self.log_message("🔥 Burning captions into video..."))
                success = self.burn_captions(video_path, srt_path, output_path)

                if success:
                    self.root.after(0, lambda: self.log_message(f"✓ Saved: {output_path}"))
                    self.root.after(0, lambda: self.processing_complete(output_path))
                else:
                    # Save both files
                    srt_out = os.path.join(output_dir, f"{safe_title}{language_suffix}.srt")
                    vid_out = os.path.join(output_dir, f"{safe_title}_original.mp4")
                    shutil.copy(srt_path, srt_out)
                    shutil.copy(video_path, vid_out)

                    self.root.after(0, lambda: self.log_message("⚠️  Burning failed. Saved as separate files:"))
                    self.root.after(0, lambda: self.log_message(f"   Subtitles: {srt_out}"))
                    self.root.after(0, lambda: self.log_message(f"   Video: {vid_out}"))
                    self.root.after(0, lambda: self.processing_complete(output_dir))
            else:
                output_filename = f"{safe_title}{language_suffix}.srt"
                output_path = os.path.join(output_dir, output_filename)
                shutil.copy(srt_path, output_path)

                self.root.after(0, lambda: self.log_message(f"✓ Saved: {output_path}"))
                self.root.after(0, lambda: self.processing_complete(output_path))

    def download_youtube(self, url, output_dir):
        ydl_opts = {
            'format': '18',
            'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
        }

        try:
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                title = info.get('title', 'video')
                duration = info.get('duration', 0)
                return filename, title, duration
        except:
            ydl_opts['format'] = 'best[height<=720]/best'
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                title = info.get('title', 'video')
                duration = info.get('duration', 0)
                return filename, title, duration

    def normalize_language_code(self, code):
        mapping = {'he': 'iw', 'zh': 'zh-CN', 'jw': 'jv'}
        return mapping.get(code, code)

    def translate_text(self, text, source_lang, target_lang):
        try:
            if not source_lang:
                source_lang = 'auto'
            else:
                source_lang = self.normalize_language_code(source_lang)

            target_lang = self.normalize_language_code(target_lang)
            translator = GoogleTranslator(source=source_lang, target=target_lang)
            translated = translator.translate(text)
            return translated if translated else text
        except:
            return text

    def format_timestamp(self, seconds):
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    def generate_srt(self, segments, output_path, translate_to, source_lang):
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, segment in enumerate(segments, start=1):
                start_time = self.format_timestamp(segment['start'])
                end_time = self.format_timestamp(segment['end'])
                text = segment['text'].strip()

                if translate_to:
                    text = self.translate_text(text, source_lang, translate_to)

                f.write(f"{i}\n{start_time} --> {end_time}\n{text}\n\n")

    def burn_captions(self, video_path, srt_path, output_path):
        if shutil.which('ffmpeg') is None:
            return False

        srt_path_escaped = srt_path.replace('\\', '/').replace(':', '\\:')
        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', f"subtitles='{srt_path_escaped}'",
            '-c:a', 'copy', '-y', output_path
        ]

        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except:
            return False

    def processing_complete(self, output_path):
        self.progress_bar.stop()
        self.is_processing = False
        self.process_btn.config(state='normal', text="Generate Captions")
        self.log_message("\n✅ Processing complete!")

        if messagebox.askyesno("Success!", "Processing complete!\n\nWould you like to open the output folder?"):
            if os.path.isfile(output_path):
                output_path = os.path.dirname(output_path)

            # Open folder in file explorer
            if sys.platform == 'win32':
                os.startfile(output_path)
            elif sys.platform == 'darwin':
                subprocess.run(['open', output_path])
            else:
                subprocess.run(['xdg-open', output_path])

    def processing_failed(self, error):
        self.progress_bar.stop()
        self.is_processing = False
        self.process_btn.config(state='normal', text="Generate Captions")
        self.log_message(f"\n❌ Error: {error}")
        messagebox.showerror("Error", f"Processing failed:\n{error}")


def main():
    root = tk.Tk()

    # Set app icon (if available)
    try:
        root.iconbitmap('icon.ico')
    except:
        pass

    # Apply theme
    style = ttk.Style()
    style.theme_use('clam')

    # Check dependencies
    print("Checking dependencies...")
    missing_packages = check_and_install_dependencies()
    ffmpeg_missing = not check_ffmpeg()
    print(f"Missing packages: {missing_packages}")
    print(f"FFmpeg installed: {not ffmpeg_missing}")

    if missing_packages or ffmpeg_missing:
        print("Creating installer window...")

        def start_app_after_install():
            print("Starting main app...")
            root.deiconify()  # Show main window
            app = VideoCaptionerApp(root)

        installer = DependencyInstallerWindow(root, missing_packages, start_app_after_install, install_ffmpeg=ffmpeg_missing)

        # Hide root after creating the installer window
        root.withdraw()

        print("Installer window created, starting mainloop...")
        root.mainloop()
    else:
        # Start main app directly
        print("Starting main app directly...")
        app = VideoCaptionerApp(root)
        root.mainloop()


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        input("Press Enter to exit...")
