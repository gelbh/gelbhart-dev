/**
 * realistic_physics.js
 * Calculate realistic physical properties for exoplanet rendering
 * Based on actual astronomical data and physics
 */

/**
 * Detect if a planet is likely tidally locked to its star
 * Based on orbital period, semi-major axis, and planet properties
 */
export function isTidallyLocked(planet) {
  // Planets very close to their stars are likely tidally locked
  if (planet.semiMajorAxis && planet.semiMajorAxis < 0.05) {
    return true; // Within 0.05 AU, tidal locking is very likely
  }

  // Short orbital periods suggest close orbits
  if (planet.orbitalPeriod && planet.orbitalPeriod < 10) {
    return true; // Less than 10 days - likely tidally locked
  }

  // Hot Jupiters are typically tidally locked
  if (planet.type === "jupiter" && planet.temperature > 1000) {
    return true;
  }

  return false;
}

/**
 * Calculate equilibrium temperature based on stellar properties
 * Uses the equation: T_eq = T_star * sqrt(R_star / (2 * a)) * (1 - A)^0.25
 * Where A is the Bond albedo
 */
export function calculateEquilibriumTemperature(planet) {
  // If we already have temperature data, use it
  if (planet.temperature) {
    return planet.temperature;
  }

  // Otherwise calculate from stellar properties
  const stellarTemp = planet.stellarTemp || 5778; // Default to Sun-like
  const stellarRadius = planet.stellarRadius || 1; // In solar radii
  const semiMajorAxis = planet.semiMajorAxis || 1; // In AU
  const albedo = getAlbedo(planet);

  // Convert stellar radius from solar radii to AU
  const stellarRadiusAU = stellarRadius * 0.00465047; // 1 R_sun = 0.00465 AU

  // Calculate equilibrium temperature
  const T_eq =
    stellarTemp *
    Math.sqrt(stellarRadiusAU / (2 * semiMajorAxis)) *
    Math.pow(1 - albedo, 0.25);

  return T_eq;
}

/**
 * Estimate Bond albedo based on planet type and properties
 */
export function getAlbedo(planet) {
  const type = planet.type;
  const temp = planet.temperature || 300;

  // Gas giants
  if (type === "jupiter") {
    if (temp < 150) return 0.5; // Cold Jupiters like Jupiter (high clouds)
    if (temp < 600) return 0.4; // Warm Jupiters
    if (temp < 1500) return 0.1; // Hot Jupiters (no reflective clouds)
    return 0.03; // Ultra-hot Jupiters (very dark)
  }

  // Ice giants
  if (type === "neptune") {
    if (temp < 100) return 0.6; // Very cold (icy)
    if (temp < 300) return 0.5; // Neptune-like
    return 0.3; // Warm ice giants
  }

  // Terrestrial planets
  if (type === "terrestrial" || type === "super-earth") {
    if (temp < 150) return 0.7; // Ice-covered
    if (temp < 273) return 0.4; // Partial ice
    if (temp < 373) return 0.3; // Earth-like (water + clouds)
    if (temp < 600) return 0.2; // Venus-like (thick atmosphere)
    if (temp < 1000) return 0.1; // Rocky with thin atmosphere
    return 0.05; // Lava world (very dark rock)
  }

  return 0.3; // Default moderate albedo
}

/**
 * Calculate insolation flux relative to Earth
 * S = L_star / (4 * pi * a^2)
 */
export function calculateInsolation(planet) {
  if (planet.insolationFlux) {
    return planet.insolationFlux;
  }

  const stellarLuminosity = planet.stellarLuminosity || 1; // In solar luminosities
  const semiMajorAxis = planet.semiMajorAxis || 1; // In AU

  // Insolation relative to Earth (Earth = 1.0)
  const insolation = stellarLuminosity / (semiMajorAxis * semiMajorAxis);

  return insolation;
}

/**
 * Determine if planet should have thermal emission visible
 */
export function hasThermalEmission(planet) {
  const temp = planet.temperature || calculateEquilibriumTemperature(planet);

  // Planets above ~800K have visible thermal emission
  return temp >= 800;
}

