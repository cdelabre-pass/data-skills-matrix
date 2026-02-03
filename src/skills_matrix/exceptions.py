"""
Custom exceptions for skills matrix.
"""


class SkillsMatrixError(Exception):
    """Base exception for skills matrix errors."""


class ConfigLoadError(SkillsMatrixError):
    """Error loading configuration file."""

    def __init__(self, path: str, message: str):
        self.path = path
        super().__init__(f"Error loading {path}: {message}")


class SkillLoadError(SkillsMatrixError):
    """Error loading skill definition."""

    def __init__(self, path: str, message: str):
        self.path = path
        super().__init__(f"Error loading skill from {path}: {message}")


class ValidationError(SkillsMatrixError):
    """Error validating skills matrix data."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(f"Validation failed with {len(errors)} error(s)")
