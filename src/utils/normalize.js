/**
 * Normalize CSS values for accurate comparison
 */

/**
 * Normalize numeric values (remove trailing decimals like .0)
 * Examples: "10.0px" -> "10px", "1.50em" -> "1.5em"
 */
export function normalizeNumeric(value) {
  if (!value || typeof value !== 'string') return value;

  return value.replace(/(\d+)\.0+([a-z%]*)/gi, '$1$2')
    .replace(/(\d+\.\d*?)0+([a-z%]*)/gi, '$1$2');
}

/**
 * Normalize color values to hex format
 * Examples:
 * - "rgb(255, 255, 255)" -> "#ffffff"
 * - "#fff" -> "#ffffff"
 * - "rgba(255, 255, 255, 0.5)" -> "rgba(255, 255, 255, 0.5)" (keep alpha)
 */
export function normalizeColor(value) {
  if (!value || typeof value !== 'string') return value;

  value = value.trim().toLowerCase();

  // Handle named colors
  const namedColors = {
    'white': '#ffffff',
    'black': '#000000',
    'red': '#ff0000',
    'green': '#008000',
    'blue': '#0000ff',
    'transparent': 'transparent',
    // Add more as needed
  };

  if (namedColors[value]) {
    return namedColors[value];
  }

  // Expand 3-digit hex to 6-digit
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
  }

  // Convert rgb() to hex
  const rgbMatch = value.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // Keep rgba as-is (can't convert to hex without losing alpha)
  const rgbaMatch = value.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/);
  if (rgbaMatch) {
    // Normalize spacing
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${rgbaMatch[4]})`;
  }

  return value;
}

/**
 * Normalize spacing in values (remove extra spaces)
 * Examples: "10px  20px" -> "10px 20px"
 */
export function normalizeSpacing(value) {
  if (!value || typeof value !== 'string') return value;

  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize margin/padding shorthand
 * Examples: "10px 10px 10px 10px" -> "10px"
 */
export function normalizeShorthand(value) {
  if (!value || typeof value !== 'string') return value;

  const parts = value.split(/\s+/);

  // If all values are the same, return single value
  if (parts.length === 4 && parts.every(p => p === parts[0])) {
    return parts[0];
  }

  // If top/bottom and left/right are same
  if (parts.length === 4 && parts[0] === parts[2] && parts[1] === parts[3]) {
    return `${parts[0]} ${parts[1]}`;
  }

  return value;
}

/**
 * Normalize border values
 * Examples: "1px solid rgb(0, 0, 0)" -> "1px solid #000000"
 */
export function normalizeBorder(value) {
  if (!value || typeof value !== 'string') return value;

  // Split border value into parts
  const parts = value.split(/\s+/);

  return parts.map(part => {
    // Normalize color part
    if (part.includes('rgb') || part.includes('#') || /^[a-z]+$/.test(part)) {
      return normalizeColor(part);
    }
    return part;
  }).join(' ');
}

/**
 * Main normalization function - applies all normalizations
 */
export function normalizeValue(propertyName, value) {
  if (!value || value === 'none' || value === 'auto' || value === 'initial' || value === 'inherit') {
    return value;
  }

  // Apply numeric normalization
  value = normalizeNumeric(value);

  // Apply spacing normalization
  value = normalizeSpacing(value);

  // Property-specific normalizations
  if (propertyName.includes('color') || propertyName === 'background-color' || propertyName === 'border-color') {
    value = normalizeColor(value);
  } else if (propertyName.includes('margin') || propertyName.includes('padding')) {
    value = normalizeShorthand(value);
  } else if (propertyName.includes('border') && value.includes(' ')) {
    value = normalizeBorder(value);
  }

  return value;
}

/**
 * Check if two values are effectively equal after normalization
 */
export function areValuesEqual(propertyName, value1, value2) {
  const normalized1 = normalizeValue(propertyName, value1);
  const normalized2 = normalizeValue(propertyName, value2);

  return normalized1 === normalized2;
}

export default {
  normalizeNumeric,
  normalizeColor,
  normalizeSpacing,
  normalizeShorthand,
  normalizeBorder,
  normalizeValue,
  areValuesEqual
};
