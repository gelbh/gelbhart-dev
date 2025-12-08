/**
 * Cache Utility Module
 * Provides in-memory caching with TTL support, LRU eviction, and cache management
 * Enhanced with persistent storage via IndexedDB for cross-session persistence
 */

import localforage from "localforage";

/**
 * Cache configuration constants
 */
export const CACHE_CONFIG = {
  // TTL values in milliseconds
  TTL: {
    STYLES_LIST: 10 * 60 * 1000, // 10 minutes for style lists
    STYLES_LIST_SEARCH: 5 * 60 * 1000, // 5 minutes for search results
    STYLES_LIST_POPULAR: 15 * 60 * 1000, // 15 minutes for popular styles
    STYLE_BY_ID: 60 * 60 * 1000, // 1 hour for individual styles
    FILTERS: 24 * 60 * 60 * 1000, // 24 hours for filter options
  },
  // Maximum number of cache entries before eviction
  MAX_SIZE: 1000,
  // Cleanup interval in milliseconds (check for expired entries)
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  // Persistent storage configuration
  STORAGE_KEY_PREFIX: "snazzy_maps_cache:",
  STORAGE_VERSION: 1,
};

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {*} data - Cached data
 * @property {number} timestamp - When the entry was created
 * @property {number} expiresAt - When the entry expires
 * @property {number} lastAccessed - Last access time for LRU
 */

/**
 * Cache statistics
 * @typedef {Object} CacheStats
 * @property {number} hits - Number of cache hits
 * @property {number} misses - Number of cache misses
 * @property {number} size - Current cache size
 * @property {number} evictions - Number of entries evicted
 */

class Cache {
  constructor(config = {}) {
    this.config = { ...CACHE_CONFIG, ...config };
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Generates a deterministic cache key from parameters
   * @param {string} prefix - Key prefix (e.g., 'styles', 'style', 'filters')
   * @param {*} params - Parameters to include in key
   * @returns {string} Cache key
   */
  generateKey(prefix, params = {}) {
    const normalized = this.normalizeParams(params);
    const parts = [prefix];

    // Mapping of parameter names to their formatters
    const paramFormatters = {
      sort: (value) => `sort:${value}`,
      tags: (value) => {
        const tags = Array.isArray(value) ? value.sort().join(",") : value;
        return `tags:${tags}`;
      },
      colors: (value) => {
        const colors = Array.isArray(value) ? value.sort().join(",") : value;
        return `colors:${colors}`;
      },
      text: (value) => `text:${value.toLowerCase().trim()}`,
      page: (value) => `page:${value}`,
      pageSize: (value) => `pageSize:${value}`,
      id: (value) => `id:${value}`,
    };

    // Process each parameter if it exists
    for (const [key, formatter] of Object.entries(paramFormatters)) {
      if (normalized[key] !== undefined) {
        parts.push(formatter(normalized[key]));
      }
    }

    return parts.join("|");
  }

  /**
   * Normalizes parameters for consistent cache key generation
   * @param {*} params - Parameters to normalize
   * @returns {Object} Normalized parameters
   */
  normalizeParams(params) {
    const normalized = {};

    if (params.sort) {
      normalized.sort = String(params.sort).toLowerCase();
    }
    if (params.tag || params.tags) {
      const tags = params.tag || params.tags;
      normalized.tags = Array.isArray(tags)
        ? tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean)
        : [String(tags).toLowerCase().trim()].filter(Boolean);
    }
    if (params.color || params.colors) {
      const colors = params.color || params.colors;
      normalized.colors = Array.isArray(colors)
        ? colors.map((c) => String(c).toLowerCase().trim()).filter(Boolean)
        : [String(colors).toLowerCase().trim()].filter(Boolean);
    }
    if (params.text) {
      normalized.text = String(params.text).toLowerCase().trim();
    }
    if (params.page !== undefined) {
      normalized.page = Number(params.page);
    }
    if (params.pageSize !== undefined) {
      normalized.pageSize = Number(params.pageSize);
    }
    if (params.id !== undefined) {
      normalized.id = String(params.id);
    }

    return normalized;
  }

  /**
   * Gets a value from cache
   * @param {string} key - Cache key
   * @returns {*|null} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update last accessed for LRU
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Gets stale data from cache (for stale-while-revalidate pattern)
   * Returns expired data without deleting it, allowing revalidation
   * @param {string} key - Cache key
   * @returns {*|null} Stale cached value or null if not found
   */
  getStale(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Return data even if expired (for stale-while-revalidate)
    if (Date.now() > entry.expiresAt) {
      return entry.data;
    }

    return null; // Not stale, use regular get() instead
  }

  /**
   * Sets a value in cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   * @returns {boolean} Success status
   */
  set(key, data, ttl) {
    try {
      // Check if we need to evict entries
      if (this.cache.size >= this.config.MAX_SIZE && !this.cache.has(key)) {
        this.evictLRU();
      }

      const now = Date.now();
      const entry = {
        data,
        timestamp: now,
        expiresAt: now + ttl,
        lastAccessed: now,
      };

      this.cache.set(key, entry);
      return true;
    } catch (error) {
      console.warn("Cache set failed:", error);
      return false;
    }
  }

