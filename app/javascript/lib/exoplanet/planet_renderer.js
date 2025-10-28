import * as THREE from "three";
import { getStarColor } from "./utils";
import { PlanetMaterialGenerator } from "./planet_material_generator";
import { PlanetAtmosphereRenderer } from "./planet_atmosphere_renderer";
import { PlanetRingRenderer } from "./planet_ring_renderer";

/**
 * PlanetRenderer
 * Handles planet rendering, materials, procedural textures, and visual effects
 */
export class PlanetRenderer {
  constructor(scene) {
    this.scene = scene;
    this.planet = null;
    this.atmosphere = null;
    this.clouds = null;
    this.rings = null;
    this.lavaGlow = null;
    this.orbitLine = null;
    this.centralStar = null;
    this.dynamicStarLight = null;

    // Orbit animation state
    this.orbitRadius = 0;
    this.orbitAngle = 0;
    this.orbitalPeriod = 0;
    this.isOrbitAnimating = false;

    // Texture loader for realistic Solar System planets
    this.textureLoader = new THREE.TextureLoader();
    this.solarSystemTextures = {};

    // Texture cache to avoid regenerating procedural textures
    this.textureCache = {
      planet: new Map(), // Planet surface textures
      clouds: new Map(), // Cloud layer textures
      rings: new Map(), // Ring textures
    };

    // Texture paths - using locally hosted textures for security
    // Textures should be placed in public/textures/planets/
    // See public/textures/planets/README.md for download instructions
    const localTexturePath = "/textures/planets";
    this.solarSystemTextureURLs = {
      Mercury: `${localTexturePath}/mercury.jpg`,
      Venus: `${localTexturePath}/venus.jpg`,
      Earth: `${localTexturePath}/earth.jpg`,
      Mars: `${localTexturePath}/mars.jpg`,
      Jupiter: `${localTexturePath}/jupiter.jpg`,
      Saturn: `${localTexturePath}/saturn.jpg`,
      Uranus: `${localTexturePath}/uranus.jpg`,
      Neptune: `${localTexturePath}/neptune.jpg`,
    };

    // Initialize extracted renderer classes
    this.materialGenerator = new PlanetMaterialGenerator(
      this.textureCache,
      this.solarSystemTextureURLs
    );
    this.atmosphereRenderer = new PlanetAtmosphereRenderer(
      this.scene,
      this.textureCache,
      this.materialGenerator
    );
    this.ringRenderer = new PlanetRingRenderer(
      this.scene,
      this.textureCache,
      this.materialGenerator
    );
  }

  /**
   * Render a planet with all its visual effects
   */
  renderPlanet(planetData, showOrbit = false) {
    // Clean up existing planet
    this.cleanup();

    const radius = Math.max(0.5, Math.min(3, planetData.radius * 0.5));
    const geometry = new THREE.SphereGeometry(radius, 64, 64);

    // Prepare star information for realistic rendering
    const starPosition = new THREE.Vector3(5, 3, 5);
    const starColor = this.getStarColorVector(planetData);
    const starIntensity = 2.0 + (planetData.stellarLuminosity || 0) * 0.3;

    // Generate material with realistic physics
    const material = this.materialGenerator.generatePlanetMaterial(planetData, {
      starPosition,
      starColor,
      starIntensity,
      planetRadius: radius,
    });

    this.planet = new THREE.Mesh(geometry, material);
    this.scene.add(this.planet);

    // Add visual effects based on planet type
    this.addVisualEffects(planetData, radius, {
      starPosition,
      starColor,
      starIntensity,
    });

    // Update lighting for stellar properties
    this.updateLightingForStar(planetData);

    // Add orbit visualization if enabled
    if (showOrbit) {
      this.addOrbitVisualization(planetData, radius);
    }

    return radius;
  }

  /**
   * Get star color as THREE.Vector3 for shaders
   */
  getStarColorVector(planet) {
    const starColor = getStarColor({
      spectralType: planet.spectralType,
      stellarTemp: planet.stellarTemp,
    });

    // Convert THREE.Color hex to RGB vector
    const color = new THREE.Color(starColor);
    return new THREE.Vector3(color.r, color.g, color.b);
  }

