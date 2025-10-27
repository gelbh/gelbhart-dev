/**
 * FilterManager
 * Handles search and filtering logic for exoplanets
 */
export class FilterManager {
  constructor() {
    this.exoplanets = [];
    this.filteredExoplanets = [];
    // Cache for unified search results
    this.unifiedSearchCache = null;
    this.unifiedSearchCacheQuery = null;
  }

  /**
   * Generate Solar System data (our home system!)
   */
  generateSolarSystemData() {
    const solarSystem = [
      {
        name: "Mercury",
        radius: 0.383, // Earth radii
        mass: 0.055, // Earth masses
        temperature: 440, // K
        density: 5.43,
        orbitalPeriod: 87.97, // days
        orbitalEccentricity: 0.206,
        semiMajorAxis: 0.387, // AU
        insolationFlux: 9126,
        hostStar: "Sun",
        distance: 0, // We're here!
        discoveryYear: "Ancient",
        stellarTemp: 5778,
        stellarRadius: 1.0,
        stellarMass: 1.0,
        stellarLuminosity: 0,
        ra: 0,
        dec: 0,
        orbitalInclination: 7.0,
        longitudeOfPeriastron: 29,
        discoveryMethod: "Observation",
        discoveryFacility: "Naked Eye",
        numberOfStars: 1,
        numberOfPlanets: 8,
        spectralType: "G2V",
        stellarAge: 4.6,
        massJupiter: 0.000174,
        radiusJupiter: 0.0342,
        type: "terrestrial",
      },
      {
        name: "Venus",
        radius: 0.949,
        mass: 0.815,
        temperature: 737,
        density: 5.24,
        orbitalPeriod: 224.7,
        orbitalEccentricity: 0.007,
        semiMajorAxis: 0.723,
        insolationFlux: 2601,
        hostStar: "Sun",
        distance: 0,
        discoveryYear: "Ancient",
        stellarTemp: 5778,
        stellarRadius: 1.0,
        stellarMass: 1.0,
        stellarLuminosity: 0,
        ra: 0,
        dec: 0,
        orbitalInclination: 3.4,
        longitudeOfPeriastron: 55,
        discoveryMethod: "Observation",
        discoveryFacility: "Naked Eye",
        numberOfStars: 1,
        numberOfPlanets: 8,
        spectralType: "G2V",
        stellarAge: 4.6,
        massJupiter: 0.00257,
        radiusJupiter: 0.0847,
        type: "terrestrial",
      },
      {
        name: "Earth",
        radius: 1.0,
        mass: 1.0,
        temperature: 288,
        density: 5.51,
        orbitalPeriod: 365.25,
        orbitalEccentricity: 0.017,
        semiMajorAxis: 1.0,
        insolationFlux: 1.0,
        hostStar: "Sun",
        distance: 0,
        discoveryYear: "Home",
        stellarTemp: 5778,
        stellarRadius: 1.0,
        stellarMass: 1.0,
        stellarLuminosity: 0,
        ra: 0,
        dec: 0,
        orbitalInclination: 0.0,
        longitudeOfPeriastron: 102,
        discoveryMethod: "We live here!",
        discoveryFacility: "Home",
        numberOfStars: 1,
        numberOfPlanets: 8,
        spectralType: "G2V",
        stellarAge: 4.6,
        massJupiter: 0.00315,
        radiusJupiter: 0.0892,
        type: "terrestrial",
      },
      {
        name: "Mars",
        radius: 0.532,
        mass: 0.107,
        temperature: 210,
        density: 3.93,
        orbitalPeriod: 686.98,
        orbitalEccentricity: 0.094,
        semiMajorAxis: 1.524,
        insolationFlux: 0.43,
        hostStar: "Sun",
        distance: 0,
        discoveryYear: "Ancient",
        stellarTemp: 5778,
        stellarRadius: 1.0,
        stellarMass: 1.0,
        stellarLuminosity: 0,
        ra: 0,
        dec: 0,
        orbitalInclination: 1.85,
        longitudeOfPeriastron: 336,
        discoveryMethod: "Observation",
        discoveryFacility: "Naked Eye",
        numberOfStars: 1,
        numberOfPlanets: 8,
        spectralType: "G2V",
        stellarAge: 4.6,
        massJupiter: 0.000338,
        radiusJupiter: 0.0475,
        type: "terrestrial",
      },
      {
        name: "Jupiter",
        radius: 11.21,
        mass: 317.8,
        temperature: 165,
        density: 1.33,
        orbitalPeriod: 4332.59,
        orbitalEccentricity: 0.049,
        semiMajorAxis: 5.203,
        insolationFlux: 0.037,
        hostStar: "Sun",
        distance: 0,
        discoveryYear: "Ancient",
        stellarTemp: 5778,
        stellarRadius: 1.0,
        stellarMass: 1.0,
        stellarLuminosity: 0,
        ra: 0,
        dec: 0,
        orbitalInclination: 1.3,
        longitudeOfPeriastron: 14,
        discoveryMethod: "Observation",
        discoveryFacility: "Naked Eye",
        numberOfStars: 1,
        numberOfPlanets: 8,
        spectralType: "G2V",
        stellarAge: 4.6,
        massJupiter: 1.0,
        radiusJupiter: 1.0,
        type: "jupiter",
      },
      {
        name: "Saturn",
        radius: 9.45,
        mass: 95.2,
        temperature: 134,
        density: 0.69,
        orbitalPeriod: 10759.22,
        orbitalEccentricity: 0.057,
        semiMajorAxis: 9.537,
        insolationFlux: 0.011,
        hostStar: "Sun",
        distance: 0,
        discoveryYear: "Ancient",
        stellarTemp: 5778,
        stellarRadius: 1.0,
        stellarMass: 1.0,
        stellarLuminosity: 0,
        ra: 0,
        dec: 0,
        orbitalInclination: 2.49,
        longitudeOfPeriastron: 93,
        discoveryMethod: "Observation",
        discoveryFacility: "Naked Eye",
        numberOfStars: 1,
        numberOfPlanets: 8,
        spectralType: "G2V",
        stellarAge: 4.6,
        massJupiter: 0.299,
        radiusJupiter: 0.843,
        type: "jupiter",
      },
      {
        name: "Uranus",
        radius: 4.01,
        mass: 14.5,
        temperature: 76,
        density: 1.27,
        orbitalPeriod: 30688.5,
        orbitalEccentricity: 0.046,
        semiMajorAxis: 19.19,
        insolationFlux: 0.003,
        hostStar: "Sun",
        distance: 0,
        discoveryYear: "1781",
        stellarTemp: 5778,
        stellarRadius: 1.0,
        stellarMass: 1.0,
        stellarLuminosity: 0,
        ra: 0,
        dec: 0,
        orbitalInclination: 0.77,
        longitudeOfPeriastron: 170,
        discoveryMethod: "Telescope Observation",
        discoveryFacility: "William Herschel",
        numberOfStars: 1,
        numberOfPlanets: 8,
        spectralType: "G2V",
        stellarAge: 4.6,
        massJupiter: 0.0456,
        radiusJupiter: 0.358,
        type: "neptune",
      },
      {
        name: "Neptune",
        radius: 3.88,
        mass: 17.1,
        temperature: 72,
        density: 1.64,
        orbitalPeriod: 60182,
        orbitalEccentricity: 0.009,
        semiMajorAxis: 30.07,
        insolationFlux: 0.001,
        hostStar: "Sun",
        distance: 0,
        discoveryYear: "1846",
        stellarTemp: 5778,
        stellarRadius: 1.0,
        stellarMass: 1.0,
        stellarLuminosity: 0,
        ra: 0,
        dec: 0,
        orbitalInclination: 1.77,
        longitudeOfPeriastron: 44,
        discoveryMethod: "Mathematical Prediction",
        discoveryFacility: "Berlin Observatory",
        numberOfStars: 1,
        numberOfPlanets: 8,
        spectralType: "G2V",
        stellarAge: 4.6,
        massJupiter: 0.0537,
        radiusJupiter: 0.346,
        type: "neptune",
      },
    ];

    return solarSystem;
  }

