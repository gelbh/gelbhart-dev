/**
 * Snazzy Maps Service
 *
 * API client for Snazzy Maps.
 * Handles fetching styles, searching, and filtering.
 * Pure service with no UI concerns.
 * Enhanced with modern caching using stale-while-revalidate pattern.
 */

import { cache, CACHE_CONFIG } from "../utils/cache";

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
  if (
    typeof window !== "undefined" &&
    window.googleMapsConverterConfig?.snazzyMapsApiKey
  ) {
    return window.googleMapsConverterConfig.snazzyMapsApiKey;
  }
  return null;
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

  if (options.tag) {
    const tags = Array.isArray(options.tag) ? options.tag : [options.tag];
    tags.filter(Boolean).forEach((t) => params.append("tag", t));
  }

  if (options.color) {
    const colors = Array.isArray(options.color)
      ? options.color
      : [options.color];
    colors.filter(Boolean).forEach((c) => params.append("color", c));
  }

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

    // Try to parse JSON error response from API
    // Clone response first since response body can only be read once
    const clonedResponse = response.clone();
    try {
      const contentType = clonedResponse.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await clonedResponse.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, use default error message based on status code
    }

    // Provide more specific error messages based on status code if JSON message not available
    if (
      errorMessage ===
      `Snazzy Maps API error: ${response.status} ${response.statusText}`
    ) {
      switch (response.status) {
        case 400:
          errorMessage = `Bad request: Invalid parameters provided (${response.statusText})`;
          break;
        case 401:
          errorMessage = `Unauthorized: Invalid or missing API key (${response.statusText})`;
          break;
        case 403:
          errorMessage = `Forbidden: API key does not have access (${response.statusText})`;
          break;
        case 404:
          errorMessage = `Not found: Requested resource does not exist (${response.statusText})`;
          break;
        case 429:
          errorMessage = `Rate limited: Too many requests, please try again later (${response.statusText})`;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = `Server error: Snazzy Maps API is temporarily unavailable (${response.status} ${response.statusText})`;
          break;
      }
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
 * Fetches styles from Snazzy Maps API with caching
 * Uses stale-while-revalidate pattern: serves cached data immediately, fetches fresh data in background
 * @param {Object} options - Query parameters
 * @param {string} [options.sort] - Sort order (e.g., 'popular', 'newest', 'alphabetical')
 * @param {string|string[]} [options.tag] - Filter by tag(s)
 * @param {string|string[]} [options.color] - Filter by color(s)
 * @param {string} [options.text] - Search text
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.pageSize=12] - Number of styles per page
 * @returns {Promise<{styles: Array, total: number|null, totalPages: number|null, page: number, pageSize: number, hasFullPage: boolean, hasKnownTotal: boolean}>} API response
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

  // Stale-while-revalidate: Check for fresh cached data first
  const cachedData = await cache.getAsync(cacheKey);
  if (cachedData) {
    // Fresh cache exists, return it immediately (no background refresh needed)
    return cachedData;
  }

  // Check for stale cached data
  const staleData = await cache.getStaleAsync(cacheKey);
  if (staleData) {
    // Stale cache exists, return it immediately and refresh in background
    fetchFreshStyles(normalizedOptions, cacheKey, ttl).catch((error) => {
      console.warn("Background refresh failed:", error);
      // On error, we already returned stale data, so user experience is preserved
    });
    return staleData;
  }

  // No cache available, fetch fresh data
  return fetchFreshStyles(normalizedOptions, cacheKey, ttl);
}