/**
 * Calculate thermal emission intensity based on temperature
 * Uses Stefan-Boltzmann law: j = σ * T^4
 */
export function getThermalEmissionIntensity(planet) {
  const temp = planet.temperature || calculateEquilibriumTemperature(planet);

  if (temp < 800) return 0;

  // Normalize to a visible range
  // At 1000K: weak glow
  // At 2000K: strong glow
  // At 3000K+: very bright

  const baseIntensity = Math.pow((temp - 800) / 2200, 1.5);
  return Math.min(1.0, baseIntensity * 0.5);
}

/**
 * Get thermal emission color based on blackbody temperature
 */
export function getThermalColor(temperature) {
  if (temperature < 1000) {
    return { r: 0.3, g: 0.0, b: 0.0 }; // Deep red
  } else if (temperature < 1500) {
    return { r: 0.8, g: 0.1, b: 0.0 }; // Red
  } else if (temperature < 2000) {
    return { r: 1.0, g: 0.3, b: 0.0 }; // Red-orange
  } else if (temperature < 2500) {
    return { r: 1.0, g: 0.5, b: 0.1 }; // Orange
  } else if (temperature < 3000) {
    return { r: 1.0, g: 0.7, b: 0.3 }; // Yellow-orange
  } else if (temperature < 4000) {
    return { r: 1.0, g: 0.9, b: 0.7 }; // Yellow-white
  } else {
    return { r: 1.0, g: 1.0, b: 1.0 }; // White
  }
}

/**
 * Determine atmospheric composition type based on planet properties
 */
export function getAtmosphereComposition(planet) {
  const type = planet.type;
  const temp = planet.temperature || 300;

  if (type === "jupiter") {
    return "hydrogen"; // H2/He atmosphere
  }

  if (type === "neptune") {
    if (temp < 150) return "methane"; // CH4 rich (blue)
    return "hydrogen"; // H2/He with methane
  }

  if (type === "terrestrial" || type === "super-earth") {
    if (temp < 150) return "none"; // Too cold, atmosphere likely frozen
    if (temp < 200) return "nitrogen"; // N2 dominated
    if (temp < 300) return "earth-like"; // N2/O2 possible
    if (temp < 500) return "co2-thick"; // CO2 dominated (Venus-like)
    if (temp < 1000) return "co2-thin"; // Thin CO2
    if (temp < 2000) return "silicate"; // Evaporated rock vapor
    return "metal"; // Evaporated metals
  }

  return "unknown";
}

/**
 * Get atmospheric color based on composition and stellar illumination
 */
export function getAtmosphereColor(planet, starColor) {
  const composition = getAtmosphereComposition(planet);
  const temp = planet.temperature || 300;

  // Base colors for different atmospheric compositions
  let baseColor;

  switch (composition) {
    case "hydrogen":
      if (temp < 150) baseColor = { r: 0.85, g: 0.92, b: 1.0 }; // Pale blue
      else if (temp < 1000)
        baseColor = { r: 0.95, g: 0.9, b: 0.85 }; // Pale tan
      else baseColor = { r: 0.9, g: 0.8, b: 0.7 }; // Brown (silicate clouds)
      break;

    case "methane":
      baseColor = { r: 0.65, g: 0.85, b: 1.0 }; // Blue (methane absorption)
      break;

    case "nitrogen":
      baseColor = { r: 0.8, g: 0.85, b: 0.95 }; // Very pale blue
      break;

    case "earth-like":
      baseColor = { r: 0.65, g: 0.75, b: 1.0 }; // Earth-like blue
      break;

    case "co2-thick":
      baseColor = { r: 1.0, g: 0.95, b: 0.8 }; // Yellowish (Venus-like)
      break;

    case "co2-thin":
      baseColor = { r: 1.0, g: 0.85, b: 0.7 }; // Orange-tan (Mars-like)
      break;

    case "silicate":
      baseColor = { r: 0.9, g: 0.7, b: 0.5 }; // Brown-orange
      break;

    case "metal":
      baseColor = { r: 0.8, g: 0.8, b: 0.7 }; // Gray
      break;

    default:
      baseColor = { r: 0.8, g: 0.85, b: 0.95 }; // Generic pale blue
  }

  // Tint by star color (atmospheres scatter stellar light)
  const starTint = starColor || { r: 1.0, g: 1.0, b: 1.0 };

  return {
    r: Math.min(1.0, baseColor.r * (0.8 + 0.2 * starTint.r)),
    g: Math.min(1.0, baseColor.g * (0.8 + 0.2 * starTint.g)),
    b: Math.min(1.0, baseColor.b * (0.8 + 0.2 * starTint.b)),
  };
}

