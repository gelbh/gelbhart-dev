/**
 * Core conversion logic for Google Maps V1 to V2 style conversion
 * Converts V1 style JSON (featureType, elementType, stylers) to V2 CBMS format
 */

import {
  getV2PropertyPath,
  getV2Visibility,
} from "lib/google_maps_converter/core/mapping";
import {
  supportsGeometry,
  supportsLabel,
  isValidGeometryProperty,
  isValidLabelProperty,
  mapGeometryColor,
  ensureRequiredElements,
} from "lib/google_maps_converter/core/feature-properties";
import { detectVariant } from "lib/google_maps_converter/core/variant-detection";
import { expandTargetIds } from "lib/google_maps_converter/core/feature-id-utils";
import {
  validateRuleTypes,
  convertWeight,
  getOrCreateStyle,
  ensureSection,
  cleanupStyle,
  setDefaultTransitVisibility,
  trackDirectlyMappedIds,
  separateRules,
} from "lib/google_maps_converter/core/style-utils";
import { handleHslAdjustments } from "lib/google_maps_converter/core/hsl-adjustments";
import {
  handleLabelsIconVisibility,
  handleGeneralVisibility,
} from "lib/google_maps_converter/core/visibility-processing";
import {
  processGeometryColor,
  processLabelColor,
  processAllElementColors,
  applyWeightToStyle,
} from "lib/google_maps_converter/core/color-processing";

// ============================================================================
// Style Processing Functions
// ============================================================================

/**
 * Processes a single V1 style rule and converts it to V2 style objects
 * @param {Object} v1Rule - V1 style rule
 * @param {Map} v2StylesMap - Map to accumulate V2 styles
 * @param {Map} hslAdjustmentsMap - Map to track HSL adjustments per feature type
 * @param {Set} iconVisibilityOffSet - Set of feature IDs where labels.icon visibility is "off"
 * @param {Map} visibilitySourceMap - Map tracking which feature type set visibility
 */
