#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import Logger from './logger.js';
import { extractStylesFromBothSites } from './extractStyles.js';
import { compareElements, generateDiffReport } from './compare.js';
import { generateCssPatch, generateDetailedCssPatch } from './generateCssPatch.js';
import {
  readJSON,
  writeJSON,
  writeText,
  loadSelectors,
  fileExists,
  ensureOutputDir
} from './utils/fileHandler.js';

const program = new Command();

program
  .name('sfcc-dom-diff')
  .description('DOM and ComputedStyle difference extraction tool for SFCC site migration')
  .version('1.0.0');

program
  .requiredOption('--old <url|path>', 'Old site URL or HTML file path')
  .requiredOption('--new <url|path>', 'New site (SFCC) URL or HTML file path')
  .option('--output <dir>', 'Output directory', './output')
  .option('--selectors <list>', 'Comma-separated list of CSS selectors')
  .option('--config <path>', 'Config file path (JSON or YAML) for selectors')
  .option('--properties <list>', 'Comma-separated list of CSS properties to compare')
  .option('--important', 'Add !important to generated CSS', false)
  .option('--no-important', 'Do not add !important to generated CSS')
  .option('--verbose', 'Verbose logging', false)
  .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
  .option('--matching <strategy>', 'Matching strategy: selector or similarity', 'selector')
  .option('--detailed', 'Generate detailed CSS patch with annotations', false);

program.parse(process.argv);

const options = program.opts();

/**
 * Main function
 */
async function main() {
  // Initialize logger
  const logger = new Logger({
    verbose: options.verbose,
    logFile: path.join(options.output, 'log.txt')
  });

  await logger.init();

  try {
    logger.info('Starting SFCC DOM Diff Tool...');
    logger.info(`Old site: ${options.old}`);
    logger.info(`New site: ${options.new}`);

    // Ensure output directory exists
    await ensureOutputDir(options.output);

    // Load configuration
    let config = {};
    const defaultConfigPath = './config/default.json';

    if (await fileExists(defaultConfigPath)) {
      logger.debug('Loading default configuration...');
      config = await readJSON(defaultConfigPath);
    }

    // Parse selectors
    let selectors = [];

    if (options.config) {
      logger.info(`Loading selectors from config: ${options.config}`);
      selectors = await loadSelectors(options.config);
      logger.info(`Loaded ${selectors.length} selectors from config`);
    } else if (options.selectors) {
      selectors = options.selectors.split(',').map(s => s.trim());
      logger.info(`Using ${selectors.length} selectors from command line`);
    } else {
      logger.info('No selectors specified - will compare all elements with class or id');
    }

    // Parse properties
    let properties = [];

    if (options.properties) {
      properties = options.properties.split(',').map(p => p.trim());
      logger.info(`Comparing ${properties.length} specific properties`);
    } else if (config.defaultProperties) {
      properties = config.defaultProperties;
      logger.info(`Using ${properties.length} default properties from config`);
    } else {
      logger.info('No properties specified - will compare all computed style properties');
    }

    // Puppeteer options
    const puppeteerOptions = {
      headless: config.puppeteer?.headless ?? true,
      defaultViewport: config.puppeteer?.defaultViewport ?? {
        width: 1920,
        height: 1080
      }
    };

    const timeout = parseInt(options.timeout, 10);

    // Extract styles from both sites
    logger.info('Extracting styles from both sites...');

    const { old: oldStyles, new: newStyles } = await extractStylesFromBothSites(
      options.old,
      options.new,
      selectors,
      properties,
      {
        logger,
        timeout,
        puppeteerOptions
      }
    );

    logger.success('Style extraction completed');

    // Compare elements
    logger.info('Comparing elements...');

    const comparisonResult = compareElements(oldStyles, newStyles, {
      properties,
      matchingStrategy: options.matching,
      logger
    });

    logger.success('Comparison completed');

    // Generate diff report
    const diffReport = generateDiffReport(
      options.old,
      options.new,
      comparisonResult
    );

    // Write diff report to JSON
    const diffJsonPath = path.join(options.output, 'diff.json');
    await writeJSON(diffJsonPath, diffReport);
    logger.success(`Diff report saved to: ${diffJsonPath}`);

    // Generate CSS patch
    logger.info('Generating CSS patch...');

    const useImportant = options.important ?? config.css?.useImportant ?? false;

    const cssPatch = options.detailed
      ? generateDetailedCssPatch(diffReport, {
          useImportant,
          includeComments: true,
          showOldAndNew: true
        })
      : generateCssPatch(diffReport, {
          useImportant,
          includeComments: true
        });

    const patchCssPath = path.join(options.output, 'patch.css');
    await writeText(patchCssPath, cssPatch);
    logger.success(`CSS patch saved to: ${patchCssPath}`);

    // Summary
    logger.info('');
    logger.info('=== Summary ===');
    logger.info(`Total elements compared: ${diffReport.summary.totalElements}`);
    logger.info(`Matched elements: ${diffReport.summary.matchedElements}`);
    logger.info(`Unmatched elements: ${diffReport.summary.unmatchedElements}`);
    logger.info(`Elements with differences: ${diffReport.summary.diffElements}`);
    logger.info(`Total property differences: ${diffReport.summary.diffProperties}`);
    logger.info('');

    logger.complete('Process completed successfully');

  } catch (error) {
    logger.error('Fatal error occurred', error);
    process.exit(1);
  }
}

// Run main function
main();
