/**
 * ApiManager
 * Handles fetching and processing exoplanet data from NASA API
 */
export class ApiManager {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint;
    this.exoplanets = [];
  }

  /**
   * Fetch exoplanets from NASA API (via backend proxy)
   * Processes data in batches for smoother UI experience
   */
  async fetchExoplanets(onBatchProcessed, onComplete, onError) {
    try {
      const response = await fetch(this.apiEndpoint);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Initialize arrays
      this.exoplanets = [];

      // Process data in batches
      const batchSize = 100;
      let currentBatch = 0;

      const processBatch = () => {
        const start = currentBatch * batchSize;
        const end = Math.min(start + batchSize, data.length);

        // Process this batch of planets
        const batchPlanets = data
          .slice(start, end)
          .map((planet) => this.processPlanetData(planet));

        // Add to collection
        this.exoplanets.push(...batchPlanets);

        // Callback for UI updates
        if (onBatchProcessed) {
          onBatchProcessed(batchPlanets, this.exoplanets);
        }

        // Move to next batch
        currentBatch++;

        // Continue processing if there are more planets
        if (end < data.length) {
          if ("requestIdleCallback" in window) {
            requestIdleCallback(processBatch);
          } else {
            setTimeout(processBatch, 0);
          }
        } else {
          if (onComplete) {
            onComplete(this.exoplanets);
          }
        }
      };

      // Start processing batches
      processBatch();
    } catch (error) {
      console.error("Error fetching exoplanets:", error);
      if (onError) {
        onError(error);
      }
    }
  }

  /**
   * Process and classify planet data
   */
  processPlanetData(raw) {
    const radius = raw.pl_rade || 1.0; // Earth radii
    const mass = raw.pl_bmasse || 1.0; // Earth masses
    const temp = raw.pl_eqt || 288; // Kelvin
    const distance = raw.sy_dist || 0; // parsecs
    const density = raw.pl_dens || null; // g/cm³
    const orbitalEccentricity = raw.pl_orbeccen || 0; // 0-1
    const semiMajorAxis = raw.pl_orbsmax || null; // AU
    const insolationFlux = raw.pl_insol || null; // Earth flux
    const stellarTemp = raw.st_teff || 5778; // Kelvin (default to Sun)
    const stellarRadius = raw.st_rad || 1.0; // Solar radii
    const stellarMass = raw.st_mass || 1.0; // Solar masses
    const stellarLuminosity = raw.st_lum || null; // Log solar luminosity
    const ra = raw.ra || null; // Right Ascension (degrees)
    const dec = raw.dec || null; // Declination (degrees)

    // NEW: Orbital mechanics
    const orbitalInclination = raw.pl_orbincl || null; // Degrees (0-90)
    const longitudeOfPeriastron = raw.pl_orblper || null; // Degrees

    // NEW: Discovery context
    const discoveryMethod = raw.discoverymethod || null; // e.g., "Transit", "Radial Velocity"
    const discoveryFacility = raw.disc_facility || null; // e.g., "Kepler", "TESS"

    // NEW: System context
    const numberOfStars = raw.sy_snum || 1; // Number of stars in system
    const numberOfPlanets = raw.sy_pnum || 1; // Number of planets in system

    // NEW: Stellar properties
    const spectralType = raw.st_spectype || null; // e.g., "G2V", "M3V"
    const stellarAge = raw.st_age || null; // Gyr (billion years)

    // NEW: Gas giant measurements
    const massJupiter = raw.pl_massj || null; // Jupiter masses
    const radiusJupiter = raw.pl_radj || null; // Jupiter radii

    return {
      name: raw.pl_name || "Unknown",
      radius: radius,
      mass: mass,
      temperature: temp,
      density: density,
      orbitalPeriod: raw.pl_orbper || 0,
      orbitalEccentricity: orbitalEccentricity,
      semiMajorAxis: semiMajorAxis,
      insolationFlux: insolationFlux,
      hostStar: raw.hostname || "Unknown",
      distance: distance * 3.26156, // Convert parsecs to light-years
      discoveryYear: raw.disc_year || "Unknown",
      stellarTemp: stellarTemp,
      stellarRadius: stellarRadius,
      stellarMass: stellarMass,
      stellarLuminosity: stellarLuminosity,
      ra: ra, // Right Ascension in degrees
      dec: dec, // Declination in degrees

      // NEW: Orbital mechanics data
      orbitalInclination: orbitalInclination,
      longitudeOfPeriastron: longitudeOfPeriastron,

      // NEW: Discovery context
      discoveryMethod: discoveryMethod,
      discoveryFacility: discoveryFacility,

      // NEW: System context
      numberOfStars: numberOfStars,
      numberOfPlanets: numberOfPlanets,

      // NEW: Enhanced stellar properties
      spectralType: spectralType,
      stellarAge: stellarAge,

      // NEW: Gas giant measurements
      massJupiter: massJupiter,
      radiusJupiter: radiusJupiter,

      type: this.classifyPlanet(radius, temp, density, mass),
      raw: raw,
    };
  }

  /**
   * Classify planet based on radius, temperature, density, and mass
   */
  classifyPlanet(radius, temp, density, mass) {
    // Use density for more accurate classification when available
    if (density !== null && density !== undefined) {
      if (density > 3.5) {
        return radius < 1.5 ? "terrestrial" : "super-earth";
      } else if (density >= 1.0 && density <= 2.5) {
        return "neptune";
      } else if (density < 1.5) {
        return "jupiter";
      }
    }

    // Fallback to radius-based classification
    if (radius < 1.25) {
      return "terrestrial";
    } else if (radius < 2.0) {
      if (mass !== null && mass !== undefined) {
        const expectedMassForRocky = Math.pow(radius, 3.7);
        if (mass < expectedMassForRocky * 1.5) {
          return "super-earth";
        }
      }
      return "super-earth";
    } else if (radius < 4.0) {
      return "neptune";
    } else if (radius < 10.0) {
      return "neptune";
    } else {
      return "jupiter";
    }
  }

  /**
   * Get all exoplanets
   */
  getAllExoplanets() {
    return this.exoplanets;
  }
}
