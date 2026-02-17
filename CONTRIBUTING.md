# Contributing

Thanks for your interest in improving the Skills Matrix! Whether you want to fix a skill description, add a new skill, or enhance the tooling — contributions are welcome.

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd skills-matrix

# Install Python dependencies (with dev tools)
uv sync --dev

# Install pre-commit hooks
uv run pre-commit install

# Install web dependencies
cd web && npm install
```

## Adding or Editing Skills

Skills are defined as YAML files in `data/skills/<category>/`. This is the most common and impactful way to contribute.

### Edit an existing skill

1. Find the file in `data/skills/` (organized by category)
2. Update the fields you want to change (descriptions, levels, tips, resources)
3. Run `uv run skills-matrix validate` to check your changes
4. Rebuild the web data: `uv run python scripts/build_web_data.py`

### Add a new skill

Create or edit a YAML file in the appropriate category folder:

```yaml
skills:
  - id: my_new_skill
    name: "My New Skill"
    description: "What this skill covers"
    core_roles: [data_analyst, data_engineer]
    levels:
      data_analyst: [1, 2, 3, 4]      # Expected level per career stage
      data_engineer: [1, 2, 3, 4]
      data_scientist: [NC, NC, 1, 2]  # NC = Not Concerned for this role
      analytics_eng: [1, 2, 3, 4]
      ml_engineer: [NC, 1, 2, 3]
      backend: [1, 2, 3, 4]
    level_descriptions:
      0: "No knowledge"
      1: "Basic understanding"
      2: "Can work autonomously"
      3: "Handles complex cases"
      4: "Expert level mastery"
    improvement_tips:
      "1->2": "Practice on real projects..."
      "2->3": "Take ownership of complex features..."
    resources:
      - url: "https://example.com/docs"
        title: "Official Documentation"
        type: "documentation"
```

### Add a new role

1. Add the role in `data/config.yaml`
2. Add level expectations for the new role in every skill YAML file

## Development

### Python / CLI

```bash
uv run pytest                              # Run tests
uv run pytest --cov=src/skills_matrix      # With coverage
uv run ruff check src/ tests/              # Lint
uv run ruff format src/ tests/             # Format
```

### Web App

```bash
cd web
npm run dev          # Dev server with hot reload
npm run check        # Type checking
npm run test         # Tests (vitest)
npm run build        # Production build
```

### Data sync

After editing YAML files, rebuild the JSON used by the web app:

```bash
uv run python scripts/build_web_data.py
```

A pre-commit hook will catch it if you forget.

## Pull Requests

1. Create a branch from `main`
2. Make your changes
3. Ensure tests pass and linting is clean
4. Open a PR with a clear description of what and why

## Code Style

- **Python**: formatted with ruff, tested with pytest
- **Svelte**: uses tabs for indentation
- **YAML**: 2-space indentation, follow existing file patterns
