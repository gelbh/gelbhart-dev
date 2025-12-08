/**
 * Feature property whitelist
 * Defines which properties are valid for each V2 feature ID
 * Based on cbms-json-schema.json
 */

import { getParentFeatureIds } from "./feature-id-utils.js";

// Common property arrays to reduce duplication
const COMMON_FILL_PROPERTIES = ["visible", "fillColor", "fillOpacity"];
const COMMON_STROKE_PROPERTIES = [
  "visible",
  "fillColor",
  "fillOpacity",
  "strokeColor",
  "strokeOpacity",
  "strokeWidth",
];
const COMMON_LABEL_PROPERTIES = [
  "visible",
  "pinFillColor",
  "textFillColor",
  "textFillOpacity",
  "textStrokeColor",
  "textStrokeOpacity",
];
const COMMON_TEXT_LABEL_PROPERTIES = [
  "visible",
  "textFillColor",
  "textFillOpacity",
  "textStrokeColor",
  "textStrokeOpacity",
];

/**
 * Valid geometry properties for each feature type
 * @type {Readonly<Object.<string, string[]>>}
 */
export const geometryProperties = Object.freeze({
  // pointOfInterest and sub-features
  pointOfInterest: COMMON_FILL_PROPERTIES,
  "pointOfInterest.emergency": COMMON_FILL_PROPERTIES,
  "pointOfInterest.emergency.fire": [], // Explicitly no geometry
  "pointOfInterest.emergency.hospital": COMMON_FILL_PROPERTIES,
  "pointOfInterest.emergency.pharmacy": [], // Explicitly no geometry
  "pointOfInterest.emergency.police": [], // Explicitly no geometry
  "pointOfInterest.entertainment": [], // Explicitly no geometry
  "pointOfInterest.entertainment.arts": [], // Explicitly no geometry
  "pointOfInterest.entertainment.casino": [], // Explicitly no geometry
  "pointOfInterest.entertainment.cinema": [], // Explicitly no geometry
  "pointOfInterest.entertainment.historic": [], // Explicitly no geometry
  "pointOfInterest.entertainment.museum": [], // Explicitly no geometry
  "pointOfInterest.entertainment.themePark": [], // Explicitly no geometry
  "pointOfInterest.entertainment.touristAttraction": [], // Explicitly no geometry
  "pointOfInterest.foodAndDrink": [], // Explicitly no geometry
  "pointOfInterest.foodAndDrink.bar": [], // Explicitly no geometry
  "pointOfInterest.foodAndDrink.cafe": [], // Explicitly no geometry
  "pointOfInterest.foodAndDrink.restaurant": [], // Explicitly no geometry
  "pointOfInterest.foodAndDrink.winery": [], // Explicitly no geometry
  "pointOfInterest.landmark": [], // Explicitly no geometry
  "pointOfInterest.lodging": [], // Explicitly no geometry
  "pointOfInterest.recreation": COMMON_FILL_PROPERTIES,
  "pointOfInterest.recreation.beach": COMMON_FILL_PROPERTIES,
  "pointOfInterest.recreation.boating": [], // Explicitly no geometry
  "pointOfInterest.recreation.fishing": [], // Explicitly no geometry
  "pointOfInterest.recreation.golfCourse": COMMON_FILL_PROPERTIES,
  "pointOfInterest.recreation.hotSpring": [], // Explicitly no geometry
  "pointOfInterest.recreation.natureReserve": COMMON_FILL_PROPERTIES,
  "pointOfInterest.recreation.park": COMMON_FILL_PROPERTIES,
  "pointOfInterest.recreation.peak": [], // Explicitly no geometry
  "pointOfInterest.recreation.sportsComplex": COMMON_FILL_PROPERTIES,
  "pointOfInterest.recreation.sportsField": COMMON_FILL_PROPERTIES,
  "pointOfInterest.recreation.trailhead": [], // Explicitly no geometry
  "pointOfInterest.recreation.zoo": COMMON_FILL_PROPERTIES,
  "pointOfInterest.retail": [], // Explicitly no geometry
  "pointOfInterest.retail.grocery": [], // Explicitly no geometry
  "pointOfInterest.retail.shopping": [], // Explicitly no geometry
  "pointOfInterest.service": COMMON_FILL_PROPERTIES,
  "pointOfInterest.service.atm": [], // Explicitly no geometry
  "pointOfInterest.service.bank": [], // Explicitly no geometry
  "pointOfInterest.service.carRental": [], // Explicitly no geometry
  "pointOfInterest.service.evCharging": [], // Explicitly no geometry
  "pointOfInterest.service.gasStation": [], // Explicitly no geometry
  "pointOfInterest.service.parkingLot": [], // Explicitly no geometry
  "pointOfInterest.service.postOffice": [], // Explicitly no geometry
  "pointOfInterest.service.restStop": [], // Explicitly no geometry
  "pointOfInterest.service.restroom": [], // Explicitly no geometry
  "pointOfInterest.transit": COMMON_FILL_PROPERTIES,
  "pointOfInterest.transit.airport": COMMON_FILL_PROPERTIES,
  "pointOfInterest.other": COMMON_FILL_PROPERTIES,
  // pointOfInterest.other.placeOfWorship, .school, .government - no geometry, only labels
  "pointOfInterest.other.placeOfWorship": [], // Explicitly no geometry
  "pointOfInterest.other.school": [], // Explicitly no geometry
  "pointOfInterest.other.government": [], // Explicitly no geometry
  "pointOfInterest.other.bridge": [], // Explicitly no geometry
  "pointOfInterest.other.cemetery": [], // Explicitly no geometry
  "pointOfInterest.other.library": [], // Explicitly no geometry
  "pointOfInterest.other.military": [], // Explicitly no geometry
  "pointOfInterest.other.townSquare": [], // Explicitly no geometry

  // political and sub-features
  political: ["visible", "fillColor"],
  // political.countryOrRegion, political.city, political.neighborhood - no geometry, only labels
  "political.countryOrRegion": [], // Explicitly no geometry
  "political.city": [], // Explicitly no geometry
  "political.neighborhood": [], // Explicitly no geometry
  "political.border": ["visible", "color"],
  "political.reservation": ["visible", "fillColor"],
  "political.stateOrProvince": ["visible", "fillColor"],
  "political.sublocality": [], // Explicitly no geometry
  "political.landParcel": [
    "visible",
    "strokeColor",
    "strokeOpacity",
    "strokeWidth",
  ],

  // natural features
  natural: COMMON_FILL_PROPERTIES,
  "natural.continent": [], // Explicitly no geometry
  "natural.archipelago": [], // Explicitly no geometry
  "natural.island": [], // Explicitly no geometry
  "natural.land": COMMON_FILL_PROPERTIES,
  "natural.land.landCover": COMMON_FILL_PROPERTIES,
  "natural.land.landCover.crops": COMMON_FILL_PROPERTIES,
  "natural.land.landCover.dryCrops": COMMON_FILL_PROPERTIES,
  "natural.land.landCover.forest": COMMON_FILL_PROPERTIES,
  "natural.land.landCover.ice": COMMON_FILL_PROPERTIES,
  "natural.land.landCover.sand": COMMON_FILL_PROPERTIES,
  "natural.land.landCover.shrub": COMMON_FILL_PROPERTIES,
  "natural.land.landCover.tundra": COMMON_FILL_PROPERTIES,
  "natural.water": COMMON_FILL_PROPERTIES,
  "natural.water.ocean": [], // Explicitly no geometry
  "natural.water.lake": [], // Explicitly no geometry
  "natural.water.river": [], // Explicitly no geometry
  "natural.water.other": [], // Explicitly no geometry
  "natural.base": COMMON_FILL_PROPERTIES,

  // infrastructure.roadNetwork.road and sub-features
  "infrastructure.roadNetwork.road": COMMON_STROKE_PROPERTIES,
  "infrastructure.roadNetwork.road.highway": COMMON_STROKE_PROPERTIES,
  "infrastructure.roadNetwork.road.arterial": COMMON_STROKE_PROPERTIES,
  "infrastructure.roadNetwork.road.local": COMMON_STROKE_PROPERTIES,
  // infrastructure.roadNetwork.roadDetail and sub-features - no stroke properties
  "infrastructure.roadNetwork.roadDetail": COMMON_FILL_PROPERTIES,
  "infrastructure.roadNetwork.roadDetail.surface": COMMON_FILL_PROPERTIES,
  "infrastructure.roadNetwork.roadDetail.crosswalk": COMMON_FILL_PROPERTIES,
  "infrastructure.roadNetwork.roadDetail.sidewalk": COMMON_FILL_PROPERTIES,
  "infrastructure.roadNetwork.roadDetail.intersection": [], // Explicitly no geometry
  // infrastructure.roadNetwork.roadShield - no geometry, only labels
  "infrastructure.roadNetwork.roadShield": [], // Explicitly no geometry
  // infrastructure.roadNetwork.roadSign - no geometry, only labels
  "infrastructure.roadNetwork.roadSign": [], // Explicitly no geometry
  // infrastructure.roadNetwork.noTraffic and sub-features
  "infrastructure.roadNetwork.noTraffic.pedestrianMall": COMMON_FILL_PROPERTIES,
  // infrastructure.roadNetwork.parkingAisle - geometry only, no labels
  "infrastructure.roadNetwork.parkingAisle": COMMON_STROKE_PROPERTIES,

  // infrastructure.roadNetwork base and sub-features
  "infrastructure.roadNetwork": COMMON_STROKE_PROPERTIES,
  "infrastructure.roadNetwork.noTraffic": COMMON_STROKE_PROPERTIES,
  "infrastructure.roadNetwork.noTraffic.trail": COMMON_STROKE_PROPERTIES,
  "infrastructure.roadNetwork.noTraffic.trail.paved": COMMON_STROKE_PROPERTIES,
  "infrastructure.roadNetwork.noTraffic.trail.unpaved":
    COMMON_STROKE_PROPERTIES,
  "infrastructure.roadNetwork.ramp": COMMON_STROKE_PROPERTIES,
  "infrastructure.roadNetwork.road.noOutlet": COMMON_STROKE_PROPERTIES,

  // infrastructure (general)
  infrastructure: COMMON_STROKE_PROPERTIES,
  "infrastructure.building": COMMON_STROKE_PROPERTIES,
  "infrastructure.building.commercial": COMMON_STROKE_PROPERTIES,
  "infrastructure.businessCorridor": COMMON_FILL_PROPERTIES,
  "infrastructure.urbanArea": COMMON_FILL_PROPERTIES,
  // infrastructure.railwayTrack and sub-features - geometry only, no labels
  "infrastructure.railwayTrack": COMMON_STROKE_PROPERTIES,
  "infrastructure.railwayTrack.commercial": COMMON_STROKE_PROPERTIES,
  "infrastructure.railwayTrack.commuter": COMMON_STROKE_PROPERTIES,
  // infrastructure.transitStation and sub-features - no geometry, only labels
  "infrastructure.transitStation": [], // Explicitly no geometry
  "infrastructure.transitStation.busStation": [], // Explicitly no geometry
  "infrastructure.transitStation.railStation": [], // Explicitly no geometry
  "infrastructure.transitStation.bicycleShare": [], // Explicitly no geometry
  "infrastructure.transitStation.ferryTerminal": [], // Explicitly no geometry
  "infrastructure.transitStation.funicularStation": [], // Explicitly no geometry
  "infrastructure.transitStation.monorail": [], // Explicitly no geometry
  "infrastructure.transitStation.gondolaStation": [], // Explicitly no geometry
  "infrastructure.transitStation.railStation.subwayStation": [], // Explicitly no geometry
  "infrastructure.transitStation.railStation.tramStation": [], // Explicitly no geometry
});

