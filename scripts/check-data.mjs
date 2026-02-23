#!/usr/bin/env node
/**
 * Pre-commit hook: ensures web data JSON is up-to-date with YAML sources.
 * Port of scripts/check_web_data.py
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const dataDir = join(projectRoot, 'data');
const jsonFile = join(projectRoot, 'web', 'static', 'data', 'skills-data.json');

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

if (!existsSync(jsonFile)) {
  console.error('ERROR: web/static/data/skills-data.json does not exist.');
  console.error('Run: npm run build:data');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(jsonFile, 'utf-8'));
} catch {
  console.error('ERROR: skills-data.json is not valid JSON.');
  process.exit(1);
}

const storedHash = data._source_hash;
const currentHash = getYamlHash();

if (storedHash !== currentHash) {
  console.error('WARNING: YAML sources have changed since last data build.');
  console.error(`  Stored hash:  ${storedHash ?? 'none'}`);
  console.error(`  Current hash: ${currentHash}`);
  console.error('');
  console.error('Run: npm run build:data');
  process.exit(1);
}
