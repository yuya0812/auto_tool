/**
 * Match elements between old and new sites
 */

/**
 * Calculate similarity score between two elements
 */
function calculateSimilarity(oldElement, newElement) {
  let score = 0;

  // Exact ID match
  if (oldElement.id && newElement.id && oldElement.id === newElement.id) {
    score += 100;
  }

  // Same tag name
  if (oldElement.tagName === newElement.tagName) {
    score += 10;
  }

  // Class overlap
  if (oldElement.classes.length > 0 && newElement.classes.length > 0) {
    const oldClasses = new Set(oldElement.classes);
    const newClasses = new Set(newElement.classes);
    const intersection = [...oldClasses].filter(c => newClasses.has(c));
    const union = new Set([...oldClasses, ...newClasses]);

    if (union.size > 0) {
      score += (intersection.length / union.size) * 50;
    }
  }

  // XPath similarity (structural position)
  if (oldElement.xpath && newElement.xpath) {
    const oldDepth = oldElement.xpath.split('/').length;
    const newDepth = newElement.xpath.split('/').length;
    const depthDiff = Math.abs(oldDepth - newDepth);

    if (depthDiff === 0) {
      score += 20;
    } else if (depthDiff <= 2) {
      score += 10;
    }
  }

  return score;
}

/**
 * Match elements using simple selector matching
 */
export function matchElements(oldElements, newElements) {
  const matches = [];
  const matchedNewIndices = new Set();

  oldElements.forEach((oldEl, oldIndex) => {
    let bestMatch = null;
    let bestScore = 0;

    newElements.forEach((newEl, newIndex) => {
      // Skip if already matched
      if (matchedNewIndices.has(newIndex)) {
        return;
      }

      const score = calculateSimilarity(oldEl, newEl);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = { element: newEl, index: newIndex };
      }
    });

    // Only accept matches with reasonable confidence
    if (bestMatch && bestScore >= 30) {
      matches.push({
        old: oldEl,
        new: bestMatch.element,
        matchScore: bestScore,
        oldIndex,
        newIndex: bestMatch.index
      });
      matchedNewIndices.add(bestMatch.index);
    } else {
      // No match found
      matches.push({
        old: oldEl,
        new: null,
        matchScore: 0,
        oldIndex,
        newIndex: null
      });
    }
  });

  return matches;
}

/**
 * Match elements by exact selector
 * (simpler, more deterministic approach)
 */
export function matchElementsBySelector(oldElements, newElements) {
  const matches = [];
  const newElementMap = new Map();

  // Create a map of new elements by selector
  newElements.forEach((el, index) => {
    if (!newElementMap.has(el.selector)) {
      newElementMap.set(el.selector, []);
    }
    newElementMap.get(el.selector).push({ element: el, index });
  });

  // Match old elements
  oldElements.forEach((oldEl, oldIndex) => {
    const matchingNew = newElementMap.get(oldEl.selector);

    if (matchingNew && matchingNew.length > 0) {
      // Take the first matching element
      const match = matchingNew.shift();

      matches.push({
        old: oldEl,
        new: match.element,
        matchScore: 100,
        oldIndex,
        newIndex: match.index
      });
    } else {
      // No exact match found
      matches.push({
        old: oldEl,
        new: null,
        matchScore: 0,
        oldIndex,
        newIndex: null
      });
    }
  });

  return matches;
}

/**
 * Get matching strategy
 */
export function getMatchingStrategy(strategy = 'selector') {
  switch (strategy) {
    case 'selector':
      return matchElementsBySelector;
    case 'similarity':
      return matchElements;
    default:
      return matchElementsBySelector;
  }
}

export default {
  matchElements,
  matchElementsBySelector,
  getMatchingStrategy,
  calculateSimilarity
};
