import * as THREE from "three";
import { hashCode, seededRandom } from "./utils";
import * as RealisticPhysics from "./realistic_physics";
import {
  planetSurfaceVertexShader,
  planetSurfaceFragmentShader,
  tidalLockVertexShader,
  tidalLockFragmentShader,
  gasGiantVertexShader,
  gasGiantFragmentShader,
} from "./realistic_shaders";

/**
 * PlanetMaterialGenerator
 * Handles procedural material and texture generation for planets
 * Includes support for realistic Solar System planet textures and procedural exoplanet materials
 * Enhanced with physically-based rendering
 */
export class PlanetMaterialGenerator {
  /**
   * Initialize the material generator
   * @param {Map} textureCache - Texture cache object from parent renderer
   * @param {Object} solarSystemTextureURLs - Map of planet names to texture URLs
   */
  constructor(textureCache, solarSystemTextureURLs) {
    this.textureCache = textureCache;
    this.solarSystemTextureURLs = solarSystemTextureURLs;
    this.textureLoader = new THREE.TextureLoader();
    this.useRealisticShaders = true; // Toggle for realistic rendering
  }

  /**
   * Generate procedural planet material
   * Main entry point for material generation
   * @param {Object} planet - Planet data object
   * @param {Object} options - Rendering options (starPosition, starColor, etc.)
   * @returns {THREE.Material} Generated material for the planet
   */
  generatePlanetMaterial(planet, options = {}) {
    // Check if this is a Solar System planet - use realistic texture
    if (this.isSolarSystemPlanet(planet)) {
      return this.createSolarSystemMaterial(planet);
    }

    // Use realistic shader-based materials if enabled
    if (this.useRealisticShaders && options.starPosition) {
      return this.createRealisticMaterial(planet, options);
    }

    // Otherwise, use procedural generation for exoplanets (legacy mode)
    // Check cache first to avoid regenerating the same texture
    const cacheKey = planet.name;
    let texture = this.textureCache.planet.get(cacheKey);

    if (!texture) {
      // Generate texture if not cached
      const color = this.getPlanetColor(planet);

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");

      // Base color
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 512, 512);

      // Add noise/texture based on planet type
      this.addProceduralTexture(ctx, planet);

      texture = new THREE.CanvasTexture(canvas);

      // Cache the texture for future use
      this.textureCache.planet.set(cacheKey, texture);
    }

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: this.getPlanetRoughness(planet),
      metalness: 0.1,
    });
  }

  /**
   * Create realistic shader-based material with proper physics
   * @param {Object} planet - Planet data object
   * @param {Object} options - { starPosition, starColor, starIntensity, planetRadius }
   * @returns {THREE.ShaderMaterial} Physically accurate shader material
   */
  createRealisticMaterial(planet, options) {
    const {
      starPosition = new THREE.Vector3(5, 3, 5),
      starColor = new THREE.Vector3(1.0, 1.0, 1.0),
      starIntensity = 2.0,
      planetRadius = 1.0,
    } = options;

    // Get realistic physical properties
    const isTidallyLocked = RealisticPhysics.isTidallyLocked(planet);
    const isLavaWorld = RealisticPhysics.isLavaWorld(planet);
    const hasThermalEmission = RealisticPhysics.hasThermalEmission(planet);
    const thermalIntensity =
      RealisticPhysics.getThermalEmissionIntensity(planet);
    const thermalColor = RealisticPhysics.getThermalColor(
      planet.temperature || 300
    );
    const realisticColor = RealisticPhysics.getRealisticColor(planet);

    // Generate or retrieve surface texture
    const cacheKey = planet.name + "_realistic";
    let texture = this.textureCache.planet.get(cacheKey);

    if (!texture) {
      texture = this.generateEnhancedTexture(planet, realisticColor);
      this.textureCache.planet.set(cacheKey, texture);
    }

    // For gas giants, use specialized shader
    if (planet.type === "jupiter" || planet.type === "neptune") {
      return this.createGasGiantMaterial(planet, texture, {
        starPosition,
        starColor,
        starIntensity,
        realisticColor,
      });
    }

    // For tidally locked planets, use specialized shader
    if (isTidallyLocked) {
      return this.createTidallyLockedMaterial(planet, texture, {
        starPosition,
        starColor,
        starIntensity,
        isLavaWorld,
        thermalColor,
        thermalIntensity,
      });
    }

    // For normal rotating planets, use standard surface shader
    return this.createRotatingPlanetMaterial(planet, texture, {
      starPosition,
      starColor,
      starIntensity,
      hasThermalEmission,
      thermalColor,
      thermalIntensity,
    });
  }

  /**
   * Create gas giant material with atmospheric bands
   */
  createGasGiantMaterial(planet, texture, options) {
    const { starPosition, starColor, starIntensity, realisticColor } = options;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        bandTexture: { value: texture },
        starPosition: { value: starPosition },
        starColor: { value: starColor },
        starIntensity: { value: starIntensity },
        rotationOffset: { value: 0.0 },
        baseColor: {
          value: new THREE.Vector3(
            realisticColor.r,
            realisticColor.g,
            realisticColor.b
          ),
        },
        turbulence: { value: planet.type === "jupiter" ? 0.15 : 0.08 },
      },
      vertexShader: gasGiantVertexShader,
      fragmentShader: gasGiantFragmentShader,
      side: THREE.FrontSide,
    });

    // Store for animation
    material.userData.isGasGiant = true;

    return material;
  }

  /**
   * Create tidally locked planet material
   */
  createTidallyLockedMaterial(planet, texture, options) {
    const {
      starPosition,
      starColor,
      starIntensity,
      isLavaWorld,
      thermalColor,
      thermalIntensity,
    } = options;

    const tempDiff = RealisticPhysics.getDayNightTemperatureDiff(planet);
    const realisticColor = RealisticPhysics.getRealisticColor(planet);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        surfaceTexture: { value: texture },
        starPosition: { value: starPosition },
        starColor: { value: starColor },
        starIntensity: { value: starIntensity },
        daySideColor: {
          value: new THREE.Vector3(
            realisticColor.r,
            realisticColor.g,
            realisticColor.b
          ),
        },
        nightSideColor: {
          value: new THREE.Vector3(
            thermalColor.r,
            thermalColor.g,
            thermalColor.b
          ),
        },
        temperature: { value: planet.temperature || 300 },
        nightSideEmission: { value: thermalIntensity },
        isLavaWorld: { value: isLavaWorld },
      },
      vertexShader: tidalLockVertexShader,
      fragmentShader: tidalLockFragmentShader,
      side: THREE.FrontSide,
    });

    material.userData.isTidallyLocked = true;

    return material;
  }

  /**
   * Create rotating planet material with day-night cycle
   */
  createRotatingPlanetMaterial(planet, texture, options) {
    const {
      starPosition,
      starColor,
      starIntensity,
      hasThermalEmission,
      thermalColor,
      thermalIntensity,
    } = options;

    const emissiveColor = hasThermalEmission
      ? new THREE.Vector3(thermalColor.r, thermalColor.g, thermalColor.b)
      : new THREE.Vector3(0, 0, 0);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        surfaceTexture: { value: texture },
        starPosition: { value: starPosition },
        starColor: { value: starColor },
        starIntensity: { value: starIntensity },
        planetRadius: { value: 1.0 },
        hasClouds: { value: false },
        cloudTexture: { value: null },
        cloudOpacity: { value: 0.0 },
        emissiveColor: { value: emissiveColor },
        emissiveIntensity: { value: thermalIntensity },
        ambientLight: { value: 0.05 },
      },
      vertexShader: planetSurfaceVertexShader,
      fragmentShader: planetSurfaceFragmentShader,
      side: THREE.FrontSide,
    });

    return material;
  }

  /**
   * Generate enhanced procedural texture with more realistic features
   */
  generateEnhancedTexture(planet, realisticColor) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; // Higher resolution for better quality
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Base color using realistic physics
    const colorHex = `rgb(${Math.floor(realisticColor.r * 255)}, ${Math.floor(
      realisticColor.g * 255
    )}, ${Math.floor(realisticColor.b * 255)})`;
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 1024, 1024);

    // Add enhanced procedural features
    this.addEnhancedProceduralTexture(ctx, planet);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return texture;
  }

  /**
   * Add enhanced procedural texture features
   */
  addEnhancedProceduralTexture(ctx, planet) {
    const seed = hashCode(planet.name);
    const random = seededRandom(seed);
    const size = 1024;

    // Multi-octave noise for more realistic terrain
    this.addMultiLayerNoise(ctx, random, size, planet.type);

    // Add type-specific features
    if (planet.type === "jupiter") {
      this.addEnhancedGasGiantFeatures(ctx, random, size);
    } else if (planet.type === "neptune") {
      this.addEnhancedIceGiantFeatures(ctx, random, size);
    } else if (planet.type === "terrestrial" || planet.type === "super-earth") {
      this.addEnhancedTerrestrialFeatures(ctx, planet, random, size);
    }
  }

  /**
   * Add multi-layer Perlin-like noise for realistic terrain
   */
  addMultiLayerNoise(ctx, random, size, planetType) {
    const intensity =
      planetType === "jupiter" || planetType === "neptune" ? 0.12 : 0.18;

    // Large features (octave 1)
    for (let i = 0; i < size * 3; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 8 + random() * 12;
      ctx.fillStyle = `rgba(0, 0, 0, ${random() * intensity})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Medium features (octave 2)
    for (let i = 0; i < size * 5; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 3 + random() * 5;
      ctx.fillStyle = `rgba(0, 0, 0, ${random() * intensity * 0.7})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Small features (octave 3)
    for (let i = 0; i < size * 8; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 1 + random() * 2;
      ctx.fillStyle = `rgba(0, 0, 0, ${random() * intensity * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Enhanced gas giant features with more detail
   */
  addEnhancedGasGiantFeatures(ctx, random, size) {
    // Atmospheric bands with varying opacity
    const numBands = 12 + Math.floor(random() * 6);
    for (let i = 0; i < numBands; i++) {
      const y = (i / numBands) * size + (random() * 30 - 15);
      const bandHeight = size / (numBands * 2);
      const opacity = 0.08 + random() * 0.12;
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.fillRect(0, y, size, bandHeight);

      // Add turbulence at band edges
      for (let j = 0; j < 20; j++) {
        const x = random() * size;
        const vy = y + (random() - 0.5) * bandHeight * 2;
        const width = 15 + random() * 30;
        const height = 5 + random() * 15;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + random() * 0.1})`;
        ctx.beginPath();
        ctx.ellipse(x, vy, width, height, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Large storm systems (Great Red Spot style)
    const numStorms = 2 + Math.floor(random() * 3);
    for (let i = 0; i < numStorms; i++) {
      const x = random() * size;
      const y = random() * size;
      const width = 60 + random() * 100;
      const height = 30 + random() * 50;

      ctx.fillStyle = `rgba(100, 50, 30, ${0.25 + random() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();

      // Storm center
      ctx.fillStyle = `rgba(120, 60, 40, ${0.15 + random() * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        width * 0.6,
        height * 0.6,
        random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  /**
   * Enhanced ice giant features
   */
  addEnhancedIceGiantFeatures(ctx, random, size) {
    // Smoother bands with less contrast
    const numBands = 8 + Math.floor(random() * 4);
    for (let i = 0; i < numBands; i++) {
      const y = (i / numBands) * size;
      ctx.fillStyle = `rgba(0, 0, 0, ${random() * 0.1})`;
      ctx.fillRect(0, y, size, size / (numBands * 2));
    }

    // Subtle atmospheric features
    for (let i = 0; i < 12; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 25 + random() * 50;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.04 + random() * 0.08})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Enhanced terrestrial planet features
   */
  addEnhancedTerrestrialFeatures(ctx, planet, random, size) {
    const temp = planet.temperature || 300;

    if (temp >= 1500) {
      // Lava world - glowing cracks and volcanic features
      this.addLavaFeatures(ctx, random, size);
    } else if (temp < 150) {
      // Ice world - cracks and crystalline features
      this.addIceFeatures(ctx, random, size);
    } else if (temp < 250) {
      // Frozen - large ice sheets
      this.addFrozenFeatures(ctx, random, size);
    } else if (temp < 400) {
      // Potentially habitable - add varied terrain
      this.addHabitableFeatures(ctx, planet, random, size);
    } else {
      // Hot/desert world - craters and dunes
      this.addDesertFeatures(ctx, random, size);
    }
  }

  /**
   * Add lava world features
   */
  addLavaFeatures(ctx, random, size) {
    // Glowing lava channels
    for (let i = 0; i < 50; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 15 + random() * 40;

      // Outer glow
      ctx.strokeStyle = `rgba(255, 100, 0, ${0.4 + random() * 0.3})`;
      ctx.lineWidth = 4 + random() * 6;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner bright area
      ctx.strokeStyle = `rgba(255, 200, 100, ${0.3 + random() * 0.3})`;
      ctx.lineWidth = 2 + random() * 3;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Lava flows
    for (let i = 0; i < 30; i++) {
      const startX = random() * size;
      const startY = random() * size;
      const length = 50 + random() * 150;
      const angle = random() * Math.PI * 2;

      ctx.strokeStyle = `rgba(255, 80, 0, ${0.3 + random() * 0.3})`;
      ctx.lineWidth = 3 + random() * 5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      // Create winding lava flow
      let x = startX;
      let y = startY;
      for (let j = 0; j < 10; j++) {
        x += Math.cos(angle + (random() - 0.5) * 0.5) * (length / 10);
        y += Math.sin(angle + (random() - 0.5) * 0.5) * (length / 10);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /**
   * Add ice world features
   */
  addIceFeatures(ctx, random, size) {
    // Ice cracks
    for (let i = 0; i < 80; i++) {
      const x = random() * size;
      const y = random() * size;
      const length = 30 + random() * 100;
      const angle = random() * Math.PI * 2;

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 + random() * 0.18})`;
      ctx.lineWidth = 1 + random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    // Bright ice patches
    for (let i = 0; i < 30; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 20 + random() * 40;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Add frozen world features
   */
  addFrozenFeatures(ctx, random, size) {
    // Large ice sheets
    for (let i = 0; i < 15; i++) {
      const x = random() * size;
      const y = random() * size;
      const width = 80 + random() * 150;
      const height = 60 + random() * 120;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.06 + random() * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Add habitable zone features (potentially Earth-like)
   */
  addHabitableFeatures(ctx, planet, random, size) {
    const density = planet.density || 5.0;

    // If high density and right temperature, might have liquid water
    if (
      density > 4.0 &&
      planet.temperature >= 273 &&
      planet.temperature < 373
    ) {
      // Add darker regions for potential oceans
      for (let i = 0; i < 8; i++) {
        const x = random() * size;
        const y = random() * size;
        const width = 100 + random() * 300;
        const height = 80 + random() * 250;

        ctx.fillStyle = `rgba(0, 50, 100, ${0.15 + random() * 0.15})`;
        ctx.beginPath();
        ctx.ellipse(x, y, width, height, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add coastline detail
      for (let i = 0; i < 50; i++) {
        const x = random() * size;
        const y = random() * size;
        const radius = 10 + random() * 30;

        ctx.fillStyle = `rgba(100, 80, 60, ${0.1 + random() * 0.12})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Add terrain variation
    for (let i = 0; i < 40; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 15 + random() * 40;

      ctx.strokeStyle = `rgba(0, 0, 0, ${0.08 + random() * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /**
   * Add desert/hot world features
   */
  addDesertFeatures(ctx, random, size) {
    // Craters
    const craterCount = 35 + Math.floor(random() * 20);
    for (let i = 0; i < craterCount; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 10 + random() * 50;

      // Crater rim
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 + random() * 0.2})`;
      ctx.lineWidth = 2 + random() * 3;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Crater shadow
      ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(x + radius * 0.2, y + radius * 0.2, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dune patterns for very hot worlds
    if (random() > 0.5) {
      for (let i = 0; i < 20; i++) {
        const y = random() * size;
        const amplitude = 20 + random() * 40;
        const wavelength = 50 + random() * 100;

        ctx.strokeStyle = `rgba(0, 0, 0, ${0.08 + random() * 0.08})`;
        ctx.lineWidth = 3 + random() * 4;
        ctx.beginPath();

        for (let x = 0; x < size; x += 10) {
          const dy = Math.sin((x / wavelength) * Math.PI * 2) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y + dy);
          } else {
            ctx.lineTo(x, y + dy);
          }
        }
        ctx.stroke();
      }
    }
  }

  /**
   * Check if a planet is from our Solar System
   * @param {Object} planet - Planet data object
   * @returns {boolean} True if planet is from Solar System
   */
  isSolarSystemPlanet(planet) {
    return (
      planet.hostStar === "Sun" && this.solarSystemTextureURLs[planet.name]
    );
  }

  /**
   * Create realistic material for Solar System planets
   * Loads actual texture images for accurate planetary surfaces
   * @param {Object} planet - Planet data object
   * @returns {THREE.Material} Material with loaded or fallback texture
   */
  createSolarSystemMaterial(planet) {
    const material = new THREE.MeshStandardMaterial({
      roughness: this.getPlanetRoughness(planet),
      metalness: planet.name === "Earth" ? 0.3 : 0.1,
    });

    // Load texture asynchronously
    const textureURL = this.solarSystemTextureURLs[planet.name];
    if (textureURL) {
      this.textureLoader.load(
        textureURL,
        (texture) => {
          material.map = texture;
          material.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.warn(
            `Failed to load texture for ${planet.name}, using procedural texture`
          );
          // Fallback to procedural texture
          const color = this.getPlanetColor(planet);
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 512, 512);
          this.addProceduralTexture(ctx, planet);
          material.map = new THREE.CanvasTexture(canvas);
          material.needsUpdate = true;
        }
      );
    }

    // Special handling for Earth - add specular map for oceans
    if (planet.name === "Earth") {
      material.roughness = 0.7;
      material.metalness = 0.2;
    }

    // Special handling for Saturn - it has rings
    if (planet.name === "Saturn") {
      material.roughness = 0.8;
    }

    return material;
  }

  /**
   * Get planet color based on temperature, type, insolation, and density
   * @param {Object} planet - Planet data object
   * @returns {string} Hex color string
   */
  getPlanetColor(planet) {
    const temp = planet.temperature;
    const type = planet.type;
    const insolation = planet.insolationFlux;
    const density = planet.density;

    // Gas Giants (Jupiter-like)
    if (type === "jupiter") {
      if (temp < 150) return "#c8d4e8";
      else if (temp < 400) return "#d4c4a8";
      else if (temp < 800) return "#d4a574";
      else if (temp < 1500) return "#8b6f47";
      else return "#4a3728";
    }

    // Ice Giants (Neptune-like)
    if (type === "neptune") {
      if (temp < 150) return "#b8d4ff";
      else if (temp < 300) return "#a0c8e8";
      else if (temp < 600) return "#98b8d8";
      else return "#b8a898";
    }

    // Rocky Planets (Terrestrial & Super-Earth)
    if (type === "terrestrial" || type === "super-earth") {
      const isHighDensity = density !== null && density > 4.5;

      if (temp < 200) {
        return insolation && insolation < 0.3 ? "#e8f0ff" : "#d8e8f8";
      } else if (temp < 273) {
        return "#c8d8e8";
      } else if (temp < 320) {
        if (isHighDensity) {
          return "#6b8e9f";
        } else if (insolation && insolation > 0.8 && insolation < 1.2) {
          return "#5a7d8f";
        } else {
          return "#8ba3b5";
        }
      } else if (temp < 500) {
        return "#d4b48a";
      } else if (temp < 800) {
        return "#c89464";
      } else if (temp < 1500) {
        return "#a85532";
      } else {
        return "#8b3a1f";
      }
    }

    // Fallback
    if (temp < 250) return "#b8d4e8";
    else if (temp < 400) return "#8ba3b5";
    else if (temp < 800) return "#d4a574";
    else return "#d47d5a";
  }

  /**
   * Add procedural texture to planet canvas
   * Generates noise and type-specific features
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
   * @param {Object} planet - Planet data object
   */
  addProceduralTexture(ctx, planet) {
    const seed = hashCode(planet.name);
    const random = seededRandom(seed);

    const noiseIntensity =
      planet.type === "jupiter" || planet.type === "neptune" ? 0.15 : 0.2;
    const noiseCount =
      planet.type === "jupiter" || planet.type === "neptune" ? 7000 : 5000;

    for (let i = 0; i < noiseCount; i++) {
      const x = random() * 512;
      const y = random() * 512;
      const size = random() * 3;

      ctx.fillStyle = `rgba(0, 0, 0, ${random() * noiseIntensity})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add features based on planet type
    if (planet.type === "jupiter") {
      this.addGasGiantFeatures(ctx, random);
    } else if (planet.type === "neptune") {
      this.addIceGiantFeatures(ctx, random);
    } else if (planet.type === "terrestrial" || planet.type === "super-earth") {
      this.addTerrestrialFeatures(ctx, planet, random);
    }
  }

  /**
   * Add gas giant atmospheric features
   * Creates horizontal bands and storm spots
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
   * @param {Function} random - Seeded random number generator
   */
  addGasGiantFeatures(ctx, random) {
    // Atmospheric bands
    const numBands = 8 + Math.floor(random() * 4);
    for (let i = 0; i < numBands; i++) {
      const y = (i / numBands) * 512 + random() * 20 - 10;
      const bandHeight = 512 / (numBands * 2);
      ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + random() * 0.1})`;
      ctx.fillRect(0, y, 512, bandHeight);
    }

    // Storm features
    for (let i = 0; i < 3; i++) {
      const x = random() * 512;
      const y = random() * 512;
      const width = 40 + random() * 60;
      const height = 20 + random() * 30;

      ctx.fillStyle = `rgba(100, 50, 30, ${0.2 + random() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Add ice giant features
   * Creates smoother atmospheric bands and subtle features
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
   * @param {Function} random - Seeded random number generator
   */
  addIceGiantFeatures(ctx, random) {
    // Smoother bands
    const numBands = 6 + Math.floor(random() * 3);
    for (let i = 0; i < numBands; i++) {
      const y = (i / numBands) * 512;
      ctx.fillStyle = `rgba(0, 0, 0, ${random() * 0.12})`;
      ctx.fillRect(0, y, 512, 512 / (numBands * 2));
    }

    // Atmospheric features
    for (let i = 0; i < 5; i++) {
      const x = random() * 512;
      const y = random() * 512;
      const size = 20 + random() * 40;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + random() * 0.1})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Add terrestrial planet features
   * Creates lava flows, ice cracks, or impact craters based on temperature
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
   * @param {Object} planet - Planet data object
   * @param {Function} random - Seeded random number generator
   */
  addTerrestrialFeatures(ctx, planet, random) {
    if (planet.temperature > 1000) {
      // Lava features
      for (let i = 0; i < 30; i++) {
        const x = random() * 512;
        const y = random() * 512;
        const size = 10 + random() * 30;

        ctx.strokeStyle = `rgba(255, 100, 0, ${0.3 + random() * 0.3})`;
        ctx.lineWidth = 2 + random() * 3;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (planet.temperature < 250) {
      // Ice features
      for (let i = 0; i < 40; i++) {
        const x = random() * 512;
        const y = random() * 512;
        const length = 20 + random() * 60;
        const angle = random() * Math.PI * 2;

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + random() * 0.15})`;
        ctx.lineWidth = 1 + random() * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
      }
    } else {
      // Craters
      const craterCount = planet.density && planet.density > 4.0 ? 25 : 20;
      for (let i = 0; i < craterCount; i++) {
        const x = random() * 512;
        const y = random() * 512;
        const size = random() * 30 + 10;

        ctx.strokeStyle = `rgba(0, 0, 0, ${random() * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(0, 0, 0, ${random() * 0.15})`;
        ctx.beginPath();
        ctx.arc(x + size * 0.2, y + size * 0.2, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Get planet surface roughness
   * Determines material roughness based on planet properties
   * @param {Object} planet - Planet data object
   * @returns {number} Roughness value (0.0 to 1.0)
   */
  getPlanetRoughness(planet) {
    if (planet.type === "jupiter" || planet.type === "neptune") {
      return 0.7;
    }

    if (planet.density !== null && planet.density !== undefined) {
      if (planet.density > 5.0) return 0.95;
      else if (planet.density > 3.5) return 0.85;
    }

    if (planet.temperature > 1000) return 0.6;

    return 0.9;
  }
}
