import * as THREE from "three";

/**
 * SystemRenderer
 * Handles rendering multiple planets in a single star system
 * with realistic orbital spacing and mechanics
 */
export class SystemRenderer {
  constructor(scene, planetRenderer) {
    this.scene = scene;
    this.planetRenderer = planetRenderer;
    this.systemPlanets = [];
    this.centralStar = null;
    this.dynamicStarLight = null;
    this.orbitLines = [];
    this.planetMeshes = [];
    this.animationTime = 0;
    this.showAtmospheres = false; // Toggle for atmosphere visibility
  }

  /**
   * Render entire planetary system
   * @param {Array} planets - Array of planet data for the same star system
   * @param {boolean} animateOrbits - Whether to animate planet orbits
   */
  renderSystem(planets, animateOrbits = false, useInclination = false) {
    // Clean up any existing system
    this.cleanup();

    if (!planets || planets.length === 0) {
      console.warn("No planets provided for system view");
      return;
    }

    // Store inclination setting
    this.useInclination = useInclination;

    // Sort planets by orbital distance (semi-major axis)
    const sortedPlanets = [...planets].sort((a, b) => {
      const aOrbit = a.semiMajorAxis || a.orbitalPeriod || 0;
      const bOrbit = b.semiMajorAxis || b.orbitalPeriod || 0;
      return aOrbit - bOrbit;
    });

    this.systemPlanets = sortedPlanets;

    // Get the stellar properties from the first planet (all share same star)
    const stellarData = sortedPlanets[0];

    // Add central star
    this.addCentralStar(stellarData);

    // Calculate scaling factor for orbit visualization
    const maxOrbitRadius = this.calculateMaxOrbitRadius(sortedPlanets);
    const scaleFactor = this.calculateScaleFactor(maxOrbitRadius);

    // Render each planet with its orbit
    sortedPlanets.forEach((planet, index) => {
      this.renderPlanetInSystem(
        planet,
        index,
        scaleFactor,
        animateOrbits,
        useInclination
      );
    });

    return {
      maxOrbitRadius,
      scaleFactor,
      planetCount: sortedPlanets.length,
    };
  }

  /**
   * Render a single planet within the system
   */
  renderPlanetInSystem(
    planet,
    index,
    scaleFactor,
    animateOrbits,
    useInclination = false
  ) {
    // Calculate orbit radius based on semi-major axis or orbital period
    const orbitRadius = this.calculateOrbitRadius(planet, index, scaleFactor);

    // Calculate planet visual size (scaled down for system view)
    const planetRadius = this.calculatePlanetSize(planet);

    // Create planet mesh
    const planetMesh = this.createPlanetMesh(planet, planetRadius);

    // Position planet on its orbit
    const initialAngle = Math.random() * Math.PI * 2; // Random starting position
    planetMesh.position.set(
      Math.cos(initialAngle) * orbitRadius,
      0,
      Math.sin(initialAngle) * orbitRadius
    );

    // Store planet data for animation
    planetMesh.userData = {
      planet: planet,
      orbitRadius: orbitRadius,
      orbitalPeriod: planet.orbitalPeriod || 365 * (index + 1),
      currentAngle: initialAngle,
      animateOrbits: animateOrbits,
    };

    this.planetMeshes.push(planetMesh);
    this.scene.add(planetMesh);

    // Add orbit line
    this.addOrbitLine(orbitRadius, planet, useInclination);

    // Add planet label
    this.addPlanetLabel(planetMesh, planet.name, planetRadius);
  }

  /**
   * Calculate orbit radius with proper scaling
   */
  calculateOrbitRadius(planet, index, scaleFactor) {
    let orbitRadius;

    // Use semi-major axis if available (most accurate)
    if (planet.semiMajorAxis && planet.semiMajorAxis > 0) {
      orbitRadius = planet.semiMajorAxis * scaleFactor;
    }
    // Fallback to orbital period (Kepler's third law approximation)
    else if (planet.orbitalPeriod && planet.orbitalPeriod > 0) {
      // R^3 ∝ T^2 (simplified, assuming solar-mass star)
      const au = Math.pow(planet.orbitalPeriod / 365.25, 2 / 3);
      orbitRadius = au * scaleFactor;
    }
    // Last resort: equal spacing
    else {
      orbitRadius = (index + 1) * 3;
    }

    // Ensure minimum spacing between planets
    const minRadius = 2 + index * 2;
    return Math.max(orbitRadius, minRadius);
  }

