/**
 * Color processing functions for Google Maps style conversion
 * Handles color extraction, adjustment, and application to style objects
 */

import {
  extractColor,
  normalizeHex,
  applyGamma,
} from "../utils/color-utils.js";
import {
  getExternalAdjustments,
  applyColorAdjustments,
} from "./hsl-adjustments.js";
import {
  supportsGeometry,
  supportsLabel,
  isValidGeometryProperty,
  isValidLabelProperty,
  mapGeometryColor,
  ensureRequiredElements,
} from "./feature-properties.js";
import { getV2PropertyPath } from "./mapping.js";
import {
  ensureSection,
  getOrCreateStyle,
  convertWeight,
} from "./style-utils.js";

/**
 * Applies weight/strokeWidth to a style if the feature supports it
 * @param {Object} style - Style object to modify
 * @param {string} id - V2 feature ID
 * @param {string|number|undefined} weight - Weight value from styler
 * @returns {boolean} True if weight was successfully applied, false otherwise
 */
export const applyWeightToStyle = (style, id, weight) => {
  if (weight === undefined || weight === null) {
    return false;
  }

  if (!supportsGeometry(id)) {
    return false;
  }

  if (!isValidGeometryProperty(id, "strokeWidth")) {
    return false;
  }

  const convertedWeight = convertWeight(weight);
  if (convertedWeight !== null) {
    ensureSection(style, "geometry").strokeWidth = convertedWeight;
    return true;
  }

  return false;
};

/**
 * Applies gamma adjustment to a color if present
 * @param {string|null} color - Color to adjust, or null
 * @param {string|number|undefined} gamma - Gamma value
 * @param {string} fallbackColor - Fallback color if color is null
 * @returns {string|null} Adjusted color or null
 */
export const applyGammaIfPresent = (color, gamma, fallbackColor = null) => {
  if (gamma === undefined || gamma === null) return color;

  if (color !== null) {
    return applyGamma(color, gamma);
  }

  if (fallbackColor) {
    return applyGamma(fallbackColor, gamma);
  }

  return null;
};

/**
 * Processes color with HSL and gamma adjustments
 * @param {Object} mergedStyler - Merged styler object
 * @param {Object|null} externalAdjustments - External HSL adjustments
 * @param {string|null} existingColor - Existing color to adjust if no explicit color
 * @returns {string|null} Processed color or null
 */
export const processColor = (
  mergedStyler,
  externalAdjustments,
  existingColor = null
) => {
  let color = extractColor(mergedStyler, externalAdjustments);

  const hasHslAdjustments =
    mergedStyler.saturation !== undefined ||
    mergedStyler.lightness !== undefined;

  if (color === null && hasHslAdjustments && existingColor) {
    color = applyColorAdjustments(
      existingColor,
      mergedStyler.lightness,
      mergedStyler.saturation,
      externalAdjustments
    );
  }

  return applyGammaIfPresent(color, mergedStyler.gamma, existingColor);
};

/**
 * Sets visibility to true when color is applied (if visibility wasn't explicitly set)
 * @param {Object} style - Style object
 * @param {string} section - Section name ('geometry' or 'label')
 * @param {Object} mergedStyler - Merged styler object
 */
export const setVisibilityOnColor = (style, section, mergedStyler) => {
  if (mergedStyler.visibility === undefined) {
    const sectionObj = ensureSection(style, section);
    if (sectionObj.visible === undefined) {
      sectionObj.visible = true;
    }
  }
};

/**
 * Processes geometry color properties
 * @param {Object} mergedStyler - Merged styler object
 * @param {string} id - Feature ID
 * @param {string} property - Property name
 * @param {string} targetProperty - Target property name
 * @param {Object} style - Style object
 * @param {boolean} isGeneralRule - Whether this is a general rule
 * @param {boolean} hasExplicitColor - Whether rule has explicit color
 * @param {boolean} hasHslAdjustments - Whether rule has HSL adjustments
 * @param {Map} hslAdjustmentsMap - Map of HSL adjustments
 */
export const processGeometryColor = (
  mergedStyler,
  id,
  property,
  targetProperty,
  style,
  isGeneralRule,
  hasExplicitColor,
  hasHslAdjustments,
  hslAdjustmentsMap
) => {
  const normalizedColor = hasExplicitColor
    ? normalizeHex(mergedStyler.color)
    : null;

  const externalAdjustments = getExternalAdjustments(
    isGeneralRule,
    hasExplicitColor,
    hasHslAdjustments,
    normalizedColor,
    id,
    hslAdjustmentsMap
  );

  const geometry = ensureSection(style, "geometry");
  const existingColor = geometry[targetProperty];
  const color = processColor(mergedStyler, externalAdjustments, existingColor);

  if (color !== null) {
    geometry[targetProperty] = color;
    setVisibilityOnColor(style, "geometry", mergedStyler);
  }
};

