/**
 * Shared constants for Google Maps V1 to V2 style conversion
 */

export const ICON_SHIELD_PATTERNS = [
  "infrastructure.roadNetwork.roadShield",
  "infrastructure.roadNetwork.roadSign",
  "pointOfInterest.recreation.*",
  "pointOfInterest.entertainment.*",
  "pointOfInterest.emergency.*",
  "infrastructure.transitStation.*",
  "pointOfInterest.retail.*",
  "pointOfInterest.service.*",
  "pointOfInterest.foodAndDrink.*",
  "pointOfInterest.transit.*",
  "pointOfInterest.other.school",
];

export const PURE_BLACK = "#000000";
export const PURE_WHITE = "#ffffff";
export const STROKE_WEIGHT_STEP = 0.125;
export const STROKE_WEIGHT_MAX = 8;
export const LIGHTNESS_THRESHOLD = 50;

// UI Constants
export const UI_TIMEOUTS = {
  COPY_FEEDBACK: 2000, // milliseconds
};

// Default filenames
export const DEFAULT_FILENAMES = {
  V2_STYLE: "v2-style.json",
};
