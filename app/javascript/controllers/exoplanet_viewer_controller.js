import { Controller } from "@hotwired/stimulus";
import * as THREE from "three";
import { SceneManager } from "../lib/exoplanet/scene_manager";
import { PlanetRenderer } from "../lib/exoplanet/planet_renderer";
import { SystemRenderer } from "../lib/exoplanet/system_renderer";
import { GalaxyRenderer } from "../lib/exoplanet/galaxy_renderer";
import { ApiManager } from "../lib/exoplanet/api_manager";
import { FilterManager } from "../lib/exoplanet/filter_manager";
import { UIManager } from "../lib/exoplanet/ui_manager";

// NASA Exoplanet Archive API endpoint (proxied through our backend to avoid CORS)
// Documentation: https://exoplanetarchive.ipac.caltech.edu/docs/program_interfaces.html
const EXOPLANET_API_ENDPOINT = "/api/exoplanets";

/**
 * Exoplanet Viewer Controller
 *
 * An interactive 3D exoplanet visualization tool powered by Three.js and NASA's Exoplanet Archive.
 * Features real exoplanet data, procedurally generated planets, and advanced filtering capabilities.
 *
 * Key Features:
 * - Real NASA exoplanet data from 5000+ confirmed planets
 * - Procedural planet generation based on physical properties
 * - Advanced filtering (type, temperature, distance)
 * - Orbit visualization with host star
 * - Realistic stellar lighting and atmospheric effects
 *
 * @extends Controller
 */
export default class extends Controller {
  static targets = [
    "canvas",
    "canvasLoading",
    "searchInput",
    "filterMode",
    "planetFilters",
    "systemFilters",
    "typeFilter",
    "tempMin",
    "tempMax",
    "distanceMax",
    "discoveryMethodFilter",
    "discoveryFacilityFilter",
    "minPlanets",
    "systemDistanceMax",
    "spectralTypeFilter",
    "resultsList",
    "resultCount",
    "planetInfo",
    "planetDetails",
    "planetName",
    "planetType",
    "radius",
    "mass",
    "temperature",
    "orbitalPeriod",
    "starName",
    "spectralType",
    "spectralTypeRow",
    "starAge",
    "starAgeRow",
    "distance",
    "discoveryYear",
    "discoveryMethod",
    "discoveryFacility",
    "systemContext",
    "systemContextRow",
    "nasaLink",
    "loadingIndicator",
    "instructions",
    "leftPanel",
    "systemDetails",
    "systemComparisonBody",
    "systemStarName",
    "systemPlanetCount",
    "systemDistance",
    "orbitSpeedSlider",
    "orbitSpeedValue",
    "orbitalInclinationToggle",
    "atmosphereToggle",
  ];

