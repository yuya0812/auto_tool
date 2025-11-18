import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileExists, isURL, readText } from './utils/fileHandler.js';

/**
 * Extract computed styles from a page
 */
export async function extractStyles(source, selectors, properties, options = {}) {
  const { logger, timeout = 30000, puppeteerOptions = {} } = options;

  let browser = null;

  try {
    if (logger) logger.debug(`Launching browser...`);

    // Launch browser
    browser = await puppeteer.launch({
      ...puppeteerOptions
    });

    const page = await browser.newPage();

    // Set viewport
    if (puppeteerOptions.defaultViewport) {
      await page.setViewport(puppeteerOptions.defaultViewport);
    }

    if (logger) logger.debug(`Loading source: ${source}`);

    // Load page (URL or HTML file)
    if (isURL(source)) {
      await page.goto(source, {
        waitUntil: 'networkidle2',
        timeout
      });
    } else if (await fileExists(source)) {
      // Convert relative path to absolute path
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const absolutePath = path.resolve(process.cwd(), source);
      const fileUrl = `file://${absolutePath}`;

      if (logger) logger.debug(`Loading local file: ${fileUrl}`);

      await page.goto(fileUrl, {
        waitUntil: 'domcontentloaded',
        timeout
      });
    } else {
      throw new Error(`Invalid source: ${source}. Must be a valid URL or file path.`);
    }

    if (logger) logger.debug(`Page loaded successfully`);

    // Wait a bit for any dynamic content (reduce timeout for local files)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Extract styles
    const extractedData = await page.evaluate((selectorList, propertyList) => {
      const results = [];

      // Helper to get XPath
      function getXPath(element) {
        if (element.id !== '') {
          return `//*[@id="${element.id}"]`;
        }
        if (element === document.body) {
          return '/html/body';
        }

        let ix = 0;
        const siblings = element.parentNode?.childNodes || [];
        for (let i = 0; i < siblings.length; i++) {
          const sibling = siblings[i];
          if (sibling === element) {
            const tagName = element.tagName.toLowerCase();
            return getXPath(element.parentNode) + '/' + tagName + '[' + (ix + 1) + ']';
          }
          if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            ix++;
          }
        }
        return '';
      }

      // If no selectors specified, find all elements with classes or IDs
      let elements = [];
      if (!selectorList || selectorList.length === 0) {
        elements = Array.from(document.querySelectorAll('[class], [id]'));
      } else {
        // Collect elements matching the selectors
        selectorList.forEach(selector => {
          try {
            const matched = document.querySelectorAll(selector);
            elements.push(...Array.from(matched));
          } catch (error) {
            console.warn(`Invalid selector: ${selector}`);
          }
        });
      }

      // Remove duplicates
      elements = [...new Set(elements)];

      // Extract computed styles for each element
      elements.forEach((element, index) => {
        const computedStyle = window.getComputedStyle(element);
        const styles = {};

        // Extract specified properties or all
        if (propertyList && propertyList.length > 0) {
          propertyList.forEach(prop => {
            styles[prop] = computedStyle.getPropertyValue(prop);
          });
        } else {
          // Extract all properties (can be verbose)
          for (let i = 0; i < computedStyle.length; i++) {
            const prop = computedStyle[i];
            styles[prop] = computedStyle.getPropertyValue(prop);
          }
        }

        // Try to generate a unique selector
        let uniqueSelector = '';
        if (element.id) {
          uniqueSelector = `#${element.id}`;
        } else if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\s+/).join('.');
          uniqueSelector = `${element.tagName.toLowerCase()}.${classes}`;
        } else {
          uniqueSelector = element.tagName.toLowerCase();
        }

        results.push({
          selector: uniqueSelector,
          xpath: getXPath(element),
          tagName: element.tagName.toLowerCase(),
          id: element.id || null,
          classes: element.className && typeof element.className === 'string'
            ? element.className.trim().split(/\s+/)
            : [],
          styles
        });
      });

      return results;
    }, selectors, properties);

    if (logger) logger.debug(`Extracted styles from ${extractedData.length} elements`);

    await browser.close();

    return extractedData;

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw new Error(`Failed to extract styles: ${error.message}`);
  }
}

/**
 * Extract styles from both old and new sites
 */
export async function extractStylesFromBothSites(oldSite, newSite, selectors, properties, options = {}) {
  const { logger } = options;

  if (logger) logger.info(`Extracting styles from old site: ${oldSite}`);
  const oldStyles = await extractStyles(oldSite, selectors, properties, options);

  if (logger) logger.info(`Extracting styles from new site: ${newSite}`);
  const newStyles = await extractStyles(newSite, selectors, properties, options);

  return {
    old: oldStyles,
    new: newStyles
  };
}

export default {
  extractStyles,
  extractStylesFromBothSites
};
