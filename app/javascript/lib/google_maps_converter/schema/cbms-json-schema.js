/**
 * CBMS JSON Schema Wrapper
 *
 * Exports the Google Maps Platform CBMS JSON schema.
 * Required because importmap-rails doesn't support `with { type: "json" }` syntax.
 * The schema is loaded via fetch and cached for subsequent access.
 */

let schemaCache = null;
let schemaPromise = null;

/**
 * Gets the asset path for the JSON schema file.
 * Uses Rails asset_path helper when available for production fingerprinting.
 * @returns {string} The asset path
 */
function getSchemaPath() {
  if (typeof window !== "undefined" && window.assetPath) {
    return window.assetPath("cbms-json-schema.json");
  }
  return "/assets/cbms-json-schema.json";
}

/**
 * Loads the JSON schema from the JSON file.
 * @returns {Promise<Object>} The schema object
 * @throws {Error} If the schema cannot be loaded
 */
async function loadSchema() {
  if (schemaCache) {
    return schemaCache;
  }

  if (schemaPromise) {
    return schemaPromise;
  }

  schemaPromise = (async () => {
    try {
      const path = getSchemaPath();
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(
          `Failed to load schema: ${response.status} ${response.statusText}`
        );
      }

      const schema = await response.json();
      schemaCache = schema;
      return schema;
    } catch (error) {
      console.error("Failed to load CBMS JSON schema:", error);
      throw error;
    } finally {
      schemaPromise = null;
    }
  })();

  return schemaPromise;
}

// Preload schema on module initialization
const preloadPromise = loadSchema().catch((error) => {
  console.error("Failed to preload CBMS JSON schema:", error);
  return null;
});

/**
 * Proxy object that provides synchronous access to the schema
 * Throws if accessed before the schema is loaded
 */
const schemaData = new Proxy(
  {},
  {
    get(target, prop) {
      if (schemaCache) {
        return schemaCache[prop];
      }
      throw new Error(
        `Schema not loaded yet. Ensure the schema file exists at: ${getSchemaPath()}`
      );
    },
    ownKeys() {
      return schemaCache ? Object.keys(schemaCache) : [];
    },
    has(target, prop) {
      return schemaCache ? prop in schemaCache : false;
    },
    getOwnPropertyDescriptor(target, prop) {
      // Check target first to match what Object.assign created
      if (target && Object.prototype.hasOwnProperty.call(target, prop)) {
        return Object.getOwnPropertyDescriptor(target, prop);
      }
      // Fall back to schemaCache if not on target
      return schemaCache
        ? Object.getOwnPropertyDescriptor(schemaCache, prop)
        : undefined;
    },
  }
);

preloadPromise.then((schema) => {
  if (schema) {
    Object.assign(schemaData, schema);
    Object.setPrototypeOf(schemaData, Object.getPrototypeOf(schema));
  }
});

export default schemaData;
