/**
 * Snazzy Maps Service
 *
 * API client for Snazzy Maps with stale-while-revalidate caching.
 */

import { cache, CACHE_CONFIG } from "lib/google_maps_converter/utils/cache";

const API_BASE_URL = "https://snazzymaps.com/explore.json";

/**
 * Map to track in-flight requests for deduplication
 * Key: request identifier (cache key or URL)
 * Value: Promise for the request
 */
const inFlightRequests = new Map();

/**
 * Gets the API key from Rails-provided config
 * @returns {string|null} API key or null
 */
const getApiKey = () => {
  return window?.googleMapsConverterConfig?.snazzyMapsApiKey ?? null;
};

/**
 * Builds URLSearchParams with API key and optional parameters
 * @param {Object} options - Query parameters
 * @returns {URLSearchParams} Configured URLSearchParams
 */
const buildSearchParams = (options) => {
  const params = new URLSearchParams();
  const apiKey = getApiKey();
  if (apiKey) {
    params.append("key", apiKey);
  }

  if (options.sort) params.append("sort", options.sort);
  if (options.text) params.append("text", options.text);
  if (options.page) params.append("page", options.page.toString());
  if (options.pageSize) params.append("pageSize", options.pageSize.toString());

  const normalizeArray = (value) =>
    Array.isArray(value) ? value : value ? [value] : [];

  normalizeArray(options.tag)
    .filter(Boolean)
    .forEach((t) => params.append("tag", t));

  normalizeArray(options.color)
    .filter(Boolean)
    .forEach((c) => params.append("color", c));

  return params;
};

/**
 * Handles API response and extracts error message
 * @param {Response} response - Fetch response
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If response is not OK
 */
const handleApiResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = `Snazzy Maps API error: ${response.status} ${response.statusText}`;

    try {
      const clonedResponse = response.clone();
      const contentType = clonedResponse.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errorData = await clonedResponse.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
    } catch {
      // Use default error message if JSON parsing fails
    }

    const statusMessages = {
      400: `Bad request: Invalid parameters provided (${response.statusText})`,
      401: `Unauthorized: Invalid or missing API key (${response.statusText})`,
      403: `Forbidden: API key does not have access (${response.statusText})`,
      404: `Not found: Requested resource does not exist (${response.statusText})`,
      429: `Rate limited: Too many requests, please try again later (${response.statusText})`,
    };

    if (
      errorMessage ===
        `Snazzy Maps API error: ${response.status} ${response.statusText}` &&
      statusMessages[response.status]
    ) {
      errorMessage = statusMessages[response.status];
    } else if ([500, 502, 503, 504].includes(response.status)) {
      errorMessage = `Server error: Snazzy Maps API is temporarily unavailable (${response.status} ${response.statusText})`;
    }

    throw new Error(errorMessage);
  }
  return response.json();
};

/**
 * Validates API response structure
 * @param {Object|Array} response - API response
 * @returns {boolean} True if response structure is valid
 */
const validateResponse = (response) => {
  if (Array.isArray(response)) {
    return true;
  }

  if (response && typeof response === "object") {
    // Standard API response should have pagination and styles
    if (response.styles && Array.isArray(response.styles)) {
      return true;
    }
  }

  return false;
};

/**
 * Extracts styles array from API response
 * @param {Object|Array} response - API response
 * @returns {Array} Array of styles
 */
const extractStylesFromResponse = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  // Standard API format: { pagination: {...}, styles: [...] }
  if (response.styles && Array.isArray(response.styles)) {
    return response.styles;
  }

  return [];
};

/**
 * Fetches styles from Snazzy Maps API with stale-while-revalidate caching
 * @param {Object} options - Query parameters
 * @param {string} [options.sort] - Sort order
 * @param {string|string[]} [options.tag] - Filter by tag(s)
 * @param {string|string[]} [options.color] - Filter by color(s)
 * @param {string} [options.text] - Search text
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.pageSize=12] - Number of styles per page
 * @returns {Promise<{styles: Array, total: number|null, totalPages: number|null, page: number, pageSize: number, hasFullPage: boolean, hasKnownTotal: boolean}>}
 */
