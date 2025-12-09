/**
 * Feature ID manipulation utilities
 * Functions for working with V2 feature IDs and their relationships
 */

import { ICON_SHIELD_PATTERNS } from "lib/google_maps_converter/core/constants";
import { getV2Id, getAllV2Ids } from "lib/google_maps_converter/core/mapping";

/**
 * Gets all parent feature IDs for a given feature ID
 * @param {string} featureId - V2 feature ID
 * @returns {string[]} Array of parent feature IDs (most specific first)
 */
export const getParentFeatureIds = (featureId) => {
  const parents = [];
  const parts = featureId.split(".");
  for (let i = parts.length - 1; i > 0; i--) {
    parents.push(parts.slice(0, i).join("."));
  }
  return parents;
};

/**
 * Gets all child feature IDs for a given parent feature ID
 * @param {string} parentId - Parent V2 feature ID
 * @returns {string[]} Array of child feature IDs (including the parent itself)
 */
export const getChildFeatureIds = (parentId) => {
  const allIds = getAllV2Ids();
  const children = [parentId];
  const prefix = `${parentId}.`;

  for (const id of allIds) {
    if (id.startsWith(prefix)) {
      children.push(id);
    }
  }
  return children;
};

/**
 * Expands feature IDs to include parent and child relationships
 * @param {string} featureType - V1 feature type
 * @returns {string[]} Array of expanded feature IDs
 */
export const expandTargetIds = (featureType) => {
  if (!featureType || featureType === "all") {
    return getAllV2Ids();
  }

  const mappedId = getV2Id(featureType);
  if (!mappedId) return [];

  const ids = Array.isArray(mappedId) ? mappedId : [mappedId];
  const expandedIds = new Set();
  const allFeatureIds = getAllV2Ids();

  for (const id of ids) {
    expandedIds.add(id);

    const isParent = allFeatureIds.some((fid) => fid.startsWith(`${id}.`));
    if (isParent) {
      const children = getChildFeatureIds(id);
      for (const childId of children) {
        expandedIds.add(childId);
      }
    }
  }

  return Array.from(expandedIds);
};

/**
 * Checks if a feature ID matches icon/shield patterns
 * @param {string} id - Feature ID to check
 * @returns {boolean} True if matches icon/shield pattern
 */
export const isIconShieldFeature = (id) => {
  return ICON_SHIELD_PATTERNS.some((pattern) => {
    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -2);
      return id === prefix || id.startsWith(`${prefix}.`);
    }
    return id === pattern;
  });
};
