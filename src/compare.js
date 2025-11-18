import { areValuesEqual } from './utils/normalize.js';
import { getMatchingStrategy } from './matcher.js';

/**
 * Compare styles between matched elements
 */
function compareStyles(oldStyles, newStyles, properties) {
  const differences = {};

  // Get all property keys to compare
  const allProperties = properties && properties.length > 0
    ? properties
    : [...new Set([...Object.keys(oldStyles), ...Object.keys(newStyles)])];

  allProperties.forEach(prop => {
    const oldValue = oldStyles[prop];
    const newValue = newStyles[prop];

    // Check if values are different (after normalization)
    if (!areValuesEqual(prop, oldValue, newValue)) {
      differences[prop] = {
        old: oldValue,
        new: newValue
      };
    }
  });

  return differences;
}

/**
 * Compare elements and generate diff report
 */
export function compareElements(oldElements, newElements, options = {}) {
  const {
    properties = [],
    matchingStrategy = 'selector',
    logger
  } = options;

  if (logger) logger.info('Matching elements between old and new sites...');

  // Get matching strategy function
  const matchFn = getMatchingStrategy(matchingStrategy);
  const matches = matchFn(oldElements, newElements);

  if (logger) logger.info(`Matched ${matches.filter(m => m.new !== null).length} elements`);

  const differences = [];
  let totalDiffCount = 0;
  let totalPropertyDiffs = 0;

  matches.forEach(match => {
    if (!match.new) {
      // Element not found in new site
      if (logger) logger.debug(`Element not found in new site: ${match.old.selector}`);
      return;
    }

    // Compare styles
    const styleDiffs = compareStyles(match.old.styles, match.new.styles, properties);

    // If there are differences, add to report
    if (Object.keys(styleDiffs).length > 0) {
      differences.push({
        selector: match.old.selector,
        xpath: match.old.xpath,
        tagName: match.old.tagName,
        id: match.old.id,
        classes: match.old.classes,
        matchScore: match.matchScore,
        properties: styleDiffs
      });

      totalDiffCount++;
      totalPropertyDiffs += Object.keys(styleDiffs).length;
    }
  });

  if (logger) {
    logger.info(`Found ${totalDiffCount} elements with differences`);
    logger.info(`Total ${totalPropertyDiffs} property differences`);
  }

  return {
    differences,
    summary: {
      totalElements: matches.length,
      matchedElements: matches.filter(m => m.new !== null).length,
      unmatchedElements: matches.filter(m => m.new === null).length,
      diffElements: totalDiffCount,
      diffProperties: totalPropertyDiffs
    },
    matches
  };
}

/**
 * Generate full diff report
 */
export function generateDiffReport(oldSite, newSite, comparisonResult) {
  return {
    timestamp: new Date().toISOString(),
    oldSite,
    newSite,
    summary: comparisonResult.summary,
    differences: comparisonResult.differences
  };
}

export default {
  compareElements,
  generateDiffReport,
  compareStyles
};
