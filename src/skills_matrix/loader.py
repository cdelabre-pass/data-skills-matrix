"""
YAML file loading and validation.
"""

from pathlib import Path
import yaml
from .models import Config, Category, Skill, Role, CareerLevel, SkillLevel, ColorConfig
from .exceptions import ConfigLoadError, SkillLoadError


def load_yaml(path: Path) -> dict:
    """Load a YAML file with error handling."""
    if not path.exists():
        raise ConfigLoadError(str(path), "File not found")

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        raise ConfigLoadError(str(path), f"Invalid YAML syntax: {e}")

    if data is None:
        raise ConfigLoadError(str(path), "File is empty")

    return data


def load_config(path: Path) -> Config:
    """Load the global configuration."""
    data = load_yaml(path)

    try:
        roles = [Role(**r) for r in data["roles"]]
        career_levels = [CareerLevel(**cl) for cl in data["career_levels"]]

        skill_levels = {}
        for key, levels in data["skill_levels"].items():
            skill_levels[key] = [SkillLevel(**sl) for sl in levels]

        colors = ColorConfig(**data["colors"])

        return Config(
            roles=roles,
            career_levels=career_levels,
            skill_levels=skill_levels,
            colors=colors,
            output=data.get("output", {}),
            category_order=data.get("category_order", []),
        )
    except KeyError as e:
        raise ConfigLoadError(str(path), f"Missing required field: {e}")
    except Exception as e:
        raise ConfigLoadError(str(path), str(e))


def load_category(path: Path) -> Category:
    """Load a category of skills from a YAML file."""
    data = load_yaml(path)

    try:
        category_data = data["category"]
        skills = []

        for skill_data in data.get("skills", []):
            # Convert level_descriptions keys to integers
            level_descriptions = {}
            for k, v in skill_data.get("level_descriptions", {}).items():
                level_descriptions[int(k)] = v

            # Build skill kwargs, only including optional fields if present
            skill_kwargs = {
                "id": skill_data["id"],
                "name": skill_data["name"],
                "description": skill_data["description"],
                "core_roles": skill_data.get("core_roles", []),
                "levels": skill_data.get("levels", {}),
                "level_descriptions": level_descriptions,
            }

            # Only add resources if it's a proper list
            resources = skill_data.get("resources")
            if resources and isinstance(resources, list):
                skill_kwargs["resources"] = resources

            # Only add improvement_tips if present
            improvement_tips = skill_data.get("improvement_tips")
            if improvement_tips:
                skill_kwargs["improvement_tips"] = improvement_tips

            skill = Skill(**skill_kwargs)
            skills.append(skill)

        return Category(
            id=category_data["id"],
            name=category_data["name"],
            skills=skills,
        )
    except KeyError as e:
        raise SkillLoadError(str(path), f"Missing required field: {e}")
    except Exception as e:
        raise SkillLoadError(str(path), str(e))


def load_all_skills(
    skills_dir: Path, category_order: list[str] | None = None
) -> list[Category]:
    """Load all skill categories from a directory (including subfolders).

    Args:
        skills_dir: Path to the skills directory
        category_order: Optional list of category IDs defining the order.
                       If not provided, categories are loaded alphabetically.
    """
    categories = []

    # Find all YAML files (including in subfolders)
    all_yaml_files = {}
    for yaml_path in skills_dir.rglob("*.yaml"):
        category_id = yaml_path.stem
        all_yaml_files[category_id] = yaml_path

    if category_order:
        # Load categories in specified order
        for category_id in category_order:
            if category_id in all_yaml_files:
                categories.append(load_category(all_yaml_files[category_id]))

        # Load any additional categories not in the order list
        for category_id, yaml_path in sorted(all_yaml_files.items()):
            if category_id not in category_order:
                categories.append(load_category(yaml_path))
    else:
        # Load all categories alphabetically
        for category_id, yaml_path in sorted(all_yaml_files.items()):
            categories.append(load_category(yaml_path))

    return categories


def validate_skills(config: Config, categories: list[Category]) -> list[str]:
    """Validate skills against configuration. Returns list of errors."""
    errors = []
    role_ids = {r.id for r in config.roles}

    for category in categories:
        for skill in category.skills:
            # Check core_roles reference valid roles
            for role_id in skill.core_roles:
                if role_id not in role_ids:
                    errors.append(
                        f"Skill '{skill.id}' references unknown role '{role_id}' in core_roles"
                    )

            # Check levels reference valid roles
            for role_id in skill.levels.keys():
                if role_id not in role_ids:
                    errors.append(
                        f"Skill '{skill.id}' has levels for unknown role '{role_id}'"
                    )

            # Check all roles have levels defined
            for role_id in role_ids:
                if role_id not in skill.levels:
                    errors.append(
                        f"Skill '{skill.id}' missing levels for role '{role_id}'"
                    )

    return errors