  /**
   * Add visual effects (atmosphere, clouds, rings, lava glow)
   */
  addVisualEffects(planet, radius, options = {}) {
    // Add atmosphere for certain planet types
    if (
      planet.type === "terrestrial" ||
      planet.type === "super-earth" ||
      planet.type === "neptune" ||
      planet.type === "jupiter"
    ) {
      this.atmosphere = this.atmosphereRenderer.addAtmosphere(
        planet,
        radius,
        options
      );
    }

    // Add cloud layers for terrestrial planets in temperate zones
    if (
      (planet.type === "terrestrial" || planet.type === "super-earth") &&
      planet.temperature >= 250 &&
      planet.temperature <= 400
    ) {
      this.clouds = this.atmosphereRenderer.addCloudLayer(
        planet,
        radius,
        options
      );
    }

    // Add rings for Saturn (always), Neptune (always, faint), or other gas giants (30% chance, seeded)
    if (planet.name === "Saturn") {
      this.rings = this.ringRenderer.addSaturnRings(radius, this.planet);
    } else if (planet.name === "Neptune") {
      this.rings = this.ringRenderer.addNeptuneRings(radius, this.planet);
    } else if (planet.type === "jupiter" || planet.type === "neptune") {
      // Use seeded random to ensure consistent ring presence for same planet
      const seed = this.materialGenerator.hashCode(planet.name + "_hasRings");
      const random = this.materialGenerator.seededRandom(seed);
      if (random() > 0.7) {
        this.rings = this.ringRenderer.addPlanetRings(
          planet,
          radius,
          this.planet
        );
      }
    }

    // Add lava glow for ultra-hot planets (thermal emission is now handled in shaders)
    if (
      planet.temperature >= 1000 &&
      !this.materialGenerator.useRealisticShaders
    ) {
      this.addLavaGlow(planet, radius);
    }
  }

  /**
   * Add lava glow effect
   */
  addLavaGlow(planet, planetRadius) {
    const glowGeometry = new THREE.SphereGeometry(planetRadius * 0.99, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.3,
    });

    this.lavaGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.planet.add(this.lavaGlow);