/**
 * Valid label properties for each feature type
 * @type {Readonly<Object.<string, string[]>>}
 */
export const labelProperties = Object.freeze({
  // pointOfInterest and sub-features support pinFillColor
  pointOfInterest: COMMON_LABEL_PROPERTIES,
  "pointOfInterest.emergency": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.emergency.fire": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.emergency.hospital": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.emergency.pharmacy": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.emergency.police": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.entertainment": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.entertainment.arts": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.entertainment.casino": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.entertainment.cinema": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.entertainment.historic": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.entertainment.museum": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.entertainment.themePark": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.entertainment.touristAttraction": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.foodAndDrink": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.foodAndDrink.bar": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.foodAndDrink.cafe": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.foodAndDrink.restaurant": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.foodAndDrink.winery": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.landmark": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.lodging": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.beach": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.boating": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.fishing": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.golfCourse": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.hotSpring": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.natureReserve": COMMON_TEXT_LABEL_PROPERTIES,
  "pointOfInterest.recreation.park": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.peak": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.sportsComplex": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.sportsField": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.trailhead": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.recreation.zoo": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.retail": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.retail.grocery": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.retail.shopping": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.service": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.service.atm": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.service.bank": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.service.carRental": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.service.evCharging": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.service.gasStation": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.service.parkingLot": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.service.postOffice": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.service.restStop": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.service.restroom": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.transit": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.transit.airport": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.other": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.other.placeOfWorship": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.other.school": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.other.government": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.other.bridge": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.other.cemetery": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.other.library": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.other.military": COMMON_LABEL_PROPERTIES,
  "pointOfInterest.other.townSquare": COMMON_TEXT_LABEL_PROPERTIES,

  // political and sub-features support pinFillColor
  political: COMMON_LABEL_PROPERTIES,
  "political.countryOrRegion": COMMON_TEXT_LABEL_PROPERTIES,
  "political.stateOrProvince": COMMON_TEXT_LABEL_PROPERTIES,
  "political.city": COMMON_LABEL_PROPERTIES,
  "political.sublocality": COMMON_TEXT_LABEL_PROPERTIES,
  "political.neighborhood": COMMON_TEXT_LABEL_PROPERTIES,
  "political.border": COMMON_TEXT_LABEL_PROPERTIES,
  "political.reservation": COMMON_TEXT_LABEL_PROPERTIES,
  "political.landParcel": [], // Explicitly no label

  // infrastructure.roadNetwork base and sub-features - no pinFillColor
  "infrastructure.roadNetwork": COMMON_TEXT_LABEL_PROPERTIES,
  "infrastructure.roadNetwork.noTraffic": COMMON_TEXT_LABEL_PROPERTIES,
  "infrastructure.roadNetwork.noTraffic.trail": COMMON_TEXT_LABEL_PROPERTIES,
  "infrastructure.roadNetwork.noTraffic.trail.paved":
    COMMON_TEXT_LABEL_PROPERTIES,
  "infrastructure.roadNetwork.noTraffic.trail.unpaved":
    COMMON_TEXT_LABEL_PROPERTIES,
  "infrastructure.roadNetwork.ramp": COMMON_TEXT_LABEL_PROPERTIES,
  "infrastructure.roadNetwork.road.noOutlet": COMMON_TEXT_LABEL_PROPERTIES,
  // infrastructure.roadNetwork.road does NOT support pinFillColor
  "infrastructure.roadNetwork.road": COMMON_TEXT_LABEL_PROPERTIES,
  "infrastructure.roadNetwork.road.highway": COMMON_TEXT_LABEL_PROPERTIES,
  "infrastructure.roadNetwork.road.arterial": COMMON_TEXT_LABEL_PROPERTIES,
  "infrastructure.roadNetwork.road.local": COMMON_TEXT_LABEL_PROPERTIES,
  // infrastructure.roadNetwork.roadDetail and sub-features
  "infrastructure.roadNetwork.roadDetail": [
    "visible",
    "textFillColor",
    "textFillOpacity",
  ],
  "infrastructure.roadNetwork.roadDetail.surface": [
    "visible",
    "textFillColor",
    "textFillOpacity",
  ],
  "infrastructure.roadNetwork.roadDetail.crosswalk": [], // Explicitly no labels
  "infrastructure.roadNetwork.roadDetail.sidewalk": [], // Explicitly no labels
  "infrastructure.roadNetwork.roadDetail.intersection": ["visible"],
  // infrastructure.roadNetwork.roadShield - label only
  "infrastructure.roadNetwork.roadShield": ["visible"],
  // infrastructure.roadNetwork.roadSign - label only (no textStroke properties)
  "infrastructure.roadNetwork.roadSign": [
    "visible",
    "pinFillColor",
    "textFillColor",
    "textFillOpacity",
  ],
  // infrastructure.roadNetwork.noTraffic and sub-features
  "infrastructure.roadNetwork.noTraffic.pedestrianMall": [], // Explicitly no labels
  // infrastructure.roadNetwork.parkingAisle - no labels, only geometry
  "infrastructure.roadNetwork.parkingAisle": [], // Explicitly no labels

  // infrastructure (general)
  infrastructure: COMMON_LABEL_PROPERTIES,
  "infrastructure.building": COMMON_TEXT_LABEL_PROPERTIES,
  "infrastructure.building.commercial": [], // Explicitly no labels
  "infrastructure.businessCorridor": [], // Explicitly no labels
  "infrastructure.urbanArea": [], // Explicitly no labels

  // infrastructure.railwayTrack and sub-features - no labels, only geometry
  "infrastructure.railwayTrack": [], // Explicitly no labels
  "infrastructure.railwayTrack.commercial": [], // Explicitly no labels
  "infrastructure.railwayTrack.commuter": [], // Explicitly no labels

  // natural supports labels
  natural: COMMON_TEXT_LABEL_PROPERTIES,
  // natural sub-features - label only (no pinFillColor)
  "natural.continent": COMMON_TEXT_LABEL_PROPERTIES,
  "natural.archipelago": COMMON_TEXT_LABEL_PROPERTIES,
  "natural.island": COMMON_TEXT_LABEL_PROPERTIES,
  // natural.water supports labels
  "natural.water": COMMON_TEXT_LABEL_PROPERTIES,
  // natural.water sub-features - label only (no pinFillColor)
  "natural.water.ocean": COMMON_TEXT_LABEL_PROPERTIES,
  "natural.water.lake": COMMON_TEXT_LABEL_PROPERTIES,
  "natural.water.river": COMMON_TEXT_LABEL_PROPERTIES,
  "natural.water.other": COMMON_TEXT_LABEL_PROPERTIES,

  "natural.base": [], // Explicitly no labels
  "natural.land": [], // Explicitly no labels
  // natural.land.landCover - no labels, only geometry
  "natural.land.landCover": [], // Explicitly no labels
  // natural.land.landCover sub-features - no labels, only geometry
  "natural.land.landCover.crops": [], // Explicitly no labels
  "natural.land.landCover.dryCrops": [], // Explicitly no labels
  "natural.land.landCover.forest": [], // Explicitly no labels
  "natural.land.landCover.ice": [], // Explicitly no labels
  "natural.land.landCover.sand": [], // Explicitly no labels
  "natural.land.landCover.shrub": [], // Explicitly no labels
  "natural.land.landCover.tundra": [], // Explicitly no labels

  // infrastructure.transitStation and sub-features
  "infrastructure.transitStation": COMMON_LABEL_PROPERTIES,
  "infrastructure.transitStation.busStation": COMMON_LABEL_PROPERTIES,
  "infrastructure.transitStation.railStation": COMMON_LABEL_PROPERTIES,
  "infrastructure.transitStation.bicycleShare": COMMON_LABEL_PROPERTIES,
  "infrastructure.transitStation.ferryTerminal": COMMON_LABEL_PROPERTIES,
  "infrastructure.transitStation.funicularStation": COMMON_LABEL_PROPERTIES,
  "infrastructure.transitStation.monorail": COMMON_LABEL_PROPERTIES,
  "infrastructure.transitStation.gondolaStation": COMMON_LABEL_PROPERTIES,
  "infrastructure.transitStation.railStation.subwayStation": [
    "visible",
    "pinFillColor",
  ],
  "infrastructure.transitStation.railStation.tramStation": [
    "visible",
    "pinFillColor",
    "textFillColor",
    "textFillOpacity",
    "textStrokeColor",
    "textStrokeOpacity",
  ],
});

