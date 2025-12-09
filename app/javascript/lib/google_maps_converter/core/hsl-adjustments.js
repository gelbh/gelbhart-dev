/**
 * HSL adjustment handling for Google Maps style conversion
 * Manages HSL adjustments and their application to colors
 */

import { applyHslAdjustments } from "lib/google_maps_converter/utils/color-utils";
import { PURE_BLACK, PURE_WHITE } from "lib/google_maps_converter/core/constants";
import { getParentFeatureIds } from "lib/google_maps_converter/core/feature-id-utils";

/**
 * Gets HSL adjustments for a feature ID, merging from feature and all applicable parents
 * @param {string} featureId - V2 feature ID
 * @param {Map} hslAdjustmentsMap - Map of feature ID to HSL adjustments
 * @returns {Object|null} Merged HSL adjustments object or null
 */
export const getHslAdjustments = (featureId, hslAdjustmentsMap) => {
  const adjustments = {};
  let hasAdjustments = false;

  const parents = getParentFeatureIds(featureId);
  for (const parentId of parents) {
    const parentAdjustments = hslAdjustmentsMap.get(parentId);
    if (parentAdjustments) {
      if (parentAdjustments.saturation !== undefined) {
        adjustments.saturation = parentAdjustments.saturation;
        hasAdjustments = true;
      }
      if (parentAdjustments.lightness !== undefined) {
        adjustments.lightness = parentAdjustments.lightness;
        hasAdjustments = true;
      }
    }
  }

  const featureAdjustments = hslAdjustmentsMap.get(featureId);
  if (featureAdjustments) {
    if (featureAdjustments.saturation !== undefined) {
      adjustments.saturation = featureAdjustments.saturation;
      hasAdjustments = true;
    }
    if (featureAdjustments.lightness !== undefined) {
      adjustments.lightness = featureAdjustments.lightness;
      hasAdjustments = true;
    }
  }

  return hasAdjustments ? adjustments : null;
};

/**
 * Determines if external HSL adjustments should be applied
 * @param {boolean} isGeneralRule - Whether this is a general rule
 * @param {boolean} hasExplicitColor - Whether rule has explicit color
 * @param {boolean} hasHslAdjustments - Whether rule has HSL adjustments
 * @param {string|null} normalizedColor - Normalized color value
 * @param {string} featureId - Feature ID
 * @param {Map} hslAdjustmentsMap - Map of HSL adjustments
 * @returns {Object|null} External adjustments or null
 */
export const getExternalAdjustments = (
  isGeneralRule,
  hasExplicitColor,
  hasHslAdjustments,
  normalizedColor,
  featureId,
  hslAdjustmentsMap
) => {
  const isPureBlackOrWhite =
    normalizedColor === PURE_BLACK || normalizedColor === PURE_WHITE;

  if (!isGeneralRule && hasExplicitColor) {
    return null;
  }

  if (isPureBlackOrWhite && !hasHslAdjustments) {
    return null;
  }

  return getHslAdjustments(featureId, hslAdjustmentsMap);
};

/**
 * Applies HSL adjustments to an existing color
 * @param {string} existingColor - Existing color value
 * @param {number|undefined} lightness - Lightness adjustment
 * @param {number|undefined} saturation - Saturation adjustment
 * @param {Object|null} externalAdjustments - External HSL adjustments
 * @returns {string} Adjusted color
 */
export const applyColorAdjustments = (
  existingColor,
  lightness,
  saturation,
  externalAdjustments
) => {
  let adjustedColor = applyHslAdjustments(existingColor, lightness, saturation);

  if (externalAdjustments) {
    adjustedColor = applyHslAdjustments(
      adjustedColor,
      externalAdjustments.lightness,
      externalAdjustments.saturation
    );
  }

  return adjustedColor;
};

/**
 * Handles HSL adjustment rules for general element types
 * @param {Object} mergedStyler - Merged styler object
 * @param {string[]} targetIds - Target feature IDs
 * @param {Map} hslAdjustmentsMap - Map of HSL adjustments
 */
export const handleHslAdjustments = (
  mergedStyler,
  targetIds,
  hslAdjustmentsMap
) => {
  const adjustments = {};

  if (mergedStyler.saturation !== undefined) {
    const sat = parseFloat(mergedStyler.saturation);
    if (!Number.isNaN(sat)) adjustments.saturation = sat;
  }

  if (mergedStyler.lightness !== undefined) {
    const light = parseFloat(mergedStyler.lightness);
    if (!Number.isNaN(light)) adjustments.lightness = light;
  }

  if (Object.keys(adjustments).length === 0) return;

  for (const id of targetIds) {
    const existing = hslAdjustmentsMap.get(id);
    hslAdjustmentsMap.set(id, { ...existing, ...adjustments });
  }
};
