import * as THREE from "three";
import { getStarColor, hashCode, seededRandom } from "./utils";

/**
 * StarRenderer
 * Creates realistic star visuals based on stellar physics
 * Implements procedural surface textures, coronas, and proper spectral characteristics
 */
export class StarRenderer {
  constructor(scene) {
    this.scene = scene;
    this.textureCache = new Map();
    this.stars = [];
  }

  /**
   * Create a realistic star with all visual effects
   * @param {Object} stellarData - Stellar properties (spectralType, stellarTemp, stellarRadius, stellarLuminosity)
   * @param {THREE.Vector3} position - Position in 3D space
   * @param {Object} options - { showCorona, showFlares, animate, simplified, lowDetail, customRadius }
   * @returns {THREE.Group} Star group with all components
   */
  createRealisticStar(
    stellarData,
    position = new THREE.Vector3(0, 0, 0),
    options = {}
  ) {
    const {
      showCorona = true,
      showFlares = false,
      animate = true,
      simplified = false, // Simplified mode for performance
      lowDetail = false, // Low detail mode for distant stars
      customRadius = null, // Custom radius for realistic sizing
    } = options;

    // If simplified, use basic rendering
    if (simplified) {
      return this.createSimplifiedStar(stellarData, position, options);
    }

    const starGroup = new THREE.Group();
    starGroup.position.copy(position);

    // Calculate star properties - use custom radius if provided
    const starRadius =
      customRadius !== null
        ? customRadius
        : Math.max(0.5, Math.min(2, stellarData.stellarRadius * 0.5));
    const stellarTemp = stellarData.stellarTemp || 5778; // Default to Sun-like
    const spectralType = stellarData.spectralType || "G";
    const luminosity = stellarData.stellarLuminosity || 1;

    // Get realistic star color
    const starColor = getStarColor({ spectralType, stellarTemp });
    const colorObj = new THREE.Color(starColor);

    // Create star surface with procedural texture
    const starMesh = this.createStarSurface(
      starRadius,
      stellarTemp,
      spectralType,
      colorObj,
      stellarData,
      lowDetail
    );
    starGroup.add(starMesh);

    // Add chromosphere (inner atmosphere) - skip in low detail mode
    if (!lowDetail) {
      const chromosphere = this.createChromosphere(
        starRadius,
        colorObj,
        stellarTemp
      );
      starGroup.add(chromosphere);
    }

    // Add corona (outer atmosphere) for hot stars - skip in low detail mode
    if (showCorona && stellarTemp > 4000 && !lowDetail) {
      const corona = this.createCorona(
        starRadius,
        colorObj,
        stellarTemp,
        luminosity
      );
      starGroup.add(corona);
    }

    // Add stellar prominences for active stars
    if (showFlares && stellarTemp > 3000 && !lowDetail) {
      const prominences = this.createProminences(
        starRadius,
        colorObj,
        stellarData
      );
      starGroup.add(prominences);
    }

    // Store data for animation
    starGroup.userData = {
      isStar: true,
      stellarTemp,
      spectralType,
      luminosity,
      starRadius,
      animate,
      rotationSpeed: this.calculateRotationSpeed(spectralType, starRadius),
      pulseSpeed: this.calculatePulseSpeed(spectralType),
    };

    this.stars.push(starGroup);
    return starGroup;
  }

  /**
   * Create star surface with procedural texture
   */
  createStarSurface(
    starRadius,
    stellarTemp,
    spectralType,
    colorObj,
    stellarData,
    lowDetail = false
  ) {
    // Use lower geometry detail for performance
    const segments = lowDetail ? 16 : 64;
    const geometry = new THREE.SphereGeometry(starRadius, segments, segments);

    // Generate or retrieve cached texture
    const cacheKey = `star_${stellarTemp}_${spectralType}_${
      lowDetail ? "low" : "high"
    }`;
    let texture = this.textureCache.get(cacheKey);

    if (!texture) {
      texture = this.generateStarTexture(
        stellarTemp,
        spectralType,
        colorObj,
        stellarData,
        lowDetail
      );
      this.textureCache.set(cacheKey, texture);
    }

    // Create material with emissive properties (stars are self-luminous)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: colorObj,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isStarSurface = true;

    return mesh;
  }