// Memoization cache for property validation results
const propertyValidationCache = new Map();

/**
 * Generates a cache key for property validation
 * @param {string} propertiesMapName - Name identifier for the properties map
 * @param {string} featureId - V2 feature ID
 * @param {string} property - Property name
 * @returns {string} Cache key
 */
const getPropertyCacheKey = (propertiesMapName, featureId, property) => {
  return `${propertiesMapName}:${featureId}:${property}`;
};

/**
 * Checks if a property is valid for a feature by checking the feature and its parents
 * If the feature is explicitly defined in the map, only check that feature (not parents).
 * Only check parents if the feature is not explicitly defined.
 * Results are memoized for performance.
 * @param {Object.<string, string[]>} propertiesMap - Map of feature IDs to valid properties
 * @param {string} propertiesMapName - Name identifier for the properties map (for caching)
 * @param {string} featureId - V2 feature ID
 * @param {string} property - Property name
 * @returns {boolean} True if valid
 */
const isValidProperty = (
  propertiesMap,
  propertiesMapName,
  featureId,
  property
) => {
  const cacheKey = getPropertyCacheKey(propertiesMapName, featureId, property);

  if (propertyValidationCache.has(cacheKey)) {
    return propertyValidationCache.get(cacheKey);
  }

  let result = false;

  // If feature is explicitly defined in the map, only check that feature
  if (Object.hasOwn(propertiesMap, featureId)) {
    result = propertiesMap[featureId]?.includes(property) ?? false;
  } else {
    // Only check parents if feature is not explicitly defined
    const parents = getParentFeatureIds(featureId);
    result = parents.some((parentId) =>
      propertiesMap[parentId]?.includes(property)
    );
  }

  propertyValidationCache.set(cacheKey, result);
  return result;
};

