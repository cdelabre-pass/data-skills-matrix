#!/usr/bin/env node
/**
 * Validates structural integrity of all YAML data files.
 * Run directly or imported by build-data.mjs.
 */
import { readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const dataDir = join(projectRoot, 'data');

const VALID_RESOURCE_TYPES = new Set(['documentation', 'tutorial', 'course', 'book', 'video']);

function loadYaml(filePath) {
  return yaml.load(readFileSync(filePath, 'utf-8'));
}

function fail(message) {
  console.error(`\nValidation error: ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`  Warning: ${message}`);
}

export function validateData() {
  // Load config
  const config = loadYaml(join(dataDir, 'config.yaml'));
  const validRoleIds = new Set((config.roles ?? []).map(r => r.id));

  if (validRoleIds.size === 0) {
    fail('config.yaml has no roles defined');
  }

  // Load all skills from all category files
  const skillsDir = join(dataDir, 'skills');
  const allSkillIds = new Set();
  let totalSkills = 0;

  for (const categoryEntry of readdirSync(skillsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!categoryEntry.isDirectory()) continue;
    const categoryDir = join(skillsDir, categoryEntry.name);

    for (const fileName of readdirSync(categoryDir).filter(f => f.endsWith('.yaml')).sort()) {
      const filePath = join(categoryDir, fileName);
      const fileData = loadYaml(filePath) ?? {};
      const skills = fileData.skills ?? [];
      const fileLabel = `${categoryEntry.name}/${fileName}`;

      for (const skill of skills) {
        totalSkills++;

        // Required fields
        if (!skill.id) fail(`Missing 'id' field in a skill entry in ${fileLabel}`);
        if (!skill.name) fail(`Skill '${skill.id}' in ${fileLabel} is missing required field: name`);
        if (!skill.levels) fail(`Skill '${skill.id}' in ${fileLabel} is missing required field: levels`);
        if (!skill.level_descriptions) fail(`Skill '${skill.id}' in ${fileLabel} is missing required field: level_descriptions`);

        // Unique IDs
        if (allSkillIds.has(skill.id)) {
          fail(`Duplicate skill ID '${skill.id}' found in ${fileLabel}`);
        }
        allSkillIds.add(skill.id);

        // levels[role] must be array of exactly 4 numbers
        for (const [roleId, levelArray] of Object.entries(skill.levels)) {
          if (!validRoleIds.has(roleId)) {
            fail(`Skill '${skill.id}' references unknown role '${roleId}' in levels`);
          }
          if (!Array.isArray(levelArray)) {
            fail(`Skill '${skill.id}' levels.${roleId} must be an array, got ${typeof levelArray}`);
          }
          if (levelArray.length !== 4) {
            fail(`Skill '${skill.id}' levels.${roleId} must have exactly 4 values (Jr/Cf/Sr/Ex), got ${levelArray.length}`);
          }
          for (const val of levelArray) {
            if (typeof val !== 'number' && val !== 'NC') {
              fail(`Skill '${skill.id}' levels.${roleId} contains invalid value: ${val} (expected number or 'NC')`);
            }
          }
        }

        // core_roles must reference valid role IDs
        if (skill.core_roles) {
          for (const roleId of skill.core_roles) {
            if (!validRoleIds.has(roleId)) {
              fail(`Skill '${skill.id}' core_roles references unknown role '${roleId}'`);
            }
          }
        }

        // Validate resource types
        if (skill.resources) {
          for (const resource of skill.resources) {
            if (resource.type && !VALID_RESOURCE_TYPES.has(resource.type)) {
              fail(`Skill '${skill.id}' has resource with invalid type '${resource.type}'. Valid types: ${[...VALID_RESOURCE_TYPES].join(', ')}`);
            }
          }
        }
      }
    }
  }

  // Load skill_groups.yaml
  const skillGroupsFile = join(dataDir, 'skill_groups.yaml');
  let skillGroups = {};
  try {
    skillGroups = loadYaml(skillGroupsFile) ?? {};
  } catch {
    // optional file
  }

  // Validate core_skills_by_role
  const coreSkillsByRole = skillGroups.core_skills_by_role ?? {};
  for (const [roleId, skillIds] of Object.entries(coreSkillsByRole)) {
    if (!validRoleIds.has(roleId)) {
      fail(`core_skills_by_role references unknown role '${roleId}'`);
    }
    for (const skillId of skillIds) {
      if (!allSkillIds.has(skillId)) {
        fail(`core_skills_by_role[${roleId}] references unknown skill '${skillId}'`);
      }
    }
  }

  // Validate inference_rules source/target skill IDs
  const inferenceRules = skillGroups.inference_rules ?? [];
  for (const rule of inferenceRules) {
    if (!rule.source) {
      warn('An inference rule is missing a source skill ID');
      continue;
    }
    if (!allSkillIds.has(rule.source)) {
      fail(`inference_rules: source skill '${rule.source}' does not exist`);
    }
    for (const ruleEntry of rule.rules ?? []) {
      for (const target of ruleEntry.targets ?? []) {
        if (!allSkillIds.has(target.skill)) {
          fail(`inference_rules: target skill '${target.skill}' (from source '${rule.source}') does not exist`);
        }
      }
    }
  }

  console.log(`Validation passed: ${totalSkills} skills, ${validRoleIds.size} roles, ${inferenceRules.length} inference rules`);
}

// Run directly when called as a script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateData();
}