export async function fetchStyles(options = {}) {
  const normalizedOptions = {
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 12,
    ...options,
  };

  // Generate cache key
  const cacheKey = cache.generateKey("styles", normalizedOptions);

  // Determine TTL based on request type
  let ttl = CACHE_CONFIG.TTL.STYLES_LIST;
  if (normalizedOptions.text) {
    ttl = CACHE_CONFIG.TTL.STYLES_LIST_SEARCH;
  } else if (normalizedOptions.sort === "popular") {
    ttl = CACHE_CONFIG.TTL.STYLES_LIST_POPULAR;
  }

  const cachedData = await cache.getAsync(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const staleData = await cache.getStaleAsync(cacheKey);
  if (staleData) {
    fetchFreshStyles(normalizedOptions, cacheKey, ttl).catch((error) => {
      console.warn("Background refresh failed:", error);
    });
    return staleData;
  }

  return fetchFreshStyles(normalizedOptions, cacheKey, ttl);
}

/**
 * Fetches fresh styles from API and updates cache
 * @param {Object} normalizedOptions - Normalized query parameters
 * @param {string} cacheKey - Cache key
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<{styles: Array, total: number|null, totalPages: number|null, page: number, pageSize: number, hasFullPage: boolean, hasKnownTotal: boolean}>}
 */
async function fetchFreshStyles(normalizedOptions, cacheKey, ttl) {
  try {
    const params = buildSearchParams(normalizedOptions);
    const url = `${API_BASE_URL}?${params.toString()}`;

    // Check for in-flight request with same cache key
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const data = await handleApiResponse(await fetch(url));

        const isDevelopment =
          typeof process !== "undefined" &&
          process.env?.NODE_ENV !== "production";

        if (!validateResponse(data) && isDevelopment) {
          console.warn("[Snazzy Maps API] Unexpected response structure:", {
            isArray: Array.isArray(data),
            keys: !Array.isArray(data) ? Object.keys(data || {}) : null,
            data,
          });
        }

        if (isDevelopment) {
          console.log("[Snazzy Maps API] Response structure:", {
            isArray: Array.isArray(data),
            keys: !Array.isArray(data) ? Object.keys(data) : null,
            pagination: data.pagination,
            stylesLength: Array.isArray(data)
              ? data.length
              : extractStylesFromResponse(data).length,
          });
        }

        const styles = extractStylesFromResponse(data);
        const hasFullPage = styles.length === normalizedOptions.pageSize;

        const pagination = data.pagination || {};
        const total =
          pagination.totalItems ??
          pagination.total ??
          data.total ??
          data.count ??
          data.totalCount ??
          data.totalResults ??
          (hasFullPage ? null : styles.length);

        const totalPages =
          pagination.totalPages ??
          (total !== null
            ? Math.ceil(total / normalizedOptions.pageSize)
            : null);

        const result = {
          styles,
          total,
          totalPages,
          page: pagination.currentPage ?? normalizedOptions.page,
          pageSize: pagination.pageSize ?? normalizedOptions.pageSize,
          hasFullPage,
          hasKnownTotal:
            total !== null &&
            total !== styles.length &&
            pagination.totalItems !== undefined,
        };

        await cache.setAsync(cacheKey, result, ttl);
        return result;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, requestPromise);

    return requestPromise;
  } catch (error) {
    inFlightRequests.delete(cacheKey);
    const staleData = await cache.getStaleAsync(cacheKey);
    if (staleData) {
      console.warn(
        "Network request failed, returning stale cache:",
        error.message
      );
      return staleData;
    }
    throw error;
  }
}

/**
 * Fetches a single style by ID with stale-while-revalidate caching
 * @param {string|number} styleId - Style ID
 * @returns {Promise<Object>} Style object with parsed JSON
 */
