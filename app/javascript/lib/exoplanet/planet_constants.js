/**
 * Shared constants for planet classification and display
 */

/**
 * Planet type display names
 */
export const PLANET_TYPE_NAMES = {
  terrestrial: "Terrestrial",
  "super-earth": "Super-Earth",
  neptune: "Neptune-like",
  jupiter: "Jupiter-like",
};

/**
 * Bootstrap badge colors for planet types
 */
export const PLANET_TYPE_COLORS = {
  terrestrial: "success",
  "super-earth": "info",
  neptune: "primary",
  jupiter: "warning",
};

/**
 * Get display name for a planet type
 * @param {string} type - Planet type
 * @returns {string} Display name
 */
export function getPlanetTypeName(type) {
  return PLANET_TYPE_NAMES[type] || "Unknown";
}

/**
 * Get badge color for a planet type
 * @param {string} type - Planet type
 * @returns {string} Bootstrap color class
 */
export function getTypeColor(type) {
  return PLANET_TYPE_COLORS[type] || "secondary";
}
