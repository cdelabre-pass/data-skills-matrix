# Skills Matrix

A skills assessment toolkit for data/analytics teams featuring:
- **Web App**: Interactive self-assessment questionnaire with personalized results
- **CLI Tool**: Generate comprehensive Excel matrices

## Overview

This skills matrix is designed for data teams with the following roles:

| Role | Abbreviation | Description |
|------|--------------|-------------|
| Data Analyst | DA | Business insights and reporting |
| Data Engineer | DE | Data pipelines and infrastructure |
| Data Scientist | DS | Statistical analysis and ML models |
| Analytics Engineer | AE | Data modeling and transformation |
| ML Engineer | MLE | ML systems and deployment |
| Backend Engineer | BE | APIs and backend services |

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd skills-matrix

# Install with uv (recommended)
uv sync              # Runtime dependencies only
uv sync --dev        # Include dev dependencies (pytest, ruff, pre-commit)

# Or with pip
pip install -e .
pip install -e ".[dev]"  # With dev dependencies
```

## Web Application

An interactive self-assessment tool built with SvelteKit.

### Features

- Role-based skill filtering (only see relevant skills for your role)
- Category selection (choose which domains to assess)
- Unbiased assessment (expected levels hidden during questions)
- Career level suggestion based on answers
- Skill gap analysis with improvement tips
- External learning resources for each skill
- Export to Excel or Markdown
- LocalStorage persistence (no server required)

### Running the Web App

```bash
cd web
npm install
npm run dev      # Development server at http://localhost:5173
npm run build    # Production build to web/build/
npm run preview  # Preview production build
```

### Deployment

The web app builds to static files (`web/build/`) compatible with:
- GitHub Pages
- GCP Cloud Storage
- Any static hosting

---

## CLI Tool

### Generate Excel Matrix

```bash
# Generate with default settings
skills-matrix generate

# Custom output path
skills-matrix generate -o my_matrix.xlsx

# Custom data directory
skills-matrix generate -d /path/to/data
```

### Other Commands

```bash
# List all skills by category
skills-matrix list-skills

# Validate YAML configuration
skills-matrix validate

# Show statistics
skills-matrix stats
```

## Output

The generated Excel workbook contains 7 sheets:

| Sheet | Description |
|-------|-------------|
| **Niveaux** | Skill levels reference and career expectations |
| **Matrice Compétences** | Main matrix with all skills × roles × career levels |
| **Descriptions par Niveau** | Detailed descriptions for each proficiency level |
| **Mon Évaluation** | Self-assessment form with dropdowns and gap analysis |
| **Profils par Rôle (Radar)** | Radar charts comparing role profiles |
| **Plan Développement** | Annual development planning template |
| **Historique Évaluations** | Evaluation history tracking |

## Skill Levels (0-6)

### Standard Levels (0-4)

| Level | Name | Description |
|-------|------|-------------|
| **0** | No knowledge | Never used the tool/technique |
| **1** | Beginner | Can execute basic tasks with assistance |
| **2** | Intermediate | Works autonomously on standard tasks |
| **3** | Advanced | Handles complex scenarios, can guide others |
| **4** | Expert | Complete mastery, designs large-scale solutions |

### Bonus Levels (5-6)

| Level | Name | Description |
|-------|------|-------------|
| **5** | Mentor/Evangelist | Trains teams, establishes best practices, internal champion |
| **6** | External Expert | Open-source contributions, conferences, recognized expert |

### NC = Not Concerned

Indicates a skill is not expected for this role/level combination.

## Career Levels

| Level | Experience | Core Skills Expected | Secondary Skills Expected |
|-------|------------|---------------------|--------------------------|
| Junior | 0-3 years | Level 1-2 | Level 0-1 |
| Confirmed | 3-5 years | Level 2-3 | Level 1-2 |
| Senior | 5-10 years | Level 3-4 | Level 2-3 |
| Expert | 10+ years | Level 4-5 | Level 3-4 |

## Skill Categories

### Analytics
- **Data Analysis** - SQL/BigQuery, Statistical Analysis, Insight Generation, ML Fundamentals
- **Product Analytics** - Product metrics and experimentation
- **Visualization** - Metabase, Looker/LookML, Dashboard Design

### Engineering
- **Data Modeling** - Data preparation, Star/Snowflake schemas, dbt
- **Infrastructure** - GCP, BigQuery Advanced, Kubernetes, Vertex AI, ClickHouse
- **Orchestration** - Apache Airflow, Custom Operators
- **Programming** - Python (Data/Backend), REST APIs, ETL Connectors

### Machine Learning
- **ML** - Recommendation Systems, Embeddings, TensorFlow/PyTorch, MLFlow, Model Deployment

### Operations
- **Data Ops** - Git, GitHub Actions, Terraform, Docker, Monitoring
- **Data Quality** - Testing, validation, observability
- **Optimization** - Performance tuning, cost optimization

### Compliance
- **Security** - GDPR, Data Protection, Access Control

### Business
- **Domain** - Business domain knowledge
- **Soft Skills** - Technical communication, Problem solving, Stakeholder management

## Project Structure

```
skills-matrix/
├── src/skills_matrix/       # Python CLI package
│   ├── cli.py               # CLI commands (Click)
│   ├── models.py            # Pydantic data models
│   ├── loader.py            # YAML parsing and validation
│   ├── generator.py         # Excel workbook generation
│   └── styles.py            # Excel styling utilities
├── web/                     # SvelteKit web application
│   ├── src/
│   │   ├── routes/          # Pages (home, assessment, results)
│   │   └── lib/
│   │       ├── components/  # Svelte components
│   │       └── stores/      # State management
│   ├── static/data/         # Generated JSON from YAML
│   └── build/               # Production output
├── scripts/
│   ├── build_web_data.py    # YAML to JSON converter
│   └── check_web_data.py    # Pre-commit hook for data sync
├── data/
│   ├── config.yaml          # Global configuration
│   ├── skill_groups.yaml    # Assessment modes and skill grouping
│   └── skills/              # Skill definitions by category
│       ├── analytics/
│       ├── engineering/
│       ├── ml/
│       ├── ops/
│       ├── compliance/
│       └── business/
├── tests/                   # Python unit tests
├── output/                  # Generated Excel files (gitignored)
└── pyproject.toml           # Python project config (single version source)
```

## Configuration

### Adding a New Skill

Create or edit a YAML file in `data/skills/<category>/`:

```yaml
category:
  id: my_category
  name: "My Category"