/**
 * Processes label color properties
 * @param {Object} mergedStyler - Merged styler object
 * @param {string} id - Feature ID
 * @param {string} property - Property name
 * @param {Object} style - Style object
 * @param {boolean} isGeneralRule - Whether this is a general rule
 * @param {boolean} hasExplicitColor - Whether rule has explicit color
 * @param {boolean} hasHslAdjustments - Whether rule has HSL adjustments
 * @param {Set} iconVisibilityOffSet - Set of feature IDs with icons disabled
 * @param {Map} hslAdjustmentsMap - Map of HSL adjustments
 */
export const processLabelColor = (
  mergedStyler,
  id,
  property,
  style,
  isGeneralRule,
  hasExplicitColor,
  hasHslAdjustments,
  iconVisibilityOffSet,
  hslAdjustmentsMap
) => {
  if (property === "pinFillColor" && iconVisibilityOffSet?.has(id)) {
    return;
  }

  const normalizedColor = hasExplicitColor
    ? normalizeHex(mergedStyler.color)
    : null;

  const externalAdjustments = getExternalAdjustments(
    isGeneralRule,
    hasExplicitColor,
    hasHslAdjustments,
    normalizedColor,
    id,
    hslAdjustmentsMap
  );

  const label = ensureSection(style, "label");
  const existingColor = label[property];
  const color = processColor(mergedStyler, externalAdjustments, existingColor);

  if (color !== null) {
    label[property] = color;
    setVisibilityOnColor(style, "label", mergedStyler);
  }
};

/**
 * Applies color adjustments to existing colors when no explicit color is provided
 * @param {Object} mergedStyler - Merged styler object
 * @param {Object} style - Style object
 * @param {string} section - Section name ('geometry' or 'label')
 * @param {string} property - Property name
 * @param {Object|null} externalAdjustments - External HSL adjustments
 */
export const applyAdjustmentsToExistingColor = (
  mergedStyler,
  style,
  section,
  property,
  externalAdjustments
) => {
  const sectionObj = ensureSection(style, section);
  const existingColor = sectionObj[property];
  if (!existingColor) return;

  let adjustedColor = existingColor;

  const hasHslAdjustments =
    mergedStyler.saturation !== undefined ||
    mergedStyler.lightness !== undefined;

  if (hasHslAdjustments) {
    adjustedColor = applyColorAdjustments(
      adjustedColor,
      mergedStyler.lightness,
      mergedStyler.saturation,
      externalAdjustments
    );
  }

  adjustedColor = applyGammaIfPresent(adjustedColor, mergedStyler.gamma);
  sectionObj[property] = adjustedColor;
};

/**
 * Applies adjustments to existing colors when no explicit color is provided
 * @param {Object} style - Style object to modify
 * @param {string} id - V2 feature ID
 * @param {Object} mergedStyler - Merged styler object with HSL/gamma adjustments
 * @param {Object} externalAdjustments - External HSL adjustments from feature-level rules
 */
const applyAdjustmentsToFeatureColors = (
  style,
  id,
  mergedStyler,
  externalAdjustments
) => {
  if (supportsGeometry(id)) {
    const targetProperty = mapGeometryColor(id);
    if (isValidGeometryProperty(id, targetProperty)) {
      applyAdjustmentsToExistingColor(
        mergedStyler,
        style,
        "geometry",
        targetProperty,
        externalAdjustments
      );
    }
  }

  if (supportsLabel(id)) {
    const labelColorProps = ["textFillColor", "pinFillColor"];
    for (const prop of labelColorProps) {
      if (isValidLabelProperty(id, prop)) {
        applyAdjustmentsToExistingColor(
          mergedStyler,
          style,
          "label",
          prop,
          externalAdjustments
        );
      }
    }
  }
};

/**
 * Applies color to geometry properties
 * @param {Object} style - Style object to modify
 * @param {string} id - V2 feature ID
 * @param {string} color - Hex color string (#RRGGBB) to apply
 * @param {Object} mergedStyler - Merged styler object
 */
