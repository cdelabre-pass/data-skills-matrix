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
- **Reusable** — the same YAML sources feed the web app and the Excel export
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
- **Excel Export** — downloadable workbook for offline use and team reviews (generated in-browser)
- **YAML Data** — 63 skills across 7 categories, 6 roles, 4 career levels

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

### Prerequisites

- [Node.js](https://nodejs.org/) 20+

### Setup

```bash
git clone https://github.com/cdelabre-pass/data-skills-matrix.git
cd data-skills-matrix
make install     # installs root + web dependencies
```

### Run the web app

```bash
make dev         # http://localhost:5173
```

### Rebuild skills data

After editing YAML files, regenerate the JSON used by the web app:

```bash
make build-data
```

A pre-commit hook will catch it if you forget.

### All available commands

```
make help
```

```
  help            Show this help
  install         Install all dependencies
  dev             Start web dev server (http://localhost:5173)
  build           Build everything (data + web)
  build-data      Regenerate skills-data.json from YAML sources
  check-data      Verify skills-data.json is in sync with YAML
  test            Run web app tests
  hooks           Install pre-commit hooks
```

## Project Structure

```
skills-matrix/
├── data/                       # YAML skill definitions (the source of truth)
│   ├── config.yaml             # Roles, career levels, global config
│   ├── skill_groups.yaml       # Assessment modes and core skill groupings
│   └── skills/                 # Skills organized by category
│       ├── analytics/
│       ├── engineering/
│       ├── ml/
│       ├── ops/
│       ├── compliance/
│       ├── business/
│       └── soft_skills/
├── scripts/                    # Build and validation scripts (JS)
│   ├── build-data.mjs          # YAML → JSON compiler
│   └── check-data.mjs          # Sync validator (used by pre-commit)
├── web/                        # SvelteKit web application
│   ├── src/
│   └── static/data/            # Generated skills-data.json (committed)
├── Makefile                    # Developer shortcuts
└── package.json                # Root package (js-yaml for build script)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

## Inspirations

This project is highly inspired from the [Decathlon Analytics Unified Skills Matrix](https://docs.google.com/spreadsheets/d/1LU7rDQ4Qvip1kY2g0LDJKaYCzBIXJTBUoIeWKem-EtU/edit?gid=168785105#gid=168785105) and the article [Why Your Analytics Team Desperately Needs a Skills Matrix](https://medium.com/@hugo.hauraix/why-your-analytics-team-desperately-needs-a-skills-matrix-and-how-to-build-one-986f87311756).

## License

[MIT](LICENSE)
