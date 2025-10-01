#!/usr/bin/env python3
"""
Video Captioner - Standalone Desktop Version
Generate captions for videos with AI-powered transcription and translation

Usage:
    python video_captioner_standalone.py

Requirements:
    pip install openai-whisper yt-dlp deep-translator

Author: gelbhart.dev
"""

import os
import sys
import subprocess
import json
import tempfile
import shutil
from pathlib import Path

try:
    import whisper
except ImportError:
    print("ERROR: openai-whisper is not installed.")
    print("Please run: pip install openai-whisper")
    sys.exit(1)

try:
    from yt_dlp import YoutubeDL
except ImportError:
    print("ERROR: yt-dlp is not installed.")
    print("Please run: pip install yt-dlp")
    sys.exit(1)

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("ERROR: deep-translator is not installed.")
    print("Please run: pip install deep-translator")
    sys.exit(1)


def normalize_language_code(code):
    """Convert Whisper language codes to Google Translate codes"""
    mapping = {
        'he': 'iw',  # Hebrew
        'zh': 'zh-CN',  # Chinese
        'jw': 'jv',  # Javanese
    }
    return mapping.get(code, code)


def translate_text(text, source_lang, target_lang):
    try:
        if not source_lang:
            source_lang = 'auto'
        else:
            source_lang = normalize_language_code(source_lang)

        target_lang = normalize_language_code(target_lang)

        translator = GoogleTranslator(source=source_lang, target=target_lang)
        translated = translator.translate(text)
        return translated if translated else text
    except Exception as e:
        print(f"Translation error: {e}")
        return text


def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_srt(segments, output_path, translate_to=None, source_lang=None):
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, segment in enumerate(segments, start=1):
            start_time = format_timestamp(segment['start'])
            end_time = format_timestamp(segment['end'])
            text = segment['text'].strip()

            if translate_to:
                text = translate_text(text, source_lang, translate_to)

            f.write(f"{i}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{text}\n\n")


def download_youtube_video(url, output_dir):
    print(f"Downloading video from YouTube...")
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
    except Exception:
        ydl_opts['format'] = 'best[height<=720]/best'
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            title = info.get('title', 'video')
            duration = info.get('duration', 0)
            return filename, title, duration


def burn_captions(video_path, srt_path, output_path):
    if shutil.which('ffmpeg') is None:
        print("FFmpeg not found. Cannot burn captions into video.")
        return False

    print("Burning captions into video with FFmpeg...")
    srt_path_escaped = srt_path.replace('\\', '/').replace(':', '\\:')
    cmd = [
        'ffmpeg',
        '-i', video_path,
        '-vf', f"subtitles='{srt_path_escaped}'",
        '-c:a', 'copy',
        '-y',
        output_path
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr}")
        return False


def get_user_input(prompt, default=None):
    if default:
        response = input(f"{prompt} [{default}]: ").strip()
        return response if response else default
    return input(f"{prompt}: ").strip()


def main():
    print("=" * 60)
    print("Video Captioner - Desktop Version")
    print("=" * 60)
    print()

    # Get video input
    video_input = get_user_input("Enter YouTube URL or local video file path")
    if not video_input:
        print("Error: No input provided")
        sys.exit(1)

    is_youtube = video_input.startswith('http')

    # Get language settings
    source_lang = get_user_input("Source language code (leave empty for auto-detect)", "auto")
    if source_lang.lower() == 'auto':
        source_lang = None

    # Translation
    translate = get_user_input("Translate captions? (y/n)", "n").lower()
    target_lang = None
    if translate == 'y':
        target_lang = get_user_input("Target language code (e.g., en, es, he)")

    # Output format
    burn = get_user_input("Burn captions into video? (y/n)", "n").lower() == 'y'

    # Model size
    model_size = get_user_input("Model size (tiny/base/small/medium/large)", "base")

    # Output directory
    output_dir = get_user_input("Output directory", "./captions")
    os.makedirs(output_dir, exist_ok=True)

    print()
    print("=" * 60)
    print("Processing...")
    print("=" * 60)
    print()

    with tempfile.TemporaryDirectory() as temp_dir:
        # Get video file
        video_duration = 0
        if is_youtube:
            video_path, video_title, video_duration = download_youtube_video(video_input, temp_dir)
            print(f"✓ Downloaded: {video_title}")
        else:
            if not os.path.exists(video_input):
                print(f"Error: File not found: {video_input}")
                sys.exit(1)
            video_path = video_input
            video_title = Path(video_path).stem
            print(f"✓ Using local file: {video_title}")

        # Load Whisper model
        print(f"Loading Whisper model ({model_size})...")
        model = whisper.load_model(model_size)
        print("✓ Model loaded")

        # Transcribe
        print("Transcribing audio...")
        if source_lang:
            result = model.transcribe(video_path, language=source_lang)
        else:
            result = model.transcribe(video_path)

        segments = result['segments']
        detected_lang = result.get('language', 'unknown')
        print(f"✓ Transcription complete (detected language: {detected_lang})")

        # Generate SRT
        video_name = Path(video_path).stem
        srt_path = os.path.join(temp_dir, f"{video_name}.srt")

        if target_lang:
            print(f"Translating to {target_lang}...")
        generate_srt(segments, srt_path, translate_to=target_lang, source_lang=detected_lang)
        print("✓ SRT file generated")

        # Determine output filename
        safe_title = "".join(c for c in video_title if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_title = safe_title.replace(' ', '_')

        # Add language suffix if translated
        language_suffix = ""
        if target_lang:
            lang_map = {
                'iw': 'hebrew', 'he': 'hebrew',
                'en': 'english',
                'es': 'spanish',
                'fr': 'french',
                'de': 'german',
                'it': 'italian',
                'pt': 'portuguese',
                'ru': 'russian',
                'ja': 'japanese',
                'ko': 'korean',
                'zh-CN': 'chinese', 'zh': 'chinese',
                'ar': 'arabic',
            }
            language_suffix = f"_{lang_map.get(target_lang, target_lang)}"

        if burn:
            output_filename = f"{safe_title}{language_suffix}_captioned.mp4"
            output_path = os.path.join(output_dir, output_filename)

            success = burn_captions(video_path, srt_path, output_path)
            if success:
                print(f"✓ Video with burned captions saved: {output_path}")
            else:
                # Save both SRT and video
                fallback_srt = f"{safe_title}{language_suffix}.srt"
                fallback_video = f"{safe_title}_original.mp4"
                fallback_srt_path = os.path.join(output_dir, fallback_srt)
                fallback_video_path = os.path.join(output_dir, fallback_video)

                shutil.copy(srt_path, fallback_srt_path)
                shutil.copy(video_path, fallback_video_path)

                print(f"⚠ Burned captions failed. Saved as separate files:")
                print(f"  - Subtitles: {fallback_srt_path}")
                print(f"  - Video: {fallback_video_path}")
        else:
            output_filename = f"{safe_title}{language_suffix}.srt"
            output_path = os.path.join(output_dir, output_filename)
            shutil.copy(srt_path, output_path)
            print(f"✓ SRT file saved: {output_path}")

    print()
    print("=" * 60)
    print("✓ Complete!")
    print("=" * 60)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