export async function fetchStyleById(styleId) {
  const cacheKey = cache.generateKey("style", { id: styleId });
  const ttl = CACHE_CONFIG.TTL.STYLE_BY_ID;

  const cachedData = await cache.getAsync(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const staleData = await cache.getStaleAsync(cacheKey);
  if (staleData) {
    fetchFreshStyleById(styleId, cacheKey, ttl).catch((error) => {
      console.warn("Background refresh failed:", error);
    });
    return staleData;
  }

  return fetchFreshStyleById(styleId, cacheKey, ttl);
}

/**
 * Fetches fresh style from API and updates cache
 * @param {string|number} styleId - Style ID
 * @param {string} cacheKey - Cache key
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<Object>} Style object with parsed JSON
 */
async function fetchFreshStyleById(styleId, cacheKey, ttl) {
  try {
    const params = new URLSearchParams();
    const apiKey = getApiKey();
    if (apiKey) {
      params.append("key", apiKey);
    }
    params.append("id", styleId.toString());

    const url = `${API_BASE_URL}?${params.toString()}`;

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const data = await handleApiResponse(await fetch(url));

        const isDevelopment =
          typeof process !== "undefined" &&
          process.env?.NODE_ENV !== "production";

        if (!validateResponse(data) && isDevelopment) {
          console.warn(
            `[Snazzy Maps API] Unexpected response structure for style ${styleId}:`,
            {
              isArray: Array.isArray(data),
              keys: !Array.isArray(data) ? Object.keys(data || {}) : null,
            }
          );
        }

        let styleData = null;

        if (Array.isArray(data)) {
          styleData = data[0];
        } else if (data?.styles?.[0]) {
          styleData = data.styles[0];
        } else if (data && typeof data === "object" && !Array.isArray(data)) {
          styleData = data;
        }

        if (!styleData) {
          throw new Error(
            `Style ${styleId} not found in API response. Response structure: ${JSON.stringify(
              Object.keys(data || {})
            )}`
          );
        }

        if (styleData.json) {
          try {
            styleData.parsedJson = JSON.parse(styleData.json);
          } catch (parseError) {
            console.warn(
              `Failed to parse JSON for style ${styleId}:`,
              parseError
            );
          }
        }

        await cache.setAsync(cacheKey, styleData, ttl);
        return styleData;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, requestPromise);

    return requestPromise;
  } catch (error) {
    // Clean up in-flight request on error
    inFlightRequests.delete(cacheKey);

    // If network fails, try to return stale cache as fallback
    const staleData = await cache.getStaleAsync(cacheKey);
    if (staleData) {
      console.warn(
        "Network request failed, returning stale cache:",
        error.message
      );
      return staleData;
    }
    // No stale data available, throw the error
    throw error;
  }
}

/**
 * Parses the JSON field from a style response
 * @param {Object} style - Style object from API
 * @returns {Object|null} Parsed V1 style JSON or null if parsing fails
 */
export function parseStyleJson(style) {
  if (!style?.json) {
    return null;
  }

  try {
    return JSON.parse(style.json);
  } catch (error) {
    console.error("Failed to parse style JSON:", error);
    return null;
  }
}

/**
 * Predefined tags available for filtering styles in Snazzy Maps API
 */
const AVAILABLE_TAGS = [
  "colorful",
  "complex",
  "dark",
  "greyscale",
  "light",
  "monochrome",
  "no-labels",
  "simple",
  "two-tone",
];

/**
 * Predefined colors available for filtering styles in Snazzy Maps API
 */
const AVAILABLE_COLORS = [
  "black",
  "blue",
  "gray",
  "green",
  "multi",
  "orange",
  "purple",
  "red",
  "white",
  "yellow",
];

/**
 * Fetches available filter options (tags and colors)
 * @returns {Promise<{tags: Array<string>, colors: Array<string>}>} Filter options
 */
export async function fetchAvailableFilters() {
  return {
    tags: [...AVAILABLE_TAGS],
    colors: [...AVAILABLE_COLORS],
  };
}
