"""
CLI entry point for skills matrix.
"""

from pathlib import Path
import click

from . import __version__
from .loader import load_config, load_all_skills, validate_skills
from .generator import generate_xlsx


# Shared option for data directory
data_dir_option = click.option(
    "--data-dir",
    "-d",
    default="data",
    help="Data directory containing config.yaml and skills/",
)


@click.group()
@click.version_option(version=__version__, prog_name="skills-matrix")
def main():
    """Skills Matrix CLI - Matrice de compétences Analytics"""
    pass


@main.command()
@click.option(
    "--output", "-o", default="output/skills_matrix.xlsx", help="Output file path"
)
@data_dir_option
def generate(output: str, data_dir: str):
    """Generate the Excel skills matrix."""
    data_path = Path(data_dir)
    output_path = Path(output)

    click.echo("Chargement de la configuration...")
    config = load_config(data_path / "config.yaml")

    click.echo("Chargement des compétences...")
    categories = load_all_skills(data_path / "skills", config.category_order)

    click.echo("Validation des données...")
    errors = validate_skills(config, categories)
    if errors:
        click.echo(click.style("Erreurs de validation:", fg="red"))
        for error in errors:
            click.echo(f"  - {error}")
        raise click.Abort()

    click.echo("Génération du fichier Excel...")
    stats = generate_xlsx(config, categories, output_path)

    click.echo(click.style(f"\nFichier créé: {output_path}", fg="green"))
    click.echo("\nStatistiques:")
    click.echo(f"  - {stats['total_skills']} compétences")
    click.echo(f"  - {stats['total_categories']} catégories")
    click.echo(
        f"  - {stats['total_roles']} rôles x {stats['total_career_levels']} niveaux = {stats['total_roles'] * stats['total_career_levels']} profils"
    )
    click.echo(
        "  - 7 feuilles: Niveaux, Matrice, Descriptions, Évaluation, Radars, Plan, Historique"
    )


@main.command("list-skills")
@data_dir_option
def list_skills(data_dir: str):
    """List all skills by category."""
    data_path = Path(data_dir)
    categories = load_all_skills(data_path / "skills")

    total = 0
    for category in categories:
        click.echo(click.style(f"\n{category.name}", fg="cyan", bold=True))
        click.echo("-" * len(category.name))
        for skill in category.skills:
            click.echo(f"  - {skill.name}")
            total += 1

    click.echo(f"\nTotal: {total} compétences dans {len(categories)} catégories")


@main.command()
@data_dir_option
def validate(data_dir: str):
    """Validate YAML configuration files."""
    data_path = Path(data_dir)

    click.echo("Chargement de la configuration...")
    try:
        config = load_config(data_path / "config.yaml")
        click.echo(click.style("  config.yaml: OK", fg="green"))
    except Exception as e:
        click.echo(click.style(f"  config.yaml: ERREUR - {e}", fg="red"))
        raise click.Abort()

    click.echo("\nChargement des compétences...")
    try:
        categories = load_all_skills(data_path / "skills", config.category_order)
        for category in categories:
            click.echo(
                click.style(
                    f"  {category.id}.yaml: OK ({len(category.skills)} skills)",
                    fg="green",
                )
            )
    except Exception as e:
        click.echo(click.style(f"  ERREUR - {e}", fg="red"))
        raise click.Abort()

    click.echo("\nValidation des références...")
    errors = validate_skills(config, categories)
    if errors:
        click.echo(click.style("Erreurs trouvées:", fg="red"))
        for error in errors:
            click.echo(f"  - {error}")
        raise click.Abort()
    else:
        click.echo(click.style("Toutes les références sont valides!", fg="green"))

    click.echo(click.style("\nValidation réussie!", fg="green", bold=True))


@main.command()
@data_dir_option
def stats(data_dir: str):
    """Show statistics about the skills matrix."""
    data_path = Path(data_dir)

    config = load_config(data_path / "config.yaml")
    categories = load_all_skills(data_path / "skills", config.category_order)

    total_skills = sum(len(cat.skills) for cat in categories)

    click.echo(
        click.style("Statistiques de la Matrice de Compétences", fg="cyan", bold=True)
    )
    click.echo("=" * 45)

    click.echo("\nCompétences:")
    click.echo(f"  - Total: {total_skills}")
    for category in categories:
        click.echo(f"  - {category.name}: {len(category.skills)}")

    click.echo(f"\nRôles ({len(config.roles)}):")
    for role in config.roles:
        click.echo(f"  - {role.name} ({role.abbreviation})")

    click.echo(f"\nNiveaux de carrière ({len(config.career_levels)}):")
    for level in config.career_levels:
        click.echo(f"  - {level.name} ({level.experience})")

    click.echo("\nÉchelle de compétence:")
    for sl in config.skill_levels.get("standard", []):
        click.echo(f"  - Niveau {sl.level}: {sl.name}")
    click.echo("  --- Bonus ---")
    for sl in config.skill_levels.get("bonus", []):
        click.echo(f"  - Niveau {sl.level}: {sl.name}")


if __name__ == "__main__":
    main()
