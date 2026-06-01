"""Domain-specific errors for reliable user-facing recovery."""


class VideoCaptionerError(Exception):
    """Base error with optional category and recovery hint."""

    def __init__(self, message, category="unknown", hint=None):
        super().__init__(message)
        self.category = category
        self.hint = hint


class PreflightError(VideoCaptionerError):
    """Raised when validation fails before processing."""

    def __init__(self, message, hint=None):
        super().__init__(message, category="preflight", hint=hint)


class DependencyError(VideoCaptionerError):
    """Raised when package or binary dependencies are missing."""

    def __init__(self, message, hint=None):
        super().__init__(message, category="dependency", hint=hint)


class InputError(VideoCaptionerError):
    """Raised when input source cannot be processed."""

    def __init__(self, message, hint=None):
        super().__init__(message, category="input", hint=hint)


class ProcessingError(VideoCaptionerError):
    """Raised when processing fails after preflight passes."""

    def __init__(self, message, hint=None):
        super().__init__(message, category="processing", hint=hint)
