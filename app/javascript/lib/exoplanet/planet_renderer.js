import * as THREE from "three";

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
  }

  /**
   * Render a planet with all its visual effects
   */
  renderPlanet(planetData, showOrbit = false) {
    // Clean up existing planet
    this.cleanup();

    const radius = Math.max(0.5, Math.min(3, planetData.radius * 0.5));
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const material = this.generatePlanetMaterial(planetData);

    this.planet = new THREE.Mesh(geometry, material);
    this.scene.add(this.planet);

    // Add visual effects based on planet type
    this.addVisualEffects(planetData, radius);

    // Update lighting for stellar properties
    this.updateLightingForStar(planetData);

    // Add orbit visualization if enabled
    if (showOrbit) {
      this.addOrbitVisualization(planetData, radius);
    }

    return radius;
  }

  /**
   * Add visual effects (atmosphere, clouds, rings, lava glow)
   */
  addVisualEffects(planet, radius) {
    // Add atmosphere for certain planet types
    if (
      planet.type === "terrestrial" ||
      planet.type === "super-earth" ||
      planet.type === "neptune"
    ) {
      this.addAtmosphere(planet, radius);
    }

    // Add cloud layers for terrestrial planets in temperate zones
    if (
      (planet.type === "terrestrial" || planet.type === "super-earth") &&
      planet.temperature >= 250 &&
      planet.temperature <= 400
    ) {
      this.addCloudLayer(planet, radius);
    }

    // Add rings for Saturn (always) or other gas giants (30% chance, seeded)
    if (planet.name === "Saturn") {
      this.addSaturnRings(radius);
    } else if (planet.type === "jupiter" || planet.type === "neptune") {
      // Use seeded random to ensure consistent ring presence for same planet
      const seed = this.hashCode(planet.name + "_hasRings");
      const random = this.seededRandom(seed);
      if (random() > 0.7) {
        this.addPlanetRings(planet, radius);
      }
    }

    // Add lava glow for ultra-hot planets
    if (planet.temperature >= 1000) {
      this.addLavaGlow(planet, radius);
    }
  }

  /**
   * Generate procedural planet material
   */
  generatePlanetMaterial(planet) {
    // Check if this is a Solar System planet - use realistic texture
    if (this.isSolarSystemPlanet(planet)) {
      return this.createSolarSystemMaterial(planet);
    }

    // Otherwise, use procedural generation for exoplanets
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
    } else {
    }

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: this.getPlanetRoughness(planet),
      metalness: 0.1,
    });
  }

  /**
   * Check if a planet is from our Solar System
   */
  isSolarSystemPlanet(planet) {
    return (
      planet.hostStar === "Sun" && this.solarSystemTextureURLs[planet.name]
    );
  }

  /**
   * Create realistic material for Solar System planets
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
   * Add procedural texture to planet
   */
  addProceduralTexture(ctx, planet) {
    const seed = this.hashCode(planet.name);
    const random = this.seededRandom(seed);

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

  /**
   * Add atmosphere effect
   */
  addAtmosphere(planet, planetRadius) {
    // Special handling for Solar System planets - use realistic atmosphere settings
    if (this.isSolarSystemPlanet(planet)) {
      this.addRealisticAtmosphere(planet, planetRadius);
      return;
    }

    // Generic atmosphere for exoplanets
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
  }

  /**
   * Add realistic atmosphere for Solar System planets
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
        return;
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
  }

  /**
   * Get atmosphere color
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
   * Add cloud layer
   */
  addCloudLayer(planet, planetRadius) {
    const cloudGeometry = new THREE.SphereGeometry(
      planetRadius * 1.015,
      64,
      64
    );

    // Check cache first to avoid regenerating cloud texture
    const cacheKey = planet.name + "_clouds";
    let cloudTexture = this.textureCache.clouds.get(cacheKey);

    if (!cloudTexture) {
      // Generate cloud texture if not cached
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, 512, 512);

      const seed = this.hashCode(planet.name + "_clouds");
      const random = this.seededRandom(seed);

      for (let i = 0; i < 150; i++) {
        const x = random() * 512;
        const y = random() * 512;
        const size = random() * 80 + 40;
        const opacity = random() * 0.4 + 0.2;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
      }

      cloudTexture = new THREE.CanvasTexture(canvas);

      // Cache the cloud texture
      this.textureCache.clouds.set(cacheKey, cloudTexture);
    } else {
    }

    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    this.scene.add(this.clouds);
  }

  /**
   * Add realistic Saturn rings
   */
  addSaturnRings(planetRadius) {
    const ringGeometry = new THREE.RingGeometry(
      planetRadius * 1.2, // Inner radius (closer to Saturn)
      planetRadius * 2.3, // Outer radius
      128 // High detail for Saturn's rings
    );

    // Check cache first - Saturn rings are always the same
    const cacheKey = "saturn_rings";
    let ringTexture = this.textureCache.rings.get(cacheKey);

    if (!ringTexture) {
      // Generate ring texture if not cached
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");

      // Saturn's ring system has distinct bands (A, B, C rings)
      for (let i = 0; i < 1024; i++) {
        const position = i / 1024;

        let opacity = 0;
        let colorVariation = 0;

        // C Ring (inner, faint)
        if (position < 0.15) {
          opacity = 0.15 + Math.random() * 0.1;
          colorVariation = 0.9;
        }
        // Cassini Division (gap)
        else if (position < 0.18) {
          opacity = 0.02;
          colorVariation = 0.7;
        }
        // B Ring (bright, wide)
        else if (position < 0.55) {
          opacity = 0.6 + Math.random() * 0.2;
          colorVariation = 1.0;
        }
        // Cassini Division (gap)
        else if (position < 0.58) {
          opacity = 0.05;
          colorVariation = 0.7;
        }
        // A Ring (medium brightness)
        else if (position < 0.85) {
          opacity = 0.4 + Math.random() * 0.15;
          colorVariation = 0.95;
        }
        // Encke Gap
        else if (position < 0.87) {
          opacity = 0.03;
          colorVariation = 0.7;
        }
        // Outer A Ring
        else {
          opacity = 0.3 + Math.random() * 0.1;
          colorVariation = 0.9;
        }

        // Saturn rings are golden-beige color
        const baseColor = 220;
        const r = baseColor * colorVariation;
        const g = baseColor * 0.9 * colorVariation;
        const b = baseColor * 0.7 * colorVariation;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.fillRect(i, 0, 1, 64);
      }

      ringTexture = new THREE.CanvasTexture(canvas);

      // Cache the ring texture
      this.textureCache.rings.set(cacheKey, ringTexture);
    } else {
    }

    const ringMaterial = new THREE.MeshBasicMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });

    this.rings = new THREE.Mesh(ringGeometry, ringMaterial);
    // Saturn's rings are tilted at approximately 26.7 degrees from our viewing angle
    this.rings.rotation.x = Math.PI / 2 + (26.7 * Math.PI) / 180;
    this.planet.add(this.rings);
  }

  /**
   * Add rings to gas giants
   */
  addPlanetRings(planet, planetRadius) {
    const ringGeometry = new THREE.RingGeometry(
      planetRadius * 1.5,
      planetRadius * 2.5,
      64
    );

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    const seed = this.hashCode(planet.name + "_rings");
    const random = this.seededRandom(seed);

    for (let i = 0; i < 512; i++) {
      const position = i / 512;

      let opacity = 0;
      if (position < 0.3) {
        opacity = 0.3 + random() * 0.2;
      } else if (position < 0.35) {
        opacity = 0.05;
      } else if (position < 0.7) {
        opacity = 0.4 + random() * 0.3;
      } else if (position < 0.75) {
        opacity = 0.1;
      } else {
        opacity = 0.2 + random() * 0.2;
      }

      const brightness = 180 + random() * 50;
      ctx.fillStyle = `rgba(${brightness}, ${brightness * 0.95}, ${
        brightness * 0.9
      }, ${opacity})`;
      ctx.fillRect(i, 0, 1, 64);
    }

    const ringTexture = new THREE.CanvasTexture(canvas);

    const ringMaterial = new THREE.MeshBasicMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    this.rings = new THREE.Mesh(ringGeometry, ringMaterial);
    this.rings.rotation.x = Math.PI / 2 + (random() * 0.4 - 0.2);
    this.planet.add(this.rings);
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

    const starColor = this.getStellarColor(planet.stellarTemp);
    const luminosity = planet.stellarLuminosity || 0;
    const intensity = 2 + luminosity * 0.3;

    this.dynamicStarLight = new THREE.PointLight(starColor, intensity, 100);
    this.dynamicStarLight.position.set(5, 3, 5);

    this.scene.add(this.dynamicStarLight);
  }

  /**
   * Get stellar color based on temperature
   */
  getStellarColor(temp) {
    if (temp < 3500) return 0xff6644;
    else if (temp < 5000) return 0xffaa66;
    else if (temp < 6000) return 0xffd700;
    else if (temp < 7500) return 0xffffee;
    else if (temp < 10000) return 0xffffff;
    else if (temp < 30000) return 0xccddff;
    else return 0xaabbff;
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
    }

    return orbitRadius;
  }

  /**
   * Add central star for orbit visualization
   */
  addCentralStar(planet, planetRadius) {
    const starRadius = Math.max(0.3, Math.min(1.5, planet.stellarRadius * 0.4));
    const starGeometry = new THREE.SphereGeometry(starRadius, 32, 32);
    const starColor = this.getStellarColor(planet.stellarTemp);

    const starMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      emissive: starColor,
      emissiveIntensity: 1,
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
  }

  /**
   * Hash string to number
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Seeded random number generator
   */
  seededRandom(seed) {
    let value = seed;
    return function () {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
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