/**
 * Calculate atmospheric density/thickness
 * Returns a value from 0 (no atmosphere) to 1 (very thick)
 */
export function getAtmosphereDensity(planet) {
  const type = planet.type;
  const temp = planet.temperature || 300;
  const mass = planet.mass || 1; // In Earth masses

  // Escape velocity considerations
  // More massive planets retain atmospheres better
  let baseDensity = Math.min(1.0, Math.sqrt(mass) * 0.5);

  if (type === "jupiter" || type === "neptune") {
    return 0.8 + baseDensity * 0.2; // Gas giants always have thick atmospheres
  }

  if (type === "terrestrial" || type === "super-earth") {
    // Temperature affects atmosphere retention
    if (temp < 150) return 0.1 * baseDensity; // Frozen out
    if (temp < 300) return 0.5 * baseDensity; // Moderate
    if (temp < 700) return 0.7 * baseDensity; // Thick (Venus-like)
    if (temp < 2000) return 0.3 * baseDensity; // Escaping
    return 0.0; // Lost to heat
  }

  return 0.3; // Default moderate atmosphere
}

/**
 * Determine if planet should have visible clouds
 */
export function hasClouds(planet) {
  const type = planet.type;
  const temp = planet.temperature || 300;

  // Gas giants always have visible cloud structures
  if (type === "jupiter" || type === "neptune") {
    return true;
  }

  // Terrestrial planets need right temperature for water/ice clouds
  if (type === "terrestrial" || type === "super-earth") {
    // Water clouds form in habitable zone
    if (temp >= 250 && temp <= 400) return true;
    // Sulfuric acid clouds (Venus-like)
    if (temp >= 400 && temp <= 700) return true;
  }

  return false;
}

/**
 * Calculate surface roughness for physically accurate materials
 */
export function getSurfaceRoughness(planet) {
  const type = planet.type;
  const temp = planet.temperature || 300;

  // Gas giants have smooth, fluid-like surfaces
  if (type === "jupiter" || type === "neptune") {
    return 0.7; // Somewhat rough due to atmospheric turbulence
  }

  // Rocky planets
  if (type === "terrestrial" || type === "super-earth") {
    // Molten surfaces are smooth
    if (temp > 1500) return 0.3;

    // Partial melting
    if (temp > 1000) return 0.5;

    // Typical rocky surface
    if (temp > 273) return 0.9;

    // Icy surfaces
    return 0.7;
  }

  return 0.8; // Default rough
}

/**
 * Calculate metalness for PBR materials
 */
export function getMetalness(planet) {
  const type = planet.type;
  const density = planet.density;

  // Gas giants are not metallic
  if (type === "jupiter" || type === "neptune") {
    return 0.0;
  }

  // High density suggests iron-rich composition
  if (density && density > 7.0) {
    return 0.3; // Mercury-like (large iron core exposed)
  }

  // Earth-like planets with oceans
  if (planet.temperature > 273 && planet.temperature < 373) {
    return 0.2; // Water has some specular reflection
  }

  return 0.05; // Typical rocky surface
}

/**
 * Estimate rotation period (for non-tidally locked planets)
 */
