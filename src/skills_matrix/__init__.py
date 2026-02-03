"""
Skills Matrix - Matrice de compétences Analytics

A tool to generate and manage skills matrices for data teams.
"""

from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("skills-matrix")
except PackageNotFoundError:
    __version__ = "0.0.0"  # Fallback for development without install
