/**
 * Style utility functions for Google Maps style conversion
 * General utility functions for style manipulation
 */

import { STROKE_WEIGHT_STEP, STROKE_WEIGHT_MAX } from "lib/google_maps_converter/core/constants";
import {
  supportsGeometry,
  supportsLabel,
  isValidGeometryProperty,
  isValidLabelProperty,
} from "lib/google_maps_converter/core/feature-properties";
import { getV2Id } from "lib/google_maps_converter/core/mapping";

/**
 * Converts V1 weight to V2 strokeWidth
 * @param {string|number} weight - V1 weight value
 * @returns {number|null} V2 strokeWidth (0-8, multiple of 0.125) or null if invalid
 */
export const convertWeight = (weight) => {
  if (weight === undefined || weight === null) return null;

  const numWeight = parseFloat(weight);
  if (Number.isNaN(numWeight)) return null;

  const clamped = Math.max(0, Math.min(STROKE_WEIGHT_MAX, numWeight));
  return Math.round(clamped / STROKE_WEIGHT_STEP) * STROKE_WEIGHT_STEP;
};

/**
 * Validates featureType and elementType are strings (or null/undefined)
 * @param {*} featureType - Feature type to validate
 * @param {*} elementType - Element type to validate
 * @returns {boolean} True if valid
 */
export const validateRuleTypes = (featureType, elementType) => {
  if (
    featureType !== undefined &&
    featureType !== null &&
    typeof featureType !== "string"
  ) {
    return false;
  }
  if (
    elementType !== undefined &&
    elementType !== null &&
    typeof elementType !== "string"
  ) {
    return false;
  }
  return true;
};

/**
 * Gets or creates a style object for a feature ID
 * @param {Map} v2StylesMap - Map of feature IDs to styles
 * @param {string} id - Feature ID
 * @returns {Object} Style object
 */
export const getOrCreateStyle = (v2StylesMap, id) => {
  let style = v2StylesMap.get(id);
  if (!style) {
    style = { id };
    v2StylesMap.set(id, style);
  }
  return style;
};

/**
 * Ensures a style section exists and returns it
 * @param {Object} style - Style object
 * @param {string} section - Section name ('geometry' or 'label')
 * @returns {Object} Section object
 */
export const ensureSection = (style, section) => {
  style[section] ??= {};
  return style[section];
};

/**
 * Cleans up V2 styles by ensuring required elements are present and removing unsupported elements
 * @param {Object} style - V2 style object
 * @returns {Object} Cleaned style object or null if style should be removed
 */
export const cleanupStyle = (style) => {
  const cleaned = { id: style.id };
  const hasGeometry = supportsGeometry(style.id);
  const hasLabel = supportsLabel(style.id);

  if (hasGeometry && style.geometry && Object.keys(style.geometry).length > 0) {
    const cleanedGeometry = {};
    for (const [key, value] of Object.entries(style.geometry)) {
      if (isValidGeometryProperty(style.id, key)) {
        cleanedGeometry[key] = value;
      }
    }
    if (Object.keys(cleanedGeometry).length > 0) {
      cleaned.geometry = cleanedGeometry;
    }
  }

  if (hasLabel && style.label && Object.keys(style.label).length > 0) {
    const cleanedLabel = {};
    for (const [key, value] of Object.entries(style.label)) {
      if (isValidLabelProperty(style.id, key)) {
        cleanedLabel[key] = value;
      }
    }
    if (Object.keys(cleanedLabel).length > 0) {
      cleaned.label = cleanedLabel;
    }
  }

  if (!cleaned.geometry && !cleaned.label) {
    return null;
  }

  return cleaned;
};

/**
 * Sets default visibility for transit POI if not explicitly targeted
 * @param {Map} v2StylesMap - Map of V2 styles
 * @param {Set} directlyMappedIds - Set of explicitly targeted feature IDs
 */
export const setDefaultTransitVisibility = (v2StylesMap, directlyMappedIds) => {
  const transitPoiId = "pointOfInterest.transit";
  // Only set to off if it wasn't directly mapped by a v1 featureType
  // (pointOfInterest.transit is not directly mapped by any v1 featureType currently,
  // so it would only be created through parent expansion like poi -> pointOfInterest -> pointOfInterest.transit)
  if (!v2StylesMap.has(transitPoiId) || directlyMappedIds.has(transitPoiId)) {
    return;
  }

  const transitStyle = v2StylesMap.get(transitPoiId);

  // Force visibility to false for both geometry and label when created through expansion
  if (transitStyle.geometry) {
    transitStyle.geometry.visible = false;
  } else if (supportsGeometry(transitPoiId)) {
    transitStyle.geometry = { visible: false };
  }

  if (transitStyle.label) {
    transitStyle.label.visible = false;
  } else if (supportsLabel(transitPoiId)) {
    transitStyle.label = { visible: false };
  }
};

/**
 * Tracks directly mapped feature IDs from rules (not expanded children)
 * Only tracks IDs that are directly mapped from v1 featureTypes, not those
 * included through parent expansion
 * @param {Array} rules - Array of V1 rules
 * @returns {Set} Set of directly mapped feature IDs
 */
export const trackDirectlyMappedIds = (rules) => {
  const directlyMappedIds = new Set();
  for (const rule of rules) {
    if (!rule.featureType || rule.featureType === "all") {
      continue; // Skip "all" rules as they don't directly map to specific features
    }
    const mappedId = getV2Id(rule.featureType);
    if (!mappedId) continue;

    // Only track the direct mappings, not expanded children
    const ids = Array.isArray(mappedId) ? mappedId : [mappedId];
    for (const id of ids) {
      directlyMappedIds.add(id);
    }
  }
  return directlyMappedIds;
};

/**
 * Separates rules into label icon visibility rules and other rules
 * @param {Array} v1Styles - Array of V1 style rules
 * @returns {Object} Object with labelsIconVisibilityRules and otherRules arrays
 */
export const separateRules = (v1Styles) => {
  const labelsIconVisibilityRules = [];
  const otherRules = [];

  for (const rule of v1Styles) {
    if (
      rule.elementType === "labels.icon" &&
      rule.stylers?.some((s) => s.visibility !== undefined)
    ) {
      labelsIconVisibilityRules.push(rule);
    } else {
      otherRules.push(rule);
    }
  }

  return { labelsIconVisibilityRules, otherRules };
};
