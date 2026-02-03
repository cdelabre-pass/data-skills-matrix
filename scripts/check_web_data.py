#!/usr/bin/env python3
"""Pre-commit hook to ensure web data JSON is up-to-date with YAML sources."""

import hashlib
import json
import sys
from pathlib import Path


def get_yaml_hash(data_dir: Path) -> str:
    """Compute a hash of all YAML source files."""
    hasher = hashlib.sha256()

    yaml_files = sorted(data_dir.glob("**/*.yaml"))
    for yaml_file in yaml_files:
        hasher.update(yaml_file.read_bytes())

    return hasher.hexdigest()[:16]


def main() -> int:
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data"
    json_file = project_root / "web" / "static" / "data" / "skills-data.json"

    if not json_file.exists():
        print("ERROR: web/static/data/skills-data.json does not exist.")
        print("Run: python scripts/build_web_data.py")
        return 1

    # Check if JSON has a _source_hash field
    with open(json_file, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print("ERROR: skills-data.json is not valid JSON.")
            return 1

    stored_hash = data.get("_source_hash")
    current_hash = get_yaml_hash(data_dir)

    if stored_hash != current_hash:
        print("WARNING: YAML sources have changed since last data build.")
        print(f"  Stored hash: {stored_hash or 'none'}")
        print(f"  Current hash: {current_hash}")
        print("")
        print("Run: python scripts/build_web_data.py")
        print("Or: npm run build:data (from web/ directory)")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
