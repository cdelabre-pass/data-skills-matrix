#!/usr/bin/env node
/**
 * Build script: converts YAML skill definitions to JSON for the web app.
 * Port of scripts/build_web_data.py
 */
import { createHash } from 'crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { validateData } from './validate-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const dataDir = join(projectRoot, 'data');
const outputDir = join(projectRoot, 'web', 'static', 'data');

const CATEGORY_DISPLAY_NAMES = {
  analytics: 'Analytics',
  business: 'Business',
  compliance: 'Compliance',
  engineering: 'Engineering',
  ml: 'Machine Learning',
  ops: 'Data Ops',
  soft_skills: 'Soft Skills',
};

function getAllYamlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllYamlFiles(fullPath));
    } else if (entry.name.endsWith('.yaml')) {
      files.push(fullPath);
    }
  }
  return files;
}

function getYamlHash() {
  const hasher = createHash('sha256');
  const yamlFiles = getAllYamlFiles(dataDir).sort();
  for (const file of yamlFiles) {
    hasher.update(readFileSync(file));
  }
  return hasher.digest('hex').slice(0, 16);
}

function loadYaml(filePath) {
  return yaml.load(readFileSync(filePath, 'utf-8'));
}

function buildWebData() {
  validateData();
  mkdirSync(outputDir, { recursive: true });

  const config = loadYaml(join(dataDir, 'config.yaml'));

  const skillGroupsFile = join(dataDir, 'skill_groups.yaml');
  let skillGroups = {};
  try {
    skillGroups = loadYaml(skillGroupsFile) ?? {};
  } catch {
    // optional file
  }

  const skillsDir = join(dataDir, 'skills');
  const categories = {};
  const allSkills = [];

  for (const categoryEntry of readdirSync(skillsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!categoryEntry.isDirectory()) continue;

    const categoryId = categoryEntry.name;
    const displayName = CATEGORY_DISPLAY_NAMES[categoryId] ?? categoryId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const categoryDir = join(skillsDir, categoryId);

    for (const skillEntry of readdirSync(categoryDir).filter(f => f.endsWith('.yaml')).sort()) {
      const fileData = loadYaml(join(categoryDir, skillEntry)) ?? {};
      const skills = fileData.skills ?? [];

      for (const skill of skills) {
        skill.category = categoryId;
        skill.category_name = displayName;
        allSkills.push(skill);
      }

      if (!categories[categoryId]) {
        categories[categoryId] = { id: categoryId, name: displayName, skill_count: 0 };
      }
      categories[categoryId].skill_count += skills.length;
    }
  }

  const webData = {
    _source_hash: getYamlHash(),
    roles: config.roles ?? [],
    levels: config.career_levels ?? [],
    skill_levels: config.skill_levels ?? {},
    categories: Object.values(categories),
    skills: allSkills,
    assessment_modes: skillGroups.assessment_modes ?? {},
    core_skills_by_role: skillGroups.core_skills_by_role ?? {},
    skill_groups: skillGroups.groups ?? {},
    inference_rules: skillGroups.inference_rules ?? [],
  };

  const outputFile = join(outputDir, 'skills-data.json');
  writeFileSync(outputFile, JSON.stringify(webData, null, 2) + '\n', 'utf-8');

  console.log(`Generated ${outputFile}`);
  console.log(`  - ${webData.roles.length} roles`);
  console.log(`  - ${webData.levels.length} career levels`);
  console.log(`  - ${webData.categories.length} categories`);
  console.log(`  - ${webData.skills.length} skills`);
}

buildWebData();
