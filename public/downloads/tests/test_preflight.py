import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from video_captioner_core.dependencies import run_preflight


class PreflightTest(unittest.TestCase):
    @patch("video_captioner_core.dependencies.missing_python_packages", return_value=[])
    def test_local_file_and_output_dir_pass(self, _missing):
        with tempfile.TemporaryDirectory() as tmp:
            video_file = Path(tmp) / "clip.mp4"
            video_file.write_text("stub", encoding="utf-8")
            output_dir = Path(tmp) / "out"
            run_preflight(str(video_file), str(output_dir), require_ffmpeg=False)
            self.assertTrue(output_dir.exists())


if __name__ == "__main__":
    unittest.main()