  /**
   * Set the exoplanets list
   */
  setExoplanets(exoplanets) {
    // Add Solar System to the data
    const solarSystem = this.generateSolarSystemData();
    this.exoplanets = [...solarSystem, ...exoplanets];
    this.filteredExoplanets = [...this.exoplanets];
  }

  /**
   * Search by name or host star
   */
  search(query) {
    const queryLower = query.toLowerCase().trim();

    if (!queryLower) {
      this.filteredExoplanets = [...this.exoplanets];
    } else {
      this.filteredExoplanets = this.exoplanets.filter(
        (planet) =>
          planet.name.toLowerCase().includes(queryLower) ||
          planet.hostStar.toLowerCase().includes(queryLower)
      );
    }

    return this.filteredExoplanets;
  }

  /**
   * Unified search that returns both systems and individual planets
   * Groups planets by system, showing systems as expandable items
   * @param {string} query - Search query
   * @returns {Array} Array of {type: 'system'|'planet', data: {...}, planets: [...]} objects
   */
  searchUnified(query) {
    const queryLower = query.toLowerCase().trim();

    // Check cache for performance
    if (
      this.unifiedSearchCache &&
      this.unifiedSearchCacheQuery === queryLower
    ) {
      return this.unifiedSearchCache;
    }

    let planetsToSearch = queryLower
      ? this.search(query)
      : this.filteredExoplanets;

    // Group planets by host star
    const systemsMap = new Map();
    const standalonePlanets = [];

    planetsToSearch.forEach((planet) => {
      const starName = planet.hostStar;

      if (!systemsMap.has(starName)) {
        systemsMap.set(starName, []);
      }
      systemsMap.get(starName).push(planet);
    });

    // Convert to array of results
    const results = [];

    // Add systems (stars with 2+ planets) as expandable items
    systemsMap.forEach((planets, starName) => {
      if (planets.length >= 2) {
        // This is a system
        const systemDistance = planets[0].distance;
        results.push({
          type: "system",
          starName: starName,
          planetCount: planets.length,
          distance: systemDistance,
          planets: planets.sort((a, b) => {
            // Sort planets by orbital period or name
            if (a.orbitalPeriod && b.orbitalPeriod) {
              return a.orbitalPeriod - b.orbitalPeriod;
            }
            return a.name.localeCompare(b.name);
          }),
        });
      } else {
        // Single planet, add as standalone (but include system data for navigation)
        results.push({
          type: "planet",
          planet: planets[0],
          systemData: {
            starName: starName,
            planets: planets,
            distance: planets[0].distance,
          },
        });
      }
    });

    // Sort results: systems first, then standalone planets
    results.sort((a, b) => {
      if (a.type === "system" && b.type !== "system") return -1;
      if (a.type !== "system" && b.type === "system") return 1;

      // Within same type, sort by distance or name
      if (a.type === "system") {
        return a.distance - b.distance;
      } else {
        return a.planet.distance - b.planet.distance;
      }
    });

    // Cache the results for performance
    this.unifiedSearchCache = results;
    this.unifiedSearchCacheQuery = queryLower;

    return results;
  }

