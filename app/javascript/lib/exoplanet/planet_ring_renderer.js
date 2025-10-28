import * as THREE from "three";
import { hashCode, seededRandom } from "./utils";

/**
 * PlanetRingRenderer
 * Handles planetary ring rendering for Saturn and other gas giants
 *
 * Provides realistic ring systems for Saturn and procedural rings for other planets
 */
export class PlanetRingRenderer {
  /**
   * @param {THREE.Scene} scene - THREE.js scene (kept for compatibility)
   * @param {Object} textureCache - Texture cache object with rings Map
   * @param {Object} materialGenerator - Material generator (kept for compatibility)
   */
  constructor(scene, textureCache, materialGenerator) {
    this.scene = scene;
    this.textureCache = textureCache;
    this.materialGenerator = materialGenerator;
    this.rings = null;
  }

  /**
   * Add realistic Saturn rings
   * Creates detailed ring system with distinct bands (A, B, C rings) and gaps
   *
   * @param {number} planetRadius - Base radius of the planet
   * @param {THREE.Mesh} planetMesh - The planet mesh to attach rings to
   * @returns {THREE.Mesh} The created ring mesh
   */
  addSaturnRings(planetRadius, planetMesh) {
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
      ringTexture.wrapS = THREE.ClampToEdgeWrapping;
      ringTexture.wrapT = THREE.RepeatWrapping;
      ringTexture.needsUpdate = true;

      // Cache the ring texture
      this.textureCache.rings.set(cacheKey, ringTexture);
    }

    const ringMaterial = new THREE.MeshBasicMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false, // Prevent z-fighting issues
    });

    this.rings = new THREE.Mesh(ringGeometry, ringMaterial);
    // Saturn's rings are tilted at approximately 26.7 degrees from our viewing angle
    this.rings.rotation.x = Math.PI / 2 + (26.7 * Math.PI) / 180;

    // Ensure rings render on top of planet
    this.rings.renderOrder = 1;

    // Make rings visible from both sides and ensure they're not culled
    this.rings.frustumCulled = false;

    // Add rings as child of planet mesh so they automatically follow planet transformations
    if (planetMesh) {
      planetMesh.add(this.rings);
    } else {
      // Fallback: add to scene if no planet mesh provided
      this.scene.add(this.rings);
    }

    return this.rings;
  }

  /**
   * Add realistic Neptune rings
   * Creates very faint, dark, narrow rings (Adams, Le Verrier, Galle, etc.)
   *
   * @param {number} planetRadius - Base radius of the planet
   * @param {THREE.Mesh} planetMesh - The planet mesh to attach rings to
   * @returns {THREE.Mesh} The created ring mesh
   */
  addNeptuneRings(planetRadius, planetMesh) {
    const ringGeometry = new THREE.RingGeometry(
      planetRadius * 1.5, // Inner radius
      planetRadius * 2.8, // Outer radius (wider span but very sparse)
      128 // High detail to show thin structure
    );

    // Check cache first
    const cacheKey = "neptune_rings";
    let ringTexture = this.textureCache.rings.get(cacheKey);

    if (!ringTexture) {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");

      // Neptune's rings: very faint and narrow
      for (let i = 0; i < 1024; i++) {
        const position = i / 1024;

        let opacity = 0;

        // Galle ring (innermost, very faint)
        if (position < 0.15) {
          opacity = 0.02 + Math.random() * 0.03;
        }
        // Gap
        else if (position < 0.25) {
          opacity = 0;
        }
        // Le Verrier ring (thin)
        else if (position < 0.28) {
          opacity = 0.08 + Math.random() * 0.05;
        }
        // Gap
        else if (position < 0.45) {
          opacity = 0;
        }
        // Lassell ring (faint, diffuse)
        else if (position < 0.55) {
          opacity = 0.03 + Math.random() * 0.02;
        }
        // Gap
        else if (position < 0.75) {
          opacity = 0;
        }
        // Adams ring (outermost, brightest but still very faint)
        else if (position < 0.82) {
          opacity = 0.12 + Math.random() * 0.08;
        }
        // Arago ring arc
        else if (position < 0.85) {
          opacity = 0.05 + Math.random() * 0.03;
        } else {
          opacity = 0;
        }

        // Neptune rings are dark grey/black
        const baseColor = 60 + Math.random() * 30; // Very dark
        const r = baseColor;
        const g = baseColor;
        const b = baseColor * 1.1; // Slight blue tint

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.fillRect(i, 0, 1, 64);
      }

      ringTexture = new THREE.CanvasTexture(canvas);
      ringTexture.wrapS = THREE.ClampToEdgeWrapping;
      ringTexture.wrapT = THREE.RepeatWrapping;
      ringTexture.needsUpdate = true;

      this.textureCache.rings.set(cacheKey, ringTexture);
    }

    const ringMaterial = new THREE.MeshBasicMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6, // Overall low opacity
      depthWrite: false,
      blending: THREE.NormalBlending, // Not additive - they're dark
    });

    this.rings = new THREE.Mesh(ringGeometry, ringMaterial);
    // Neptune's rings have slight tilt
    this.rings.rotation.x = Math.PI / 2 + (28.3 * Math.PI) / 180;

    this.rings.renderOrder = 1;
    this.rings.frustumCulled = false;

    if (planetMesh) {
      planetMesh.add(this.rings);
    } else {
      this.scene.add(this.rings);
    }

    return this.rings;
  }

  /**
   * Add procedural rings to gas giants (Jupiter, Uranus, etc.)
   * Creates randomized ring systems with multiple bands and gaps
   *
   * @param {Object} planet - Planet data object with name property
   * @param {number} planetRadius - Base radius of the planet
   * @param {THREE.Mesh} planetMesh - The planet mesh to attach rings to
   * @returns {THREE.Mesh} The created ring mesh
   */
  addPlanetRings(planet, planetRadius, planetMesh) {
    const ringGeometry = new THREE.RingGeometry(
      planetRadius * 1.5,
      planetRadius * 2.5,
      64
    );

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    const seed = hashCode(planet.name + "_rings");
    const random = seededRandom(seed);

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
    ringTexture.wrapS = THREE.ClampToEdgeWrapping;
    ringTexture.wrapT = THREE.RepeatWrapping;
    ringTexture.needsUpdate = true;

    const ringMaterial = new THREE.MeshBasicMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false, // Prevent z-fighting issues
    });

    this.rings = new THREE.Mesh(ringGeometry, ringMaterial);
    this.rings.rotation.x = Math.PI / 2 + (random() * 0.4 - 0.2);

    // Ensure rings render on top of planet
    this.rings.renderOrder = 1;

    // Add rings as child of planet mesh so they automatically follow planet transformations
    if (planetMesh) {
      planetMesh.add(this.rings);
    } else {
      // Fallback: add to scene if no planet mesh provided
      this.scene.add(this.rings);
    }

    return this.rings;
  }

  /**
   * Get the current rings mesh
   * @returns {THREE.Mesh|null} The rings mesh or null if not created
   */
  getRings() {
    return this.rings;
  }

  /**
   * Clear the current rings reference
   */
  clearRings() {
    this.rings = null;
  }
}