/**
 * Fetches fresh styles from API and updates cache
 * @param {Object} normalizedOptions - Normalized query parameters
 * @param {string} cacheKey - Cache key
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<{styles: Array, total: number|null, totalPages: number|null, page: number, pageSize: number, hasFullPage: boolean, hasKnownTotal: boolean}>} API response
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

        // Validate response structure
        if (!validateResponse(data)) {
          if (
            typeof process !== "undefined" &&
            process.env?.NODE_ENV !== "production"
          ) {
            console.warn("[Snazzy Maps API] Unexpected response structure:", {
              isArray: Array.isArray(data),
              keys: !Array.isArray(data) ? Object.keys(data || {}) : null,
              data,
            });
          }
        }

        // Log API response structure in development to help debug pagination
        if (
          typeof process !== "undefined" &&
          process.env?.NODE_ENV !== "production"
        ) {
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

        // Extract pagination info from the pagination object (API returns it nested)
        const pagination = data.pagination || {};
        const total =
          pagination.totalItems ??
          pagination.total ??
          data.total ??
          data.count ??
          data.totalCount ??
          data.totalResults ??
          (hasFullPage ? null : styles.length); // Only use styles.length if we didn't get a full page

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
          hasFullPage, // Indicates if we got exactly pageSize results (suggests more pages may exist)
          hasKnownTotal:
            total !== null &&
            total !== styles.length &&
            pagination.totalItems !== undefined, // True if we have a reliable total count from API
        };

        // Cache the result
        await cache.setAsync(cacheKey, result, ttl);

        return result;
      } finally {
        // Remove from in-flight requests when done
        inFlightRequests.delete(cacheKey);
      }
    })();

    // Store the request promise for deduplication
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
 * Fetches a single style by ID with caching
 * Uses stale-while-revalidate pattern: serves cached data immediately, fetches fresh data in background
 * @param {string|number} styleId - Style ID
 * @returns {Promise<Object>} Style object with parsed JSON
 */
export async function fetchStyleById(styleId) {
  const cacheKey = cache.generateKey("style", { id: styleId });
  const ttl = CACHE_CONFIG.TTL.STYLE_BY_ID;

  // Stale-while-revalidate: Check for fresh cached data first
  const cachedData = await cache.getAsync(cacheKey);
  if (cachedData) {
    // Fresh cache exists, return it immediately (no background refresh needed)
    return cachedData;
  }

  // Check for stale cached data
  const staleData = await cache.getStaleAsync(cacheKey);
  if (staleData) {
    // Stale cache exists, return it immediately and refresh in background
    fetchFreshStyleById(styleId, cacheKey, ttl).catch((error) => {
      console.warn("Background refresh failed:", error);
      // On error, we already returned stale data, so user experience is preserved
    });
    return staleData;
  }

  // No cache available, fetch fresh data
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

    // Check for in-flight request with same cache key
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const data = await handleApiResponse(await fetch(url));

        // Validate response structure
        if (!validateResponse(data)) {
          if (
            typeof process !== "undefined" &&
            process.env?.NODE_ENV !== "production"
          ) {
            console.warn(
              `[Snazzy Maps API] Unexpected response structure for style ${styleId}:`,
              {
                isArray: Array.isArray(data),
                keys: !Array.isArray(data) ? Object.keys(data || {}) : null,
              }
            );
          }
        }

        // Extract style data from response
        // The API returns the same paginated structure: { pagination: {...}, styles: [...] }
        let styleData = null;

        if (Array.isArray(data)) {
          styleData = data[0];
        } else if (data?.styles && Array.isArray(data.styles)) {
          // Standard API format - extract from styles array
          styleData = data.styles[0];
        } else if (data && typeof data === "object" && !Array.isArray(data)) {
          // Direct style object (not in array)
          styleData = data;
        }

        if (!styleData) {
          throw new Error(
            `Style ${styleId} not found in API response. Response structure: ${JSON.stringify(
              Object.keys(data || {})
            )}`
          );
        }

        // Parse JSON if available
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

        // Cache the result
        await cache.setAsync(cacheKey, styleData, ttl);

        return styleData;
      } finally {
        // Remove from in-flight requests when done
        inFlightRequests.delete(cacheKey);
      }
    })();

    // Store the request promise for deduplication
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
 * Returns predefined lists that match Snazzy Maps API filter options
 * @returns {Promise<{tags: Array<string>, colors: Array<string>}>} Filter options
 */
export async function fetchAvailableFilters() {
  // Return predefined lists matching Snazzy Maps API filter options
  return {
    tags: [...AVAILABLE_TAGS],
    colors: [...AVAILABLE_COLORS],
  };
}