const applyColorToGeometry = (style, id, color, mergedStyler) => {
  if (!supportsGeometry(id)) return;

  const geometryPaths = getV2PropertyPath("geometry", id);
  if (geometryPaths) {
    const paths = Array.isArray(geometryPaths)
      ? geometryPaths
      : [geometryPaths];
    for (const path of paths) {
      const [, property] = path.split(".");
      const targetProperty =
        property === "color" ? mapGeometryColor(id) : property;
      if (isValidGeometryProperty(id, targetProperty)) {
        ensureSection(style, "geometry")[targetProperty] = color;
        setVisibilityOnColor(style, "geometry", mergedStyler);
      }
    }
  } else {
    const targetProperty = mapGeometryColor(id);
    if (isValidGeometryProperty(id, targetProperty)) {
      ensureSection(style, "geometry")[targetProperty] = color;
      setVisibilityOnColor(style, "geometry", mergedStyler);
    }
  }
};

/**
 * Applies color to label properties
 * @param {Object} style - Style object to modify
 * @param {string} id - V2 feature ID
 * @param {string} color - Hex color string (#RRGGBB) to apply
 * @param {Object} mergedStyler - Merged styler object
 * @param {Set<string>} iconVisibilityOffSet - Set of feature IDs with icons disabled
 */
const applyColorToLabel = (
  style,
  id,
  color,
  mergedStyler,
  iconVisibilityOffSet
) => {
  if (!supportsLabel(id)) return;

  const label = ensureSection(style, "label");
  if (isValidLabelProperty(id, "textFillColor")) {
    label.textFillColor = color;
    setVisibilityOnColor(style, "label", mergedStyler);
  }
  if (
    isValidLabelProperty(id, "pinFillColor") &&
    !iconVisibilityOffSet?.has(id)
  ) {
    label.pinFillColor = color;
    setVisibilityOnColor(style, "label", mergedStyler);
  }
};

/**
 * Processes colors for elementType "all" or undefined
 * @param {Object} mergedStyler - Merged styler object
 * @param {string[]} targetIds - Target feature IDs
 * @param {Map} v2StylesMap - Map of V2 styles
 * @param {boolean} hasExplicitColor - Whether rule has explicit color
 * @param {boolean} hasHslAdjustments - Whether rule has HSL adjustments
 * @param {Set} iconVisibilityOffSet - Set of feature IDs with icons disabled
 * @param {Map} hslAdjustmentsMap - Map of HSL adjustments
 */
export const processAllElementColors = (
  mergedStyler,
  targetIds,
  v2StylesMap,
  hasExplicitColor,
  hasHslAdjustments,
  iconVisibilityOffSet,
  hslAdjustmentsMap
) => {
  const normalizedColor = hasExplicitColor
    ? normalizeHex(mergedStyler.color)
    : null;

  const hasGamma =
    mergedStyler.gamma !== undefined && mergedStyler.gamma !== null;

  for (const id of targetIds) {
    const externalAdjustments = getExternalAdjustments(
      true,
      hasExplicitColor,
      hasHslAdjustments,
      normalizedColor,
      id,
      hslAdjustmentsMap
    );

    let color = extractColor(mergedStyler, externalAdjustments);

    // Handle case where no explicit color but adjustments exist
    if (color === null && (hasHslAdjustments || hasGamma)) {
      const style = getOrCreateStyle(v2StylesMap, id);
      ensureRequiredElements(style, id, null);
      applyAdjustmentsToFeatureColors(
        style,
        id,
        mergedStyler,
        externalAdjustments
      );
      applyWeightToStyle(style, id, mergedStyler.weight);
      continue;
    }

    // Handle case where no color at all, but weight might be present
    if (color === null) {
      if (mergedStyler.weight !== undefined && mergedStyler.weight !== null) {
        const style = getOrCreateStyle(v2StylesMap, id);
        ensureRequiredElements(style, id, null);
        applyWeightToStyle(style, id, mergedStyler.weight);
      }
      continue;
    }

    // Apply gamma adjustment if present
    color = applyGammaIfPresent(color, mergedStyler.gamma);

    const style = getOrCreateStyle(v2StylesMap, id);
    ensureRequiredElements(style, id, null);

    // Apply color to geometry and label properties
    applyColorToGeometry(style, id, color, mergedStyler);
    applyColorToLabel(style, id, color, mergedStyler, iconVisibilityOffSet);

    // Handle weight property for features that support strokeWidth
    applyWeightToStyle(style, id, mergedStyler.weight);
  }
};