  /**
   * Generate procedural star surface texture
   * Includes photosphere, sunspots, granulation, and spectral-specific features
   */
  generateStarTexture(
    stellarTemp,
    spectralType,
    colorObj,
    stellarData,
    lowDetail = false
  ) {
    const canvas = document.createElement("canvas");
    // Use smaller texture for low detail mode
    const textureSize = lowDetail ? 256 : 1024;
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext("2d");

    // Base star color
    const baseColor = `rgb(${Math.floor(colorObj.r * 255)}, ${Math.floor(
      colorObj.g * 255
    )}, ${Math.floor(colorObj.b * 255)})`;
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, textureSize, textureSize);

    const seed = hashCode(`${stellarTemp}_${spectralType}`);
    const random = seededRandom(seed);

    // Add surface features based on spectral type (reduced detail for low detail mode)
    if (spectralType.startsWith("O") || spectralType.startsWith("B")) {
      // Hot blue stars: smooth surface, few features
      this.addHotStarFeatures(ctx, random, colorObj, textureSize, lowDetail);
    } else if (spectralType.startsWith("A") || spectralType.startsWith("F")) {
      // White/yellow-white stars: moderate features
      this.addModerateStarFeatures(
        ctx,
        random,
        colorObj,
        textureSize,
        lowDetail
      );
    } else if (spectralType.startsWith("G")) {
      // Sun-like yellow stars: sunspots, granulation
      this.addSunlikeFeatures(
        ctx,
        random,
        colorObj,
        stellarTemp,
        textureSize,
        lowDetail
      );
    } else if (spectralType.startsWith("K")) {
      // Orange stars: many spots, active
      this.addOrangeStarFeatures(ctx, random, colorObj, textureSize, lowDetail);
    } else if (spectralType.startsWith("M")) {
      // Red dwarfs: very spotty, flare stars
      this.addRedDwarfFeatures(ctx, random, colorObj, textureSize, lowDetail);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return texture;
  }

