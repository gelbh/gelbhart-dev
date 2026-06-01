"""Pipeline configuration and strongly typed options."""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class PipelineOptions:
    """Runtime options for a single captioning request."""

    video_input: str
    output_dir: str
    source_lang: str = "auto"
    target_lang: Optional[str] = None
    burn_captions: bool = False
    model_size: str = "base"
    compute_type: str = "auto"  # auto, cpu, cuda
    quality_profile: str = "balanced"  # fast, balanced, high

    def normalized_output_dir(self) -> Path:
        return Path(self.output_dir).expanduser().resolve()
