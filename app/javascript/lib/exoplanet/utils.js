/**
 * Shared utility functions for the exoplanet viewer
 */

/**
 * Generate a hash code from a string for seeded random generation
 * @param {string} str - Input string
 * @returns {number} Hash code
 */
export function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Create a seeded random number generator
 * @param {number} seed - Seed value
 * @returns {function} Function that returns random numbers between 0 and 1
 */
export function seededRandom(seed) {
  let value = seed;
  return function () {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Get star color based on spectral type and temperature
 * @param {Object} stellarData - Stellar data object
 * @param {string} stellarData.spectralType - Spectral classification (e.g., "G2V")
 * @param {number} stellarData.stellarTemp - Stellar temperature in Kelvin
 * @returns {number} Color as hex value
 */
export function getStarColor(stellarData) {
  // Try spectral type first
  if (stellarData.spectralType) {
    const typeChar = stellarData.spectralType.charAt(0).toUpperCase();
    const spectralColors = {
      O: 0x9bb0ff, // Blue
      B: 0xaabfff, // Blue-white
      A: 0xcad7ff, // White
      F: 0xf8f7ff, // Yellow-white
      G: 0xfff4e8, // Yellow (like our Sun)
      K: 0xffd2a1, // Orange
      M: 0xffbd6f, // Red
    };
    if (spectralColors[typeChar]) return spectralColors[typeChar];
  }

  // Fallback to temperature-based color
  const temp = stellarData.stellarTemp || stellarData.temperature || 5778;
  if (temp > 10000) return 0xaabbff; // Hot blue
  if (temp > 7500) return 0xccddff; // Blue-white
  if (temp > 6000) return 0xffffff; // White
  if (temp > 5000) return 0xffd700; // Yellow
  if (temp > 3500) return 0xffaa66; // Orange
  return 0xff6644; // Cool red
}

/**
 * Format distance with appropriate units (light-years or AU)
 * @param {number} distanceLightYears - Distance in light years
 * @returns {string} Formatted distance string
 */
export function formatDistance(distanceLightYears) {
  if (!distanceLightYears || distanceLightYears === 0) {
    return "1 AU (Sun)";
  }

  // If distance is less than 0.01 light years, show in AU
  // 1 light year ≈ 63,241 AU
  if (distanceLightYears < 0.01) {
    const distanceAU = (distanceLightYears * 63241).toFixed(0);
    return `${distanceAU} AU`;
  }

  // Otherwise show in light years
  return `${distanceLightYears.toFixed(1)} ly`;
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Dispose of a Three.js Object3D and all its resources
 * @param {THREE.Object3D} object - Object to dispose
 * @param {THREE.Scene} scene - Scene to remove object from
 */
export function disposeObject3D(object, scene) {
  if (!object) return;

  if (scene) {
    scene.remove(object);
  }

  // Dispose geometry
  if (object.geometry) {
    object.geometry.dispose();
  }

  // Dispose material(s)
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    } else {
      if (object.material.map) object.material.map.dispose();
      object.material.dispose();
    }
  }

  // Traverse children and dispose
  if (object.traverse) {
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
