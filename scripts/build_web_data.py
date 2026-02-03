#!/usr/bin/env python3
"""Build script to convert YAML skill definitions to JSON for the web app."""

import hashlib
import json
from pathlib import Path

import yaml


def get_yaml_hash(data_dir: Path) -> str:
    """Compute a hash of all YAML source files for change detection."""
    hasher = hashlib.sha256()

    yaml_files = sorted(data_dir.glob("**/*.yaml"))
    for yaml_file in yaml_files:
        hasher.update(yaml_file.read_bytes())

    return hasher.hexdigest()[:16]


def load_yaml_file(file_path: Path) -> dict:
    """Load a YAML file and return its contents."""
    with open(file_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def build_web_data():
    """Convert all YAML skill definitions to a single JSON file for the web app."""
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data"
    output_dir = project_root / "web" / "static" / "data"

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load config (contains roles and career_levels)
    config_file = data_dir / "config.yaml"
    config_data = load_yaml_file(config_file)

    # Load skill groups config (assessment modes, core skills, inference rules)
    skill_groups_file = data_dir / "skill_groups.yaml"
    skill_groups_data = {}
    if skill_groups_file.exists():
        skill_groups_data = load_yaml_file(skill_groups_file)

    # Load all skills from categories
    skills_dir = data_dir / "skills"
    categories = {}
    all_skills = []

    for category_dir in sorted(skills_dir.iterdir()):
        if not category_dir.is_dir():
            continue

        category_dir_name = category_dir.name

        for skill_file in sorted(category_dir.glob("*.yaml")):
            file_data = load_yaml_file(skill_file)

            # Get category info from the file
            category_info = file_data.get("category", {})
            category_id = category_info.get("id", skill_file.stem)
            category_name = category_info.get(
                "name", category_id.replace("_", " ").title()
            )

            # Extract skills from the file
            skills_list = file_data.get("skills", [])

            for skill in skills_list:
                # Add category to each skill
                skill["category"] = category_dir_name
                skill["category_name"] = category_name
                all_skills.append(skill)

            # Track category with skill count
            if category_dir_name not in categories:
                categories[category_dir_name] = {
                    "id": category_dir_name,
                    "name": category_dir_name.replace("_", " ").title(),
                    "skill_count": 0,
                }
            categories[category_dir_name]["skill_count"] += len(skills_list)

    # Convert categories dict to list
    categories_list = list(categories.values())

    # Build the complete data structure
    web_data = {
        "_source_hash": get_yaml_hash(data_dir),  # For change detection
        "roles": config_data.get("roles", []),
        "levels": config_data.get("career_levels", []),
        "skill_levels": config_data.get("skill_levels", {}),
        "categories": categories_list,
        "skills": all_skills,
        # New: Assessment modes, core skills, inference rules
        "assessment_modes": skill_groups_data.get("assessment_modes", {}),
        "core_skills_by_role": skill_groups_data.get("core_skills_by_role", {}),
        "skill_groups": skill_groups_data.get("groups", {}),
        "inference_rules": skill_groups_data.get("inference_rules", []),
    }

    # Write JSON output
    output_file = output_dir / "skills-data.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(web_data, f, ensure_ascii=False, indent=2)

    print(f"Generated {output_file}")
    print(f"  - {len(web_data['roles'])} roles")
    print(f"  - {len(web_data['levels'])} career levels")
    print(f"  - {len(web_data['categories'])} categories")
    print(f"  - {len(web_data['skills'])} skills")


if __name__ == "__main__":
    build_web_data()