    const hazeGeometry = new THREE.SphereGeometry(planetRadius * 1.08, 64, 64);
    const hazeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });

    const haze = new THREE.Mesh(hazeGeometry, hazeMaterial);
    this.scene.add(haze);
    this.lavaGlow.haze = haze;
  }

  /**
   * Update lighting based on stellar properties
   */
  updateLightingForStar(planet) {
    if (this.dynamicStarLight) {
      this.scene.remove(this.dynamicStarLight);
    }

    const starColor = getStarColor({
      spectralType: planet.spectralType,
      stellarTemp: planet.stellarTemp,
    });
    const luminosity = planet.stellarLuminosity || 0;
    const intensity = 2 + luminosity * 0.3;

    this.dynamicStarLight = new THREE.PointLight(starColor, intensity, 100);
    this.dynamicStarLight.position.set(5, 3, 5);

    this.scene.add(this.dynamicStarLight);
  }

  /**
   * Add orbit visualization
   */
  addOrbitVisualization(planet, planetRadius) {
    let orbitRadius = planetRadius * 3;

    if (planet.semiMajorAxis && planet.semiMajorAxis > 0) {
      const au = planet.semiMajorAxis;
      if (au < 0.1) {
        orbitRadius = planetRadius * (3 + au * 20);
      } else if (au < 1) {
        orbitRadius = planetRadius * (5 + au * 3);
      } else if (au < 5) {
        orbitRadius = planetRadius * (8 + Math.log10(au) * 4);
      } else {
        orbitRadius = planetRadius * (12 + Math.log10(au) * 3);
      }
    } else if (planet.orbitalPeriod && planet.orbitalPeriod > 0) {
      const logPeriod = Math.log10(Math.max(1, planet.orbitalPeriod));
      orbitRadius = planetRadius * (2.5 + logPeriod * 0.8);
    }

    // Create orbit circle
    const orbitGeometry = new THREE.BufferGeometry();
    const orbitPoints = [];
    const segments = 128;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      orbitPoints.push(
        Math.cos(angle) * orbitRadius,
        0,
        Math.sin(angle) * orbitRadius
      );
    }

    orbitGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(orbitPoints, 3)
    );

    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.5,
      linewidth: 2,
    });

    this.orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    this.scene.add(this.orbitLine);

    // Add central star
    this.addCentralStar(planet, planetRadius);

    // Store orbit data for animation
    this.orbitRadius = orbitRadius;
    this.orbitAngle = 0; // Start at 0 degrees
    this.orbitalPeriod = planet.orbitalPeriod || 365; // Default to Earth's period
    this.isOrbitAnimating = true;

    // Position planet on orbit
    if (this.planet) {
      this.planet.position.set(orbitRadius, 0, 0);
      if (this.atmosphere) {
        this.atmosphere.position.set(orbitRadius, 0, 0);
      }
      if (this.clouds) {
        this.clouds.position.set(orbitRadius, 0, 0);
      }
      // Rings are children of planet, so they move automatically
    }

    return orbitRadius;
  }

  /**
   * Add central star for orbit visualization
   */
  addCentralStar(planet, planetRadius) {
    const starRadius = Math.max(0.3, Math.min(1.5, planet.stellarRadius * 0.4));
    const starGeometry = new THREE.SphereGeometry(starRadius, 32, 32);
    const starColor = getStarColor({
      spectralType: planet.spectralType,
      stellarTemp: planet.stellarTemp,
    });

    const starMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
    });
    this.centralStar = new THREE.Mesh(starGeometry, starMaterial);

    // Add glow
    const glowGeometry = new THREE.SphereGeometry(starRadius * 1.4, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.centralStar.add(glow);

    // Add corona for hot stars
    if (planet.stellarTemp > 6000) {
      const coronaGeometry = new THREE.SphereGeometry(starRadius * 1.8, 32, 32);
      const coronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
      });
      const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
      this.centralStar.add(corona);
    }

    this.centralStar.position.set(0, 0, 0);
    this.scene.add(this.centralStar);
  }

  /**
   * Animate effects (clouds, lava glow)
   */
  animateEffects() {
    if (this.clouds) {
      this.clouds.rotation.y += 0.0003;
    }

    if (this.lavaGlow) {
      const pulse = Math.sin(Date.now() * 0.002) * 0.1 + 0.3;
      this.lavaGlow.material.opacity = pulse;
    }
  }

  /**
   * Update shader uniforms for realistic rendering
   * Must be called every frame for shaders to work properly
   * @param {THREE.Camera} camera - The scene camera for position updates
   */
  updateShaderUniforms(camera) {
    if (!this.planet || !this.planet.material) return;

    // Update camera position for atmospheric scattering
    if (
      this.planet.material.uniforms &&
      this.planet.material.uniforms.cameraPosition
    ) {
      this.planet.material.uniforms.cameraPosition.value.copy(camera.position);
    }

    // Update gas giant rotation offset
    if (
      this.planet.material.userData &&
      this.planet.material.userData.isGasGiant
    ) {
      if (this.planet.material.uniforms.rotationOffset) {
        this.planet.material.uniforms.rotationOffset.value += 0.0002;
      }
    }

    // Update atmosphere shader uniforms
    if (this.atmosphere && this.atmosphere.material.uniforms) {
      if (this.atmosphere.material.uniforms.cameraPosition) {
        this.atmosphere.material.uniforms.cameraPosition.value.copy(
          camera.position
        );
      }
    }
  }

  /**
   * Rotate planet
   */
  rotatePlanet(speed = 0.005) {
    if (this.planet) {
      this.planet.rotation.y += speed;
    }
  }

  /**
   * Animate planet orbit around star
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {number} speedMultiplier - Speed multiplier (1.0 = 1 orbit per 60 seconds)
   */
  animateOrbit(deltaTime = 0.016, speedMultiplier = 1.0) {
    if (!this.isOrbitAnimating || !this.planet || this.orbitRadius === 0)
      return;

    // Calculate angular velocity
    // At speedMultiplier = 1.0: planet completes 1 full orbit in 60 seconds
    const baseOrbitTime = 60.0; // seconds for one complete orbit at speed 1.0
    const angularVelocity = ((2 * Math.PI) / baseOrbitTime) * speedMultiplier;

    // Update angle
    this.orbitAngle += angularVelocity * deltaTime;

    // Update position of planet
    const x = Math.cos(this.orbitAngle) * this.orbitRadius;
    const z = Math.sin(this.orbitAngle) * this.orbitRadius;

    this.planet.position.set(x, 0, z);

    // Update atmosphere position
    if (this.atmosphere) {
      this.atmosphere.position.set(x, 0, z);
    }

    // Update clouds position
    if (this.clouds) {
      this.clouds.position.set(x, 0, z);
    }

    // Rings are children of planet, so they move automatically
  }

  /**
   * Set rendering quality
   * @param {boolean} high - Whether to use high quality rendering
   */
  setQuality(high) {
    // Update planet material quality
    if (this.planet && this.planet.material) {
      if (high) {
        this.planet.material.flatShading = false;
        if (this.planet.material.map) {
          this.planet.material.map.anisotropy = 16;
        }
      } else {
        this.planet.material.flatShading = true;
        if (this.planet.material.map) {
          this.planet.material.map.anisotropy = 1;
        }
      }
      this.planet.material.needsUpdate = true;
    }

    // Update atmosphere quality if present
    if (this.atmosphere && this.atmosphere.material) {
      if (high) {
        this.atmosphere.material.transparent = true;
        this.atmosphere.material.opacity = 0.3;
      } else {
        this.atmosphere.material.transparent = true;
        this.atmosphere.material.opacity = 0.2;
      }
      this.atmosphere.material.needsUpdate = true;
    }

    // Update clouds quality if present
    if (this.clouds && this.clouds.material) {
      if (high) {
        this.clouds.material.transparent = true;
        this.clouds.material.opacity = 0.4;
      } else {
        this.clouds.material.transparent = true;
        this.clouds.material.opacity = 0.3;
      }
      this.clouds.material.needsUpdate = true;
    }
  }

  /**
   * Cleanup all planet-related objects
   */
  cleanup() {
    if (this.planet) {
      this.scene.remove(this.planet);
      this.planet = null;
    }
    if (this.atmosphere) {
      this.scene.remove(this.atmosphere);
      this.atmosphere = null;
    }
    if (this.clouds) {
      this.scene.remove(this.clouds);
      this.clouds = null;
    }
    if (this.rings) {
      // Rings are children of planet mesh, so they'll be removed with it
      // Just dispose of geometry and material
      if (this.rings.geometry) this.rings.geometry.dispose();
      if (this.rings.material) this.rings.material.dispose();
      this.rings = null;
    }
    if (this.lavaGlow) {
      if (this.lavaGlow.haze) {
        this.scene.remove(this.lavaGlow.haze);
        // Dispose of haze geometry and material to prevent memory leak
        if (this.lavaGlow.haze.geometry) {
          this.lavaGlow.haze.geometry.dispose();
        }
        if (this.lavaGlow.haze.material) {
          this.lavaGlow.haze.material.dispose();
        }
      }
      this.lavaGlow = null;
    }
    if (this.orbitLine) {
      this.scene.remove(this.orbitLine);
      this.orbitLine = null;
    }
    if (this.centralStar) {
      this.scene.remove(this.centralStar);
      this.centralStar = null;
    }
    if (this.dynamicStarLight) {
      this.scene.remove(this.dynamicStarLight);
      this.dynamicStarLight = null;
    }

    // Reset orbit animation state
    this.orbitRadius = 0;
    this.orbitAngle = 0;
    this.orbitalPeriod = 0;
    this.isOrbitAnimating = false;
  }
}
