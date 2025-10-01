#!/usr/bin/env python3
"""
Video Captioner Tool - Web Version
Processes videos and generates captions with optional translation.
"""

import os
import sys
import subprocess
import json
from pathlib import Path
import tempfile
import shutil

try:
    import whisper
except ImportError:
    print(json.dumps({"error": "whisper package not installed"}))
    sys.exit(1)

try:
    from yt_dlp import YoutubeDL
except ImportError:
    print(json.dumps({"error": "yt-dlp package not installed"}))
    sys.exit(1)

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print(json.dumps({"error": "deep-translator package not installed"}))
    sys.exit(1)


def download_youtube_video(url, output_dir):
    ydl_opts = {
        'format': '18',
        'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
        'noprogress': True,
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


def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


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
        # Normalize language codes for Google Translate
        if not source_lang:
            source_lang = 'auto'
        else:
            source_lang = normalize_language_code(source_lang)

        target_lang = normalize_language_code(target_lang)

        translator = GoogleTranslator(source=source_lang, target=target_lang)
        translated = translator.translate(text)
        return translated if translated else text
    except Exception as e:
        # Log to stderr for debugging
        print(f"Translation error: {e}", file=sys.stderr)
        return text


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


def burn_captions(video_path, srt_path, output_path):
    if shutil.which('ffmpeg') is None:
        print("FFmpeg not found", file=sys.stderr)
        return False

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
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr}", file=sys.stderr)
        return False


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No config provided"}))
        sys.exit(1)

    config = json.loads(sys.argv[1])
    output_dir = config.get('output_dir', 'public/captions')

    with tempfile.TemporaryDirectory() as temp_dir:
        # Get video file
        video_duration = 0
        if config['is_youtube']:
            video_path, video_title, video_duration = download_youtube_video(config['input'], temp_dir)
        else:
            video_path = config['input']
            video_title = Path(video_path).stem

        # Load Whisper model
        model = whisper.load_model(config.get('model', 'base'))

        # Transcribe
        if config.get('language'):
            result = model.transcribe(video_path, language=config['language'])
        else:
            result = model.transcribe(video_path)

        segments = result['segments']
        detected_lang = result.get('language', 'unknown')

        # Generate SRT
        video_name = Path(video_path).stem
        srt_path = os.path.join(temp_dir, f"{video_name}.srt")
        generate_srt(segments, srt_path, translate_to=config.get('translate_to'), source_lang=detected_lang)

        # Determine output path
        safe_title = "".join(c for c in video_title if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_title = safe_title.replace(' ', '_')

        # Add language suffix if translated
        language_suffix = ""
        if config.get('translate_to'):
            # Create a reverse mapping to get language name from code
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
                'hi': 'hindi',
                'tr': 'turkish',
                'nl': 'dutch',
                'pl': 'polish',
                'sv': 'swedish',
                'da': 'danish',
                'fi': 'finnish',
                'no': 'norwegian',
                'cs': 'czech',
                'el': 'greek',
                'hu': 'hungarian',
                'ro': 'romanian',
                'th': 'thai',
                'id': 'indonesian',
                'vi': 'vietnamese',
                'uk': 'ukrainian',
                'bg': 'bulgarian',
                'hr': 'croatian',
                'sr': 'serbian',
                'sk': 'slovak',
                'sl': 'slovenian',
                'fa': 'persian',
                'ur': 'urdu',
                'ta': 'tamil',
                'te': 'telugu',
                'mr': 'marathi',
                'bn': 'bengali',
            }
            lang_code = config.get('translate_to')
            language_suffix = f"_{lang_map.get(lang_code, lang_code)}"

        os.makedirs(output_dir, exist_ok=True)

        if config.get('burn'):
            output_filename = f"{safe_title}{language_suffix}_captioned.mp4"
            output_path = os.path.join(output_dir, output_filename)
        else:
            output_filename = f"{safe_title}{language_suffix}.srt"
            output_path = os.path.join(output_dir, output_filename)

        # Output
        result_data = {
            "success": True,
            "output": output_filename,
            "detected_lang": detected_lang,
            "video_title": video_title,
            "duration": video_duration,
            "subtitle_lang": config.get('translate_to', detected_lang)
        }

        if config.get('burn'):
            success = burn_captions(video_path, srt_path, output_path)
            if success:
                print(json.dumps(result_data))
            else:
                # Save both SRT and video file when burning fails
                fallback_srt = f"{safe_title}{language_suffix}.srt"
                fallback_video = f"{safe_title}_original.mp4"
                fallback_srt_path = os.path.join(output_dir, fallback_srt)
                fallback_video_path = os.path.join(output_dir, fallback_video)

                shutil.copy(srt_path, fallback_srt_path)
                shutil.copy(video_path, fallback_video_path)

                result_data["output"] = fallback_srt
                result_data["video_output"] = fallback_video
                result_data["warning"] = "Burned captions failed. Saved as separate SRT and video files."
                print(json.dumps(result_data))
        else:
            shutil.copy(srt_path, output_path)
            print(json.dumps(result_data))


if __name__ == '__main__':
    main()
