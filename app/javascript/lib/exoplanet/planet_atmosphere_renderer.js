import * as THREE from "three";
import { hashCode, seededRandom } from "./utils";
import * as RealisticPhysics from "./realistic_physics";
import {
  atmosphereVertexShader,
  atmosphereFragmentShader,
  cloudVertexShader,
  cloudFragmentShader,
} from "./realistic_shaders";

/**
 * PlanetAtmosphereRenderer
 * Handles atmosphere and cloud rendering for planets
 * Enhanced with realistic physics-based scattering
 */
export class PlanetAtmosphereRenderer {
  /**
   * Create a new atmosphere renderer
   * @param {THREE.Scene} scene - The THREE.js scene to add meshes to
   * @param {Object} textureCache - Texture cache object for cloud textures
   * @param {Object} materialGenerator - Instance with hashCode and seededRandom methods
   */
  constructor(scene, textureCache, materialGenerator) {
    this.scene = scene;
    this.textureCache = textureCache;
    this.materialGenerator = materialGenerator;

    // Track created meshes
    this.atmosphere = null;
    this.clouds = null;

    // Use realistic shaders
    this.useRealisticShaders = true;
  }

  /**
   * Add atmosphere effect
   * @param {Object} planet - Planet data object
   * @param {number} planetRadius - Radius of the planet mesh
   * @param {Object} options - Optional star position and color for realistic rendering
   * @returns {THREE.Mesh|null} The created atmosphere mesh
   */
  addAtmosphere(planet, planetRadius, options = {}) {
    // Special handling for Solar System planets - use realistic atmosphere settings
    if (this.isSolarSystemPlanet(planet)) {
      return this.addRealisticAtmosphere(planet, planetRadius);
    }

    // Use realistic physics-based atmosphere if enabled and star data is available
    if (this.useRealisticShaders && options.starPosition) {
      return this.addPhysicsBasedAtmosphere(planet, planetRadius, options);
    }

    // Legacy: Generic atmosphere for exoplanets
    let atmosphereThickness = 1.1;
    let atmosphereOpacity = 0.15; // Reduced from 0.2 for better visibility

    if (planet.type === "jupiter" || planet.type === "neptune") {
      atmosphereThickness = 1.15;
      atmosphereOpacity = 0.25; // Reduced from 0.35
    }

    if (planet.type === "super-earth") {
      atmosphereThickness = 1.12;
      atmosphereOpacity = 0.18; // Reduced from 0.25
    }

    if (planet.temperature > 1500) {
      atmosphereOpacity = 0.08; // Reduced from 0.1
      atmosphereThickness = 1.05;
    } else if (planet.temperature > 800) {
      atmosphereThickness = 1.2;
      atmosphereOpacity = 0.12; // Reduced from 0.15
    }

    if (planet.temperature < 150 && planet.type === "terrestrial") {
      atmosphereThickness = 1.15;
      atmosphereOpacity = 0.22; // Reduced from 0.3
    }

    const atmosphereGeometry = new THREE.SphereGeometry(
      planetRadius * atmosphereThickness,
      64,
      64
    );
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: this.getAtmosphereColor(planet),
      transparent: true,
      opacity: atmosphereOpacity,
      side: THREE.BackSide,
    });

    this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(this.atmosphere);

    return this.atmosphere;
  }

  /**
   * Add physics-based realistic atmosphere with proper scattering
   * @param {Object} planet - Planet data object
   * @param {number} planetRadius - Planet mesh radius
   * @param {Object} options - { starPosition, starColor, cameraPosition }
   * @returns {THREE.Mesh} Atmosphere mesh with shader material
   */
  addPhysicsBasedAtmosphere(planet, planetRadius, options) {
    const {
      starPosition = new THREE.Vector3(5, 3, 5),
      starColor = { r: 1.0, g: 1.0, b: 1.0 },
      cameraPosition = new THREE.Vector3(0, 0, 10),
    } = options;

    // Get realistic atmospheric properties
    const atmosphereDensity = RealisticPhysics.getAtmosphereDensity(planet);
    const atmosphereColor = RealisticPhysics.getAtmosphereColor(
      planet,
      starColor
    );

    // Calculate atmosphere thickness based on planet type and mass
    let atmosphereThickness = 1.08; // Default thin atmosphere

    if (planet.type === "jupiter" || planet.type === "neptune") {
      atmosphereThickness = 1.18; // Thick gas giant atmosphere
    } else if (planet.type === "super-earth") {
      atmosphereThickness = 1.12; // Medium atmosphere
    }

    // Adjust for temperature (hot planets lose atmosphere)
    if (planet.temperature > 2000) {
      atmosphereThickness = 1.03; // Escaping atmosphere
    } else if (planet.temperature > 1500) {
      atmosphereThickness = 1.05; // Thin atmosphere
    }

    const atmosphereRadius = planetRadius * atmosphereThickness;

    const atmosphereGeometry = new THREE.SphereGeometry(
      atmosphereRadius,
      64,
      64
    );

    // Create shader-based atmosphere material
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        starPosition: { value: starPosition },
        atmosphereColor: {
          value: new THREE.Vector3(
            atmosphereColor.r,
            atmosphereColor.g,
            atmosphereColor.b
          ),
        },
        atmosphereDensity: { value: atmosphereDensity },
        planetRadius: { value: planetRadius },
        atmosphereRadius: { value: atmosphereRadius },
        cameraPosition: { value: cameraPosition },
      },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(this.atmosphere);

    // Store for updates
    this.atmosphere.userData.isRealisticAtmosphere = true;

    return this.atmosphere;
  }

  /**
   * Add realistic atmosphere for Solar System planets
   * @param {Object} planet - Planet data object
   * @param {number} planetRadius - Radius of the planet mesh
   * @returns {THREE.Mesh|null} The created atmosphere mesh
   */
  addRealisticAtmosphere(planet, planetRadius) {
    let atmosphereColor;
    let atmosphereOpacity;
    let atmosphereThickness;

    switch (planet.name) {
      case "Earth":
        atmosphereColor = 0x4da6ff; // Beautiful blue
        atmosphereOpacity = 0.08; // Very subtle
        atmosphereThickness = 1.08;
        break;
      case "Mars":
        atmosphereColor = 0xffb380; // Reddish-orange
        atmosphereOpacity = 0.05; // Very thin
        atmosphereThickness = 1.05;
        break;
      case "Venus":
        atmosphereColor = 0xfff4cc; // Yellowish
        atmosphereOpacity = 0.12; // Thick atmosphere
        atmosphereThickness = 1.12;
        break;
      case "Jupiter":
        atmosphereColor = 0xf8e8d8; // Creamy
        atmosphereOpacity = 0.15;
        atmosphereThickness = 1.15;
        break;
      case "Saturn":
        atmosphereColor = 0xffe8b8; // Pale gold
        atmosphereOpacity = 0.12;
        atmosphereThickness = 1.12;
        break;
      case "Uranus":
        atmosphereColor = 0xafffff; // Cyan
        atmosphereOpacity = 0.1;
        atmosphereThickness = 1.1;
        break;
      case "Neptune":
        atmosphereColor = 0x5599ff; // Deep blue
        atmosphereOpacity = 0.12;
        atmosphereThickness = 1.12;
        break;
      case "Mercury":
        // Mercury has no atmosphere
        return null;
      default:
        // Fallback for any other Solar System body
        atmosphereColor = 0xccddff;
        atmosphereOpacity = 0.08;
        atmosphereThickness = 1.08;
    }

    const atmosphereGeometry = new THREE.SphereGeometry(
      planetRadius * atmosphereThickness,
      64,
      64
    );

    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: atmosphereColor,
      transparent: true,
      opacity: atmosphereOpacity,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending, // Makes it glow nicely
    });

    this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(this.atmosphere);

    return this.atmosphere;
  }

  /**
   * Get atmosphere color based on planet properties
   * @param {Object} planet - Planet data object
   * @returns {number} Hex color value for the atmosphere
   */
  getAtmosphereColor(planet) {
    const temp = planet.temperature;
    const type = planet.type;

    if (type === "jupiter") {
      if (temp < 200) return 0xd8e4f8;
      else if (temp < 600) return 0xf8e8d8;
      else if (temp < 1200) return 0xf8d8c8;
      else return 0xe8c8b8;
    }

    if (type === "neptune") {
      if (temp < 100) return 0xc8d8ff;
      else if (temp < 300) return 0xa8c8f8;
      else if (temp < 600) return 0x98b8e8;
      else return 0xb8a8c8;
    }

    if (temp < 150) return 0xd8e8ff;
    else if (temp < 250) return 0xb8d4ff;
    else if (temp < 350) return 0x88b8ff;
    else if (temp < 600) return 0xf8d8a8;
    else if (temp < 1000) return 0xffcc88;
    else if (temp < 2000) return 0xff8844;
    else return 0xff6644;
  }

  /**
   * Add cloud layer for terrestrial planets
   * @param {Object} planet - Planet data object
   * @param {number} planetRadius - Radius of the planet mesh
   * @param {Object} options - Optional star position and color for realistic rendering
   * @returns {THREE.Mesh} The created cloud layer mesh
   */
  addCloudLayer(planet, planetRadius, options = {}) {
    const cloudGeometry = new THREE.SphereGeometry(
      planetRadius * 1.015,
      64,
      64
    );

    // Check cache first to avoid regenerating cloud texture
    const cacheKey = planet.name + "_clouds";
    let cloudTexture = this.textureCache.clouds.get(cacheKey);

    if (!cloudTexture) {
      // Generate enhanced cloud texture based on planet properties
      cloudTexture = this.generateRealisticCloudTexture(planet);
      // Cache the cloud texture
      this.textureCache.clouds.set(cacheKey, cloudTexture);
    }

    // Use realistic shader if star position is available
    if (this.useRealisticShaders && options.starPosition) {
      const cloudMaterial = new THREE.ShaderMaterial({
        uniforms: {
          cloudTexture: { value: cloudTexture },
          starPosition: { value: options.starPosition },
          starColor: { value: options.starColor || new THREE.Vector3(1, 1, 1) },
          starIntensity: { value: options.starIntensity || 2.0 },
          cloudOpacity: { value: 0.7 },
          cloudHeight: { value: planetRadius * 1.015 },
        },
        vertexShader: cloudVertexShader,
        fragmentShader: cloudFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
      this.clouds.userData.isRealisticClouds = true;
    } else {
      // Legacy cloud rendering
      const cloudMaterial = new THREE.MeshPhongMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      });

      this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    }

    this.scene.add(this.clouds);

    return this.clouds;
  }

  /**
   * Generate realistic cloud texture based on planet properties
   * Uses atmospheric circulation patterns
   */
  generateRealisticCloudTexture(planet) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; // Higher resolution for better quality
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, 1024, 1024);

    const seed = hashCode(planet.name + "_clouds");
    const random = seededRandom(seed);
    const temp = planet.temperature || 300;

    // Determine cloud pattern type based on temperature and planet properties
    if (temp >= 250 && temp <= 373) {
      // Water clouds (Earth-like)
      this.generateWaterClouds(ctx, random, 1024);
    } else if (temp > 373 && temp <= 700) {
      // Sulfuric acid clouds (Venus-like)
      this.generateVenusClouds(ctx, random, 1024);
    } else {
      // Generic clouds
      this.generateGenericClouds(ctx, random, 1024);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return texture;
  }

  /**
   * Generate Earth-like water clouds with realistic patterns
   */
  generateWaterClouds(ctx, random, size) {
    // Cloud formations based on atmospheric circulation
    // More clouds near equator and mid-latitudes

    // Large cloud systems
    for (let i = 0; i < 80; i++) {
      const x = random() * size;
      const y = random() * size;
      const width = 60 + random() * 140;
      const height = 40 + random() * 80;
      const opacity = 0.3 + random() * 0.4;

      // Elliptical cloud formations
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, width);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.6})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Small puffy clouds
    for (let i = 0; i < 200; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 20 + random() * 50;
      const opacity = 0.2 + random() * 0.3;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cloud bands (trade winds, jet streams)
    for (let i = 0; i < 4; i++) {
      const y = (size / 5) * (i + 0.5) + (random() - 0.5) * (size / 10);
      const bandHeight = size / 15;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + random() * 0.15})`;

      // Create wavy band
      ctx.beginPath();
      ctx.moveTo(0, y);

      for (let x = 0; x <= size; x += 10) {
        const wave =
          Math.sin((x / size) * Math.PI * 4 + random() * 2) * (bandHeight / 2);
        ctx.lineTo(x, y + wave);
      }

      ctx.lineTo(size, y + bandHeight);
      ctx.lineTo(0, y + bandHeight);
      ctx.closePath();
      ctx.fill();
    }
  }

  /**
   * Generate Venus-like thick cloud layer
   */
  generateVenusClouds(ctx, random, size) {
    // Venus has a very thick, uniform cloud layer with subtle patterns

    // Base thick cloud layer
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(0, 0, size, size);

    // Subtle variations in cloud density
    for (let i = 0; i < 100; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 80 + random() * 200;
      const opacity = 0.05 + random() * 0.1;

      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Large-scale circulation patterns
    for (let i = 0; i < 5; i++) {
      const y = (size / 6) * (i + 0.5);
      const amplitude = 40 + random() * 60;

      ctx.strokeStyle = `rgba(0, 0, 0, ${0.08 + random() * 0.08})`;
      ctx.lineWidth = 30 + random() * 50;
      ctx.beginPath();

      for (let x = 0; x <= size; x += 5) {
        const wave = Math.sin((x / size) * Math.PI * 3) * amplitude;
        if (x === 0) {
          ctx.moveTo(x, y + wave);
        } else {
          ctx.lineTo(x, y + wave);
        }
      }

      ctx.stroke();
    }
  }

  /**
   * Generate generic cloud patterns
   */
  generateGenericClouds(ctx, random, size) {
    // Simple cloud formations
    for (let i = 0; i < 150; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 30 + random() * 90;
      const opacity = 0.25 + random() * 0.4;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }

  /**
   * Check if a planet is from our Solar System
   * @param {Object} planet - Planet data object
   * @returns {boolean} True if the planet is from our Solar System
   */
  isSolarSystemPlanet(planet) {
    const solarSystemPlanets = [
      "Mercury",
      "Venus",
      "Earth",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
    ];
    return (
      planet.hostStar === "Sun" && solarSystemPlanets.includes(planet.name)
    );
  }

  /**
   * Get the atmosphere mesh reference
   * @returns {THREE.Mesh|null} The atmosphere mesh
   */
  getAtmosphere() {
    return this.atmosphere;
  }

  /**
   * Get the cloud layer mesh reference
   * @returns {THREE.Mesh|null} The cloud layer mesh
   */
  getClouds() {
    return this.clouds;
  }

  /**
   * Cleanup all atmosphere-related objects
   */
  cleanup() {
    if (this.atmosphere) {
      this.scene.remove(this.atmosphere);
      if (this.atmosphere.geometry) {
        this.atmosphere.geometry.dispose();
      }
      if (this.atmosphere.material) {
        this.atmosphere.material.dispose();
      }
      this.atmosphere = null;
    }

    if (this.clouds) {
      this.scene.remove(this.clouds);
      if (this.clouds.geometry) {
        this.clouds.geometry.dispose();
      }
      if (this.clouds.material) {
        if (this.clouds.material.map) {
          this.clouds.material.map.dispose();
        }
        this.clouds.material.dispose();
      }
      this.clouds = null;
    }
  }
}
