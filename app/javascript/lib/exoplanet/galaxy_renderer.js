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
    this.milkyWayStructure = null; // Visual representation of galaxy structure
    this.galacticCenterMarker = null; // Sagittarius A* marker
    this.spiralArms = []; // Visual spiral arm structures
    this.milkyWayDisk = null; // Reference to the disk mesh
    this.diskRotationZ = 0; // Current Z rotation of the disk
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

    // Add realistic Milky Way structure
    this.addMilkyWayStructure();

    // Add galactic center (visual reference point for our Sun/Solar System)
    this.addGalacticCenter();

    // Add marker for actual galactic center (Sagittarius A*)
    this.addGalacticCenterMarker();

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
   * Add complete Milky Way galaxy structure
   */
  addMilkyWayStructure() {
    this.milkyWayStructure = new THREE.Group();

    // Add textured disk with realistic Milky Way image
    this.addGalacticDiskTexture();

    // Position the galaxy in galactic coordinates
    this.positionGalaxyInGalacticCoordinates();

    this.scene.add(this.milkyWayStructure);
  }

  /**
   * Position the galaxy structure in galactic coordinates
   */
  positionGalaxyInGalacticCoordinates() {
    const earthDistanceFromGC = 27000;
    const scaledDistance = Math.log10(earthDistanceFromGC + 1) * 15;
    this.milkyWayStructure.position.set(scaledDistance, 0, 0);
  }

  /**
   * Add textured galactic disk showing the spiral structure
   */
  addGalacticDiskTexture() {
    const diskGeometry = new THREE.CircleGeometry(180, 128);

    const diskMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const disk = new THREE.Mesh(diskGeometry, diskMaterial);
    this.milkyWayDisk = disk;
    disk.rotation.x = Math.PI / 2;
    disk.rotation.z = this.diskRotationZ;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      "/textures/galaxy/milky_way.png",
      (texture) => {
        diskMaterial.map = texture;
        diskMaterial.needsUpdate = true;
      },
      undefined,
      (error) => {
        console.warn("Failed to load Milky Way texture");
      }
    );

    this.milkyWayStructure.add(disk);
  }

  /**
   * Add marker for galactic center (Sagittarius A*)
   */
  addGalacticCenterMarker() {
    const earthDistanceFromGC = 27000;
    const scaledDistance = Math.log10(earthDistanceFromGC + 1) * 15;

    const geometry = new THREE.SphereGeometry(3, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8,
    });

    this.galacticCenterMarker = new THREE.Mesh(geometry, material);
    this.galacticCenterMarker.position.set(scaledDistance, 0, 0);

    const glowGeometry = new THREE.SphereGeometry(5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.galacticCenterMarker.add(glow);

    this.scene.add(this.galacticCenterMarker);
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
  }

  /**
   * Convert equatorial coordinates (RA, Dec) to galactic coordinates (l, b)
   */
  equatorialToGalactic(ra, dec) {
    const galacticCenterRA = 266.4;
    const galacticCenterDec = -28.9;
    const northGalacticPoleRA = 192.85;
    const northGalacticPoleDec = 27.13;
    const galacticLongitudeOfNCP = 122.93;

    const raRad = (ra * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;
    const ngpRA = (northGalacticPoleRA * Math.PI) / 180;
    const ngpDec = (northGalacticPoleDec * Math.PI) / 180;

    const sinB =
      Math.sin(decRad) * Math.sin(ngpDec) +
      Math.cos(decRad) * Math.cos(ngpDec) * Math.cos(raRad - ngpRA);
    const b = Math.asin(sinB);

    const y = Math.cos(decRad) * Math.sin(raRad - ngpRA);
    const x =
      Math.sin(decRad) * Math.cos(ngpDec) -
      Math.cos(decRad) * Math.sin(ngpDec) * Math.cos(raRad - ngpRA);
    let l = Math.atan2(y, x) + (galacticLongitudeOfNCP * Math.PI) / 180;

    if (l < 0) l += 2 * Math.PI;
    if (l >= 2 * Math.PI) l -= 2 * Math.PI;

    return { l, b };
  }

  /**
   * Calculate 3D position for a star system using galactic coordinates
   * Converts RA/Dec to galactic coordinates with 123° rotation offset
   * Earth is at the origin (0, 0, 0)
   */
  calculateSystemPosition(system, index, totalSystems) {
    const firstPlanet = system.planets[0];
    if (!firstPlanet) {
      console.warn("System has no planets:", system);
      return new THREE.Vector3(0, 0, 0);
    }

    const distance = system.distance || 100;
    const ra = firstPlanet.ra;
    const dec = firstPlanet.dec;

    const earthDistanceFromGC = 27000;
    const earthScaledDist = Math.log10(earthDistanceFromGC + 1) * 15;

    if (ra === null || dec === null || ra === undefined || dec === undefined) {
      console.warn("Missing RA/Dec for system:", system.name);
      const theta = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 4;
      const radius = Math.random() * 10 + earthScaledDist - 5;
      return new THREE.Vector3(
        radius * Math.cos(theta),
        height,
        radius * Math.sin(theta)
      );
    }

    // Convert equatorial to galactic coordinates
    const galactic = this.equatorialToGalactic(ra, dec);
    let l = galactic.l;
    const b = galactic.b;

    // Apply 123° rotation offset to align with Milky Way texture
    const rotationOffset = (123 * Math.PI) / 180;
    l = l + rotationOffset;

    // Scale distance for visualization
    const scaledDistanceFromEarth = Math.log10(distance + 1) * 8;

    // Position relative to Earth in galactic coordinates
    const xFromEarth = scaledDistanceFromEarth * Math.cos(b) * Math.cos(l);
    const yFromEarth = scaledDistanceFromEarth * Math.sin(b) * 0.2;
    const zFromEarth = scaledDistanceFromEarth * Math.cos(b) * Math.sin(l);

    const earthPosGalactocentric = new THREE.Vector3(0, 0, 0);
    const systemPosHeliocentric = new THREE.Vector3(
      xFromEarth,
      yFromEarth,
      zFromEarth
    );

    const finalPosition = systemPosHeliocentric.add(earthPosGalactocentric);
    return finalPosition;
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
   */
  animateGalaxy(deltaTime) {
    const time = Date.now() * 0.001;

    // Rotate the Sun at galactic center
    if (this.galacticCenter) {
      this.galacticCenter.rotation.y += deltaTime * 0.05;
      const pulse = Math.sin(time * 0.5) * 0.1 + 1.0;
      this.galacticCenter.scale.setScalar(pulse);
    }

    // Animate galactic center marker (Sagittarius A*)
    if (this.galacticCenterMarker) {
      const pulse = Math.sin(time * 1.5) * 0.15 + 1.0;
      this.galacticCenterMarker.scale.setScalar(pulse);
    }

    // Subtle pulsing of stars (twinkling effect)
    this.systemMeshes.forEach((mesh, index) => {
      if (mesh.userData.isStarSystem) {
        const pulse = Math.sin(time + index * 0.5) * 0.1 + 0.9;
        mesh.scale.setScalar(pulse);
      }
    });
  }

  /**
   * Set rendering quality
   * @param {boolean} high - Whether to use high quality rendering
   */
  setQuality(high) {
    // Update quality for all system meshes
    this.systemMeshes.forEach((mesh) => {
      if (mesh.material) {
        if (high) {
          mesh.material.flatShading = false;
          // Increase emissive intensity for better glow
          if (mesh.material.emissive) {
            mesh.material.emissiveIntensity = 1.0;
          }
        } else {
          mesh.material.flatShading = true;
          // Reduce emissive intensity for performance
          if (mesh.material.emissive) {
            mesh.material.emissiveIntensity = 0.7;
          }
        }
        mesh.material.needsUpdate = true;
      }
    });

    // Update galactic center quality if present
    if (this.galacticCenter && this.galacticCenter.material) {
      if (high) {
        this.galacticCenter.material.flatShading = false;
      } else {
        this.galacticCenter.material.flatShading = true;
      }
      this.galacticCenter.material.needsUpdate = true;
    }
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
      if (this.galacticCenter.geometry) this.galacticCenter.geometry.dispose();
      if (this.galacticCenter.material) this.galacticCenter.material.dispose();
      this.galacticCenter.children.forEach((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.galacticCenter = null;
    }

    // Remove Milky Way structure
    if (this.milkyWayStructure) {
      this.scene.remove(this.milkyWayStructure);
      this.milkyWayStructure.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.milkyWayStructure = null;
    }

    // Remove galactic center marker
    if (this.galacticCenterMarker) {
      this.scene.remove(this.galacticCenterMarker);
      if (this.galacticCenterMarker.geometry)
        this.galacticCenterMarker.geometry.dispose();
      if (this.galacticCenterMarker.material)
        this.galacticCenterMarker.material.dispose();
      this.galacticCenterMarker.children.forEach((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.galacticCenterMarker = null;
    }

    this.spiralArms = [];
    this.milkyWayDisk = null;
    this.starSystems = [];
  }
}
