import * as THREE from "three";

/**
 * GalaxyRenderer
 * Renders multiple star systems using real astronomical coordinates
 * Uses RA (Right Ascension), Dec (Declination), and Distance data
 * to accurately position exoplanet systems as observed from Earth
 *
 * Earth is positioned at the origin (0, 0, 0)
 * Systems are placed using standard astronomical coordinate conversion:
 * - RA: 0-360 degrees (celestial longitude)
 * - Dec: -90 to +90 degrees (celestial latitude)
 * - Distance: in light-years
 */
export class GalaxyRenderer {
  constructor(scene) {
    this.scene = scene;
    this.starSystems = [];
    this.systemMeshes = [];
    this.systemLabels = [];
    this.galacticCenter = null;
  }

  /**
   * Render the galaxy view with multiple star systems
   * @param {Array} systems - Array of star system data
   */
  renderGalaxy(systems) {
    // Clean up any existing galaxy
    this.cleanup();

    if (!systems || systems.length === 0) {
      return;
    }

    this.starSystems = systems;

    // Add galactic center (visual reference point)
    this.addGalacticCenter();

    // Render each star system
    systems.forEach((system, index) => {
      this.renderStarSystem(system, index, systems.length);
    });

    // Make the galactic center (Sun) clickable by storing its system data
    if (this.galacticCenter) {
      const solarSystem = systems.find((sys) => sys.starName === "Sun");
      if (solarSystem) {
        this.galacticCenter.userData.isStarSystem = true;
        this.galacticCenter.userData.systemData = solarSystem;
        this.systemMeshes.push(this.galacticCenter);
      }
    }

    return {
      systemCount: systems.length,
      maxDistance: this.calculateMaxSystemDistance(),
    };
  }

  /**
   * Add a visual representation of the Sun (Solar System at galactic center)
   */
  addGalacticCenter() {
    // Create the Sun at the center with realistic appearance
    const geometry = new THREE.SphereGeometry(1.5, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xfdb813, // Realistic Sun color (MeshBasicMaterial is always full brightness)
    });

    this.galacticCenter = new THREE.Mesh(geometry, material);
    this.galacticCenter.position.set(0, 0, 0); // Sun/Solar System at origin

    // Load realistic Sun texture from local assets
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      "/textures/planets/sun.jpg",
      (texture) => {
        material.map = texture;
        material.needsUpdate = true;
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
      { scale: 1.6, opacity: 0.5, color: 0xfdb813 },
      { scale: 2.1, opacity: 0.35, color: 0xffa500 },
      { scale: 2.7, opacity: 0.2, color: 0xff8c00 },
    ];

    glowLayers.forEach((layer) => {
      const glowGeometry = new THREE.SphereGeometry(1.5 * layer.scale, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: layer.opacity,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      this.galacticCenter.add(glow);
    });

    // Add solar flare effect (bright outer layer)
    const flareGeometry = new THREE.SphereGeometry(1.5 * 3.0, 32, 32);
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
          intensity = pow(0.7 - dot(vNormal, vNormel), 2.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.25);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const flare = new THREE.Mesh(flareGeometry, flareMaterial);
    this.galacticCenter.add(flare);

    this.scene.add(this.galacticCenter);
  }

  /**
   * Render a single star system in the galaxy
   */
  renderStarSystem(system, index, totalSystems) {
    // Skip the Solar System - it's rendered as the galactic center
    if (system.starName === "Sun") {
      return;
    }

    // Calculate position based on distance from Earth and a spiral pattern
    const position = this.calculateSystemPosition(system, index, totalSystems);

    // Create star mesh (size based on planet count)
    const starSize = Math.max(0.3, Math.min(1.5, system.planets.length * 0.2));
    const starMesh = this.createStarMesh(system, starSize);
    starMesh.position.copy(position);

    // Store system data
    starMesh.userData = {
      system: system,
      isStarSystem: true,
    };

    this.systemMeshes.push(starMesh);
    this.scene.add(starMesh);

    // Add subtle lines connecting nearby systems to Earth
    // Only show for systems within 200 light-years
    if (system.distance && system.distance < 200) {
      this.addConnectionLine(position);
    }
  }

