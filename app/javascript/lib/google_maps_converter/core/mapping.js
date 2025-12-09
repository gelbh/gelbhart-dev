/**
 * Mapping rules for converting Google Maps V1 style JSON to V2 CBMS format
 * Maps featureType and elementType from V1 to V2 structure
 */

import {
  geometryProperties,
  labelProperties,
  isValidGeometryProperty,
  isValidLabelProperty,
} from "./feature-properties.js";
import schemaData from "../schema/cbms-json-schema.js";

/**
 * Gets the schema data
 * @returns {Object} The schema object
 */
function getSchemaData() {
  return schemaData;
}

/**
 * Maps V1 featureType to V2 id
 * Only includes feature IDs that exist in the schema
 * Some features map to arrays to include both parent category and all relevant subtypes
 * @type {Readonly<Object.<string, string|string[]>>}
 */
const featureTypeMap = Object.freeze({
  poi: "pointOfInterest",
  "poi.attraction": [
    "pointOfInterest.entertainment",
    "pointOfInterest.entertainment.touristAttraction",
    "pointOfInterest.entertainment.arts",
    "pointOfInterest.entertainment.casino",
    "pointOfInterest.entertainment.cinema",
    "pointOfInterest.entertainment.historic",
    "pointOfInterest.entertainment.museum",
    "pointOfInterest.entertainment.themePark",
  ],
  "poi.business": [
    "pointOfInterest",
    "pointOfInterest.retail",
    "pointOfInterest.retail.grocery",
    "pointOfInterest.retail.shopping",
    "pointOfInterest.service",
    "pointOfInterest.service.atm",
    "pointOfInterest.service.bank",
    "pointOfInterest.service.carRental",
    "pointOfInterest.service.evCharging",
    "pointOfInterest.service.gasStation",
    "pointOfInterest.service.parkingLot",
    "pointOfInterest.service.postOffice",
    "pointOfInterest.service.restStop",
    "pointOfInterest.service.restroom",
    "pointOfInterest.foodAndDrink",
    "pointOfInterest.foodAndDrink.bar",
    "pointOfInterest.foodAndDrink.cafe",
    "pointOfInterest.foodAndDrink.restaurant",
    "pointOfInterest.foodAndDrink.winery",
  ],
  "poi.park": "pointOfInterest.recreation.park",
  "poi.sports_complex": "pointOfInterest.recreation.sportsComplex",
  "poi.place_of_worship": "pointOfInterest.other.placeOfWorship",
  "poi.school": "pointOfInterest.other.school",
  "poi.government": "pointOfInterest.other.government",
  "poi.medical": [
    "pointOfInterest.emergency",
    "pointOfInterest.emergency.hospital",
    "pointOfInterest.emergency.pharmacy",
    "pointOfInterest.emergency.police",
    "pointOfInterest.emergency.fire",
  ],
  administrative: "political",
  "administrative.country": "political.countryOrRegion",
  "administrative.locality": "political.city",
  "administrative.neighborhood": "political.neighborhood",
  "administrative.land_parcel": "political.landParcel",
  "administrative.province": "political.stateOrProvince",
  road: [
    "infrastructure.roadNetwork",
    "infrastructure.roadNetwork.road",
    "infrastructure.roadNetwork.road.arterial",
    "infrastructure.roadNetwork.road.highway",
    "infrastructure.roadNetwork.road.local",
    "infrastructure.roadNetwork.road.noOutlet",
    "infrastructure.roadNetwork.noTraffic",
    "infrastructure.roadNetwork.noTraffic.pedestrianMall",
    "infrastructure.roadNetwork.noTraffic.trail",
    "infrastructure.roadNetwork.noTraffic.trail.paved",
    "infrastructure.roadNetwork.noTraffic.trail.unpaved",
    "infrastructure.roadNetwork.ramp",
    "infrastructure.roadNetwork.parkingAisle",
    "infrastructure.roadNetwork.roadDetail",
    "infrastructure.roadNetwork.roadDetail.surface",
    "infrastructure.roadNetwork.roadDetail.crosswalk",
    "infrastructure.roadNetwork.roadDetail.sidewalk",
    "infrastructure.roadNetwork.roadDetail.intersection",
    "infrastructure.roadNetwork.roadShield",
    "infrastructure.roadNetwork.roadSign",
  ],
  "road.highway": [
    "infrastructure.roadNetwork.road.highway",
    "infrastructure.roadNetwork.ramp",
  ],
  "road.highway.controlled_access": "infrastructure.roadNetwork.road.highway",
  "road.arterial": "infrastructure.roadNetwork.road.arterial",
  "road.local": [
    "infrastructure.roadNetwork.road.local",
    "infrastructure.roadNetwork.road.noOutlet",
    "infrastructure.roadNetwork.noTraffic",
  ],
  landscape: [
    "natural.land",
    "natural.base",
    "infrastructure.urbanArea",
    "infrastructure.businessCorridor",
  ],
  "landscape.man_made": [
    "infrastructure.building",
    "infrastructure.building.commercial",
    "infrastructure.urbanArea",
    "infrastructure.businessCorridor",
  ],
  "landscape.natural": [
    "natural.land",
    "natural.base",
    "natural.island",
    "natural.continent",
    "natural.archipelago",
  ],
  "landscape.natural.landcover": [
    "natural.land.landCover",
    "natural.land.landCover.crops",
    "natural.land.landCover.dryCrops",
    "natural.land.landCover.forest",
    "natural.land.landCover.ice",
    "natural.land.landCover.sand",
    "natural.land.landCover.shrub",
    "natural.land.landCover.tundra",
  ],
  "landscape.natural.terrain": "natural.land",
  water: [
    "natural.water",
    "natural.water.ocean",
    "natural.water.lake",
    "natural.water.river",
    "natural.water.other",
  ],
  transit: ["infrastructure.transitStation", "infrastructure.railwayTrack"],
  "transit.line": ["infrastructure.railwayTrack"],
  "transit.station": [
    "infrastructure.transitStation",
    "infrastructure.transitStation.busStation",
    "infrastructure.transitStation.railStation",
    "infrastructure.transitStation.bicycleShare",
    "infrastructure.transitStation.ferryTerminal",
    "infrastructure.transitStation.funicularStation",
    "infrastructure.transitStation.gondolaStation",
    "infrastructure.transitStation.monorail",
    "infrastructure.transitStation.railStation.subwayStation",
    "infrastructure.transitStation.railStation.tramStation",
    "pointOfInterest.transit.airport",
  ],
  "transit.station.airport": "pointOfInterest.transit.airport",
  "transit.station.bus": "infrastructure.transitStation.busStation",
  "transit.station.rail": "infrastructure.transitStation.railStation",
});