  /**
   * Apply filters (type, temperature, distance, discovery method, discovery facility)
   */
  applyFilters(filters) {
    const {
      type,
      tempMin,
      tempMax,
      distMax,
      discoveryMethod,
      discoveryFacility,
    } = filters;

    const tempMinValue = parseFloat(tempMin) || 0;
    const tempMaxValue = parseFloat(tempMax) || Infinity;
    const distMaxValue = parseFloat(distMax) || Infinity;

    // Invalidate unified search cache
    this.unifiedSearchCache = null;
    this.unifiedSearchCacheQuery = null;

    this.filteredExoplanets = this.exoplanets.filter((planet) => {
      const typeMatch = !type || planet.type === type;
      const tempMatch =
        planet.temperature >= tempMinValue &&
        planet.temperature <= tempMaxValue;
      const distMatch = planet.distance <= distMaxValue;

      // NEW: Discovery method filter
      const discoveryMethodMatch =
        !discoveryMethod ||
        (planet.discoveryMethod &&
          planet.discoveryMethod.includes(discoveryMethod));

      // NEW: Discovery facility filter (partial match for flexibility)
      const discoveryFacilityMatch =
        !discoveryFacility ||
        (planet.discoveryFacility &&
          planet.discoveryFacility.includes(discoveryFacility));

      return (
        typeMatch &&
        tempMatch &&
        distMatch &&
        discoveryMethodMatch &&
        discoveryFacilityMatch
      );
    });

    return this.filteredExoplanets;
  }

  /**
   * Apply system filters (filter systems, not individual planets)
   * @param {Object} filters - System filter criteria
   * @returns {Array} Array of filtered system results in unified format
   */
  applySystemFilters(filters) {
    const { minPlanets, distMax, spectralType } = filters;

    const minPlanetsValue = parseInt(minPlanets) || 2;
    const distMaxValue = parseFloat(distMax) || Infinity;

    // Get all systems
    const systems = this.getNotableSystems();

    // Filter systems based on criteria
    const filteredSystems = systems.filter((system) => {
      const planetCountMatch = system.planets.length >= minPlanetsValue;
      const distMatch = system.distance <= distMaxValue;

      // Spectral type filter (check first letter of spectral type)
      const spectralMatch =
        !spectralType ||
        (system.planets[0].spectralType &&
          system.planets[0].spectralType.startsWith(spectralType));

      return planetCountMatch && distMatch && spectralMatch;
    });

    // Convert to unified result format
    return filteredSystems.map((system) => ({
      type: "system",
      starName: system.starName,
      planetCount: system.planets.length,
      distance: system.distance,
      planets: system.planets,
    }));
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    // Invalidate unified search cache
    this.unifiedSearchCache = null;
    this.unifiedSearchCacheQuery = null;

    this.filteredExoplanets = [...this.exoplanets];
    return this.filteredExoplanets;
  }

