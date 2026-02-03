"""
Pydantic models for skills matrix data structures.
"""

from pydantic import BaseModel, Field


class Role(BaseModel):
    """A job role in the organization."""

    id: str
    name: str
    abbreviation: str


class CareerLevel(BaseModel):
    """A career level with experience requirements."""

    id: str
    name: str
    abbreviation: str
    experience: str
    description: str
    core_expected: list[int]
    secondary_expected: list[int]


class SkillLevel(BaseModel):
    """A skill proficiency level."""

    level: int
    name: str
    description: str


class Resource(BaseModel):
    """An external learning resource."""

    url: str
    title: str
    type: str = "documentation"  # documentation, course, tutorial, book, video


class Skill(BaseModel):
    """A skill with levels per role."""

    id: str
    name: str
    description: str
    core_roles: list[str] = Field(default_factory=list)
    levels: dict[str, list[int | str]]  # role_id -> [junior, confirmed, senior, expert]
    level_descriptions: dict[int, str]
    resources: list[Resource] = Field(default_factory=list)
    improvement_tips: dict[str, str] = Field(default_factory=dict)  # "1→2": "tip..."


class Category(BaseModel):
    """A category of skills."""

    id: str
    name: str
    skills: list[Skill] = Field(default_factory=list)


class ColorConfig(BaseModel):
    """Color configuration."""

    header: str
    categories: dict[str, str]
    levels: dict[str, str]
    core_secondary: dict[str, str]


class Config(BaseModel):
    """Global configuration."""

    roles: list[Role]
    career_levels: list[CareerLevel]
    skill_levels: dict[str, list[SkillLevel]]
    colors: ColorConfig
    output: dict
    category_order: list[str] = Field(default_factory=list)