export function getRotationPeriod(planet) {
  // If tidally locked, rotation period = orbital period
  if (isTidallyLocked(planet)) {
    return planet.orbitalPeriod || 1;
  }

  // Otherwise, estimate based on planet type and size
  const type = planet.type;
  const radius = planet.radius || 1; // In Earth radii

  if (type === "jupiter") {
    // Gas giants rotate fast (Jupiter: 10 hours)
    return 0.4 + radius * 0.2; // Days
  }

  if (type === "terrestrial" || type === "super-earth") {
    // Rocky planets vary widely (Earth: 1 day, Venus: 243 days)
    // Smaller planets tend to rotate faster
    return 0.5 + radius * 0.5; // Days
  }

  return 1.0; // Default to Earth-like
}

/**
 * Calculate day-night temperature difference for tidally locked planets
 */
export function getDayNightTemperatureDiff(planet) {
  if (!isTidallyLocked(planet)) {
    return 0; // Not applicable
  }

  const baseTemp = planet.temperature || 300;
  const atmosphereDensity = getAtmosphereDensity(planet);

  // Thick atmospheres redistribute heat better
  // Thin atmospheres allow extreme temperature differences
  const diffFactor = 1.0 - atmosphereDensity * 0.5;

  // Day side can be much hotter than average
  // Night side much colder
  const tempDiff = baseTemp * diffFactor * 0.4;

  return {
    daySideTemp: baseTemp + tempDiff,
    nightSideTemp: Math.max(0, baseTemp - tempDiff),
  };
}

/**
 * Determine if planet is a lava world (molten surface)
 */
export function isLavaWorld(planet) {
  const temp = planet.temperature || 300;

  // Silicate rocks melt around 1500K
  // Lava worlds are planets hot enough to have molten surfaces
  return temp >= 1500;
}

/**
 * Get realistic planet color based on all properties
 */
export function getRealisticColor(planet) {
  const type = planet.type;
  const temp = planet.temperature || 300;
  const density = planet.density;

  // Lava worlds glow with thermal emission
  if (isLavaWorld(planet)) {
    return getThermalColor(temp);
  }

  // Gas giants
  if (type === "jupiter") {
    if (temp < 150) return { r: 0.78, g: 0.83, b: 0.91 }; // Pale blue-gray (ammonia ice)
    if (temp < 600) return { r: 0.83, g: 0.77, b: 0.66 }; // Tan (Jupiter-like)
    if (temp < 1500) return { r: 0.83, g: 0.65, b: 0.45 }; // Orange-brown (warm)
    return { r: 0.54, g: 0.44, b: 0.28 }; // Dark brown (hot Jupiter)
  }

  // Ice giants
  if (type === "neptune") {
    if (temp < 100) return { r: 0.72, g: 0.83, b: 1.0 }; // Pale blue (methane ice)
    if (temp < 300) return { r: 0.63, g: 0.78, b: 0.91 }; // Neptune blue (methane gas)
    return { r: 0.73, g: 0.66, b: 0.6 }; // Gray-tan (warm)
  }

  // Terrestrial/rocky planets
  if (type === "terrestrial" || type === "super-earth") {
    // Ice worlds
    if (temp < 150) return { r: 0.91, g: 0.94, b: 1.0 }; // White-blue ice
    if (temp < 273) return { r: 0.8, g: 0.87, b: 0.91 }; // Pale blue-gray ice

    // Habitable zone - check for water
    if (temp >= 273 && temp < 373) {
      // High density = rocky (Mars-like)
      if (density && density > 4.5) {
        return { r: 0.42, g: 0.49, b: 0.56 }; // Blue-gray (Earth-like ocean)
      }
      // Lower density = more ice/volatiles
      return { r: 0.54, g: 0.49, b: 0.44 }; // Brown-gray (dry)
    }

    // Hot terrestrials
    if (temp < 700) return { r: 0.83, g: 0.72, b: 0.54 }; // Tan (desert)
    if (temp < 1200) return { r: 0.78, g: 0.58, b: 0.39 }; // Orange-brown (hot)

    // Approaching melting point
    return { r: 0.66, g: 0.33, b: 0.2 }; // Dark red-brown
  }

  // Default
  return { r: 0.7, g: 0.7, b: 0.7 };
}