  /**
   * Calculate maximum orbit radius in the system
   */
  calculateMaxOrbitRadius(planets) {
    let maxRadius = 0;

    planets.forEach((planet) => {
      if (planet.semiMajorAxis && planet.semiMajorAxis > maxRadius) {
        maxRadius = planet.semiMajorAxis;
      }
    });

    // If no semi-major axis data, use orbital period
    if (maxRadius === 0) {
      planets.forEach((planet) => {
        if (planet.orbitalPeriod) {
          const au = Math.pow(planet.orbitalPeriod / 365.25, 2 / 3);
          if (au > maxRadius) maxRadius = au;
        }
      });
    }

    return maxRadius || 10; // Default if no data
  }

  /**
   * Calculate scale factor to fit system in view
   */
  calculateScaleFactor(maxOrbitRadius) {
    // We want the outermost planet at roughly 15-20 units from center
    const targetMaxRadius = 18;

    if (maxOrbitRadius < 1) {
      // Very compact system (hot Jupiters, etc.)
      return 30;
    } else if (maxOrbitRadius < 5) {
      // Compact system
      return targetMaxRadius / maxOrbitRadius;
    } else if (maxOrbitRadius < 50) {
      // Normal system
      return targetMaxRadius / maxOrbitRadius;
    } else {
      // Very large system
      return targetMaxRadius / maxOrbitRadius;
    }
  }

  /**
   * Calculate planet visual size (scaled for system view)
   */
  calculatePlanetSize(planet) {
    // Scale down planets for system view, but keep them visible
    const baseRadius = Math.max(0.2, Math.min(1.5, planet.radius * 0.3));

    // Ensure gas giants are visibly larger than terrestrials
    if (planet.type === "jupiter") {
      return baseRadius * 1.5;
    } else if (planet.type === "neptune") {
      return baseRadius * 1.2;
    }

    return baseRadius;
  }

  /**
   * Create planet mesh with material
   */
  createPlanetMesh(planet, radius) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = this.planetRenderer.generatePlanetMaterial(planet);

    const mesh = new THREE.Mesh(geometry, material);

    // Store base radius in userData
    let actualRadius = radius;