/**
 * Maps V1 elementType to V2 property paths
 * For "geometry" element type, returns a special marker that requires feature-specific handling
 * @type {Readonly<Object.<string, string>>}
 */
const elementTypeMap = Object.freeze({
  "geometry.fill": "geometry.fillColor",
  "geometry.stroke": "geometry.strokeColor",
  geometry: "geometry.color", // Special marker - requires feature-specific handling
  "labels.text.fill": "label.textFillColor",
  "labels.text.stroke": "label.textStrokeColor",
  "labels.icon": "label.pinFillColor",
  labels: "label.textFillColor", // For color operations; visibility handled separately
  "labels.text": "label.textFillColor", // For color operations; visibility handled separately
});

/**
 * Maps V1 visibility values to V2 boolean
 * @type {Readonly<Object.<string, boolean>>}
 */
const visibilityMap = Object.freeze({
  on: true,
  off: false,
  simplified: true,
});

/**
 * Gets V2 id from V1 featureType
 * @param {string} featureType - V1 featureType
 * @returns {string|string[]|null} V2 id(s) or null if not mapped
 */
export const getV2Id = (featureType) =>
  !featureType || featureType === "all"
    ? null
    : featureTypeMap[featureType] ?? null;

/**
 * Gets V2 property path(s) from V1 elementType
 * For "geometry" element type, returns an array of property paths based on feature capabilities
 * @param {string} elementType - V1 elementType
 * @param {string} [featureId] - Optional V2 feature ID for feature-specific mapping
 * @returns {string|string[]|null} V2 property path(s) or null if not mapped
 */
export const getV2PropertyPath = (elementType, featureId = null) => {
  if (!elementType || elementType === "all") {
    return null;
  }

  const basePath = elementTypeMap[elementType];
  if (!basePath) {
    return null;
  }

  // Special handling for "geometry" element type - requires feature-specific logic
  if (elementType === "geometry" && featureId) {
    return getGeometryPropertyPaths(featureId);
  }

  return basePath;
};

/**
 * Gets the appropriate geometry property path(s) for a feature
 * Returns array of property paths based on what the feature supports
 * @param {string} featureId - V2 feature ID
 * @returns {string[]} Array of property paths
 */
function getGeometryPropertyPaths(featureId) {
  // political.border uses "color" instead of fillColor/strokeColor
  if (featureId === "political.border") {
    return ["geometry.color"];
  }

  const hasFill = isValidGeometryProperty(featureId, "fillColor");
  const hasStroke = isValidGeometryProperty(featureId, "strokeColor");

  const paths = [];
  if (hasFill) {
    paths.push("geometry.fillColor");
  }
  if (hasStroke) {
    paths.push("geometry.strokeColor");
  }

  // If neither fill nor stroke, fall back to fillColor (shouldn't happen, but safe fallback)
  if (paths.length === 0) {
    paths.push("geometry.fillColor");
  }

  return paths;
}

/**
 * Gets V2 visibility boolean from V1 visibility value
 * @param {string} visibility - V1 visibility value
 * @returns {boolean|null} V2 visibility boolean or null if not mapped
 */
export const getV2Visibility = (visibility) => {
  if (visibility === undefined || visibility === null) {
    return null;
  }
  const normalized = String(visibility).toLowerCase();
  return visibilityMap[normalized] ?? null;
};

/**
 * Extracts all feature IDs from the V2 CBMS schema
 * Parses the schema to find all "const" values in id fields
 * @returns {readonly string[]} Array of all feature IDs from the schema
 */
const extractAllFeatureIdsFromSchema = () => {
  const schema = getSchemaData();
  const featureIds = new Set();
  const stylesSchema = schema?.properties?.styles;

  for (const item of stylesSchema?.items?.oneOf ?? []) {
    const featureId = item?.properties?.id?.const;
    if (featureId) {
      featureIds.add(featureId);
    }
  }

  return Array.from(featureIds).sort();
};

// Cache for feature IDs - initialized lazily on first access
// This allows the schema to load asynchronously before extraction
let cachedAllFeatureIds = null;

/**
 * Gets all V2 ids that should be affected by 'all' featureType
 * Returns all feature IDs from the schema to ensure "all" rules apply
 * to every feature ID defined in the V2 CBMS format (124 total)
 * @returns {readonly string[]} Array of all V2 ids
 */
export const getAllV2Ids = () => {
  if (cachedAllFeatureIds === null) {
    try {
      cachedAllFeatureIds = Object.freeze(extractAllFeatureIdsFromSchema());
    } catch (error) {
      console.warn("Schema not ready:", error);
      return [];
    }
  }
  return cachedAllFeatureIds;
};
