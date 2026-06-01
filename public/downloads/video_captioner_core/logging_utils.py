"""Structured logging helpers for observability and diagnostics."""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path


LOGGER_NAME = "video_captioner"


def _json_formatter(record):
    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "level": record.levelname,
        "message": record.getMessage(),
        "logger": record.name,
    }
    if hasattr(record, "event"):
        payload["event"] = record.event
    if hasattr(record, "metadata"):
        payload["metadata"] = record.metadata
    return json.dumps(payload, ensure_ascii=False)


class JsonLogFormatter(logging.Formatter):
    def format(self, record):
        return _json_formatter(record)


def configure_logger(log_dir):
    """Create text + JSON logs for easier support/debugging."""
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(LOGGER_NAME)
    logger.setLevel(logging.INFO)
    for handler in logger.handlers:
        handler.close()
    logger.handlers = []

    text_handler = logging.FileHandler(log_path / "video_captioner.log", encoding="utf-8")
    text_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))

    json_handler = logging.FileHandler(log_path / "video_captioner.jsonl", encoding="utf-8")
    json_handler.setFormatter(JsonLogFormatter())

    logger.addHandler(text_handler)
    logger.addHandler(json_handler)
    return logger
