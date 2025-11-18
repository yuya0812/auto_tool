/**
 * Generate CSS patch from differences
 */

/**
 * Convert property name from camelCase to kebab-case
 */
function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Format CSS property value
 */
function formatCssValue(property, value) {
  // Handle special cases
  if (value === '' || value === null || value === undefined) {
    return 'initial';
  }

  return value;
}

/**
 * Generate CSS rule for a single element
 */
function generateCssRule(difference, useImportant = false) {
  const { selector, properties } = difference;

  // Generate CSS properties
  const cssProperties = [];

  Object.entries(properties).forEach(([prop, values]) => {
    const kebabProp = toKebabCase(prop);
    const value = formatCssValue(prop, values.old);
    const important = useImportant ? ' !important' : '';

    cssProperties.push(`  ${kebabProp}: ${value}${important};`);
  });

  // Build CSS rule
  return `${selector} {\n${cssProperties.join('\n')}\n}`;
}

/**
 * Generate CSS patch file content
 */
export function generateCssPatch(diffReport, options = {}) {
  const {
    useImportant = false,
    includeComments = true
  } = options;

  const lines = [];

  // Add header comments
  if (includeComments) {
    lines.push('/* Auto-generated CSS Patch */');
    lines.push(`/* Generated at: ${diffReport.timestamp} */`);
    lines.push(`/* Old Site: ${diffReport.oldSite} */`);
    lines.push(`/* New Site: ${diffReport.newSite} */`);
    lines.push(`/* Differences found: ${diffReport.summary.diffElements} elements, ${diffReport.summary.diffProperties} properties */`);
    lines.push('');
  }

  // Generate CSS rules for each difference
  diffReport.differences.forEach((diff, index) => {
    if (includeComments) {
      lines.push(`/* Element ${index + 1}: ${diff.selector} */`);
      if (diff.xpath) {
        lines.push(`/* XPath: ${diff.xpath} */`);
      }
    }

    const rule = generateCssRule(diff, useImportant);
    lines.push(rule);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Generate detailed CSS patch with annotations
 */
export function generateDetailedCssPatch(diffReport, options = {}) {
  const {
    useImportant = false,
    includeComments = true,
    showOldAndNew = true
  } = options;

  const lines = [];

  // Add header comments
  if (includeComments) {
    lines.push('/* ========================================== */');
    lines.push('/*       Auto-generated CSS Patch            */');
    lines.push('/* ========================================== */');
    lines.push(`/* Generated at: ${diffReport.timestamp} */`);
    lines.push(`/* Old Site: ${diffReport.oldSite} */`);
    lines.push(`/* New Site: ${diffReport.newSite} */`);
    lines.push('/* ========================================== */');
    lines.push('');
    lines.push('/* Summary:');
    lines.push(`   - Total elements compared: ${diffReport.summary.totalElements}`);
    lines.push(`   - Elements with differences: ${diffReport.summary.diffElements}`);
    lines.push(`   - Total property differences: ${diffReport.summary.diffProperties}`);
    lines.push('*/');
    lines.push('');
  }

  // Generate CSS rules for each difference
  diffReport.differences.forEach((diff, index) => {
    if (includeComments) {
      lines.push('/* ========================================== */');
      lines.push(`/* Element ${index + 1} */`);
      lines.push(`/* Selector: ${diff.selector} */`);
      if (diff.xpath) {
        lines.push(`/* XPath: ${diff.xpath} */`);
      }
      if (diff.id) {
        lines.push(`/* ID: ${diff.id} */`);
      }
      if (diff.classes && diff.classes.length > 0) {
        lines.push(`/* Classes: ${diff.classes.join(', ')} */`);
      }
      lines.push('/* ========================================== */');

      if (showOldAndNew) {
        lines.push('/* Property changes: */');
        Object.entries(diff.properties).forEach(([prop, values]) => {
          lines.push(`/*   ${toKebabCase(prop)}: ${values.new} → ${values.old} */`);
        });
      }
    }

    const rule = generateCssRule(diff, useImportant);
    lines.push(rule);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Group differences by selector prefix (e.g., same component)
 */
export function groupDifferencesByComponent(differences) {
  const groups = {};

  differences.forEach(diff => {
    // Try to extract component name from selector
    const match = diff.selector.match(/^\.([a-zA-Z0-9-_]+)/);
    const component = match ? match[1] : 'ungrouped';

    if (!groups[component]) {
      groups[component] = [];
    }

    groups[component].push(diff);
  });

  return groups;
}

/**
 * Generate CSS patch organized by component
 */
export function generateOrganizedCssPatch(diffReport, options = {}) {
  const {
    useImportant = false,
    includeComments = true
  } = options;

  const lines = [];

  // Add header
  if (includeComments) {
    lines.push('/* Auto-generated CSS Patch (Organized by Component) */');
    lines.push(`/* Generated at: ${diffReport.timestamp} */`);
    lines.push('');
  }

  // Group differences
  const groups = groupDifferencesByComponent(diffReport.differences);

  // Generate CSS for each group
  Object.entries(groups).forEach(([component, diffs]) => {
    if (includeComments) {
      lines.push('/* ========================================== */');
      lines.push(`/* Component: ${component} */`);
      lines.push(`/* Elements: ${diffs.length} */`);
      lines.push('/* ========================================== */');
      lines.push('');
    }

    diffs.forEach(diff => {
      const rule = generateCssRule(diff, useImportant);
      lines.push(rule);
      lines.push('');
    });
  });

  return lines.join('\n');
}

export default {
  generateCssPatch,
  generateDetailedCssPatch,
  generateOrganizedCssPatch,
  groupDifferencesByComponent
};
