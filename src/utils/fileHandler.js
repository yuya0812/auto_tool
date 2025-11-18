import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Read JSON file
 */
export async function readJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file at ${filePath}: ${error.message}`);
  }
}

/**
 * Write JSON file
 */
export async function writeJSON(filePath, data) {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write JSON file at ${filePath}: ${error.message}`);
  }
}

/**
 * Read YAML file
 */
export async function readYAML(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return yaml.load(content);
  } catch (error) {
    throw new Error(`Failed to read YAML file at ${filePath}: ${error.message}`);
  }
}

/**
 * Write text file (CSS, log, etc.)
 */
export async function writeText(filePath, content) {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write text file at ${filePath}: ${error.message}`);
  }
}

/**
 * Read text file
 */
export async function readText(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read text file at ${filePath}: ${error.message}`);
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if path is a URL
 */
export function isURL(input) {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Load config file (JSON or YAML)
 */
export async function loadConfig(configPath) {
  if (!await fileExists(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const ext = path.extname(configPath).toLowerCase();

  if (ext === '.json') {
    return await readJSON(configPath);
  } else if (ext === '.yaml' || ext === '.yml') {
    return await readYAML(configPath);
  } else {
    throw new Error(`Unsupported config file format: ${ext}`);
  }
}

/**
 * Load selectors from config file
 */
export async function loadSelectors(configPath) {
  const config = await loadConfig(configPath);

  // Handle different config formats
  if (Array.isArray(config)) {
    return config;
  } else if (config.selectors && Array.isArray(config.selectors)) {
    return config.selectors;
  } else {
    throw new Error('Invalid selectors config format. Expected array or object with "selectors" property.');
  }
}

/**
 * Ensure output directory exists
 */
export async function ensureOutputDir(outputDir) {
  try {
    await fs.ensureDir(outputDir);
  } catch (error) {
    throw new Error(`Failed to create output directory at ${outputDir}: ${error.message}`);
  }
}

export default {
  readJSON,
  writeJSON,
  readYAML,
  writeText,
  readText,
  fileExists,
  isURL,
  loadConfig,
  loadSelectors,
  ensureOutputDir
};