/**
 * Checks if a geometry property is valid for a feature
 * @param {string} featureId - V2 feature ID
 * @param {string} property - Property name
 * @returns {boolean} True if valid
 */
export function isValidGeometryProperty(featureId, property) {
  return isValidProperty(geometryProperties, "geometry", featureId, property);
}

/**
 * Checks if a label property is valid for a feature
 * @param {string} featureId - V2 feature ID
 * @param {string} property - Property name
 * @returns {boolean} True if valid
 */
export function isValidLabelProperty(featureId, property) {
  return isValidProperty(labelProperties, "label", featureId, property);
}

/**
 * Checks if a feature supports properties from a given map
 * @param {Object.<string, string[]>} propertiesMap - Map of feature IDs to valid properties
 * @param {string} featureId - V2 feature ID
 * @returns {boolean} True if feature supports properties
 */
const supportsProperties = (propertiesMap, featureId) => {
  if (Object.hasOwn(propertiesMap, featureId)) {
    const props = propertiesMap[featureId];
    return Array.isArray(props) && props.length > 0;
  }

  const parents = getParentFeatureIds(featureId);
  return parents.some((parentId) => {
    if (Object.hasOwn(propertiesMap, parentId)) {
      const props = propertiesMap[parentId];
      return Array.isArray(props) && props.length > 0;
    }
    return false;
  });
};