  /**
   * Evicts the least recently used entry
   */
  evictLRU() {
    let oldestKey = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Removes expired entries from cache
   * @returns {number} Number of entries removed
   */
  cleanupExpired() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Starts automatic cleanup of expired entries
   */
  startCleanup() {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, this.config.CLEANUP_INTERVAL);
  }

  /**
   * Stops automatic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clears all cache entries
   */
  clear() {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }

  /**
   * Clears cache entries matching a pattern
   * @param {string|RegExp} pattern - Pattern to match against keys
   * @returns {number} Number of entries removed
   */
  clearByPattern(pattern) {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    let removed = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Gets cache statistics
   * @returns {CacheStats} Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate:
        this.stats.hits + this.stats.misses > 0
          ? this.stats.hits / (this.stats.hits + this.stats.misses)
          : 0,
    };
  }

  /**
   * Gets the current cache size
   * @returns {number} Number of entries in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Checks if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Async get method that checks persistent storage if not in memory
   * @param {string} key - Cache key
   * @returns {Promise<*|null>} Cached value or null if not found/expired
   */
  async getAsync(key) {
    // First check memory cache
    const memoryResult = this.get(key);
    if (memoryResult !== null) {
      return memoryResult;
    }

    // Check persistent storage
    try {
      const storageKey = `${this.config.STORAGE_KEY_PREFIX}${key}`;
      const stored = await localforage.getItem(storageKey);
      if (!stored) {
        return null;
      }

      const entry = stored;
      const now = Date.now();

      // Check if expired
      if (now > entry.expiresAt) {
        await localforage.removeItem(storageKey);
        return null;
      }

      // Load into memory cache for faster future access
      this.cache.set(key, entry);

      // Update last accessed
      entry.lastAccessed = now;
      await localforage.setItem(storageKey, entry);

      this.stats.hits++;
      return entry.data;
    } catch (error) {
      console.warn("Cache getAsync failed:", error);
      return null;
    }
  }

  /**
   * Async get stale method that checks persistent storage
   * @param {string} key - Cache key
   * @returns {Promise<*|null>} Stale cached value or null if not found
   */
  async getStaleAsync(key) {
    // First check memory cache
    const memoryResult = this.getStale(key);
    if (memoryResult !== null) {
      return memoryResult;
    }

    // Check persistent storage
    try {
      const storageKey = `${this.config.STORAGE_KEY_PREFIX}${key}`;
      const stored = await localforage.getItem(storageKey);
      if (!stored) {
        return null;
      }

      const entry = stored;

      // Return data even if expired (for stale-while-revalidate)
      if (Date.now() > entry.expiresAt) {
        // Load into memory cache
        this.cache.set(key, entry);
        return entry.data;
      }

      return null; // Not stale, use regular getAsync() instead
    } catch (error) {
      console.warn("Cache getStaleAsync failed:", error);
      return null;
    }
  }

  /**
   * Async set method that writes to both memory and persistent storage
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<boolean>} Success status
   */
  async setAsync(key, data, ttl) {
    try {
      // Set in memory cache
      this.set(key, data, ttl);

      // Also write to persistent storage
      const entry = this.cache.get(key);
      if (entry) {
        const storageKey = `${this.config.STORAGE_KEY_PREFIX}${key}`;
        await localforage.setItem(storageKey, entry);
      }

      return true;
    } catch (error) {
      console.warn("Cache setAsync failed:", error);
      return false;
    }
  }

  /**
   * Clears cache from both memory and persistent storage
   * @returns {Promise<number>} Number of entries removed
   */
  async clearAsync() {
    try {
      const size = this.cache.size;
      this.clear();

      // Clear persistent storage entries with our prefix
      const keys = await localforage.keys();
      const prefix = this.config.STORAGE_KEY_PREFIX;
      let removed = 0;

      for (const key of keys) {
        if (key.startsWith(prefix)) {
          await localforage.removeItem(key);
          removed++;
        }
      }

      return size + removed;
    } catch (error) {
      console.warn("Cache clearAsync failed:", error);
      this.clear(); // At least clear memory cache
      return this.cache.size;
    }
  }

  /**
   * Clears cache entries matching a pattern from both memory and persistent storage
   * @param {string|RegExp} pattern - Pattern to match against keys
   * @returns {Promise<number>} Number of entries removed
   */
  async clearByPatternAsync(pattern) {
    try {
      const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
      let removed = this.clearByPattern(pattern);

      // Clear from persistent storage
      const keys = await localforage.keys();
      const prefix = this.config.STORAGE_KEY_PREFIX;

      for (const key of keys) {
        if (key.startsWith(prefix)) {
          const cacheKey = key.substring(prefix.length);
          if (regex.test(cacheKey)) {
            await localforage.removeItem(key);
            removed++;
          }
        }
      }

      return removed;
    } catch (error) {
      console.warn("Cache clearByPatternAsync failed:", error);
      return this.clearByPattern(pattern); // At least clear memory cache
    }
  }
}

// Create and export a singleton cache instance
export const cache = new Cache();

// Export the Cache class for custom instances if needed
export default Cache;
