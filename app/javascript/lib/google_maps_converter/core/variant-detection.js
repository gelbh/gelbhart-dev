/**
 * Variant detection for Google Maps styles
 * Detects light/dark variant from V1 style data
 */

import { hexToHsl, normalizeHex } from "../utils/color-utils.js";
import { LIGHTNESS_THRESHOLD } from "./constants.js";

/**
 * Detects variant (light/dark) from V1 style data
 * @param {Array} v1Styles - V1 style array
 * @returns {string} 'light' or 'dark'
 */
export const detectVariant = (v1Styles) => {
  if (!Array.isArray(v1Styles) || v1Styles.length === 0) {
    return "light";
  }

  let totalLightness = 0;
  let colorCount = 0;

  for (const style of v1Styles) {
    const stylers = style?.stylers;
    if (!Array.isArray(stylers)) continue;

    for (const styler of stylers) {
      if (styler?.color) {
        const hsl = hexToHsl(normalizeHex(styler.color));
        totalLightness += hsl.l;
        colorCount++;
      }
    }
  }

  if (colorCount === 0) return "light";

  const avgLightness = totalLightness / colorCount;
  return avgLightness < LIGHTNESS_THRESHOLD ? "dark" : "light";
};