  /**
   * Create simplified star for performance (galaxy view)
   */
  createSimplifiedStar(stellarData, position, options) {
    const { customRadius = null } = options;

    const starRadius =
      customRadius !== null
        ? customRadius
        : Math.max(0.5, Math.min(2, stellarData.stellarRadius * 0.5));
    const stellarTemp = stellarData.stellarTemp || 5778;
    const spectralType = stellarData.spectralType || "G";

    // Get star color
    const starColor = getStarColor({ spectralType, stellarTemp });
    const colorObj = new THREE.Color(starColor);

    // Simple sphere with just color, no texture
    const geometry = new THREE.SphereGeometry(starRadius, 12, 12);
    const material = new THREE.MeshBasicMaterial({
      color: colorObj,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    // Add simple glow
    const glowGeometry = new THREE.SphereGeometry(starRadius * 1.3, 12, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colorObj,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    // Store minimal data
    mesh.userData = {
      isStar: true,
      isSimplified: true,
      stellarTemp,
      spectralType,
    };

    this.stars.push(mesh);
    return mesh;
  }

  /**
   * Add features for hot O/B type stars
   */
  addHotStarFeatures(ctx, random, colorObj, textureSize, lowDetail) {
    // Hot stars have very smooth surfaces
    // Add subtle brightness variations
    const scale = textureSize / 1024;
    const featureCount = lowDetail ? 30 : 100;

    for (let i = 0; i < featureCount; i++) {
      const x = random() * textureSize;
      const y = random() * textureSize;
      const radius = (30 + random() * 60) * scale;
      const opacity = 0.03 + random() * 0.05;

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Add features for moderate A/F type stars
   */
  addModerateStarFeatures(ctx, random, colorObj, textureSize, lowDetail) {
    // Some granulation
    const scale = textureSize / 1024;
    const featureCount = lowDetail ? 100 : 300;

    for (let i = 0; i < featureCount; i++) {
      const x = random() * textureSize;
      const y = random() * textureSize;
      const radius = (10 + random() * 20) * scale;
      const brightness = random() > 0.5 ? 1 : -1;
      const opacity = 0.05 + random() * 0.08;

      if (brightness > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      }
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Add Sun-like features (G type stars)
   */
  addSunlikeFeatures(
    ctx,
    random,
    colorObj,
    stellarTemp,
    textureSize,
    lowDetail
  ) {
    const scale = textureSize / 1024;

    // Granulation pattern (convection cells)
    const granulationCount = lowDetail ? 150 : 500;
    for (let i = 0; i < granulationCount; i++) {
      const x = random() * textureSize;
      const y = random() * textureSize;
      const radius = (8 + random() * 15) * scale;
      const brightness = random() > 0.5 ? 1 : -1;
      const opacity = 0.08 + random() * 0.1;

      if (brightness > 0) {
        ctx.fillStyle = `rgba(255, 255, 200, ${opacity})`;
      } else {
        ctx.fillStyle = `rgba(100, 80, 0, ${opacity})`;
      }
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sunspots (cooler regions)
    const spotCount = lowDetail ? 8 : 15 + Math.floor(random() * 20);
    for (let i = 0; i < spotCount; i++) {
      const x = random() * textureSize;
      const y = random() * textureSize;
      const radius = (15 + random() * 35) * scale;

      // Umbra (dark center)
      ctx.fillStyle = `rgba(0, 0, 0, ${0.4 + random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Penumbra (lighter outer region)
      ctx.fillStyle = `rgba(80, 60, 0, ${0.25 + random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Faculae (bright active regions)
    const faculaeCount = lowDetail ? 10 : 30;
    for (let i = 0; i < faculaeCount; i++) {
      const x = random() * textureSize;
      const y = random() * textureSize;
      const radius = (10 + random() * 25) * scale;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Add features for K type orange stars
   */
  addOrangeStarFeatures(ctx, random, colorObj, textureSize, lowDetail) {
    const scale = textureSize / 1024;

    // K stars are magnetically active - lots of spots
    const spotCount = lowDetail ? 15 : 30 + Math.floor(random() * 40);
    for (let i = 0; i < spotCount; i++) {
      const x = random() * textureSize;
      const y = random() * textureSize;
      const radius = (20 + random() * 45) * scale;

      ctx.fillStyle = `rgba(0, 0, 0, ${0.35 + random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Granulation
    const granulationCount = lowDetail ? 120 : 400;
    for (let i = 0; i < granulationCount; i++) {
      const x = random() * textureSize;
      const y = random() * textureSize;
      const radius = (10 + random() * 18) * scale;

      ctx.fillStyle = `rgba(255, 150, 50, ${0.1 + random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Add features for M type red dwarf stars
   */
  addRedDwarfFeatures(ctx, random, colorObj, textureSize, lowDetail) {
    const scale = textureSize / 1024;

    // Red dwarfs are extremely spotty and have flares
    const spotCount = lowDetail ? 20 : 50 + Math.floor(random() * 60);
    for (let i = 0; i < spotCount; i++) {
      const x = random() * textureSize;
      const y = random() * textureSize;
      const radius = (25 + random() * 50) * scale;

      // Large dark spots covering significant portions
      ctx.fillStyle = `rgba(0, 0, 0, ${0.4 + random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bright flare regions
    const flareCount = lowDetail ? 8 : 20;
    for (let i = 0; i < flareCount; i++) {
      const x = random() * textureSize;
      const y = random() * textureSize;
      const radius = (15 + random() * 30) * scale;

      ctx.fillStyle = `rgba(255, 100, 50, ${0.2 + random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Convection patterns
    const convectionCount = lowDetail ? 100 : 300;
    for (let i = 0; i < convectionCount; i++) {
      const x = random() * textureSize;
      const y = random() * textureSize;
      const radius = (12 + random() * 20) * scale;

      ctx.fillStyle = `rgba(150, 50, 20, ${0.12 + random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Create chromosphere (inner atmospheric layer)
   */
  createChromosphere(starRadius, colorObj, stellarTemp) {
    const chromosphereRadius = starRadius * 1.08;
    const geometry = new THREE.SphereGeometry(chromosphereRadius, 64, 64);

    // Chromosphere is reddish for cool stars, bluish for hot stars
    let chromosphereColor;
    if (stellarTemp < 4000) {
      chromosphereColor = new THREE.Color(1.0, 0.3, 0.2); // Red
    } else if (stellarTemp < 7000) {
      chromosphereColor = new THREE.Color(1.0, 0.8, 0.6); // Yellow-white
    } else {
      chromosphereColor = new THREE.Color(0.8, 0.9, 1.0); // Blue-white
    }

    const material = new THREE.MeshBasicMaterial({
      color: chromosphereColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isChromosphere = true;

    return mesh;
  }

  /**
   * Create corona (outer atmospheric glow)
   */
  createCorona(starRadius, colorObj, stellarTemp, luminosity) {
    const coronaRadius = starRadius * (1.5 + luminosity * 0.3);
    const geometry = new THREE.SphereGeometry(coronaRadius, 64, 64);

    // Corona brightness depends on stellar temperature
    let coronaOpacity = 0.08;
    if (stellarTemp > 10000)
      coronaOpacity = 0.15; // Very hot stars have bright coronas
    else if (stellarTemp > 7000) coronaOpacity = 0.12;
    else if (stellarTemp < 4000) coronaOpacity = 0.05; // Cool stars have faint coronas

    const material = new THREE.MeshBasicMaterial({
      color: colorObj,
      transparent: true,
      opacity: coronaOpacity,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isCorona = true;

    // Add second, more diffuse corona layer
    const outerCoronaRadius = coronaRadius * 1.4;
    const outerGeometry = new THREE.SphereGeometry(outerCoronaRadius, 32, 32);
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: colorObj,
      transparent: true,
      opacity: coronaOpacity * 0.4,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
    outerMesh.userData.isOuterCorona = true;
    mesh.add(outerMesh);

    return mesh;
  }

  /**
   * Create stellar prominences (solar flares/loops)
   */
  createProminences(starRadius, colorObj, stellarData) {
    const prominenceGroup = new THREE.Group();

    const seed = hashCode(`${stellarData.spectralType}_prominences`);
    const random = seededRandom(seed);

    // Create 3-6 prominence arcs
    const count = 3 + Math.floor(random() * 4);

    for (let i = 0; i < count; i++) {
      const prominence = this.createSingleProminence(
        starRadius,
        colorObj,
        random
      );
      prominenceGroup.add(prominence);
    }

    prominenceGroup.userData.isProminences = true;
    return prominenceGroup;
  }

  /**
   * Create a single prominence arc
   */
  createSingleProminence(starRadius, colorObj, random) {
    const points = [];
    const arcHeight = starRadius * (0.3 + random() * 0.4);
    const arcWidth = starRadius * (0.2 + random() * 0.3);

    // Create arc shape
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI;
      const x = Math.cos(angle) * arcWidth;
      const y = starRadius + Math.sin(angle) * arcHeight;
      const z = (random() - 0.5) * arcWidth * 0.2;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      32,
      starRadius * 0.02,
      8,
      false
    );

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.0, 0.4, 0.2), // Reddish glow
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(tubeGeometry, material);

    // Random rotation to position prominence
    mesh.rotation.y = random() * Math.PI * 2;
    mesh.rotation.z = (random() - 0.5) * Math.PI * 0.5;

    return mesh;
  }

  /**
   * Calculate rotation speed based on spectral type
   * Hot stars rotate faster, cool stars slower
   */
  calculateRotationSpeed(spectralType, starRadius) {
    let baseSpeed = 0.0002;

    if (spectralType.startsWith("O") || spectralType.startsWith("B")) {
      baseSpeed *= 3; // Fast rotation
    } else if (spectralType.startsWith("A")) {
      baseSpeed *= 2;
    } else if (spectralType.startsWith("M")) {
      baseSpeed *= 0.3; // Slow rotation
    }

    // Larger stars rotate slower (conservation of angular momentum)
    return baseSpeed / Math.sqrt(starRadius);
  }

  /**
   * Calculate pulse speed for variable stars
   */
  calculatePulseSpeed(spectralType) {
    // Most stars don't pulsate noticeably
    if (spectralType.startsWith("O") || spectralType.startsWith("M")) {
      return 0.5; // Slight variation
    }
    return 0.0;
  }

  /**
   * Animate all stars (rotation, pulsation, flares)
   * Call this in animation loop
   */
  animateStars(deltaTime = 0.016) {
    this.stars.forEach((starGroup) => {
      // Skip simplified stars or stars without animation
      if (!starGroup.userData.animate || starGroup.userData.isSimplified)
        return;

      const { rotationSpeed, pulseSpeed } = starGroup.userData;

      // Rotate star surface
      const surface = starGroup.children.find(
        (child) => child.userData.isStarSurface
      );
      if (surface) {
        surface.rotation.y += rotationSpeed;
      }

      // Subtle pulsation for variable stars
      if (pulseSpeed > 0) {
        const time = Date.now() * 0.001;
        const pulse = Math.sin(time * pulseSpeed) * 0.03 + 1.0;
        starGroup.scale.setScalar(pulse);
      }

      // Animate corona shimmer
      const corona = starGroup.children.find(
        (child) => child.userData.isCorona
      );
      if (corona) {
        const time = Date.now() * 0.001;
        const shimmer = Math.sin(time * 2 + Math.random()) * 0.02 + 1.0;
        corona.scale.setScalar(shimmer);
      }
    });
  }

  /**
   * Cleanup all stars
   */
  cleanup() {
    this.stars.forEach((star) => {
      star.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });

      if (star.parent) {
        star.parent.remove(star);
      }
    });

    this.stars = [];
    this.textureCache.clear();
  }
}
