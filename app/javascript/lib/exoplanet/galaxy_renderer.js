import * as THREE from "three";
import { getStarColor } from "./utils";
import { StarRenderer } from "./star_renderer";

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
    this.starRenderer = new StarRenderer(scene); // Realistic star rendering
    this.useRealisticStars = false; // Toggle for realistic star rendering (disabled by default for performance)
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
   * Creates a supermassive black hole visualization with accretion disk
   */
  addGalacticCenterMarker() {
    const earthDistanceFromGC = 27000;
    const scaledDistance = Math.log10(earthDistanceFromGC + 1) * 15;

    this.galacticCenterMarker = new THREE.Group();
    this.galacticCenterMarker.position.set(scaledDistance, 0, 0);

    // Make it clickable
    this.galacticCenterMarker.userData.isGalacticCenter = true;
    this.galacticCenterMarker.userData.name = "Sagittarius A*";
    this.galacticCenterMarker.userData.description =
      "Supermassive Black Hole at the center of the Milky Way";
    this.galacticCenterMarker.userData.mass = "4.15 million solar masses";
    this.galacticCenterMarker.userData.distance =
      "27,000 light-years from Earth";

    // Central black sphere (event horizon)
    const blackHoleGeometry = new THREE.SphereGeometry(2, 32, 32);
    const blackHoleMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 1.0,
    });
    const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
    blackHole.userData.isClickable = true; // Make clickable for raycasting
    this.galacticCenterMarker.add(blackHole);

    // Inner photon sphere (gravitational lensing effect)
    const photonSphereGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const photonSphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const photonSphere = new THREE.Mesh(
      photonSphereGeometry,
      photonSphereMaterial
    );
    this.galacticCenterMarker.add(photonSphere);

    // Accretion disk
    const diskGeometry = new THREE.RingGeometry(3, 8, 64);
    const diskMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    accretionDisk.rotation.x = Math.PI / 2;
    accretionDisk.userData.isAccretionDisk = true;
    this.galacticCenterMarker.add(accretionDisk);

    // Inner hot disk region
    const hotDiskGeometry = new THREE.RingGeometry(3, 5, 64);
    const hotDiskMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff88,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const hotDisk = new THREE.Mesh(hotDiskGeometry, hotDiskMaterial);
    hotDisk.rotation.x = Math.PI / 2;
    hotDisk.userData.isHotDisk = true;
    this.galacticCenterMarker.add(hotDisk);

    // Multiple energy glow layers
    const glowLayers = [
      { radius: 4, color: 0xffaa00, opacity: 0.5 },
      { radius: 6, color: 0xff8800, opacity: 0.35 },
      { radius: 9, color: 0xff6600, opacity: 0.2 },
      { radius: 12, color: 0xff4400, opacity: 0.1 },
    ];

    glowLayers.forEach((layer, index) => {
      const glowGeometry = new THREE.SphereGeometry(layer.radius, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: layer.opacity,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.userData.glowLayer = index;
      this.galacticCenterMarker.add(glow);
    });

    // X-ray emission corona
    const coronaGeometry = new THREE.SphereGeometry(7, 32, 32);
    const coronaMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    corona.userData.isCorona = true;
    this.galacticCenterMarker.add(corona);

    // Polar jets (perpendicular to accretion disk)
    const createJet = (direction) => {
      const jetGeometry = new THREE.CylinderGeometry(0.5, 1.5, 15, 16);
      const jetMaterial = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const jet = new THREE.Mesh(jetGeometry, jetMaterial);
      jet.position.y = direction * 10;
      jet.userData.isJet = true;
      jet.userData.direction = direction;
      return jet;
    };

    const jetTop = createJet(1);
    const jetBottom = createJet(-1);
    this.galacticCenterMarker.add(jetTop);
    this.galacticCenterMarker.add(jetBottom);

    this.scene.add(this.galacticCenterMarker);
  }

  /**
   * Add a visual representation of the Sun (Solar System at galactic center)
   */
  addGalacticCenter() {
    if (this.useRealisticStars) {
      // Use simplified star renderer for the Sun for better performance
      const solarData = {
        spectralType: "G2V",
        stellarTemp: 5778,
        stellarRadius: 1.0,
        stellarLuminosity: 1.0,
      };

      this.galacticCenter = this.starRenderer.createRealisticStar(
        solarData,
        new THREE.Vector3(0, 0, 0),
        {
          showCorona: false,
          showFlares: false,
          animate: true,
          simplified: true, // Use simplified rendering for performance
        }
      );

      // Scale for galaxy view
      this.galacticCenter.scale.setScalar(1.5);
      this.scene.add(this.galacticCenter);
    } else {
      // Legacy rendering
      const geometry = new THREE.SphereGeometry(1.5, 64, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0xfdb813,
      });

      this.galacticCenter = new THREE.Mesh(geometry, material);
      this.galacticCenter.position.set(0, 0, 0);

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
   * Create star mesh with color based on stellar properties
   */
  createStarMesh(system, size) {
    if (this.useRealisticStars) {
      // Use simplified star renderer for performance in galaxy view
      const firstPlanet = system.planets[0];
      const stellarData = {
        spectralType: firstPlanet?.spectralType || "G",
        stellarTemp: firstPlanet?.stellarTemp || 5778,
        stellarRadius: firstPlanet?.stellarRadius || 1.0,
        stellarLuminosity: firstPlanet?.stellarLuminosity || 1.0,
      };

      const starGroup = this.starRenderer.createRealisticStar(
        stellarData,
        new THREE.Vector3(0, 0, 0),
        {
          showCorona: false,
          showFlares: false,
          animate: false, // Disable animation for distant stars
          simplified: true, // Use simplified rendering for performance
        }
      );

      // Scale to appropriate size for galaxy view
      starGroup.scale.setScalar(size);

      return starGroup;
    } else {
      // Legacy rendering
      const geometry = new THREE.SphereGeometry(size, 16, 16);

      const firstPlanet = system.planets[0];
      const starColor = getStarColor({
        spectralType: firstPlanet?.spectralType,
        stellarTemp: firstPlanet?.stellarTemp,
      });

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
   * Get all clickable objects (systems + galactic center)
   */
  getAllClickableObjects() {
    const clickable = [
      ...this.systemMeshes.filter((mesh) => mesh.userData.isStarSystem),
    ];

    // Add galactic center's clickable children
    if (this.galacticCenterMarker) {
      this.galacticCenterMarker.traverse((child) => {
        if (child.userData.isClickable) {
          clickable.push(child);
        }
      });
    }

    return clickable;
  }

  /**
   * Get the galactic center marker position
   */
  getGalacticCenterPosition() {
    if (this.galacticCenterMarker) {
      return this.galacticCenterMarker.position.clone();
    }
    return null;
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

    // Animate realistic stars
    if (this.useRealisticStars) {
      this.starRenderer.animateStars(deltaTime);
    } else {
      // Legacy animation
      // Rotate the Sun at galactic center
      if (this.galacticCenter) {
        this.galacticCenter.rotation.y += deltaTime * 0.05;
        const pulse = Math.sin(time * 0.5) * 0.1 + 1.0;
        this.galacticCenter.scale.setScalar(pulse);
      }

      // Subtle pulsing of stars (twinkling effect)
      this.systemMeshes.forEach((mesh, index) => {
        if (mesh.userData.isStarSystem) {
          const pulse = Math.sin(time + index * 0.5) * 0.1 + 0.9;
          mesh.scale.setScalar(pulse);
        }
      });
    }

    // Animate galactic center marker (Sagittarius A*)
    if (this.galacticCenterMarker) {
      // Rotate accretion disk
      this.galacticCenterMarker.children.forEach((child) => {
        if (child.userData.isAccretionDisk) {
          child.rotation.z += deltaTime * 0.3; // Fast inner rotation
        }
        if (child.userData.isHotDisk) {
          child.rotation.z += deltaTime * 0.5; // Even faster hot disk
        }

        // Pulsing glow layers with different frequencies
        if (child.userData.glowLayer !== undefined) {
          const layerIndex = child.userData.glowLayer;
          const pulseFreq = 1.0 + layerIndex * 0.3;
          const pulse = Math.sin(time * pulseFreq) * 0.15 + 1.0;
          child.scale.setScalar(pulse);
        }

        // Shimmer X-ray corona
        if (child.userData.isCorona) {
          const shimmer = Math.sin(time * 2.5) * 0.2 + 1.0;
          child.scale.setScalar(shimmer);
        }

        // Pulse jets
        if (child.userData.isJet) {
          const jetPulse =
            Math.sin(time * 1.5 + child.userData.direction) * 0.3 + 1.0;
          child.scale.y = jetPulse;

          // Add slight opacity variation
          const opacityPulse = Math.sin(time * 2) * 0.2 + 0.6;
          child.material.opacity = opacityPulse;
        }
      });

      // Subtle overall rotation
      this.galacticCenterMarker.rotation.y += deltaTime * 0.05;
    }
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

      // Recursively cleanup all children
      this.galacticCenterMarker.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });

      this.galacticCenterMarker = null;
    }

    // Cleanup realistic star renderer
    if (this.starRenderer) {
      this.starRenderer.cleanup();
    }

    this.spiralArms = [];
    this.milkyWayDisk = null;
    this.starSystems = [];
  }
}