  /**
   * Calculate 3D position for a star system using real astronomical coordinates
   * Converts RA (Right Ascension), Dec (Declination), and Distance into Cartesian coordinates
   * Earth is at the origin (0, 0, 0)
   */
  calculateSystemPosition(system, index, totalSystems) {
    // Get the first planet to extract coordinate data
    const firstPlanet = system.planets[0];
    if (!firstPlanet) {
      console.warn("System has no planets:", system);
      return new THREE.Vector3(0, 0, 0);
    }

    const distance = system.distance || 100; // Distance in light-years
    const ra = firstPlanet.ra; // Right Ascension in degrees (0-360)
    const dec = firstPlanet.dec; // Declination in degrees (-90 to +90)

    // If we don't have coordinates, fall back to a default position
    if (ra === null || dec === null || ra === undefined || dec === undefined) {
      console.warn("Missing RA/Dec for system:", system.name);
      // Place it randomly as fallback
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const scaledDist = Math.min(distance * 0.3, 100);
      return new THREE.Vector3(
        scaledDist * Math.cos(phi) * Math.cos(theta),
        scaledDist * Math.sin(phi),
        scaledDist * Math.cos(phi) * Math.sin(theta)
      );
    }

    // Convert degrees to radians
    const raRad = (ra * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;

    // Scale distance for visualization (map light-years to scene units)
    // Most discovered exoplanets are within a few thousand light-years
    // Use logarithmic scaling to compress distant systems while keeping nearby ones visible
    const scaledDistance = Math.log10(distance + 1) * 15;

    // Convert spherical coordinates (RA, Dec, Distance) to Cartesian (x, y, z)
    // Standard astronomical coordinate conversion:
    // x points toward RA=0°, Dec=0° (vernal equinox direction)
    // y points toward Dec=+90° (north celestial pole)
    // z points toward RA=90°, Dec=0°
    const x = scaledDistance * Math.cos(decRad) * Math.cos(raRad);
    const y = scaledDistance * Math.sin(decRad);
    const z = scaledDistance * Math.cos(decRad) * Math.sin(raRad);

    return new THREE.Vector3(x, y, z);
  }

  /**
   * Get accurate star color from spectral type
   */
  getStarColor(planet) {
    // Try spectral type first for accuracy
    if (planet && planet.spectralType) {
      const typeChar = planet.spectralType.charAt(0).toUpperCase();

      // Harvard spectral classification
      const spectralColors = {
        O: 0x9bb0ff, // Blue
        B: 0xaabfff, // Blue-white
        A: 0xcad7ff, // White
        F: 0xf8f7ff, // Yellow-white
        G: 0xfff4e8, // Yellow (like our Sun)
        K: 0xffd2a1, // Orange
        M: 0xffbd6f, // Red
      };

      if (spectralColors[typeChar]) {
        return spectralColors[typeChar];
      }
    }

    // Fallback to temperature-based color
    if (planet && planet.stellarTemp) {
      const temp = planet.stellarTemp;
      if (temp > 7500) return 0xaaaaff; // Blue
      else if (temp > 6000) return 0xffffee; // White
      else if (temp > 5000) return 0xffffaa; // Yellow
      else if (temp > 3500) return 0xffaa44; // Orange
      else return 0xff6644; // Red
    }

    // Default yellow
    return 0xffffaa;
  }

  /**
   * Create star mesh with color based on stellar properties
   */
  createStarMesh(system, size) {
    const geometry = new THREE.SphereGeometry(size, 16, 16);

    // Get accurate star color using spectral type
    const firstPlanet = system.planets[0];
    const starColor = this.getStarColor(firstPlanet);

    const material = new THREE.MeshBasicMaterial({
      color: starColor,
      transparent: true,
      opacity: 0.9,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Add subtle glow
    const glowGeometry = new THREE.SphereGeometry(size * 1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    return mesh;
  }

  /**
   * Add subtle connection line from system to Earth
   * Helps visualize distance and direction from our observation point
   */
  addConnectionLine(position) {
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0)); // Earth at origin
    points.push(position);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.08,
    });

    const line = new THREE.Line(geometry, material);
    this.systemMeshes.push(line);
    this.scene.add(line);
  }

  /**
   * Calculate maximum distance of systems from center
   */
  calculateMaxSystemDistance() {
    let maxDist = 0;
    this.systemMeshes.forEach((mesh) => {
      if (mesh.userData.isStarSystem) {
        const dist = mesh.position.length();
        if (dist > maxDist) maxDist = dist;
      }
    });
    return maxDist;
  }

  /**
   * Get all star system meshes for raycasting
   */
  getAllSystemMeshes() {
    return this.systemMeshes.filter((mesh) => mesh.userData.isStarSystem);
  }

  /**
   * Find the galactic position of a specific star system
   * @param {Object} system - The star system to find
   * @returns {THREE.Vector3|null} The system's position in galactic coordinates, or null if not found
   */
  getSystemPosition(system) {
    if (!system) return null;

    // Solar System is always at the center (origin)
    if (system.starName === "Sun") {
      return new THREE.Vector3(0, 0, 0);
    }

    // Find the mesh for this system (use starName for comparison)
    const systemMesh = this.systemMeshes.find(
      (mesh) =>
        mesh.userData.isStarSystem &&
        (mesh.userData.system?.starName === system.starName ||
          mesh.userData.systemData?.starName === system.starName)
    );

    if (systemMesh) {
      return systemMesh.position.clone();
    }

    // If not found in rendered meshes, calculate it directly
    // This can happen if we're transitioning before the galaxy is fully rendered
    const systemIndex = this.starSystems.findIndex(
      (s) => s.starName === system.starName
    );
    if (systemIndex >= 0) {
      return this.calculateSystemPosition(
        system,
        systemIndex,
        this.starSystems.length
      );
    }

    return null;
  }

  /**
   * Animate galaxy view
   * Adds subtle visual effects without distorting the realistic positions
   */
  animateGalaxy(deltaTime) {
    // Rotate the Sun at galactic center
    if (this.galacticCenter) {
      this.galacticCenter.rotation.y += deltaTime * 0.05;

      // Pulse the Sun's glow
      const time = Date.now() * 0.001;
      const pulse = Math.sin(time * 0.5) * 0.1 + 1.0;
      this.galacticCenter.scale.setScalar(pulse);
    }

    // Subtle pulsing of stars (twinkling effect)
    const time = Date.now() * 0.001;
    this.systemMeshes.forEach((mesh, index) => {
      if (mesh.userData.isStarSystem) {
        const pulse = Math.sin(time + index * 0.5) * 0.1 + 0.9;
        mesh.scale.setScalar(pulse);
      }
    });
  }

  /**
   * Cleanup all galaxy objects
   */
  cleanup() {
    // Remove system meshes and connection lines
    this.systemMeshes.forEach((mesh) => {
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
    this.systemMeshes = [];

    // Remove Sun/Solar System representation
    if (this.galacticCenter) {
      this.scene.remove(this.galacticCenter);
      this.galacticCenter = null;
    }

    this.starSystems = [];
  }
}