/**
 * Checks if a feature supports label properties
 * @param {string} featureId - V2 feature ID
 * @returns {boolean} True if feature supports labels
 */
export const supportsLabel = (featureId) =>
  supportsProperties(labelProperties, featureId);

/**
 * Checks if a feature supports geometry properties
 * @param {string} featureId - V2 feature ID
 * @returns {boolean} True if feature supports geometry
 */
export const supportsGeometry = (featureId) =>
  supportsProperties(geometryProperties, featureId);

/**
 * Maps geometry.color to the appropriate property for a feature
 * @param {string} featureId - V2 feature ID
 * @returns {string} Property name (fillColor, strokeColor, or color)
 */
export const mapGeometryColor = (featureId) => {
  if (isValidGeometryProperty(featureId, "color")) {
    return "color";
  }
  return isValidGeometryProperty(featureId, "fillColor")
    ? "fillColor"
    : "fillColor"; // Default fallback
};

/**
 * Ensures a style object has the required element structure based on feature capabilities
 * For label-only features: ensures label element exists
 * For geometry-only features: ensures geometry element exists
 * For features supporting both: ensures both exist when appropriate
 * @param {Object} style - Style object to ensure elements for
 * @param {string} id - Feature ID
 * @param {string} elementType - V1 elementType (optional, for context)
 */
export function ensureRequiredElements(style, id, elementType) {
  const hasGeometry = supportsGeometry(id);
  const hasLabel = supportsLabel(id);

  if (!hasGeometry && hasLabel) {
    style.label ??= {};
    return;
  }

  if (hasGeometry && !hasLabel) {
    style.geometry ??= {};
    return;
  }

  if (hasGeometry && hasLabel) {
    const isAll = !elementType || elementType === "all";
    if (isAll) {
      style.geometry ??= {};
      style.label ??= {};
    } else if (elementType.startsWith("geometry")) {
      style.geometry ??= {};
    } else if (elementType.startsWith("labels")) {
      style.label ??= {};
    }
  }
}
