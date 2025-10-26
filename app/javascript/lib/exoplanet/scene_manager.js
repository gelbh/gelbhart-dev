import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/**
 * SceneManager
 * Manages Three.js scene setup, camera, lighting, starfield, and rendering
 */
export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.composer = null;
    this.bloomPass = null;
    this.starField = null;
    this.ambientLight = null;
    this.starLight = null;
    this.animationId = null;
    this.starAnimationFrameCount = 0; // Counter for throttling star updates
    this.isMobileDevice = this.detectMobileDevice(); // Detect mobile for performance optimization
  }

  /**
   * Detect if device is mobile for performance optimizations
   */
  detectMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
    );
  }

  /**
   * Initialize Three.js scene, camera, renderer, and controls
   */
  initialize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera (60° FOV for better viewing area, standard for 3D applications)
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Post-processing
    this.setupPostProcessing(width, height);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;

    // Lighting
    this.setupLighting();

    // Starfield
    this.addStarfield();

    // Handle window resize
    window.addEventListener("resize", () => this.onWindowResize());
  }

  /**
   * Setup lighting for the scene
   */
  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    this.starLight = new THREE.PointLight(0xffffff, 2, 100);
    this.starLight.position.set(5, 3, 5);
    this.scene.add(this.starLight);
  }

  /**
   * Add starfield background with twinkling stars
   */
  addStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    const starsSizes = [];
    const starsColors = [];

    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      starsVertices.push(x, y, z);

      starsSizes.push(Math.random() * 2 + 0.5);

      const color = new THREE.Color();
      color.setHSL(0.6, 0.2, 0.8 + Math.random() * 0.2);
      starsColors.push(color.r, color.g, color.b);
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starsVertices, 3)
    );
    starsGeometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(starsSizes, 1)
    );
    starsGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(starsColors, 3)
    );

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
    });

    this.starField = new THREE.Points(starsGeometry, starsMaterial);
    this.starField.renderOrder = -1; // Render stars before other objects
    this.scene.add(this.starField);
  }

  /**
   * Animate twinkling stars (throttled to every 3 frames for performance)
   */
  animateStars() {
    if (!this.starField) return;

    // Throttle star animation to every 3 frames (~20 FPS instead of 60 FPS)
    // This reduces CPU load by ~67% with minimal visual difference
    this.starAnimationFrameCount++;
    if (this.starAnimationFrameCount < 3) {
      return;
    }
    this.starAnimationFrameCount = 0;

    const time = Date.now() * 0.0005;
    const sizes = this.starField.geometry.attributes.size.array;
    const originalSizes = this.starField.geometry.attributes.size.array;

    for (let i = 0; i < sizes.length; i++) {
      const twinkle = Math.abs(Math.sin(time + i * 0.5)) * 0.5 + 0.5;
      sizes[i] = (originalSizes[i] || 1) * (0.7 + twinkle * 0.6);
    }
    this.starField.geometry.attributes.size.needsUpdate = true;
  }

  /**
   * Setup post-processing effects (disabled on mobile for performance)
   */
  setupPostProcessing(width, height) {
    // Skip post-processing on mobile devices for better performance
    if (this.isMobileDevice) {
      console.log(
        "Mobile device detected - post-processing disabled for performance"
      );
      this.composer = null;
      return;
    }

    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.5, // Strength
      0.4, // Radius
      0.85 // Threshold
    );
    this.composer.addPass(this.bloomPass);

    console.log("Post-processing enabled (bloom effect)");
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  /**
   * Update controls
   */
  updateControls() {
    if (this.controls && this.controls.enabled) {
      this.controls.update();
    }
  }

  /**
   * Render the scene
   */
  render() {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Reset camera to default position
   */
  resetCamera(optimalDistance = 5) {
    if (!this.camera || !this.controls) return;

    const distance = Math.max(2.5, Math.min(25, optimalDistance));

    this.camera.position.set(0, 0, distance);
    this.camera.rotation.set(0, 0, 0);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);

    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Smooth camera transition animation
   */
  smoothCameraTransition(targetPosition, duration = 1200, onComplete = null) {
    if (!this.camera || !this.controls) return;

    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const targetControlsTarget = new THREE.Vector3(0, 0, 0); // Always look at origin
    const startTime = Date.now();

    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth motion (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      // Smoothly transition both camera position and controls target
      this.camera.position.lerpVectors(startPosition, targetPosition, eased);
      this.controls.target.lerpVectors(
        startTarget,
        targetControlsTarget,
        eased
      );
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else if (onComplete) {
        onComplete();
      }
    };

    animateCamera();
  }

  /**
   * Smooth camera transition with custom target (for cinematic camera movements)
   * Transitions both camera position and the point it's looking at
   */
  smoothCameraTransitionWithTarget(
    targetPosition,
    targetLookAt,
    duration = 1500,
    onComplete = null
  ) {
    if (!this.camera || !this.controls) return;

    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = Date.now();

    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth motion (ease-in-out cubic for more cinematic feel)
      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Smoothly transition both camera position and look-at target
      this.camera.position.lerpVectors(startPosition, targetPosition, eased);
      this.controls.target.lerpVectors(startTarget, targetLookAt, eased);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else if (onComplete) {
        onComplete();
      }
    };

    animateCamera();
  }

  /**
   * Smooth camera transition that tracks a moving target (for following orbiting planets)
   * The camera continuously follows the target as it moves during the animation
   */
  smoothCameraTransitionTrackingTarget(
    targetMesh,
    desiredDistance,
    duration = 2000,
    onComplete = null
  ) {
    if (!this.camera || !this.controls) return;

    const startPosition = this.camera.position.clone();
    const startLookAt = this.controls.target.clone();
    const startTime = Date.now();

    // Get initial planet position
    const initialPlanetPosition = new THREE.Vector3();
    targetMesh.getWorldPosition(initialPlanetPosition);

    // Calculate the initial ideal camera position relative to planet
    const cameraOffset = new THREE.Vector3(
      0,
      desiredDistance * 0.2,
      desiredDistance
    );
    const initialIdealPosition = initialPlanetPosition
      .clone()
      .add(cameraOffset);

    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth motion (ease-in-out cubic for more cinematic feel)
      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Get the target's current world position (updates as it orbits)
      const currentPlanetPosition = new THREE.Vector3();
      targetMesh.getWorldPosition(currentPlanetPosition);

      // Calculate current ideal camera position relative to planet's current position
      const currentIdealPosition = currentPlanetPosition
        .clone()
        .add(cameraOffset);

      // The final target position is the initial ideal position plus the delta from planet movement
      const planetDelta = currentPlanetPosition
        .clone()
        .sub(initialPlanetPosition);
      const movingTargetPosition = initialIdealPosition
        .clone()
        .add(planetDelta);

      // Smoothly interpolate from start position to the moving target position
      this.camera.position.lerpVectors(
        startPosition,
        movingTargetPosition,
        eased
      );

      // Smoothly interpolate the look-at target from start to current planet position
      this.controls.target.lerpVectors(
        startLookAt,
        currentPlanetPosition,
        eased
      );
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else if (onComplete) {
        onComplete();
      }
    };

    animateCamera();
  }

  /**
   * Calculate optimal camera distance based on object size
   */
  calculateOptimalCameraDistance(
    objectRadius,
    showOrbit = false,
    orbitRadius = null
  ) {
    const fov = this.camera.fov * (Math.PI / 180);
    let distance = Math.abs((objectRadius * 2.5) / Math.tan(fov / 2));

    if (showOrbit && orbitRadius) {
      distance = Math.abs((orbitRadius * 2.5) / Math.tan(fov / 2));
    }

    return Math.max(2.5, Math.min(25, distance));
  }

  /**
   * Cleanup scene objects
   */
  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
