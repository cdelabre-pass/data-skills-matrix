"""
Pytest fixtures for skills-matrix tests.
"""

import pytest
from pathlib import Path
import tempfile
import yaml


@pytest.fixture
def sample_config_data():
    """Sample configuration data for testing."""
    return {
        "roles": [
            {"id": "data_analyst", "name": "Data Analyst", "abbreviation": "DA"},
            {"id": "data_engineer", "name": "Data Engineer", "abbreviation": "DE"},
        ],
        "career_levels": [
            {
                "id": "junior",
                "name": "Junior",
                "abbreviation": "Jr",
                "experience": "0-3 ans",
                "description": "Apprentissage",
                "core_expected": [1, 2],
                "secondary_expected": [0, 1],
            },
            {
                "id": "senior",
                "name": "Senior",
                "abbreviation": "Sr",
                "experience": "5-10 ans",
                "description": "Expert",
                "core_expected": [3, 4],
                "secondary_expected": [2, 3],
            },
        ],
        "skill_levels": {
            "standard": [
                {
                    "level": 0,
                    "name": "Aucune connaissance",
                    "description": "N'a jamais utilisé",
                },
                {"level": 1, "name": "Débutant", "description": "Tâches basiques"},
                {"level": 2, "name": "Intermédiaire", "description": "Autonome"},
                {"level": 3, "name": "Avancé", "description": "Complexe"},
                {"level": 4, "name": "Expert", "description": "Maîtrise complète"},
            ],
            "bonus": [
                {"level": 5, "name": "Mentor", "description": "Forme les équipes"},
            ],
        },
        "colors": {
            "header": "3943B4",
            "categories": {"data_analysis": "FFC8AA"},
            "levels": {
                "0": "FFCFC9",
                "1": "FFE5A0",
                "2": "D4EDBC",
                "3": "93C47D",
                "4": "38761D",
            },
            "core_secondary": {"core": "93C47D", "secondary": "E6E6E6"},
        },
        "output": {"default_filename": "test.xlsx"},
        "category_order": ["data_analysis"],
    }


@pytest.fixture
def sample_skill_data():
    """Sample skill category data for testing."""
    return {
        "category": {"id": "data_analysis", "name": "Analyse de Données"},
        "skills": [
            {
                "id": "sql",
                "name": "SQL",
                "description": "Write SQL queries",
                "core_roles": ["data_analyst", "data_engineer"],
                "levels": {
                    "data_analyst": [1, 2, 3, 4],
                    "data_engineer": [1, 2, 3, 4],
                },
                "level_descriptions": {
                    0: "No knowledge",
                    1: "Basic SELECT",
                    2: "JOINs and CTEs",
                    3: "Optimization",
                    4: "Expert",
                },
                "resources": [
                    {
                        "url": "https://docs.example.com/sql",
                        "title": "SQL Guide",
                        "type": "documentation",
                    },
                ],
            },
        ],
    }


@pytest.fixture
def temp_config_file(sample_config_data):
    """Create a temporary config YAML file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.dump(sample_config_data, f)
        return Path(f.name)


@pytest.fixture
def temp_skill_file(sample_skill_data):
    """Create a temporary skill YAML file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.dump(sample_skill_data, f)
        return Path(f.name)


@pytest.fixture
def temp_skills_dir(sample_skill_data):
    """Create a temporary skills directory with a skill file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        skills_dir = Path(tmpdir) / "skills"
        skills_dir.mkdir()
        skill_file = skills_dir / "data_analysis.yaml"
        with open(skill_file, "w") as f:
            yaml.dump(sample_skill_data, f)
        yield skills_dir