    // Add simple atmosphere for gas giants (only if enabled)
    if (
      (planet.type === "jupiter" || planet.type === "neptune") &&
      this.showAtmospheres
    ) {
      const atmosphereRadius = radius * 1.15;
      const atmosphereGeometry = new THREE.SphereGeometry(
        atmosphereRadius,
        32,
        32
      );
      const atmosphereColor = planet.type === "jupiter" ? 0xf8e8d8 : 0xa8c8f8;
      const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: atmosphereColor,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
      });
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      atmosphere.name = "atmosphere"; // Tag for easy identification
      mesh.add(atmosphere);
      actualRadius = atmosphereRadius; // Update actual size if atmosphere is shown
    }

    // Store actual rendered radius (including atmosphere if present)
    mesh.userData.actualRadius = actualRadius;
    mesh.userData.baseRadius = radius;

    return mesh;
  }

  /**
   * Add orbit line for a planet with realistic 3D orientation
   */
  addOrbitLine(radius, planet, useInclination = false) {
    const orbitGeometry = new THREE.BufferGeometry();
    const orbitPoints = [];
    const segments = 128;

    // Get orbital parameters (only use if enabled)
    const inclination = useInclination ? planet.orbitalInclination || 0 : 0; // degrees
    const longitudeOfPeriastron = useInclination
      ? planet.longitudeOfPeriastron || 0
      : 0; // degrees
    const eccentricity = planet.orbitalEccentricity || 0;

    // Convert to radians
    const incRad = (inclination * Math.PI) / 180;
    const longPerRad = (longitudeOfPeriastron * Math.PI) / 180;

    // Create orbit points with elliptical shape and 3D orientation
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;

      // Calculate position in orbital plane (elliptical orbit)
      // For simplicity, use circular approximation but account for eccentricity
      const r = radius * (1 - eccentricity * Math.cos(angle));
      let x = Math.cos(angle) * r;
      let y = 0;
      let z = Math.sin(angle) * r;

      // Apply 3D rotation for orbital inclination (only if enabled)
      if (useInclination && inclination !== 0) {
        // Rotate around X-axis for inclination
        const y_rot = y * Math.cos(incRad) - z * Math.sin(incRad);
        const z_rot = y * Math.sin(incRad) + z * Math.cos(incRad);
        y = y_rot;
        z = z_rot;
      }

      // Apply rotation for longitude of periastron (rotation around Z-axis)
      if (useInclination && longitudeOfPeriastron !== 0) {
        const x_rot = x * Math.cos(longPerRad) - y * Math.sin(longPerRad);
        const y_rot = x * Math.sin(longPerRad) + y * Math.cos(longPerRad);
        x = x_rot;
        y = y_rot;
      }

      orbitPoints.push(x, y, z);
    }

    orbitGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(orbitPoints, 3)
    );

    // Color-code orbit lines by planet type
    const orbitColor = this.getOrbitColor(planet.type);
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: orbitColor,
      transparent: true,
      opacity: 0.4,
    });

    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);

    // Store orbital parameters for animation
    orbitLine.userData = {
      inclination: incRad,
      longitudeOfPeriastron: longPerRad,
      eccentricity: eccentricity,
    };

    this.orbitLines.push(orbitLine);
    this.scene.add(orbitLine);
  }

  /**
   * Get orbit line color based on planet type
   */
  getOrbitColor(planetType) {
    const colors = {
      terrestrial: 0x22c55e, // Green
      "super-earth": 0x3b82f6, // Blue
      neptune: 0x6366f1, // Indigo
      jupiter: 0xf59e0b, // Amber
    };
    return colors[planetType] || 0x6b7280; // Gray default
  }

  /**
   * Add text label for planet
   */
  addPlanetLabel(planetMesh, name, planetRadius) {
    // Create canvas for label
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 64;

    // Draw label background
    context.fillStyle = "rgba(0, 0, 0, 0.7)";
    context.fillRect(0, 0, 256, 64);

    // Draw text
    context.font = "Bold 20px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";
    context.textBaseline = "middle";

    // Extract planet letter (e.g., "Kepler-90 b" -> "b")
    const planetLetter = name.split(" ").pop();
    context.fillText(planetLetter, 128, 32);

    // Create sprite
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1, 0.25, 1);
    sprite.position.set(0, planetRadius + 0.5, 0);

    planetMesh.add(sprite);
  }

  /**
   * Get accurate star color from spectral type (with temperature fallback)
   */
  getStarColorFromSpectralType(stellarData) {
    const spectralType = stellarData.spectralType;

    // If spectral type is available, use it for accurate colors
    if (spectralType) {
      const typeChar = spectralType.charAt(0).toUpperCase();

      // Based on Harvard spectral classification
      const spectralColors = {
        O: 0x9bb0ff, // Blue (30,000-50,000 K)
        B: 0xaabfff, // Blue-white (10,000-30,000 K)
        A: 0xcad7ff, // White (7,500-10,000 K)
        F: 0xf8f7ff, // Yellow-white (6,000-7,500 K)
        G: 0xfff4e8, // Yellow (5,200-6,000 K) - Like our Sun
        K: 0xffd2a1, // Orange (3,700-5,200 K)
        M: 0xffbd6f, // Red (2,400-3,700 K)
      };

      if (spectralColors[typeChar]) {
        console.log(
          `Using spectral type ${spectralType} for accurate star color`
        );
        return spectralColors[typeChar];
      }
    }

    // Fallback to temperature-based color
    return this.planetRenderer.getStellarColor(stellarData.stellarTemp);
  }

  /**
   * Add multiple stars for binary/triple star systems
   */
  addMultiStarSystem(stellarData, numberOfStars) {
    console.log(`Rendering ${numberOfStars}-star system!`);

    const starRadius = Math.max(
      0.5,
      Math.min(2, stellarData.stellarRadius * 0.5)
    );
    const starColor = this.getStarColorFromSpectralType(stellarData);

    // Create a container for the multi-star system
    this.centralStar = new THREE.Group();

    // Position stars in the system
    const starPositions = this.calculateStarPositions(
      numberOfStars,
      starRadius
    );

    starPositions.forEach((position, index) => {
      const starGeometry = new THREE.SphereGeometry(starRadius, 32, 32);

      // Vary star colors slightly for visual distinction
      let individualStarColor = starColor;
      if (index > 0) {
        // Make companion stars slightly different colors
        individualStarColor = this.adjustColorForCompanion(starColor, index);
      }

      const starMaterial = new THREE.MeshBasicMaterial({
        color: individualStarColor,
        emissive: individualStarColor,
        emissiveIntensity: 1,
      });

      const star = new THREE.Mesh(starGeometry, starMaterial);
      star.position.copy(position);

      // Add glow
      const glowGeometry = new THREE.SphereGeometry(starRadius * 1.5, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: individualStarColor,
        transparent: true,
        opacity: 0.4,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      star.add(glow);

      this.centralStar.add(star);
    });

    this.scene.add(this.centralStar);
    this.updateLighting(stellarData);
  }

  /**
   * Calculate positions for multiple stars in a system
   */
  calculateStarPositions(numberOfStars, starRadius) {
    const positions = [];
    const separation = starRadius * 4; // Distance between stars

    if (numberOfStars === 2) {
      // Binary system: position stars on either side
      positions.push(new THREE.Vector3(-separation / 2, 0, 0));
      positions.push(new THREE.Vector3(separation / 2, 0, 0));
    } else if (numberOfStars === 3) {
      // Triple system: equilateral triangle
      const angle = (Math.PI * 2) / 3;
      for (let i = 0; i < 3; i++) {
        const x = Math.cos(angle * i) * separation;
        const z = Math.sin(angle * i) * separation;
        positions.push(new THREE.Vector3(x, 0, z));
      }
    } else {
      // 4+ stars: circular arrangement
      const angle = (Math.PI * 2) / numberOfStars;
      for (let i = 0; i < numberOfStars; i++) {
        const x = Math.cos(angle * i) * separation;
        const z = Math.sin(angle * i) * separation;
        positions.push(new THREE.Vector3(x, 0, z));
      }
    }

    return positions;
  }

  /**
   * Adjust star color for companion stars
   */
  adjustColorForCompanion(baseColor, companionIndex) {
    // Shift hue slightly for companion stars
    const colorShifts = [
      0xffe5b4, // Slightly warmer
      0xb4d4ff, // Slightly cooler
    ];
    return colorShifts[(companionIndex - 1) % colorShifts.length] || baseColor;
  }

  /**
   * Add central star (or multiple stars for binary/triple systems)
   */
  addCentralStar(stellarData) {
    const numberOfStars = stellarData.numberOfStars || 1;

    // For binary/triple star systems, create multiple stars
    if (numberOfStars > 1) {
      this.addMultiStarSystem(stellarData, numberOfStars);
      return;
    }

    // Check if this is our Sun - use realistic texture
    if (stellarData.starName === "Sun") {
      this.addRealisticSun(stellarData);
      return;
    }

    // Single star system (generic)
    const starRadius = Math.max(
      0.5,
      Math.min(2, stellarData.stellarRadius * 0.5)
    );
    const starGeometry = new THREE.SphereGeometry(starRadius, 32, 32);
    const starColor = this.getStarColorFromSpectralType(stellarData);

    const starMaterial = new THREE.MeshBasicMaterial({
      color: starColor, // MeshBasicMaterial is always full brightness (self-lit)
    });

    this.centralStar = new THREE.Mesh(starGeometry, starMaterial);

    // Add glow
    const glowGeometry = new THREE.SphereGeometry(starRadius * 1.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      transparent: true,
      opacity: 0.4,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.centralStar.add(glow);

    // Add corona for hot stars
    if (stellarData.stellarTemp > 6000) {
      const coronaGeometry = new THREE.SphereGeometry(starRadius * 2, 32, 32);
      const coronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
      });
      const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
      this.centralStar.add(corona);
    }

    this.centralStar.position.set(0, 0, 0);
    this.scene.add(this.centralStar);

    // Update lighting
    this.updateLighting(stellarData);
  }

  /**
   * Add realistic Sun with texture
   */
  addRealisticSun(stellarData) {
    const starRadius = Math.max(
      0.5,
      Math.min(2, stellarData.stellarRadius * 0.5)
    );

    const starGeometry = new THREE.SphereGeometry(starRadius, 64, 64);

    // Create material with realistic Sun appearance
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xfdb813,
      emissive: 0xfdb813,
      emissiveIntensity: 1.2,
    });

    this.centralStar = new THREE.Mesh(starGeometry, starMaterial);

    // Load realistic Sun texture from local assets
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      "/textures/planets/sun.jpg",
      (texture) => {
        starMaterial.map = texture;
        starMaterial.needsUpdate = true;
        console.log("Loaded realistic Sun texture");
      },
      undefined,
      (error) => {
        console.warn(
          "Failed to load Sun texture, using solid color. Ensure sun.jpg exists in public/textures/planets/"
        );
      }
    );

    // Add multiple glow layers for realistic solar corona
    const glowLayers = [
      { scale: 1.3, opacity: 0.5, color: 0xfdb813 },
      { scale: 1.6, opacity: 0.3, color: 0xffa500 },
      { scale: 2.0, opacity: 0.15, color: 0xff8c00 },
    ];

    glowLayers.forEach((layer) => {
      const glowGeometry = new THREE.SphereGeometry(
        starRadius * layer.scale,
        32,
        32
      );
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: layer.opacity,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      this.centralStar.add(glow);
    });

    // Add solar flare effect (bright outer layer)
    const flareGeometry = new THREE.SphereGeometry(starRadius * 2.5, 32, 32);
    const flareMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xffaa00) },
        viewVector: { value: new THREE.Vector3(0, 0, 5) },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.6 - dot(vNormal, vNormel), 3.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.3);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const flare = new THREE.Mesh(flareGeometry, flareMaterial);
    this.centralStar.add(flare);

    this.centralStar.position.set(0, 0, 0);
    this.scene.add(this.centralStar);

    // Update lighting with Sun-specific values
    this.updateLighting(stellarData);
  }

  /**
   * Update scene lighting based on stellar properties
   */
  updateLighting(stellarData) {
    if (this.dynamicStarLight) {
      this.scene.remove(this.dynamicStarLight);
    }

    const starColor = this.getStarColorFromSpectralType(stellarData);
    const luminosity = stellarData.stellarLuminosity || 0;
    const intensity = 2.5 + luminosity * 0.3;

    this.dynamicStarLight = new THREE.PointLight(starColor, intensity, 100);
    this.dynamicStarLight.position.set(0, 0, 0);

    this.scene.add(this.dynamicStarLight);
  }

  /**
   * Animate orbital motion
   * Call this in the main animation loop
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {number} speedMultiplier - Speed multiplier (1.0 = 1 orbit per 60 seconds)
   */
  animateOrbits(
    deltaTime = 0.016,
    speedMultiplier = 1.0,
    useInclination = false
  ) {
    this.animationTime += deltaTime;

    this.planetMeshes.forEach((planetMesh) => {
      if (!planetMesh.userData.animateOrbits) return;

      const { orbitRadius, orbitalPeriod, planet } = planetMesh.userData;

      // Calculate angular velocity
      // At speedMultiplier = 1.0: any planet completes 1 full orbit in 60 seconds
      // This gives us a consistent time scale where we can see relative speeds
      const baseOrbitTime = 60.0; // seconds for one complete orbit at speed 1.0
      const angularVelocity = ((2 * Math.PI) / baseOrbitTime) * speedMultiplier;

      // Update angle
      planetMesh.userData.currentAngle += angularVelocity * deltaTime;

      // Get orbital parameters (only use if enabled)
      const inclination = useInclination ? planet.orbitalInclination || 0 : 0;
      const longitudeOfPeriastron = useInclination
        ? planet.longitudeOfPeriastron || 0
        : 0;
      const eccentricity = planet.orbitalEccentricity || 0;

      // Convert to radians
      const incRad = (inclination * Math.PI) / 180;
      const longPerRad = (longitudeOfPeriastron * Math.PI) / 180;
      const angle = planetMesh.userData.currentAngle;

      // Calculate position in orbital plane (with eccentricity)
      const r = orbitRadius * (1 - eccentricity * Math.cos(angle));
      let x = Math.cos(angle) * r;
      let y = 0;
      let z = Math.sin(angle) * r;

      // Apply 3D rotation for orbital inclination (only if enabled)
      if (useInclination && inclination !== 0) {
        const y_rot = y * Math.cos(incRad) - z * Math.sin(incRad);
        const z_rot = y * Math.sin(incRad) + z * Math.cos(incRad);
        y = y_rot;
        z = z_rot;
      }

      // Apply rotation for longitude of periastron (only if enabled)
      if (useInclination && longitudeOfPeriastron !== 0) {
        const x_rot = x * Math.cos(longPerRad) - y * Math.sin(longPerRad);
        const y_rot = x * Math.sin(longPerRad) + y * Math.cos(longPerRad);
        x = x_rot;
        y = y_rot;
      }

      // Update planet position with 3D orbital mechanics
      planetMesh.position.set(x, y, z);

      // Rotate planet on its axis
      planetMesh.rotation.y += 0.01;
    });
  }

  /**
   * Rotate all planets on their axes
   */
  rotatePlanets(speed = 0.005) {
    this.planetMeshes.forEach((mesh) => {
      mesh.rotation.y += speed;
    });
  }

  /**
   * Get all planet meshes
   */
  getAllPlanetMeshes() {
    return this.planetMeshes;
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    if (this.systemPlanets.length === 0) return null;

    const types = {
      terrestrial: 0,
      "super-earth": 0,
      neptune: 0,
      jupiter: 0,
    };

    let minOrbit = Infinity;
    let maxOrbit = 0;
    let totalMass = 0;
    let avgTemp = 0;

    this.systemPlanets.forEach((planet) => {
      types[planet.type]++;

      if (planet.semiMajorAxis) {
        minOrbit = Math.min(minOrbit, planet.semiMajorAxis);
        maxOrbit = Math.max(maxOrbit, planet.semiMajorAxis);
      }

      if (planet.mass) {
        totalMass += planet.mass;
      }

      avgTemp += planet.temperature;
    });

    avgTemp /= this.systemPlanets.length;

    return {
      starName: this.systemPlanets[0].hostStar,
      planetCount: this.systemPlanets.length,
      types: types,
      orbitalRange:
        minOrbit !== Infinity ? { min: minOrbit, max: maxOrbit } : null,
      totalMass: totalMass,
      avgTemperature: avgTemp,
    };
  }

  /**
   * Focus on a specific planet (hide others, stop animations)
   * @param {Object} planet - The planet to focus on
   */
  focusOnPlanet(planet) {
    this.planetMeshes.forEach((mesh) => {
      if (mesh.userData.planet === planet) {
        // Keep the focused planet visible
        mesh.visible = true;
        // Stop its orbital animation
        mesh.userData.animateOrbits = false;
      } else {
        // Hide other planets
        mesh.visible = false;
      }
    });

    // Hide the central star initially (will show when orbit is enabled)
    if (this.centralStar) {
      this.centralStar.visible = false;
    }
    if (this.dynamicStarLight) {
      this.dynamicStarLight.visible = false;
    }

    // Hide all orbit lines initially
    this.orbitLines.forEach((line) => {
      line.visible = false;
    });
  }

  /**
   * Show/hide the central star
   */
  setCentralStarVisibility(visible) {
    if (this.centralStar) {
      this.centralStar.visible = visible;
    }
    if (this.dynamicStarLight) {
      this.dynamicStarLight.visible = visible;
    }
  }

  /**
   * Show orbit line for a specific planet
   */
  showOrbitForPlanet(planet, show = true) {
    const planetIndex = this.planetMeshes.findIndex(
      (mesh) => mesh.userData.planet === planet
    );

    if (planetIndex >= 0 && this.orbitLines[planetIndex]) {
      this.orbitLines[planetIndex].visible = show;
    }

    // Also enable/disable orbital animation for the planet
    if (planetIndex >= 0) {
      this.planetMeshes[planetIndex].userData.animateOrbits = show;
    }
  }

  /**
   * Return to system view (show all planets, resume animations)
   */
  showAllPlanets() {
    this.planetMeshes.forEach((mesh) => {
      mesh.visible = true;
      mesh.userData.animateOrbits = true;
    });

    if (this.centralStar) {
      this.centralStar.visible = true;
    }
    if (this.dynamicStarLight) {
      this.dynamicStarLight.visible = true;
    }

    this.orbitLines.forEach((line) => {
      line.visible = true;
    });
  }

  /**
   * Toggle atmosphere visibility for all gas giant planets
   */
  toggleAtmospheres(show) {
    this.showAtmospheres = show;

    this.planetMeshes.forEach((mesh) => {
      const planet = mesh.userData.planet;
      const isGasGiant = planet.type === "jupiter" || planet.type === "neptune";

      if (isGasGiant) {
        // Find and toggle existing atmosphere
        const atmosphere = mesh.children.find(
          (child) => child.name === "atmosphere"
        );

        if (show && !atmosphere) {
          // Create new atmosphere
          // Get base radius from userData or fallback to geometry parameters
          const baseRadius =
            mesh.userData.baseRadius || mesh.geometry.parameters.radius;

          // Validate baseRadius to prevent NaN
          if (!baseRadius || isNaN(baseRadius)) {
            console.warn(
              `Cannot create atmosphere for ${planet.name}: invalid radius`
            );
            return;
          }

          const atmosphereRadius = baseRadius * 1.15;
          const atmosphereGeometry = new THREE.SphereGeometry(
            atmosphereRadius,
            32,
            32
          );
          const atmosphereColor =
            planet.type === "jupiter" ? 0xf8e8d8 : 0xa8c8f8;
          const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: atmosphereColor,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide,
          });
          const newAtmosphere = new THREE.Mesh(
            atmosphereGeometry,
            atmosphereMaterial
          );
          newAtmosphere.name = "atmosphere";
          mesh.add(newAtmosphere);

          // Update userData if not already set
          if (!mesh.userData.baseRadius) {
            mesh.userData.baseRadius = baseRadius;
          }
          mesh.userData.actualRadius = atmosphereRadius;
        } else if (!show && atmosphere) {
          // Remove atmosphere
          mesh.remove(atmosphere);
          atmosphere.geometry.dispose();
          atmosphere.material.dispose();

          // Get base radius from userData or geometry
          const baseRadius =
            mesh.userData.baseRadius || mesh.geometry.parameters.radius;
          mesh.userData.actualRadius = baseRadius;
        }
      }
    });
  }

  /**
   * Get the mesh for a specific planet
   */
  getPlanetMesh(planet) {
    return this.planetMeshes.find((mesh) => mesh.userData.planet === planet);
  }

  /**
   * Cleanup all system objects
   */
  cleanup() {
    // Remove planet meshes
    this.planetMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    this.planetMeshes = [];

    // Remove orbit lines
    this.orbitLines.forEach((line) => {
      this.scene.remove(line);
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
    });
    this.orbitLines = [];

    // Remove central star
    if (this.centralStar) {
      this.scene.remove(this.centralStar);
      this.centralStar = null;
    }

    // Remove lighting
    if (this.dynamicStarLight) {
      this.scene.remove(this.dynamicStarLight);
      this.dynamicStarLight = null;
    }

    this.systemPlanets = [];
    this.animationTime = 0;
  }
}
