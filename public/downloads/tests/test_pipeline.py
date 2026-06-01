import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from video_captioner_core.config import PipelineOptions
from video_captioner_core.pipeline import VideoCaptionerPipeline


class FakeModel:
    def transcribe(self, _video_path, **_kwargs):
        return {
            "language": "en",
            "segments": [
                {"start": 0.0, "end": 1.0, "text": "hello world"},
            ],
        }


class FakeWhisper:
    @staticmethod
    def load_model(_size):
        return FakeModel()


class FakeYoutubeDL:
    def __init__(self, _opts):
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def extract_info(self, _url, download=True):
        return {"title": "yt_video", "duration": 2}

    def prepare_filename(self, _info):
        return "mock_video.mp4"


class EchoTranslator:
    def __init__(self, source, target):
        pass

    def translate(self, text):
        return text


class PipelineTest(unittest.TestCase):
    @patch("video_captioner_core.dependencies.missing_python_packages", return_value=[])
    @patch("video_captioner_core.dependencies.ffmpeg_available", return_value=True)
    @patch("video_captioner_core.pipeline.resolve_video_input")
    def test_process_local_file_smoke(self, mock_resolve, _ffmpeg, _missing):
        with tempfile.TemporaryDirectory() as tmp:
            local_video = Path(tmp) / "clip.mp4"
            local_video.write_text("stub", encoding="utf-8")
            mock_resolve.return_value = (str(local_video), "clip", 2)

            options = PipelineOptions(video_input=str(local_video), output_dir=str(Path(tmp) / "out"))
            pipeline = VideoCaptionerPipeline(FakeWhisper, FakeYoutubeDL, EchoTranslator)
            result = pipeline.process(options)
            self.assertTrue(result["output_paths"])

    @patch("video_captioner_core.dependencies.missing_python_packages", return_value=[])
    @patch("video_captioner_core.dependencies.ffmpeg_available", return_value=True)
    @patch("video_captioner_core.pipeline.resolve_video_input")
    def test_process_youtube_mocked_smoke(self, mock_resolve, _ffmpeg, _missing):
        with tempfile.TemporaryDirectory() as tmp:
            downloaded_video = Path(tmp) / "yt_video.mp4"
            downloaded_video.write_text("stub", encoding="utf-8")
            mock_resolve.return_value = (str(downloaded_video), "yt_video", 2)

            options = PipelineOptions(video_input="https://youtube.com/watch?v=fake", output_dir=str(Path(tmp) / "out"))
            pipeline = VideoCaptionerPipeline(FakeWhisper, FakeYoutubeDL, EchoTranslator)
            result = pipeline.process(options)
            self.assertTrue(result["output_paths"])


if __name__ == "__main__":
    unittest.main()
