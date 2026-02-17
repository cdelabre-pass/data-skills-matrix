# Skills Matrix

[![CI](https://github.com/cdelabre-pass/data-skills-matrix/actions/workflows/ci.yml/badge.svg)](https://github.com/cdelabre-pass/data-skills-matrix/actions/workflows/ci.yml)
[![Deploy to Vercel](https://github.com/cdelabre-pass/data-skills-matrix/actions/workflows/deploy.yml/badge.svg)](https://github.com/cdelabre-pass/data-skills-matrix/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A skills assessment toolkit for data and analytics teams — because growing people matters as much as shipping code.

**[Live Demo](https://data-skills-matrix.vercel.app/)**

## Why a Skills Matrix?

The personal and professional growth of our teammates is a cornerstone of our company culture. We have a strong framework of regular check-ins between each teammate and their leader, including one-on-one monthly meetings, mid-year reviews, and an annual performance discussion. These moments are key to tracking progress, discussing well-being, and planning for the future.

A skills matrix makes these conversations concrete. Instead of vague "you're doing great" or "you need to improve", it gives both the teammate and the leader a shared, objective view of where things stand and where to go next.

## Philosophy

### Skills as a shared language

Every skill is defined in a simple YAML file with clear level descriptions (0 to 4), expected levels per role and career stage, improvement tips, and learning resources. This makes the framework transparent — anyone can read it, challenge it, and propose changes.

### YAML-first: reusable and versionable

All skill definitions live in `data/skills/` as YAML files, organized by category. This design is intentional:

- **Readable** — non-engineers can review and contribute to skill definitions
- **Versionable** — track how expectations evolve over time via git history
- **Reusable** — the same YAML sources feed both the web app and the CLI/Excel export
- **Extensible** — add a skill, a role, or a career level by editing YAML, no code changes needed

```yaml
# Example: data/skills/analytics/data_analysis.yaml
skills:
  - id: sql_bigquery
    name: "SQL / BigQuery"
    core_roles: [data_analyst, analytics_eng]
    levels:
      data_analyst: [1, 2, 3, 4]      # Junior, Confirmed, Senior, Expert
      data_engineer: [1, 2, 3, 4]
      data_scientist: [1, 2, 3, 3]
    level_descriptions:
      0: "No knowledge of SQL"
      1: "Can write basic SELECT queries"
      2: "Comfortable with JOINs, CTEs, window functions"
      3: "Optimizes complex queries, understands execution plans"
      4: "Designs data models, mentors others on SQL best practices"
    improvement_tips:
      "1->2": "Practice writing queries on real datasets..."
```

### Assessment without bias

During self-assessment, expected levels are hidden. You evaluate yourself honestly first, then compare with expectations. This avoids anchoring bias and produces more genuine results.

## What's Inside

- **Web App** — interactive self-assessment with personalized results, gap analysis, and development plans
- **CLI Tool** — generate comprehensive Excel workbooks for offline use and team reviews
- **YAML Data** — 63 skills across 6 categories, 6 roles, 4 career levels

### Roles

| Role | Abbr. |
|------|-------|
| Data Analyst | DA |
| Data Engineer | DE |
| Data Scientist | DS |
| Analytics Engineer | AE |
| ML Engineer | MLE |
| Backend Engineer | BE |

### Skill Levels (0–4 + bonus)

| Level | Meaning |
|-------|---------|
| 0 | No knowledge |
| 1 | Beginner — can do basic tasks with help |
| 2 | Intermediate — autonomous on standard work |
| 3 | Advanced — handles complex cases, guides others |
| 4 | Expert — full mastery, designs solutions at scale |
| 5–6 | Bonus: mentor/evangelist, external expert |

## Quick Start

### Web App

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

### CLI

```bash
uv sync
skills-matrix generate              # Generate Excel matrix
skills-matrix list-skills            # List all skills
skills-matrix validate               # Validate YAML config
```

### Data Sync

YAML sources are compiled to JSON for the web app. A pre-commit hook keeps them in sync:

```bash
uv run python scripts/build_web_data.py
```

## Project Structure

```
skills-matrix/
├── data/                       # YAML skill definitions (the source of truth)
│   ├── config.yaml             # Roles and global config
│   ├── skill_groups.yaml       # Assessment modes
│   └── skills/                 # Skills by category
│       ├── analytics/
│       ├── engineering/
│       ├── ml/
│       ├── ops/
│       ├── compliance/
│       └── business/
├── web/                        # SvelteKit web application
├── src/skills_matrix/          # Python CLI package
├── scripts/                    # Build and validation scripts
└── tests/                      # Python tests
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

## Inspirations

- Decathlon Analytics Unified Skills Matrix
- [Why Your Analytics Team Desperately Needs a Skills Matrix](https://medium.com/@hugo.hauraix/why-your-analytics-team-desperately-needs-a-skills-matrix-and-how-to-build-one-986f87311756)

## License

[MIT](LICENSE)
