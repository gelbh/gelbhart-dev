/**
 * Color conversion utilities for Google Maps V1 to V2 style conversion
 * Handles HSL adjustments and color normalization
 */

/**
 * Converts a decimal value to a two-digit hex string
 * @param {number} value - Decimal value (0-255)
 * @returns {string} Two-digit hex string
 */
const toHex = (value) => {
  const hex = Math.round(value).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};

/**
 * Converts hex color to HSL
 * @param {string} hex - Hex color string (#RRGGBB)
 * @returns {{h: number, s: number, l: number}} HSL values (0-360 for h, 0-100 for s and l)
 */
export function hexToHsl(hex) {
  const normalized = normalizeHex(hex);
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL to hex color
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color string (#RRGGBB)
 */
export function hslToHex(h, s, l) {
  // Normalize and clamp inputs to valid ranges
  h = ((h % 360) + 360) % 360; // Normalize hue to 0-360
  s = Math.max(0, Math.min(100, s)); // Clamp saturation to 0-100
  l = Math.max(0, Math.min(100, l)); // Clamp lightness to 0-100

  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  // Clamp RGB values to 0-255 range before converting to hex
  const clampRgb = (value) =>
    Math.max(0, Math.min(255, Math.round(value * 255)));
  return `#${toHex(clampRgb(r))}${toHex(clampRgb(g))}${toHex(clampRgb(b))}`;
}

/**
 * Applies HSL adjustment to a single component
 * @param {number} value - Current HSL component value (0-100)
 * @param {number|string} adjustment - Adjustment value (-100 to 100)
 * @returns {number} Adjusted value clamped to 0-100
 */
const applyHslComponent = (value, adjustment) => {
  if (adjustment === undefined || adjustment === null) return value;
  const adjust = parseFloat(adjustment);
  return Number.isNaN(adjust)
    ? value
    : Math.max(0, Math.min(100, value + adjust));
};

/**
 * Applies gamma adjustment to a hex color
 * Gamma adjusts the brightness curve: output = (input / 255) ^ (1 / gamma) * 255
 * @param {string} baseColor - Base hex color (#RRGGBB)
 * @param {number|string} gamma - Gamma value (typically 0.01 to 10.0)
 * @returns {string} Adjusted hex color (#RRGGBB)
 */
export function applyGamma(baseColor, gamma) {
  if (gamma === undefined || gamma === null) return baseColor;
  const gammaValue = parseFloat(gamma);
  if (Number.isNaN(gammaValue) || gammaValue <= 0 || gammaValue > 100)
    return baseColor;

  const normalized = normalizeHex(baseColor);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  const gammaCorrection = 1 / gammaValue;
  const applyGammaToChannel = (channel) => {
    const normalized = channel / 255;
    const corrected = Math.pow(normalized, gammaCorrection);
    return Math.round(Math.max(0, Math.min(255, corrected * 255)));
  };

  const correctedR = applyGammaToChannel(r);
  const correctedG = applyGammaToChannel(g);
  const correctedB = applyGammaToChannel(b);

  return `#${toHex(correctedR)}${toHex(correctedG)}${toHex(correctedB)}`;
}

/**
 * Applies V1 lightness and saturation adjustments to a base color
 * @param {string} baseColor - Base hex color (#RRGGBB)
 * @param {number|string} lightness - Lightness adjustment (-100 to 100)
 * @param {number|string} saturation - Saturation adjustment (-100 to 100)
 * @returns {string} Adjusted hex color (#RRGGBB)
 */
export function applyHslAdjustments(baseColor, lightness, saturation) {
  const normalized = normalizeHex(baseColor);
  const { h, s: baseS, l: baseL } = hexToHsl(normalized);

  const s = applyHslComponent(baseS, saturation);
  const l = applyHslComponent(baseL, lightness);

  return hslToHex(h, s, l);
}

/**
 * Normalizes hex color to 6-digit format (#RRGGBB)
 * @param {string} hex - Hex color string (may be 3 or 6 digits)
 * @returns {string} Normalized 6-digit hex color (#RRGGBB)
 */
export const normalizeHex = (hex) => {
  if (!hex || typeof hex !== "string") {
    return "#000000";
  }

  let normalized = hex.trim().toLowerCase();

  if (normalized.startsWith("#")) {
    normalized = normalized.slice(1);
  }

  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (normalized.length !== 6 || !/^[0-9a-f]{6}$/.test(normalized)) {
    return "#000000";
  }

  return `#${normalized}`;
};

/**
 * Extracts color from V1 styler object, applying HSL adjustments if present
 * When an explicit color is present in the styler, HSL adjustments from the same styler object
 * are applied to modify the explicit color. External HSL adjustments (from feature-level rules)
 * are then applied after styler-level adjustments.
 * @param {Object} styler - V1 styler object
 * @param {Object} externalAdjustments - Optional external HSL adjustments to apply {saturation?: number, lightness?: number}
 * @returns {string|null} Hex color string (#RRGGBB) or null if no color specified and no HSL adjustments
 */
export const extractColor = (styler, externalAdjustments = null) => {
  const hasExplicitColor = styler?.color !== undefined && styler.color !== null;
  const hasHslAdjustments =
    styler?.lightness !== undefined || styler?.saturation !== undefined;
  const hasExternalAdjustments =
    externalAdjustments &&
    (externalAdjustments.saturation !== undefined ||
      externalAdjustments.lightness !== undefined);

  if (!hasExplicitColor && !hasHslAdjustments && !hasExternalAdjustments) {
    return null;
  }

  if (!hasExplicitColor && (hasHslAdjustments || hasExternalAdjustments)) {
    return null;
  }

  let color = normalizeHex(styler.color);
  const isPureBlack = color === "#000000";
  const isPureWhite = color === "#ffffff";
  const isPureBlackOrWhite = isPureBlack || isPureWhite;

  if (hasHslAdjustments) {
    color = applyHslAdjustments(color, styler.lightness, styler.saturation);
  }

  if (hasExternalAdjustments && (!isPureBlackOrWhite || hasHslAdjustments)) {
    color = applyHslAdjustments(
      color,
      externalAdjustments.lightness,
      externalAdjustments.saturation
    );
  }

  return color;
};