skills:
  - id: my_skill
    name: "My Skill"
    description: "What this skill covers"
    core_roles: [data_analyst, data_engineer]  # Roles where this is a core skill
    levels:
      data_analyst: [1, 2, 3, 4]      # Expected levels: Junior, Confirmed, Senior, Expert
      data_engineer: [1, 2, 3, 4]
      data_scientist: [NC, NC, 1, 2]  # NC = Not Concerned
      analytics_eng: [1, 2, 3, 4]
      ml_engineer: [NC, 1, 2, 3]
      backend: [1, 2, 3, 4]
    level_descriptions:
      0: "No knowledge"
      1: "Basic understanding"
      2: "Can work autonomously"
      3: "Handles complex cases"
      4: "Expert level mastery"
    resources:
      - url: "https://example.com/docs"
        title: "Official Documentation"
        type: "documentation"
      - url: "https://example.com/tutorial"
        title: "Getting Started Tutorial"
        type: "tutorial"
    improvement_tips:
      "1->2": "Practice on real projects..."
      "2->3": "Take ownership of complex features..."
      "3->4": "Lead architectural decisions..."
```

### Adding a New Role

Edit `data/config.yaml`:

```yaml
roles:
  - id: new_role
    name: New Role
    abbreviation: NR
```

Then add level expectations for this role in all skill YAML files.

## Usage Guidelines

### Self-Assessment

1. Fill in the matrix with concrete evidence (links to projects, dashboards, GitHub repos)
2. Levels are cumulative: you cannot reach a level without mastering previous ones
3. Be honest - the goal is growth, not inflation

### Validation

1. Self-assessment should be reviewed by a Staff peer or manager
2. Consistency is key: reaching a level requires demonstrating behaviors repeatedly
3. Use the "Preuves/Exemples" column to document evidence

### Review Cycle

1. Review and update the matrix annually
2. Adapt skills and levels as tools and practices evolve
3. Use the development plan to track progress on target skills

## Tech Stack

This matrix is tailored for a stack including:

| Category | Technologies |
|----------|-------------|
| **Infrastructure** | GCP (GCS, GKE, Compute Engine, CloudSQL, Vertex AI) |
| **ELT / Data Warehouse** | Airflow, BigQuery, dbt, Python, ClickHouse |
| **Visualization** | Metabase, Looker |
| **ML** | Python, TensorFlow/PyTorch, MLFlow |
| **Data Ops** | GitHub Actions, ArgoCD, Grafana, Terraform |

## Development

### Setup

```bash
# Install Python dependencies
uv sync --dev

# Install pre-commit hooks
uv run pre-commit install

# Install web dependencies
cd web && npm install
```

### CLI / Python

```bash
# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=src/skills_matrix

# Format code
uv run ruff format src/ tests/

# Lint
uv run ruff check src/ tests/

# Validate YAML config
uv run skills-matrix validate
```

### Web App

```bash
cd web

# Type checking
npm run check

# Run tests
npm run test

# Build JSON data from YAML
npm run build:data

# Development with hot reload
npm run dev

# Production build (includes data build)
npm run build
```

### Data Sync

The web app uses a JSON file (`web/static/data/skills-data.json`) generated from the YAML sources. A pre-commit hook ensures this stays in sync:

```bash
# Manually rebuild web data after YAML changes
uv run python scripts/build_web_data.py

# Or from web directory
npm run build:data
```

If you modify files in `data/`, the pre-commit hook will fail if the JSON isn't rebuilt.

### CI/CD

GitHub Actions workflows handle:

- **CI** (`.github/workflows/ci.yml`): Runs on all PRs
  - Python: lint (ruff) + tests (pytest)
  - Web: type check + tests (vitest) + build
  - Data: YAML to JSON build verification

- **Deploy** (`.github/workflows/deploy.yml`): Runs on main branch
  - Runs all CI checks
  - Deploys web app to Vercel

## Inspirations

- Decathlon Analytics Unified Skills Matrix
- [Why Your Analytics Team Desperately Needs a Skills Matrix](https://medium.com/@hugo.hauraix/why-your-analytics-team-desperately-needs-a-skills-matrix-and-how-to-build-one-986f87311756)
- Patterns from [pass-culture/data-gcp](https://github.com/pass-culture/data-gcp)

## License

Internal use only - pass Culture Data Team