  /**
   * Get filtered results
   */
  getFilteredExoplanets() {
    return this.filteredExoplanets;
  }

  /**
   * Get a random planet from filtered list
   */
  getRandomPlanet() {
    if (this.filteredExoplanets.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(
      Math.random() * this.filteredExoplanets.length
    );
    return this.filteredExoplanets[randomIndex];
  }

  /**
   * Group planets by their host star system
   * @returns {Map} Map of star names to arrays of planets
   */
  groupByStarSystem() {
    const systems = new Map();

    this.exoplanets.forEach((planet) => {
      const starName = planet.hostStar;
      if (!systems.has(starName)) {
        systems.set(starName, []);
      }
      systems.get(starName).push(planet);
    });

    return systems;
  }

  /**
   * Get multi-planet systems only
   * @param {number} minPlanets - Minimum number of planets required
   * @returns {Map} Map of star names to planet arrays (only systems with >= minPlanets)
   */
  getMultiPlanetSystems(minPlanets = 2) {
    const allSystems = this.groupByStarSystem();
    const multiPlanetSystems = new Map();

    allSystems.forEach((planets, starName) => {
      if (planets.length >= minPlanets) {
        multiPlanetSystems.set(starName, planets);
      }
    });

    return multiPlanetSystems;
  }

  /**
   * Get planets for a specific star system
   * @param {string} starName - Name of the host star
   * @returns {Array} Array of planets in that system
   */
  getPlanetsForSystem(starName) {
    return this.exoplanets.filter((planet) => planet.hostStar === starName);
  }

  /**
   * Get system statistics
   * @returns {Object} Statistics about star systems
   */
  getSystemStatistics() {
    const systems = this.groupByStarSystem();
    const multiPlanetSystems = this.getMultiPlanetSystems();

    const planetCounts = [];
    systems.forEach((planets) => {
      planetCounts.push(planets.length);
    });

    const maxPlanets = Math.max(...planetCounts);
    const largestSystem = [...systems.entries()].find(
      ([_, planets]) => planets.length === maxPlanets
    );

    return {
      totalSystems: systems.size,
      multiPlanetSystems: multiPlanetSystems.size,
      singlePlanetSystems: systems.size - multiPlanetSystems.size,
      largestSystemName: largestSystem ? largestSystem[0] : null,
      largestSystemPlanetCount: maxPlanets,
      averagePlanetsPerSystem:
        planetCounts.reduce((a, b) => a + b, 0) / planetCounts.length,
    };
  }

  /**
   * Search for star systems
   * @param {string} query - Search query
   * @returns {Array} Array of {starName, planets[]} objects
   */
  searchSystems(query) {
    const queryLower = query.toLowerCase().trim();
    const systems = this.groupByStarSystem();
    const results = [];

    systems.forEach((planets, starName) => {
      if (starName.toLowerCase().includes(queryLower)) {
        results.push({
          starName: starName,
          planets: planets,
        });
      }
    });

    return results;
  }

  /**
   * Get notable multi-planet systems
   * (Systems with 3+ planets, sorted by planet count)
   * @returns {Array} Array of {starName, planets[], count} objects
   */
  getNotableSystems() {
    const systems = this.getMultiPlanetSystems(3);
    const notable = [];

    systems.forEach((planets, starName) => {
      // Calculate average distance for the system (use first planet's distance)
      const systemDistance = planets[0]?.distance || 0;

      notable.push({
        starName: starName,
        planets: planets,
        count: planets.length,
        distance: systemDistance, // Add distance for galactic positioning
      });
    });

    // Sort by planet count (descending)
    notable.sort((a, b) => b.count - a.count);

    return notable;
  }

  /**
   * Get a random multi-planet system
   * @param {number} minPlanets - Minimum number of planets required
   * @returns {Object} {starName, planets[]} or null
   */
  getRandomSystem(minPlanets = 2) {
    const systems = this.getMultiPlanetSystems(minPlanets);
    const systemArray = Array.from(systems.entries());

    if (systemArray.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * systemArray.length);
    const [starName, planets] = systemArray[randomIndex];

    return {
      starName: starName,
      planets: planets,
    };
  }

  /**
   * Get all exoplanets (unfiltered)
   * @returns {Array} All exoplanets
   */
  getAllExoplanets() {
    return this.exoplanets;
  }
}
