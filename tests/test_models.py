"""
Tests for Pydantic models.
"""

import pytest
from pydantic import ValidationError

from skills_matrix.models import (
    Role,
    CareerLevel,
    SkillLevel,
    Skill,
    Category,
    ColorConfig,
    Config,
)


class TestRole:
    def test_valid_role(self):
        role = Role(id="data_analyst", name="Data Analyst", abbreviation="DA")
        assert role.id == "data_analyst"
        assert role.name == "Data Analyst"
        assert role.abbreviation == "DA"

    def test_missing_field(self):
        with pytest.raises(ValidationError):
            Role(id="data_analyst", name="Data Analyst")  # missing abbreviation


class TestCareerLevel:
    def test_valid_career_level(self):
        level = CareerLevel(
            id="junior",
            name="Junior",
            abbreviation="Jr",
            experience="0-3 ans",
            description="Apprentissage",
            core_expected=[1, 2],
            secondary_expected=[0, 1],
        )
        assert level.id == "junior"
        assert level.core_expected == [1, 2]

    def test_missing_field(self):
        with pytest.raises(ValidationError):
            CareerLevel(
                id="junior",
                name="Junior",
                abbreviation="Jr",
                experience="0-3 ans",
                # missing description and expected levels
            )


class TestSkillLevel:
    def test_valid_skill_level(self):
        sl = SkillLevel(level=0, name="None", description="No knowledge")
        assert sl.level == 0
        assert sl.name == "None"


class TestSkill:
    def test_valid_skill(self):
        skill = Skill(
            id="sql",
            name="SQL",
            description="Write queries",
            core_roles=["data_analyst"],
            levels={"data_analyst": [1, 2, 3, 4]},
            level_descriptions={0: "None", 1: "Basic"},
        )
        assert skill.id == "sql"
        assert skill.core_roles == ["data_analyst"]
        assert skill.levels["data_analyst"] == [1, 2, 3, 4]

    def test_skill_with_nc_levels(self):
        skill = Skill(
            id="ml",
            name="ML",
            description="Machine Learning",
            core_roles=["data_scientist"],
            levels={"data_analyst": ["NC", "NC", 1, 2]},
            level_descriptions={0: "None"},
        )
        assert skill.levels["data_analyst"] == ["NC", "NC", 1, 2]

    def test_skill_default_values(self):
        skill = Skill(
            id="test",
            name="Test",
            description="Test skill",
            levels={},
            level_descriptions={},
        )
        assert skill.core_roles == []
        assert skill.resources == []
        assert skill.improvement_tips == {}


class TestCategory:
    def test_valid_category(self):
        skill = Skill(
            id="sql",
            name="SQL",
            description="Write queries",
            levels={},
            level_descriptions={},
        )
        category = Category(id="analytics", name="Analytics", skills=[skill])
        assert category.id == "analytics"
        assert len(category.skills) == 1

    def test_empty_skills(self):
        category = Category(id="empty", name="Empty")
        assert category.skills == []


class TestColorConfig:
    def test_valid_color_config(self):
        colors = ColorConfig(
            header="3943B4",
            categories={"data_analysis": "FFC8AA"},
            levels={"0": "FFCFC9"},
            core_secondary={"core": "93C47D", "secondary": "E6E6E6"},
        )
        assert colors.header == "3943B4"


class TestConfig:
    def test_valid_config(self, sample_config_data):
        roles = [Role(**r) for r in sample_config_data["roles"]]
        career_levels = [
            CareerLevel(**cl) for cl in sample_config_data["career_levels"]
        ]
        skill_levels = {
            k: [SkillLevel(**sl) for sl in v]
            for k, v in sample_config_data["skill_levels"].items()
        }
        colors = ColorConfig(**sample_config_data["colors"])

        config = Config(
            roles=roles,
            career_levels=career_levels,
            skill_levels=skill_levels,
            colors=colors,
            output=sample_config_data["output"],
            category_order=sample_config_data["category_order"],
        )

        assert len(config.roles) == 2
        assert len(config.career_levels) == 2
        assert len(config.skill_levels["standard"]) == 5
        assert config.category_order == ["data_analysis"]

    def test_default_category_order(self):
        config = Config(
            roles=[],
            career_levels=[],
            skill_levels={},
            colors=ColorConfig(
                header="000000",
                categories={},
                levels={},
                core_secondary={"core": "000000", "secondary": "FFFFFF"},
            ),
            output={},
        )
        assert config.category_order == []
