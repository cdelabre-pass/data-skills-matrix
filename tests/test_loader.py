"""
Tests for YAML loading and validation.
"""

import pytest
from pathlib import Path

from skills_matrix.loader import (
    load_yaml,
    load_config,
    load_category,
    load_all_skills,
    validate_skills,
)
from skills_matrix.exceptions import ConfigLoadError, SkillLoadError


class TestLoadYaml:
    def test_load_valid_yaml(self, temp_config_file):
        data = load_yaml(temp_config_file)
        assert "roles" in data
        assert len(data["roles"]) == 2

    def test_load_nonexistent_file(self):
        with pytest.raises(ConfigLoadError) as exc_info:
            load_yaml(Path("/nonexistent/file.yaml"))
        assert "File not found" in str(exc_info.value)

    def test_load_empty_file(self, tmp_path):
        empty_file = tmp_path / "empty.yaml"
        empty_file.write_text("")
        with pytest.raises(ConfigLoadError) as exc_info:
            load_yaml(empty_file)
        assert "File is empty" in str(exc_info.value)

    def test_load_invalid_yaml(self, tmp_path):
        invalid_file = tmp_path / "invalid.yaml"
        invalid_file.write_text("invalid: yaml: syntax:")
        with pytest.raises(ConfigLoadError) as exc_info:
            load_yaml(invalid_file)
        assert "Invalid YAML syntax" in str(exc_info.value)


class TestLoadConfig:
    def test_load_valid_config(self, temp_config_file):
        config = load_config(temp_config_file)
        assert len(config.roles) == 2
        assert config.roles[0].id == "data_analyst"
        assert len(config.career_levels) == 2
        assert len(config.skill_levels["standard"]) == 5
        assert config.category_order == ["data_analysis"]

    def test_load_config_missing_field(self, tmp_path):
        incomplete_file = tmp_path / "incomplete.yaml"
        incomplete_file.write_text("roles: []")  # missing other required fields
        with pytest.raises(ConfigLoadError) as exc_info:
            load_config(incomplete_file)
        assert "Missing required field" in str(exc_info.value)


class TestLoadCategory:
    def test_load_valid_category(self, temp_skill_file):
        category = load_category(temp_skill_file)
        assert category.id == "data_analysis"
        assert category.name == "Analyse de Données"
        assert len(category.skills) == 1
        assert category.skills[0].id == "sql"

    def test_load_category_with_level_descriptions(self, temp_skill_file):
        category = load_category(temp_skill_file)
        skill = category.skills[0]
        # Check that level_descriptions keys are converted to integers
        assert 0 in skill.level_descriptions
        assert 1 in skill.level_descriptions
        assert skill.level_descriptions[0] == "No knowledge"

    def test_load_category_missing_field(self, tmp_path):
        incomplete_file = tmp_path / "incomplete.yaml"
        incomplete_file.write_text("category:\n  name: Test")  # missing id
        with pytest.raises(SkillLoadError):
            load_category(incomplete_file)


class TestLoadAllSkills:
    def test_load_all_skills(self, temp_skills_dir):
        categories = load_all_skills(temp_skills_dir)
        assert len(categories) == 1
        assert categories[0].id == "data_analysis"

    def test_load_all_skills_with_order(self, temp_skills_dir, sample_skill_data):
        # Add another skill file
        other_file = temp_skills_dir / "other.yaml"
        other_data = {
            "category": {"id": "other", "name": "Other"},
            "skills": [],
        }
        import yaml

        with open(other_file, "w") as f:
            yaml.dump(other_data, f)

        # Load with specific order
        categories = load_all_skills(
            temp_skills_dir, category_order=["other", "data_analysis"]
        )
        assert len(categories) == 2
        assert categories[0].id == "other"
        assert categories[1].id == "data_analysis"

    def test_load_all_skills_without_order(self, temp_skills_dir, sample_skill_data):
        # Add another skill file
        other_file = temp_skills_dir / "aaa_first.yaml"
        other_data = {
            "category": {"id": "aaa_first", "name": "AAA First"},
            "skills": [],
        }
        import yaml

        with open(other_file, "w") as f:
            yaml.dump(other_data, f)

        # Load without order - should be alphabetical
        categories = load_all_skills(temp_skills_dir, category_order=None)
        assert len(categories) == 2
        assert categories[0].id == "aaa_first"  # alphabetically first
        assert categories[1].id == "data_analysis"


class TestValidateSkills:
    def test_validate_valid_skills(self, temp_config_file, temp_skill_file):
        config = load_config(temp_config_file)
        category = load_category(temp_skill_file)

        errors = validate_skills(config, [category])
        assert errors == []

    def test_validate_invalid_core_role(self, temp_config_file, tmp_path):
        config = load_config(temp_config_file)

        # Create skill with invalid core_role
        invalid_skill_data = {
            "category": {"id": "test", "name": "Test"},
            "skills": [
                {
                    "id": "test_skill",
                    "name": "Test Skill",
                    "description": "Test",
                    "core_roles": ["nonexistent_role"],  # invalid role
                    "levels": {
                        "data_analyst": [1, 2, 3, 4],
                        "data_engineer": [1, 2, 3, 4],
                    },
                    "level_descriptions": {0: "None"},
                },
            ],
        }
        import yaml

        invalid_file = tmp_path / "invalid_skill.yaml"
        with open(invalid_file, "w") as f:
            yaml.dump(invalid_skill_data, f)

        category = load_category(invalid_file)
        errors = validate_skills(config, [category])

        assert len(errors) == 1
        assert "unknown role 'nonexistent_role'" in errors[0]

    def test_validate_missing_role_levels(self, temp_config_file, tmp_path):
        config = load_config(temp_config_file)

        # Create skill missing levels for a role
        missing_levels_data = {
            "category": {"id": "test", "name": "Test"},
            "skills": [
                {
                    "id": "test_skill",
                    "name": "Test Skill",
                    "description": "Test",
                    "core_roles": [],
                    "levels": {
                        "data_analyst": [1, 2, 3, 4],
                        # missing data_engineer
                    },
                    "level_descriptions": {0: "None"},
                },
            ],
        }
        import yaml

        missing_file = tmp_path / "missing_levels.yaml"
        with open(missing_file, "w") as f:
            yaml.dump(missing_levels_data, f)

        category = load_category(missing_file)
        errors = validate_skills(config, [category])

        assert len(errors) == 1
        assert "missing levels for role 'data_engineer'" in errors[0]