function processV1Rule(
  v1Rule,
  v2StylesMap,
  hslAdjustmentsMap,
  iconVisibilityOffSet = null,
  visibilitySourceMap = null
) {
  const { featureType, elementType, stylers } = v1Rule;

  if (
    !validateRuleTypes(featureType, elementType) ||
    !Array.isArray(stylers) ||
    stylers.length === 0
  ) {
    return;
  }

  const targetIds = expandTargetIds(featureType);
  if (targetIds.length === 0) return;

  const mergedStyler = stylers.reduce((acc, s) => ({ ...acc, ...s }), {});
  const isGeneralElementType = elementType === "all" || !elementType;
  const isGeneralFeatureType = !featureType || featureType === "all";
  // A rule is "general" if either the elementType or featureType is "all"
  // This ensures proper HSL adjustment handling when featureType is "all"
  const isGeneralRule = isGeneralElementType || isGeneralFeatureType;
  const hasExplicitColor =
    mergedStyler.color !== undefined && mergedStyler.color !== null;
  const hasHslAdjustments =
    mergedStyler.saturation !== undefined ||
    mergedStyler.lightness !== undefined;

  if (isGeneralRule && !hasExplicitColor && hasHslAdjustments) {
    handleHslAdjustments(mergedStyler, targetIds, hslAdjustmentsMap);
  }

  if (mergedStyler.visibility !== undefined) {
    const visible = getV2Visibility(mergedStyler.visibility);
    if (visible !== null) {
      if (elementType === "labels.icon") {
        if (iconVisibilityOffSet !== null) {
          handleLabelsIconVisibility(
            targetIds,
            visible,
            v2StylesMap,
            iconVisibilityOffSet
          );
        }
      } else {
        handleGeneralVisibility(
          targetIds,
          visible,
          elementType,
          v2StylesMap,
          featureType || "all",
          visibilitySourceMap
        );
      }
    }
  }

  const propertyPath = getV2PropertyPath(elementType);
  if (propertyPath) {
    // For geometry element type, we need feature-specific paths
    // For label element types, the path is the same for all features
    const needsFeatureSpecificPaths = elementType === "geometry";

    for (const id of targetIds) {
      const propertyPathResult = needsFeatureSpecificPaths
        ? getV2PropertyPath(elementType, id)
        : propertyPath;
      if (!propertyPathResult) continue;

      const propertyPaths = Array.isArray(propertyPathResult)
        ? propertyPathResult
        : [propertyPathResult];

      for (const path of propertyPaths) {
        const [section, property] = path.split(".");

        if (section === "geometry" && !supportsGeometry(id)) continue;
        if (section === "label" && !supportsLabel(id)) continue;

        const style = getOrCreateStyle(v2StylesMap, id);
        ensureRequiredElements(style, id, elementType);

        if (section === "geometry") {
          const isColorProperty =
            property === "fillColor" ||
            property === "strokeColor" ||
            property === "color";
          const targetProperty =
            property === "color" ? mapGeometryColor(id) : property;

          if (isColorProperty && isValidGeometryProperty(id, targetProperty)) {
            processGeometryColor(
              mergedStyler,
              id,
              property,
              targetProperty,
              style,
              isGeneralRule,
              hasExplicitColor,
              hasHslAdjustments,
              hslAdjustmentsMap
            );
          } else if (
            property === "strokeWidth" &&
            isValidGeometryProperty(id, "strokeWidth")
          ) {
            applyWeightToStyle(style, id, mergedStyler.weight);
          }
        } else if (section === "label") {
          const labelColorProps = [
            "textFillColor",
            "textStrokeColor",
            "pinFillColor",
          ];
          if (
            labelColorProps.includes(property) &&
            isValidLabelProperty(id, property)
          ) {
            processLabelColor(
              mergedStyler,
              id,
              property,
              style,
              isGeneralRule,
              hasExplicitColor,
              hasHslAdjustments,
              iconVisibilityOffSet,
              hslAdjustmentsMap
            );
          }
        }
      }

      // Handle weight property for label element types that include "stroke"
      // Weight should be applied to geometry.strokeWidth (not label properties)
      // This applies even when there's no color in the styler
      if (
        mergedStyler.weight !== undefined &&
        mergedStyler.weight !== null &&
        elementType &&
        elementType.includes("stroke")
      ) {
        const style = getOrCreateStyle(v2StylesMap, id);
        applyWeightToStyle(style, id, mergedStyler.weight);
      }
    }
  } else if (isGeneralElementType) {
    // Only use processAllElementColors when elementType is "all" or undefined
    // When featureType is "all" but elementType is specific, use propertyPath branch above
    processAllElementColors(
      mergedStyler,
      targetIds,
      v2StylesMap,
      hasExplicitColor,
      hasHslAdjustments,
      iconVisibilityOffSet,
      hslAdjustmentsMap
    );
  }
}

/**
 * Converts V1 style JSON to V2 CBMS format
 * @param {Array|string} v1Input - V1 style JSON (array or JSON string)
 * @returns {Object} V2 style object with variant and styles array
 */
export function convertV1ToV2(v1Input) {
  let v1Styles;
  try {
    v1Styles = typeof v1Input === "string" ? JSON.parse(v1Input) : v1Input;
  } catch (error) {
    throw new Error(`Invalid JSON input: ${error.message}`);
  }

  if (!Array.isArray(v1Styles)) {
    throw new Error("V1 input must be an array of style rules");
  }

  const variant = detectVariant(v1Styles);
  const v2StylesMap = new Map();
  const hslAdjustmentsMap = new Map();
  const iconVisibilityOffSet = new Set();
  const visibilitySourceMap = new Map();

  const { labelsIconVisibilityRules, otherRules } = separateRules(v1Styles);
  const directlyMappedIds = trackDirectlyMappedIds([
    ...otherRules,
    ...labelsIconVisibilityRules,
  ]);

  for (const rule of otherRules) {
    processV1Rule(
      rule,
      v2StylesMap,
      hslAdjustmentsMap,
      iconVisibilityOffSet,
      visibilitySourceMap
    );
  }

  for (const rule of labelsIconVisibilityRules) {
    processV1Rule(
      rule,
      v2StylesMap,
      hslAdjustmentsMap,
      iconVisibilityOffSet,
      visibilitySourceMap
    );
  }

  setDefaultTransitVisibility(v2StylesMap, directlyMappedIds);

  const styles = Array.from(v2StylesMap.values())
    .map(cleanupStyle)
    .filter((style) => style !== null && (style.geometry || style.label));

  return { variant, styles };
}
