/**
 * Visibility processing functions for Google Maps style conversion
 * Handles visibility rules and their application to style objects
 */

import {
  supportsGeometry,
  supportsLabel,
  isValidGeometryProperty,
  isValidLabelProperty,
  ensureRequiredElements,
} from "./feature-properties.js";
import { getV2Visibility } from "./mapping.js";
import { isIconShieldFeature } from "./feature-id-utils.js";
import { ensureSection, getOrCreateStyle } from "./style-utils.js";

/**
 * Handles labels.icon visibility rules
 * @param {string[]} targetIds - Target feature IDs
 * @param {boolean} visible - Visibility value
 * @param {Map} v2StylesMap - Map of V2 styles
 * @param {Set} iconVisibilityOffSet - Set of feature IDs with icons disabled
 */
export const handleLabelsIconVisibility = (
  targetIds,
  visible,
  v2StylesMap,
  iconVisibilityOffSet
) => {
  for (const id of targetIds) {
    if (!supportsLabel(id)) continue;

    if (isIconShieldFeature(id)) {
      const style = getOrCreateStyle(v2StylesMap, id);
      const label = ensureSection(style, "label");
      // For icon/shield features, always apply labels.icon visibility
      // If setting to false, always apply; if setting to true, apply if not already set to false by a more specific rule
      if (label.visible === undefined) {
        label.visible = visible;
      } else if (!visible) {
        // Always set to false if visibility is off
        label.visible = false;
      } else if (visible) {
        // Set to true if visibility is on (allows overriding previous false values from less specific rules)
        label.visible = true;
      }
    } else if (isValidLabelProperty(id, "pinFillColor")) {
      if (!visible) {
        iconVisibilityOffSet.add(id);
        const style = v2StylesMap.get(id);
        if (style?.label?.pinFillColor !== undefined) {
          delete style.label.pinFillColor;
        }
      } else {
        iconVisibilityOffSet.delete(id);
      }
    }
  }
};

/**
 * Determines if geometry visibility should be applied
 * @param {string} elementType - Element type
 * @param {string} id - Feature ID
 * @returns {boolean} True if geometry visibility should be applied
 */
export const shouldApplyGeometryVisibility = (elementType, id) => {
  if (elementType === "geometry.fill") {
    return isValidGeometryProperty(id, "fillColor");
  }
  if (elementType === "geometry.stroke") {
    return isValidGeometryProperty(id, "strokeColor");
  }
  return true;
};

/**
 * Checks if a more specific child feature type has already set visibility
 * @param {string} featureType - Current feature type
 * @param {string} elementType - Element type
 * @param {string} v2Id - V2 feature ID
 * @param {Map} visibilitySourceMap - Map tracking which feature type set visibility
 * @returns {boolean} True if a more specific rule already set visibility
 */
export const hasMoreSpecificVisibility = (
  featureType,
  elementType,
  v2Id,
  visibilitySourceMap
) => {
  if (!featureType) return false;

  for (const [key, sourceFeatureType] of visibilitySourceMap.entries()) {
    if (!key.startsWith(`${v2Id}:`)) continue;

    if (!sourceFeatureType || !sourceFeatureType.startsWith(`${featureType}.`))
      continue;

    const sourceElementType = key.substring(v2Id.length + 1);

    if (!elementType || elementType === "all") {
      return true;
    }

    if (
      sourceElementType === elementType ||
      sourceElementType.startsWith(`${elementType}.`)
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Handles general visibility rules
 * @param {string[]} targetIds - Target feature IDs
 * @param {boolean} visible - Visibility value
 * @param {string} elementType - Element type
 * @param {Map} v2StylesMap - Map of V2 styles
 * @param {string} featureType - Feature type that's setting visibility
 * @param {Map} visibilitySourceMap - Map tracking which feature type set visibility
 */
export const handleGeneralVisibility = (
  targetIds,
  visible,
  elementType,
  v2StylesMap,
  featureType,
  visibilitySourceMap
) => {
  for (const id of targetIds) {
    const key = `${id}:${elementType || "all"}`;

    if (
      hasMoreSpecificVisibility(
        featureType,
        elementType,
        id,
        visibilitySourceMap
      )
    ) {
      continue;
    }

    const style = getOrCreateStyle(v2StylesMap, id);
    const hasGeometry = supportsGeometry(id);
    const hasLabel = supportsLabel(id);
    const shouldApplyGeometry = shouldApplyGeometryVisibility(elementType, id);

    const isGeometryTarget =
      !elementType ||
      elementType === "all" ||
      elementType?.startsWith("geometry");
    const isLabelTarget =
      !elementType ||
      elementType === "all" ||
      elementType?.startsWith("labels");

    if (!hasGeometry && hasLabel) {
      const isGeneralLabelTarget =
        !elementType ||
        elementType === "all" ||
        elementType === "labels" ||
        elementType === "labels.text" ||
        elementType === "labels.icon" ||
        elementType?.startsWith("labels.text") ||
        elementType?.startsWith("labels.icon");

      if (isGeneralLabelTarget) {
        ensureSection(style, "label").visible = visible;
        visibilitySourceMap.set(key, featureType);
      }
    } else if (hasGeometry && !hasLabel) {
      if (isGeometryTarget && shouldApplyGeometry) {
        ensureSection(style, "geometry").visible = visible;
        visibilitySourceMap.set(key, featureType);
      }
    } else if (hasGeometry && elementType?.startsWith("geometry")) {
      // For geometry-specific element types (geometry.fill, geometry.stroke, etc.)
      // Apply visibility to geometry section
      if (shouldApplyGeometry) {
        ensureSection(style, "geometry").visible = visible;
        visibilitySourceMap.set(key, featureType);
      }
    } else {
      ensureRequiredElements(style, id, elementType);

      // Apply geometry visibility if applicable
      if (isGeometryTarget && hasGeometry && shouldApplyGeometry) {
        ensureSection(style, "geometry").visible = visible;
        visibilitySourceMap.set(key, featureType);
      }

      // Apply label visibility if applicable
      // For labels.text, also check if elementType starts with labels.text
      const isLabelTextTarget =
        isLabelTarget ||
        elementType === "labels.text" ||
        elementType?.startsWith("labels.text");
      if (isLabelTextTarget && hasLabel) {
        ensureSection(style, "label").visible = visible;
        visibilitySourceMap.set(key, featureType);
      }
    }
  }
};