  /**
   * Initialize controller and setup managers
   */
  connect() {
    console.log("Exoplanet Viewer Controller Connected");

    // Current state
    this.currentPlanet = null;
    this.currentSystem = null;
    this.viewMode = "galaxy"; // Always start with galaxy view
    this.animateOrbits = true; // Always animate in system view
    this.orbitSpeed = 1.0; // Speed multiplier: 1.0 = 1 orbit per 60 seconds (realistic)
    this.useOrbitalInclination = false; // Whether to show realistic 3D orbital inclinations
    this.animationId = null;

    // Raycaster for planet click detection
    this.raycaster = null;
    this.mouse = null;

    // Two-click selection system
    this.selectedObjectForTooltip = null; // Track selected object for tooltip
    this.tooltip = null; // Reference to tooltip element
    this.tooltipTimeout = null; // Auto-hide timer for tooltip
    this.clickStartTime = 0; // Track click duration to detect accidental clicks
    this.clickStartPos = { x: 0, y: 0 }; // Track click position for drag detection

    // Event listener references for cleanup
    this.boundEventListeners = {};

    // Animation state
    this.isTabVisible = true;

    // Search debouncing
    this.searchTimeout = null;

    // Camera following state
    this.followPlanet = false; // Whether camera should follow orbiting planet
    this.lastPlanetPosition = null; // Store last planet position for delta calculation

    // Auto-switch to system/galaxy view on zoom out
    this.systemZoomThreshold = 18; // Distance threshold to switch to system view
    this.galaxyZoomThreshold = 60; // Distance threshold to switch to galaxy view
    this.lastCameraDistance = 5;
    this.isTransitioning = false; // Prevent zoom detection during view transitions

    // Initialize managers
    this.sceneManager = null;
    this.planetRenderer = null;
    this.systemRenderer = null;
    this.galaxyRenderer = null;
    this.apiManager = new ApiManager(EXOPLANET_API_ENDPOINT);
    this.filterManager = new FilterManager();
    this.uiManager = new UIManager({
      resultsList: this.resultsListTarget,
      resultCount: this.resultCountTarget,
      planetInfo: this.hasPlanetInfoTarget ? this.planetInfoTarget : null,
      planetDetails: this.hasPlanetDetailsTarget
        ? this.planetDetailsTarget
        : null,
      planetName: this.planetNameTarget,
      planetType: this.planetTypeTarget,
      radius: this.radiusTarget,
      mass: this.massTarget,
      temperature: this.temperatureTarget,
      orbitalPeriod: this.orbitalPeriodTarget,
      starName: this.starNameTarget,
      distance: this.distanceTarget,
      discoveryYear: this.discoveryYearTarget,
      nasaLink: this.nasaLinkTarget,
      loadingIndicator: this.hasLoadingIndicatorTarget
        ? this.loadingIndicatorTarget
        : null,
      canvasLoading: this.hasCanvasLoadingTarget
        ? this.canvasLoadingTarget
        : null,
      systemDetails: this.hasSystemDetailsTarget
        ? this.systemDetailsTarget
        : null,
      systemComparisonBody: this.hasSystemComparisonBodyTarget
        ? this.systemComparisonBodyTarget
        : null,
      systemStarName: this.hasSystemStarNameTarget
        ? this.systemStarNameTarget
        : null,
      systemPlanetCount: this.hasSystemPlanetCountTarget
        ? this.systemPlanetCountTarget
        : null,
      systemDistance: this.hasSystemDistanceTarget
        ? this.systemDistanceTarget
        : null,
    });

    // Set callbacks
    this.uiManager.setPlanetSelectCallback((planet) =>
      this.selectPlanet(planet)
    );
    this.uiManager.setSystemSelectCallback((system) =>
      this.selectSystem(system)
    );

    // Defer Three.js initialization to allow page animations to complete smoothly
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.initThreeJS();
        this.fetchExoplanets();
      }, 100);
    });
  }

  /**
   * Cleanup when controller disconnects
   */
  disconnect() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.sceneManager) {
      this.sceneManager.cleanup();
    }
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    if (this.tooltip && this.tooltip.parentElement) {
      this.tooltip.parentElement.removeChild(this.tooltip);
    }

    // Remove all event listeners
    if (this.canvasTarget && this.boundEventListeners) {
      this.canvasTarget.removeEventListener(
        "click",
        this.boundEventListeners.canvasClick
      );
      this.canvasTarget.removeEventListener(
        "mousedown",
        this.boundEventListeners.canvasMouseDown
      );
      this.canvasTarget.removeEventListener(
        "mouseup",
        this.boundEventListeners.canvasMouseUp
      );
      this.canvasTarget.removeEventListener(
        "mousemove",
        this.boundEventListeners.canvasMouseMove
      );
      this.canvasTarget.removeEventListener(
        "mouseleave",
        this.boundEventListeners.canvasMouseLeave
      );
      this.canvasTarget.removeEventListener(
        "contextmenu",
        this.boundEventListeners.canvasContextMenu
      );
      this.canvasTarget.removeEventListener(
        "wheel",
        this.boundEventListeners.canvasWheel
      );
    }

    if (this.boundEventListeners && this.boundEventListeners.visibilityChange) {
      document.removeEventListener(
        "visibilitychange",
        this.boundEventListeners.visibilityChange
      );
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Create tooltip element for two-click selection
   */
  createTooltip() {
    this.tooltip = document.createElement("div");
    this.tooltip.className =
      "exoplanet-tooltip position-absolute bg-dark text-white p-3 rounded shadow-lg";
    this.tooltip.style.display = "none";
    this.tooltip.style.zIndex = "1000";
    this.tooltip.style.maxWidth = "300px";
    this.tooltip.style.pointerEvents = "none";
    this.tooltip.style.opacity = "0.9"; // Add transparency
    this.tooltip.style.transition = "opacity 0.3s ease"; // Smooth fade effect
    this.canvasTarget.appendChild(this.tooltip);
  }

  /**
   * Show tooltip with object information
   */
  showTooltip(objectData, x, y) {
    if (!this.tooltip) return;

    // Clear any existing auto-hide timer
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }

    let content = "";

    if (objectData.type === "system") {
      content = `
        <div class="fw-bold mb-2"><i class="bx bx-sun text-warning me-1"></i> ${
          objectData.starName
        }</div>
        <div class="small mb-2">
          <div><i class="bx bx-planet me-1"></i> ${
            objectData.planetCount
          } planets</div>
          <div><i class="bx bx-trip me-1"></i> ${objectData.distance.toFixed(
            1
          )} light-years</div>
        </div>
        <div class="text-info small"><i class="bx bx-mouse me-1"></i> Click again to zoom in</div>
      `;
    } else if (objectData.type === "planet") {
      content = `
        <div class="fw-bold mb-2"><i class="bx bx-planet text-primary me-1"></i> ${
          objectData.name
        }</div>
        <div class="small mb-2">
          <div><i class="bx bx-sun me-1"></i> ${objectData.hostStar}</div>
          <div><i class="bx bx-thermometer me-1"></i> ${
            objectData.temperature
              ? objectData.temperature.toFixed(0) + " K"
              : "Unknown"
          }</div>
        </div>
        <div class="text-info small"><i class="bx bx-mouse me-1"></i> Click again to zoom in</div>
      `;
    }

    this.tooltip.innerHTML = content;
    this.tooltip.style.display = "block";
    this.tooltip.style.opacity = "0.9";
    this.tooltip.style.left = `${x + 15}px`;
    this.tooltip.style.top = `${y + 15}px`;

    // Auto-hide tooltip after 4 seconds
    this.tooltipTimeout = setTimeout(() => {
      this.hideTooltip();
    }, 4000);
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.opacity = "0";
      setTimeout(() => {
        if (this.tooltip) {
          this.tooltip.style.display = "none";
        }
      }, 300); // Wait for fade animation
    }
    this.selectedObjectForTooltip = null;

    // Clear auto-hide timer
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

  /**
   * Initialize Three.js Scene using SceneManager
   */
  initThreeJS() {
    this.sceneManager = new SceneManager(this.canvasTarget);
    this.sceneManager.initialize();

    // Increase max camera distance to allow galaxy view
    this.sceneManager.controls.maxDistance = 150;

    this.planetRenderer = new PlanetRenderer(this.sceneManager.scene);
    this.systemRenderer = new SystemRenderer(
      this.sceneManager.scene,
      this.planetRenderer
    );
    this.galaxyRenderer = new GalaxyRenderer(this.sceneManager.scene);

    // Setup raycaster for planet click detection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Create tooltip element
    this.createTooltip();

    // Track interaction states for cursor changes
    this.isDragging = false;
    this.isPanning = false;
    this.mouseDownPosition = null;
    this.dragThreshold = 5; // pixels - movement must exceed this to be considered dragging

    // Add event listeners with stored references for cleanup
    this.boundEventListeners.canvasClick = (event) => this.onCanvasClick(event);
    this.boundEventListeners.canvasMouseDown = (event) =>
      this.onCanvasMouseDown(event);
    this.boundEventListeners.canvasMouseUp = () => this.onCanvasMouseUp();
    this.boundEventListeners.canvasMouseMove = (event) =>
      this.onCanvasMouseMove(event);
    this.boundEventListeners.canvasMouseLeave = () => this.onCanvasMouseLeave();
    this.boundEventListeners.canvasContextMenu = (event) =>
      event.preventDefault();
    this.boundEventListeners.canvasWheel = () => {
      if (this.followPlanet) {
        this.followPlanet = false;
        this.lastPlanetPosition = null;
        console.log("Camera following disabled by zoom");
      }

      // Hide tooltip when zooming
      if (this.selectedObjectForTooltip) {
        this.hideTooltip();
      }
    };

    this.canvasTarget.addEventListener(
      "click",
      this.boundEventListeners.canvasClick
    );
    this.canvasTarget.addEventListener(
      "mousedown",
      this.boundEventListeners.canvasMouseDown
    );
    this.canvasTarget.addEventListener(
      "mouseup",
      this.boundEventListeners.canvasMouseUp
    );
    this.canvasTarget.addEventListener(
      "mousemove",
      this.boundEventListeners.canvasMouseMove
    );
    this.canvasTarget.addEventListener(
      "mouseleave",
      this.boundEventListeners.canvasMouseLeave
    );
    this.canvasTarget.addEventListener(
      "contextmenu",
      this.boundEventListeners.canvasContextMenu
    );
    this.canvasTarget.addEventListener(
      "wheel",
      this.boundEventListeners.canvasWheel
    );

    // Listen for visibility changes to pause animation when tab is hidden
    this.boundEventListeners.visibilityChange = () =>
      this.handleVisibilityChange();
    document.addEventListener(
      "visibilitychange",
      this.boundEventListeners.visibilityChange
    );

    // Start animation loop
    this.animate();

    // Hide loading indicator
    if (this.hasCanvasLoadingTarget) {
      this.canvasLoadingTarget.style.display = "none";
    }
  }

  /**
   * Handle visibility change (pause animation when tab is hidden)
   */
  handleVisibilityChange() {
    this.isTabVisible = !document.hidden;

    if (this.isTabVisible) {
      console.log("Tab visible - resuming animation");
      // Resume animation if it was paused
      if (!this.animationId) {
        this.animate();
      }
    } else {
      console.log("Tab hidden - pausing animation");
      // Animation will naturally pause on next frame
    }
  }

  /**
   * Animation loop
   */
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Skip rendering if tab is not visible to save resources
    if (!this.isTabVisible) {
      return;
    }

    // Update controls
    this.sceneManager.updateControls();

    // Check for auto-switch on zoom out (planet → system → galaxy)
    if (this.viewMode === "planet" && this.currentPlanet) {
      this.checkZoomOutSwitch();
    } else if (this.viewMode === "system" && this.currentSystem) {
      this.checkGalaxyZoomOut();
    }

    // Handle different view modes
    if (this.viewMode === "planet") {
      // Check if we're in unified system view (planet focused) or standalone planet view
      if (this.currentSystem && this.systemRenderer.systemPlanets.length > 0) {
        // Unified view: use systemRenderer
        // Don't animate orbits in planet view (just rotate the planet on its axis)
        // Always rotate planets realistically
        this.systemRenderer.rotatePlanets(0.005);
      } else {
        // Standalone planet view: use planetRenderer
        // Always rotate planet realistically
        this.planetRenderer.rotatePlanet(0.005);

        // Animate effects (clouds, lava glow)
        this.planetRenderer.animateEffects();
      }
    } else if (this.viewMode === "system") {
      // Animate orbital motion if enabled
      if (this.animateOrbits) {
        // Apply speed multiplier and inclination setting to animation
        this.systemRenderer.animateOrbits(
          0.016,
          this.orbitSpeed,
          this.useOrbitalInclination
        );
      }

      // Always rotate planets realistically
      this.systemRenderer.rotatePlanets(0.005);
    } else if (this.viewMode === "galaxy") {
      // Animate galaxy (subtle rotation and star pulsing)
      this.galaxyRenderer.animateGalaxy(0.016);
    }

    // Follow planet if enabled (camera tracks orbiting planet in both planet and system view)
    if (this.followPlanet && this.currentPlanet) {
      this.updateCameraFollowing();
    }

    // Animate stars
    this.sceneManager.animateStars();

    // Render scene
    this.sceneManager.render();
  }

  /**
   * Update camera position to follow orbiting planet
   * Allows user to rotate around the planet while following its orbital motion
   */
  updateCameraFollowing() {
    if (!this.currentSystem || !this.systemRenderer.systemPlanets.length) {
      return;
    }

    // Get the planet mesh
    const planetMesh = this.systemRenderer.getPlanetMesh(this.currentPlanet);
    if (!planetMesh) return;

    // Get planet's current world position
    const planetPosition = new THREE.Vector3();
    planetMesh.getWorldPosition(planetPosition);

    // Get the previous planet position (or use current if first frame)
    if (!this.lastPlanetPosition) {
      this.lastPlanetPosition = planetPosition.clone();
      return;
    }

    // Calculate how much the planet moved this frame
    const planetDelta = planetPosition.clone().sub(this.lastPlanetPosition);

    // Move the camera by the same delta (following the planet)
    this.sceneManager.camera.position.add(planetDelta);

    // Move the controls target by the same delta (keep looking at the planet)
    this.sceneManager.controls.target.add(planetDelta);

    // Store current position for next frame
    this.lastPlanetPosition.copy(planetPosition);
  }

  /**
   * Check if camera has zoomed out far enough to switch to system view
   */
  checkZoomOutSwitch() {
    // Don't check during transitions or in wrong view mode
    if (
      this.isTransitioning ||
      this.viewMode !== "planet" ||
      !this.currentPlanet
    ) {
      return;
    }

    const camera = this.sceneManager.camera;
    const cameraDistance = camera.position.length();

    // Only switch if zooming out (not zooming back in)
    // Add a small buffer to prevent immediate re-triggering
    if (
      cameraDistance > this.systemZoomThreshold &&
      cameraDistance > this.lastCameraDistance + 0.1
    ) {
      // Check if current planet has a multi-planet system
      const systemPlanets = this.filterManager.getPlanetsForSystem(
        this.currentPlanet.hostStar
      );

      if (systemPlanets.length > 1) {
        console.log(
          `Auto-switching to system view: ${
            this.currentPlanet.hostStar
          } (distance: ${cameraDistance.toFixed(2)})`
        );

        // Set transitioning flag to prevent immediate re-triggering
        this.isTransitioning = true;

        // Switch to system view mode
        this.viewMode = "system";

        // Show all planets again (unified view)
        this.systemRenderer.showAllPlanets();

        // Keep camera following enabled when auto-zooming to system view
        // (will only disable if user manually pans)

        // Update UI for system view
        this.updateUIForSystemView();

        // Update system info
        this.uiManager.showSystemInfo(this.currentSystem);
        this.uiManager.updateSystemStats({
          starName: this.currentPlanet.hostStar,
          planetCount: systemPlanets.length,
          planets: systemPlanets,
        });
        this.uiManager.updateSystemComparison(systemPlanets);

        // Prevent immediate re-checking after switch
        this.lastCameraDistance = 100; // Set high to prevent re-triggering

        // Clear transition flag after delay
        setTimeout(() => {
          this.isTransitioning = false;
        }, 1500);

        return;
      }
    }

    this.lastCameraDistance = cameraDistance;
  }

  /**
   * Check if camera has zoomed out far enough to switch to galaxy view
   */
  checkGalaxyZoomOut() {
    // Don't check during transitions or in wrong view mode
    if (this.isTransitioning || this.viewMode !== "system") {
      return;
    }

    const camera = this.sceneManager.camera;
    const cameraDistance = camera.position.length();

    // Only switch if zooming out beyond galaxy threshold
    if (
      cameraDistance > this.galaxyZoomThreshold &&
      cameraDistance > this.lastCameraDistance + 0.1
    ) {
      console.log(
        `Auto-switching to galaxy view (distance: ${cameraDistance.toFixed(2)})`
      );

      // Set transitioning flag
      this.isTransitioning = true;

      // Disable camera following when entering galaxy view
      this.followPlanet = false;
      this.lastPlanetPosition = null;

      // Switch to galaxy view
      this.switchToGalaxyView();

      // Prevent immediate re-checking
      this.lastCameraDistance = 200;

      // Clear transition flag after delay
      setTimeout(() => {
        this.isTransitioning = false;
      }, 1500);

      return;
    }

    this.lastCameraDistance = cameraDistance;
  }

  // ============================================
  // DATA FETCHING
  // ============================================

  /**
   * Fetch exoplanets from NASA API using ApiManager
   */
  async fetchExoplanets() {
    await this.apiManager.fetchExoplanets(
      // On batch processed
      (batchPlanets, allExoplanets) => {
        this.filterManager.setExoplanets(allExoplanets);

        // Only show loading progress, don't rebuild unified list on every batch
        // This is a performance optimization - we'll build the list once at the end
        if (this.hasResultCountTarget) {
          this.resultCountTarget.textContent = `Loading... ${allExoplanets.length}`;
        }

        // If this is the first batch, load galaxy view
        if (
          allExoplanets.length === batchPlanets.length &&
          allExoplanets.length > 0
        ) {
          // Load galaxy view with all systems
          const systems = this.filterManager.getNotableSystems();
          if (systems.length > 0 && this.galaxyRenderer) {
            this.galaxyRenderer.renderGalaxy(systems);
            console.log(
              `Galaxy view initialized with ${systems.length} systems`
            );

            // Set initial camera position - zoomed out to see entire galaxy
            const maxDistance =
              this.galaxyRenderer.calculateMaxSystemDistance();
            const optimalDistance = Math.max(150, maxDistance * 2.5);

            this.sceneManager.camera.position.set(
              0,
              optimalDistance * 0.8,
              optimalDistance * 0.8
            );
            this.sceneManager.camera.lookAt(0, 0, 0);
            this.sceneManager.controls.target.set(0, 0, 0);
            this.sceneManager.controls.update();
          }
        }
      },
      // On complete
      (allExoplanets) => {
        console.log(`Loaded all ${allExoplanets.length} exoplanets`);

        // Build unified search results list once (performance optimization)
        // Use requestIdleCallback to avoid blocking the main thread
        const buildList = () => {
          const results = this.filterManager.searchUnified("");
          this.uiManager.updateUnifiedResultsList(results);
          console.log(`Built unified list with ${results.length} items`);
        };

        if (window.requestIdleCallback) {
          window.requestIdleCallback(buildList, { timeout: 2000 });
        } else {
          // Fallback for browsers without requestIdleCallback (Safari)
          // Use requestAnimationFrame + setTimeout to better mimic idle behavior
          requestAnimationFrame(() => {
            setTimeout(buildList, 1);
          });
        }

        // Ensure galaxy view is loaded
        const systems = this.filterManager.getNotableSystems();
        if (systems.length > 0 && this.galaxyRenderer) {
          this.galaxyRenderer.renderGalaxy(systems);
        }
      },
      // On error
      (error) => {
        this.uiManager.showError(
          "Failed to load exoplanet data. Please try again later."
        );
      }
    );
  }

  // ============================================
  // SEARCH & FILTERING
  // ============================================

  /**
   * Unified search functionality (searches both planets and systems)
   * Debounced to avoid rebuilding list on every keystroke
   */
  search() {
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search by 300ms
    this.searchTimeout = setTimeout(() => {
      const query = this.searchInputTarget.value;
      const results = this.filterManager.searchUnified(query);
      this.uiManager.updateUnifiedResultsList(results);
      this.searchTimeout = null;
    }, 300);
  }

  /**
   * Change filter mode (planet vs system filters)
   */
  changeFilterMode() {
    const mode = this.filterModeTarget.value;

    if (mode === "planets") {
      this.planetFiltersTarget.style.display = "";
      this.systemFiltersTarget.style.display = "none";
    } else {
      this.planetFiltersTarget.style.display = "none";
      this.systemFiltersTarget.style.display = "";
    }

    // Re-apply filters with current mode
    this.applyFilters();
  }

  /**
   * Apply filters (handles both planet and system filters)
   */
  applyFilters() {
    const filterMode = this.filterModeTarget.value;

    if (filterMode === "planets") {
      // Apply planet filters
      const filters = {
        type: this.typeFilterTarget.value,
        tempMin: this.tempMinTarget.value,
        tempMax: this.tempMaxTarget.value,
        distMax: this.distanceMaxTarget.value,
        discoveryMethod: this.discoveryMethodFilterTarget.value,
        discoveryFacility: this.discoveryFacilityFilterTarget.value,
      };

      const filtered = this.filterManager.applyFilters(filters);
      const results = this.filterManager.searchUnified("");
      this.uiManager.updateUnifiedResultsList(results);
    } else {
      // Apply system filters
      const systemFilters = {
        minPlanets: this.minPlanetsTarget.value,
        distMax: this.systemDistanceMaxTarget.value,
        spectralType: this.spectralTypeFilterTarget.value,
      };

      const results = this.filterManager.applySystemFilters(systemFilters);
      this.uiManager.updateUnifiedResultsList(results);
    }
  }

  /**
   * Clear all filters (handles both planet and system filters)
   */
  clearFilters() {
    this.searchInputTarget.value = "";

    // Clear planet filters
    this.typeFilterTarget.value = "";
    this.tempMinTarget.value = "";
    this.tempMaxTarget.value = "";
    this.distanceMaxTarget.value = "";
    this.discoveryMethodFilterTarget.value = "";
    this.discoveryFacilityFilterTarget.value = "";

    // Clear system filters
    this.minPlanetsTarget.value = "";
    this.systemDistanceMaxTarget.value = "";
    this.spectralTypeFilterTarget.value = "";

    const filtered = this.filterManager.clearFilters();
    const results = this.filterManager.searchUnified("");
    this.uiManager.updateUnifiedResultsList(results);
  }

  // ============================================
  // PLANET SELECTION & RENDERING
  // ============================================

  /**
   * Select and display a planet
   */
  selectPlanet(planet, systemData = null) {
    this.currentPlanet = planet;

    // Set transition flag to prevent auto zoom-out detection
    this.isTransitioning = true;

    // Update info panel
    this.uiManager.showPlanetInfo(planet);

    // If we're in galaxy view and have system data, navigate: Galaxy → System → Planet
    if (this.viewMode === "galaxy" && systemData) {
      console.log(`Navigating from galaxy to system to planet: ${planet.name}`);

      // First, select the system (this will load system view)
      this.selectSystem({
        starName: systemData.starName,
        planets: systemData.planets,
        distance: systemData.distance,
      });

      // After a short delay, select the specific planet within the system
      setTimeout(() => {
        // Find the planet in the rendered system
        const planetMesh = this.systemRenderer.getPlanetMesh(planet);
        if (planetMesh) {
          const planetWorldPosition = new THREE.Vector3();
          planetMesh.getWorldPosition(planetWorldPosition);

          // Transition to focus on this planet
          this.transitionToPlanetFromSystem(
            planet,
            planetWorldPosition,
            planetMesh
          );
        }
      }, 1500); // Wait for system view to load

      return;
    }

    // Standard planet view rendering (for standalone planets or direct navigation)
    // Render planet in 3D
    const planetRadius = this.planetRenderer.renderPlanet(planet);

    // Smooth camera transition
    const targetDistance =
      this.sceneManager.calculateOptimalCameraDistance(planetRadius);

    // Smooth camera transition with callback
    this.sceneManager.smoothCameraTransition(
      new THREE.Vector3(0, 0, targetDistance),
      1500, // Longer duration for smoother transition
      () => {
        // Clear transition flag and update last camera distance after transition completes
        this.lastCameraDistance = targetDistance;
        setTimeout(() => {
          this.isTransitioning = false;
        }, 500); // Additional delay to prevent immediate re-triggering
      }
    );
  }

  /**
   * Select a random planet
   */
  selectRandomPlanet() {
    const randomPlanet = this.filterManager.getRandomPlanet();
    if (randomPlanet) {
      this.selectPlanet(randomPlanet);
    }
  }

  /**
   * Calculate orbit radius (helper for camera positioning)
   */
  calculateOrbitRadius(planet, planetRadius) {
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

    return orbitRadius;
  }

  // ============================================
  // CONTROLS
  // ============================================

  /**
   * Reset camera to default position based on current view mode
   */
  resetCamera() {
    if (!this.sceneManager) return;

    // Set transition flag during camera reset
    this.isTransitioning = true;

    if (this.viewMode === "galaxy") {
      // Reset to view entire galaxy - zoomed way out
      const maxDistance = this.galaxyRenderer.calculateMaxSystemDistance();
      const optimalDistance = Math.max(150, maxDistance * 2.5); // Much more zoomed out

      this.sceneManager.camera.position.set(
        0,
        optimalDistance * 0.8,
        optimalDistance * 0.8
      );
      this.sceneManager.camera.lookAt(0, 0, 0);
      this.sceneManager.controls.target.set(0, 0, 0);
      this.sceneManager.controls.update();

      console.log(`Galaxy view reset: distance ${optimalDistance.toFixed(1)}`);
    } else if (this.viewMode === "system" && this.currentSystem) {
      // Reset to view entire system
      const maxOrbitRadius = this.systemRenderer.calculateMaxOrbitRadius(
        this.currentSystem.planets
      );
      const optimalDistance = Math.max(15, maxOrbitRadius * 2.5);

      this.sceneManager.camera.position.set(
        0,
        optimalDistance * 0.4,
        optimalDistance
      );
      this.sceneManager.camera.lookAt(0, 0, 0);
      this.sceneManager.controls.target.set(0, 0, 0);
      this.sceneManager.controls.update();

      // Reset last camera distance for zoom-out detection
      this.lastCameraDistance = optimalDistance;

      console.log(`System view reset: distance ${optimalDistance.toFixed(1)}`);
    } else if (this.viewMode === "planet" && this.currentPlanet) {
      // Reset to view planet optimally
      const planetRadius = Math.max(
        0.5,
        Math.min(3, this.currentPlanet.radius * 0.5)
      );
      const optimalDistance =
        this.sceneManager.calculateOptimalCameraDistance(planetRadius);

      this.sceneManager.resetCamera(optimalDistance);

      // Reset last camera distance for zoom-out detection
      this.lastCameraDistance = optimalDistance;
    } else {
      // Fallback
      this.sceneManager.resetCamera(5);
    }

    // Clear transition flag after a short delay
    setTimeout(() => {
      this.isTransitioning = false;
    }, 500);
  }

  // ============================================
  // SYSTEM VIEW
  // ============================================

  /**
   * Toggle between planet and system view modes
   */
  toggleViewMode(event) {
    const newMode = event.target.value;

    if (newMode === this.viewMode) return;

    this.viewMode = newMode;

    if (newMode === "system") {
      this.switchToSystemView();
    } else {
      this.switchToPlanetView();
    }
  }

  /**
   * Switch to system view mode
   */
  switchToSystemView() {
    // Reset camera following state when switching to system view
    this.followPlanet = false;
    this.lastPlanetPosition = null;

    // Update UI elements
    this.updateUIForSystemView();

    // Update speed display
    this.updateOrbitSpeedDisplay();

    // Initialize cursor for system view
    this.canvasTarget.classList.remove("grabbing", "moving", "pointer");
    this.canvasTarget.classList.add("grab");

    // Update UI to show systems list
    const notableSystems = this.filterManager.getNotableSystems();
    this.uiManager.updateSystemsList(notableSystems);

    // Clear planet view
    this.planetRenderer.cleanup();

    // If we had a current planet, try to show its system
    if (this.currentPlanet) {
      const systemPlanets = this.filterManager.getPlanetsForSystem(
        this.currentPlanet.hostStar
      );
      if (systemPlanets.length > 1) {
        this.selectSystem({
          starName: this.currentPlanet.hostStar,
          planets: systemPlanets,
          count: systemPlanets.length,
        });
      } else if (notableSystems.length > 0) {
        // Show first notable system if current planet doesn't have multiple planets
        this.selectSystem(notableSystems[0]);
      }
    } else if (notableSystems.length > 0) {
      // Show first notable system if no current planet
      this.selectSystem(notableSystems[0]);
    }
  }

  /**
   * Switch to planet view mode
   */
  switchToPlanetView() {
    // Disable camera following when switching to planet view
    this.followPlanet = false;
    this.lastPlanetPosition = null;

    // Update UI elements
    this.updateUIForPlanetView();

    // Reset cursor to grab for planet view
    this.canvasTarget.classList.remove("pointer", "grabbing", "moving");
    this.canvasTarget.classList.add("grab");

    // Update UI to show planets list
    this.uiManager.updateResultsList(
      this.filterManager.getFilteredExoplanets()
    );

    // Clear system view
    this.systemRenderer.cleanup();

    // If we had a current system, show the first planet
    if (this.currentSystem && this.currentSystem.planets.length > 0) {
      this.selectPlanet(this.currentSystem.planets[0]);
    }
  }

  /**
   * Switch to galaxy view mode
   */
  switchToGalaxyView() {
    this.viewMode = "galaxy";

    // Store the current system before clearing
    const previousSystem = this.currentSystem;

    // Clear system and planet views
    this.systemRenderer.cleanup();
    this.planetRenderer.cleanup();

    // Get all notable systems
    const notableSystems = this.filterManager.getNotableSystems();

    // Render galaxy
    const galaxyInfo = this.galaxyRenderer.renderGalaxy(notableSystems);

    console.log(`Galaxy view: ${galaxyInfo.systemCount} star systems`);

    // Position camera - if we were viewing a system, zoom out from its galactic position
    if (previousSystem) {
      const systemPosition =
        this.galaxyRenderer.getSystemPosition(previousSystem);

      if (systemPosition) {
        // Calculate camera position behind and above the system
        const distance = 30; // Distance from the system
        const offset = new THREE.Vector3(0, 1, 1.5)
          .normalize()
          .multiplyScalar(distance);

        // Position camera relative to the system's galactic position
        const cameraPos = systemPosition.clone().add(offset);

        this.sceneManager.camera.position.copy(cameraPos);
        this.sceneManager.controls.target.copy(systemPosition);
        this.sceneManager.camera.lookAt(systemPosition);
        this.sceneManager.controls.update();

        console.log(
          `Galaxy view centered on ${previousSystem.name} at`,
          systemPosition
        );
      } else {
        // Fallback to default galaxy view
        this.sceneManager.camera.position.set(0, 80, 80);
        this.sceneManager.camera.lookAt(0, 0, 0);
        this.sceneManager.controls.target.set(0, 0, 0);
        this.sceneManager.controls.update();
      }
    } else {
      // Default galaxy view (looking at Earth/origin)
      this.sceneManager.camera.position.set(0, 80, 80);
      this.sceneManager.camera.lookAt(0, 0, 0);
      this.sceneManager.controls.target.set(0, 0, 0);
      this.sceneManager.controls.update();
    }
  }

  /**
   * Update UI elements for system view
   */
  updateUIForSystemView() {
    // Update search title
    const searchTitle = document.getElementById("searchTitle");
    if (searchTitle) {
      searchTitle.textContent = "Search Star Systems";
    }

    // Show/hide appropriate buttons
    const randomPlanetBtn = document.getElementById("randomPlanetBtn");
    const randomSystemBtn = document.getElementById("randomSystemBtn");
    if (randomPlanetBtn) randomPlanetBtn.style.display = "none";
    if (randomSystemBtn) randomSystemBtn.style.display = "block";

    // Show/hide appropriate controls
    const orbitSpeedControl = document.getElementById("orbitSpeedControl");
    const orbitalInclinationControl = document.getElementById(
      "orbitalInclinationControl"
    );
    const systemInstructions = document.getElementById("systemInstructions");
    if (orbitSpeedControl) orbitSpeedControl.style.display = "flex";
    if (orbitalInclinationControl)
      orbitalInclinationControl.style.display = "block";
    if (systemInstructions) systemInstructions.style.display = "block";

    // Show system details, hide planet details
    if (this.hasSystemDetailsTarget) {
      this.systemDetailsTarget.style.display = "block";
    }
    if (this.hasPlanetDetailsTarget) {
      this.planetDetailsTarget.style.display = "none";
    }

    // Update search placeholder
    if (this.hasSearchInputTarget) {
      this.searchInputTarget.placeholder = "Search star systems...";
    }
  }

  /**
   * Update UI elements for planet view
   */
  updateUIForPlanetView() {
    // Update search title
    const searchTitle = document.getElementById("searchTitle");
    if (searchTitle) {
      searchTitle.textContent = "Search Exoplanets";
    }

    // Show/hide appropriate buttons
    const randomPlanetBtn = document.getElementById("randomPlanetBtn");
    const randomSystemBtn = document.getElementById("randomSystemBtn");
    if (randomPlanetBtn) randomPlanetBtn.style.display = "block";
    if (randomSystemBtn) randomSystemBtn.style.display = "none";

    // Show/hide appropriate controls
    const orbitSpeedControl = document.getElementById("orbitSpeedControl");
    const orbitalInclinationControl = document.getElementById(
      "orbitalInclinationControl"
    );
    const systemInstructions = document.getElementById("systemInstructions");
    // Hide orbit speed control and inclination toggle in planet view (only visible in system view)
    if (orbitSpeedControl) orbitSpeedControl.style.display = "none";
    if (orbitalInclinationControl)
      orbitalInclinationControl.style.display = "none";
    if (systemInstructions) systemInstructions.style.display = "none";

    // Hide system details, show planet details
    if (this.hasSystemDetailsTarget) {
      this.systemDetailsTarget.style.display = "none";
    }
    if (this.hasPlanetDetailsTarget) {
      this.planetDetailsTarget.style.display = "block";
    }

    // Update search placeholder
    if (this.hasSearchInputTarget) {
      this.searchInputTarget.placeholder = "Search by name...";
    }
  }

  /**
   * Select and display a star system
   */
  selectSystem(system) {
    this.currentSystem = system;

    // Clean up galaxy view if transitioning from galaxy
    if (this.viewMode === "galaxy") {
      console.log(
        `Transitioning from galaxy view to system: ${system.starName}`
      );
      this.galaxyRenderer.cleanup();
    }

    this.viewMode = "system";

    // Update UI for system view (shows 3D orbit toggle, etc.)
    this.updateUIForSystemView();

    // Set transition flag to prevent immediate switching
    this.isTransitioning = true;

    // Enable camera following for system view
    // (will follow the current planet if one is set)
    if (this.currentPlanet) {
      this.followPlanet = true;
      this.lastPlanetPosition = null;
      console.log("Camera following enabled for system view");
    }

    // Render the system
    const systemInfo = this.systemRenderer.renderSystem(
      system.planets,
      this.animateOrbits,
      this.useOrbitalInclination
    );

    // Update info panel with system details
    this.uiManager.showSystemInfo(system);
    this.uiManager.updateSystemStats({
      starName: system.starName,
      planetCount: system.planets.length,
      planets: system.planets,
    });
    this.uiManager.updateSystemComparison(system.planets);

    // Calculate optimal camera distance
    const maxRadius = systemInfo.maxOrbitRadius * systemInfo.scaleFactor;
    const cameraDistance = this.sceneManager.calculateOptimalCameraDistance(
      maxRadius,
      true,
      maxRadius
    );

    // Position camera to view entire system with smooth transition
    this.sceneManager.smoothCameraTransition(
      new THREE.Vector3(0, cameraDistance * 0.3, cameraDistance),
      1500, // Longer duration for smoother transition
      () => {
        // Clear transition flag after transition completes
        this.lastCameraDistance = cameraDistance;
        setTimeout(() => {
          this.isTransitioning = false;
        }, 500);
      }
    );
  }

  /**
   * Select a random multi-planet system
   */
  selectRandomSystem() {
    const randomSystem = this.filterManager.getRandomSystem(2);
    if (randomSystem) {
      this.selectSystem(randomSystem);
    }
  }

  /**
   * Search for systems
   */
  searchSystems() {
    const query = this.searchInputTarget.value;
    const results = this.filterManager.searchSystems(query);
    this.uiManager.updateSystemsList(results);
  }

  /**
   * Update orbit animation speed
   */
  updateOrbitSpeed(event) {
    const sliderValue = parseFloat(event.target.value);
    // Map slider value (0-100) to speed multiplier
    // 50 (middle) = 1.0 (1 orbit = 60 seconds)
    // Range: 0.1x to 10x
    if (sliderValue <= 50) {
      // 0-50 maps to 0.1-1.0
      this.orbitSpeed = 0.1 + (sliderValue / 50) * 0.9;
    } else {
      // 50-100 maps to 1.0-10.0
      this.orbitSpeed = 1.0 + ((sliderValue - 50) / 50) * 9.0;
    }

    // Update display value
    this.updateOrbitSpeedDisplay();
  }

  /**
   * Update orbit speed display with time representation
   */
  updateOrbitSpeedDisplay() {
    if (!this.hasOrbitSpeedValueTarget) return;

    // Calculate seconds per orbit at current speed
    const secondsPerOrbit = 60 / this.orbitSpeed;

    let displayText;
    if (secondsPerOrbit < 1) {
      displayText = `${(secondsPerOrbit * 1000).toFixed(0)}ms`;
    } else if (secondsPerOrbit < 60) {
      displayText = `${secondsPerOrbit.toFixed(1)}s`;
    } else if (secondsPerOrbit < 3600) {
      displayText = `${(secondsPerOrbit / 60).toFixed(1)}m`;
    } else {
      displayText = `${(secondsPerOrbit / 3600).toFixed(1)}h`;
    }

    this.orbitSpeedValueTarget.textContent = displayText;
  }

  /**
   * Handle canvas click for planet/system selection
   */
  onCanvasClick(event) {
    // Don't trigger click if we were dragging
    if (this.isDragging) return;

    // Only ignore extremely fast clicks (< 50ms, likely double-clicks or accidents)
    const clickDuration = Date.now() - this.clickStartTime;
    if (clickDuration < 50) {
      return;
    }

    // Calculate mouse position in normalized device coordinates
    const rect = this.canvasTarget.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    // Handle clicks based on view mode
    if (this.viewMode === "galaxy") {
      // Click on star system in galaxy view
      const systemMeshes = this.galaxyRenderer.getAllSystemMeshes();
      const intersects = this.raycaster.intersectObjects(systemMeshes, true);

      if (intersects.length > 0) {
        let clickedMesh = intersects[0].object;

        // Find the system mesh
        while (clickedMesh.parent && !clickedMesh.userData.isStarSystem) {
          clickedMesh = clickedMesh.parent;
        }

        // Get system data (could be in 'system' or 'systemData' property)
        const system =
          clickedMesh.userData.system || clickedMesh.userData.systemData;

        if (system) {
          // Two-click system: First click shows tooltip, second click zooms in
          if (
            this.selectedObjectForTooltip &&
            this.selectedObjectForTooltip.starName === system.starName &&
            this.selectedObjectForTooltip.type === "system"
          ) {
            // Second click - zoom in
            console.log(
              `Zooming into star system: ${system.starName} (${system.planets.length} planets)`
            );

            this.hideTooltip();

            // Get the system's galactic position
            const systemPosition =
              this.galaxyRenderer.getSystemPosition(system);

            if (systemPosition) {
              // Set transitioning flag
              this.isTransitioning = true;

              // Calculate zoom-in camera position (closer to the system)
              const zoomDistance = 8; // Much closer than galaxy view
              const direction = this.sceneManager.camera.position
                .clone()
                .sub(systemPosition)
                .normalize();
              const targetCameraPos = systemPosition
                .clone()
                .add(direction.multiplyScalar(zoomDistance));

              // Smooth zoom transition to the system
              this.sceneManager.smoothCameraTransitionWithTarget(
                targetCameraPos,
                systemPosition,
                1000,
                () => {
                  // After zoom animation completes, switch to system view
                  this.viewMode = "system";
                  this.currentSystem = system;
                  this.galaxyRenderer.cleanup();
                  this.selectSystem(system);

                  // Clear transition flag
                  setTimeout(() => {
                    this.isTransitioning = false;
                  }, 300);
                }
              );
            }
          } else {
            // First click - show tooltip
            console.log(`Selected star system: ${system.starName}`);
            this.selectedObjectForTooltip = {
              type: "system",
              starName: system.starName,
              planetCount: system.planets.length,
              distance: system.distance || 0,
            };
            this.showTooltip(
              this.selectedObjectForTooltip,
              event.clientX - rect.left,
              event.clientY - rect.top
            );
          }
        }
      } else {
        // Clicked empty space - hide tooltip
        this.hideTooltip();
      }
    } else if (this.viewMode === "system" && this.currentSystem) {
      // Click on planet in system view
      const planetMeshes = this.systemRenderer.getAllPlanetMeshes();
      const intersects = this.raycaster.intersectObjects(planetMeshes, true);

      if (intersects.length > 0) {
        // Find the clicked planet mesh
        let clickedMesh = intersects[0].object;

        // Traverse up to find the main planet mesh (in case we clicked on a child)
        while (clickedMesh.parent && !clickedMesh.userData.planet) {
          clickedMesh = clickedMesh.parent;
        }

        if (clickedMesh.userData.planet) {
          const planet = clickedMesh.userData.planet;

          // Two-click system: First click shows tooltip, second click zooms in
          if (
            this.selectedObjectForTooltip &&
            this.selectedObjectForTooltip.name === planet.name &&
            this.selectedObjectForTooltip.type === "planet"
          ) {
            // Second click - zoom in
            console.log(`Zooming into planet: ${planet.name}`);

            this.hideTooltip();

            // Get the planet's current world position in the system
            const planetWorldPosition = new THREE.Vector3();
            clickedMesh.getWorldPosition(planetWorldPosition);

            // Perform cinematic transition to the planet
            this.transitionToPlanetFromSystem(
              planet,
              planetWorldPosition,
              clickedMesh
            );
          } else {
            // First click - show tooltip
            console.log(`Selected planet: ${planet.name}`);
            this.selectedObjectForTooltip = {
              type: "planet",
              name: planet.name,
              hostStar: planet.hostStar,
              temperature: planet.temperature,
            };
            const rect = this.canvasTarget.getBoundingClientRect();
            this.showTooltip(
              this.selectedObjectForTooltip,
              event.clientX - rect.left,
              event.clientY - rect.top
            );
          }
        }
      } else {
        // Clicked empty space - hide tooltip
        this.hideTooltip();
      }
    }
  }

  /**
   * Cinematic transition from system view to individual planet view
   * Creates a smooth camera movement that "zooms in" on the clicked planet
   * The camera follows the planet as it moves along its orbit during the transition
   */
  transitionToPlanetFromSystem(planet, planetWorldPosition, planetMesh) {
    // Set transition flag to prevent auto zoom-out detection
    this.isTransitioning = true;

    // Get the actual size of the planet mesh using bounding box
    const boundingBox = new THREE.Box3().setFromObject(planetMesh);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const actualPlanetRadius = Math.max(size.x, size.y, size.z) / 2;

    // Calculate optimal camera distance using the scene manager's method
    // This ensures the entire planet fits in view based on camera FOV
    const closeUpDistance = this.sceneManager.calculateOptimalCameraDistance(
      actualPlanetRadius,
      false, // Not showing orbit initially
      null
    );

    // Add extra margin to ensure entire planet is visible with some breathing room
    const safeDistance = Math.max(
      closeUpDistance * 1.5,
      actualPlanetRadius * 5
    );

    // Zoom into the planet, tracking its moving position
    this.sceneManager.smoothCameraTransitionTrackingTarget(
      planetMesh, // Pass the mesh itself so we can track its moving position
      safeDistance,
      2000, // 2 second transition
      () => {
        // Once we're zoomed in, switch to planet-focused mode
        this.viewMode = "planet";

        // Store the current planet
        this.currentPlanet = planet;

        // Focus on this planet in the system (hide others, stop animations)
        this.systemRenderer.focusOnPlanet(planet);

        // Update UI
        this.updateUIForPlanetView();
        this.uiManager.showPlanetInfo(planet);
        this.uiManager.updateResultsList(
          this.filterManager.getFilteredExoplanets()
        );
        this.uiManager.updateActiveListItem(
          planet,
          this.filterManager.getFilteredExoplanets()
        );

        // Update camera distance tracking
        const currentDistance = this.sceneManager.camera.position.length();
        this.lastCameraDistance = currentDistance;

        // Disable camera following initially (will be enabled if user turns on orbit)
        this.followPlanet = false;
        this.lastPlanetPosition = null;

        // Clear transition flag
        setTimeout(() => {
          this.isTransitioning = false;
        }, 500);
      }
    );
  }

  /**
   * Handle mouse down for cursor state
   */
  onCanvasMouseDown(event) {
    this.isDragging = false;

    // Track mouse down position for drag detection
    this.mouseDownPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    // Track click start time for accidental click detection
    this.clickStartTime = Date.now();
    this.clickStartPos = {
      x: event.clientX,
      y: event.clientY,
    };

    if (event.button === 0) {
      // Left click - rotation (don't disable following, just update cursor)
      this.canvasTarget.classList.add("grabbing");
      this.canvasTarget.classList.remove("grab", "pointer");
    } else if (event.button === 2) {
      // Right click - panning (disable camera following)
      this.isPanning = true;
      this.canvasTarget.classList.add("moving");

      // Disable following when panning
      if (this.followPlanet) {
        this.followPlanet = false;
        this.lastPlanetPosition = null;
        console.log("Camera following disabled by panning");
      }
    }
  }

  /**
   * Handle mouse up to reset cursor state
   */
  onCanvasMouseUp() {
    this.isDragging = false;
    this.isPanning = false;
    this.mouseDownPosition = null;
    this.canvasTarget.classList.remove("grabbing", "moving");
    this.updateCanvasCursor();
  }

  /**
   * Handle mouse move for cursor updates and drag detection
   */
  onCanvasMouseMove(event) {
    // Detect if we're actually dragging (moved during mouse down)
    if (event.buttons > 0 && this.mouseDownPosition) {
      // Calculate distance moved from mouse down position
      const deltaX = event.clientX - this.mouseDownPosition.x;
      const deltaY = event.clientY - this.mouseDownPosition.y;
      const distanceMoved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Only consider it dragging if moved beyond threshold
      if (distanceMoved > this.dragThreshold) {
        this.isDragging = true;

        // Hide tooltip when user starts dragging
        if (this.selectedObjectForTooltip) {
          this.hideTooltip();
        }
      }
    }

    // Update cursor based on hover state (only in system view)
    if (this.viewMode === "system" && !this.isPanning && !event.buttons) {
      this.updateCanvasCursor(event);
    }
  }

  /**
   * Handle mouse leave to reset cursor
   */
  onCanvasMouseLeave() {
    this.canvasTarget.classList.remove("grabbing", "grab", "pointer", "moving");
    this.isDragging = false;
    this.isPanning = false;
    this.mouseDownPosition = null;

    // Hide tooltip when mouse leaves canvas
    if (this.selectedObjectForTooltip) {
      this.hideTooltip();
    }
  }

  /**
   * Update canvas cursor based on hover state
   */
  updateCanvasCursor(event = null) {
    if (!this.currentSystem || this.viewMode !== "system") {
      this.canvasTarget.classList.remove("pointer");
      this.canvasTarget.classList.add("grab");
      return;
    }

    if (event) {
      // Check if hovering over a planet
      const rect = this.canvasTarget.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
      const planetMeshes = this.systemRenderer.getAllPlanetMeshes();
      const intersects = this.raycaster.intersectObjects(planetMeshes, true);

      if (intersects.length > 0) {
        this.canvasTarget.classList.add("pointer");
        this.canvasTarget.classList.remove("grab");
      } else {
        this.canvasTarget.classList.remove("pointer");
        this.canvasTarget.classList.add("grab");
      }
    } else {
      this.canvasTarget.classList.remove("pointer");
      this.canvasTarget.classList.add("grab");
    }
  }

  /**
   * Toggle orbital inclination (3D orbits)
   */
  toggleOrbitalInclination() {
    this.useOrbitalInclination = this.orbitalInclinationToggleTarget.checked;
    console.log(
      `Orbital inclination ${
        this.useOrbitalInclination ? "enabled" : "disabled"
      }`
    );

    // Update the system renderer's inclination setting
    if (this.systemRenderer) {
      this.systemRenderer.useInclination = this.useOrbitalInclination;
    }

    // Re-render current system if we're in system view
    // This is necessary to update the orbit lines
    if (this.viewMode === "system" && this.currentSystem) {
      this.systemRenderer.renderSystem(
        this.currentSystem.planets,
        this.animateOrbits,
        this.useOrbitalInclination
      );
    }
  }

  /**
   * Toggle atmosphere visibility
   */
  toggleAtmospheres() {
    const showAtmospheres = this.atmosphereToggleTarget.checked;
    console.log(`Atmospheres ${showAtmospheres ? "enabled" : "disabled"}`);

    // Update the system renderer's atmosphere setting
    if (this.systemRenderer) {
      this.systemRenderer.toggleAtmospheres(showAtmospheres);
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    const container = this.canvasTarget.parentElement;

    // Check for fullscreen element with vendor prefixes
    const fullscreenElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;

    if (!fullscreenElement) {
      // Enter fullscreen
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }
}
