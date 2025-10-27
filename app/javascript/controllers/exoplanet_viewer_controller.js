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
    "loadingIndicator",
    "instructions",
    "leftPanel",
    "orbitSpeedSlider",
    "orbitSpeedValue",
    "orbitalInclinationToggle",
    "atmosphereToggle",
    "filtersIcon",
    "filtersSection",
    "resultsIcon",
    "resultsSection",
    "infoContent",
    "starVisibilityToggle",
    "planetLabelsToggle",
    "orbitLinesToggle",
    "starDensitySlider",
    "starDensityValue",
    "highQualityToggle",
    "cameraSpeedSlider",
    "cameraSpeedValue",
    "autoRotateToggle",
  ];

  /**
   * Initialize controller and setup managers
   */
  connect() {
    // Current state
    this.currentPlanet = null;
    this.currentSystem = null;
    this.viewMode = "galaxy"; // Always start with galaxy view
    this.animateOrbits = true; // Always animate in system view
    this.orbitSpeed = 1.0; // Speed multiplier: 1.0 = 1 orbit per 60 seconds (realistic)
    this.useOrbitalInclination = false; // Whether to show realistic 3D orbital inclinations
    this.animationId = null;

    // Settings state
    this.showStars = true;
    this.showPlanetLabels = false;
    this.showOrbitLines = true;
    this.starDensity = 0.5; // 0.0 to 1.0
    this.highQuality = true;
    this.cameraSpeed = 1.0;
    this.autoRotate = false;

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

    // Panel dragging state
    this.draggedPanel = null;
    this.panelOffset = { x: 0, y: 0 };
    this.boundPanelDragStart = this.onPanelDragStart.bind(this);
    this.boundPanelDrag = this.onPanelDrag.bind(this);
    this.boundPanelDragEnd = this.onPanelDragEnd.bind(this);

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
      loadingIndicator: this.hasLoadingIndicatorTarget
        ? this.loadingIndicatorTarget
        : null,
      canvasLoading: this.hasCanvasLoadingTarget
        ? this.canvasLoadingTarget
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
        this.initPanelDragging();
        this.initInfoTabPlanetClicks();
        // Set initial settings visibility for galaxy view
        this.updateSettingsVisibility("galaxy");
      }, 100);
    });
  }

  /**
   * Initialize event listener for planet clicks in info tab
   */
  initInfoTabPlanetClicks() {
    // Listen for custom planet-select events from info tab
    this.element.addEventListener("planet-select", (event) => {
      const planetName = event.detail;

      // Find the planet by name
      const allPlanets = this.filterManager.getAllExoplanets();
      const planet = allPlanets.find((p) => p.name === planetName);

      if (planet && this.currentSystem) {
        // Get the planet mesh from the system
        const planetMesh = this.systemRenderer.getPlanetMesh(planet);
        if (planetMesh) {
          const planetWorldPosition = new THREE.Vector3();
          planetMesh.getWorldPosition(planetWorldPosition);

          // Zoom into the planet
          this.transitionToPlanetFromSystem(
            planet,
            planetWorldPosition,
            planetMesh
          );
        }
      }
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
        <div class="small">
          <div><i class="bx bx-planet me-1"></i> ${
            objectData.planetCount
          } planets</div>
          <div><i class="bx bx-trip me-1"></i> ${objectData.distance.toFixed(
            1
          )} light-years</div>
        </div>
      `;
    } else if (objectData.type === "planet") {
      content = `
        <div class="fw-bold mb-2"><i class="bx bx-planet text-primary me-1"></i> ${
          objectData.name
        }</div>
        <div class="small">
          <div><i class="bx bx-sun me-1"></i> ${objectData.hostStar}</div>
          <div><i class="bx bx-thermometer me-1"></i> ${
            objectData.temperature
              ? objectData.temperature.toFixed(0) + " K"
              : "Unknown"
          }</div>
        </div>
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
      // Resume animation if it was paused
      if (!this.animationId) {
        this.animate();
      }
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

        // Update info tab with system information
        this.updateInfoTab();

        // Auto-switch to info tab
        this.switchToInfoTab();

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

            // Set initial camera position - zoomed out to see entire galaxy
            const maxDistance =
              this.galaxyRenderer.calculateMaxSystemDistance();
            const optimalDistance = Math.max(150, maxDistance * 2.5);

            this.sceneManager.camera.position.set(
              0,
              optimalDistance * 0.3,
              optimalDistance * 0.3
            );
            this.sceneManager.camera.lookAt(0, 0, 0);
            this.sceneManager.controls.target.set(0, 0, 0);
            this.sceneManager.controls.update();
          }
        }
      },
      // On complete
      (allExoplanets) => {
        // Build unified search results list once (performance optimization)
        // Use requestIdleCallback to avoid blocking the main thread
        const buildList = () => {
          const results = this.filterManager.searchUnified("");
          this.uiManager.updateUnifiedResultsList(results);
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

        // Update info tab with galaxy information
        this.updateInfoTab();
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

    // If we're in galaxy view and have system data, navigate: Galaxy → System → Planet
    if (this.viewMode === "galaxy" && systemData) {
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

    // Update info tab with planet information
    this.updateInfoTab();

    // Auto-switch to info tab
    this.switchToInfoTab();
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
        optimalDistance * 0.3,
        optimalDistance * 0.3
      );
      this.sceneManager.camera.lookAt(0, 0, 0);
      this.sceneManager.controls.target.set(0, 0, 0);
      this.sceneManager.controls.update();
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
      } else {
        // Fallback to default galaxy view
        this.sceneManager.camera.position.set(0, 30, 30);
        this.sceneManager.camera.lookAt(0, 0, 0);
        this.sceneManager.controls.target.set(0, 0, 0);
        this.sceneManager.controls.update();
      }
    } else {
      // Default galaxy view (looking at Earth/origin)
      this.sceneManager.camera.position.set(0, 60, 60);
      this.sceneManager.camera.lookAt(0, 0, 0);
      this.sceneManager.controls.target.set(0, 0, 0);
      this.sceneManager.controls.update();
    }

    // Update info tab with galaxy information
    this.updateInfoTab();

    // Auto-switch to info tab
    this.switchToInfoTab();

    // Update settings visibility for galaxy view
    this.updateSettingsVisibility("galaxy");
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

    // Show/hide system instructions
    const systemInstructions = document.getElementById("systemInstructions");
    if (systemInstructions) systemInstructions.style.display = "block";

    // Update search placeholder
    if (this.hasSearchInputTarget) {
      this.searchInputTarget.placeholder = "Search star systems...";
    }

    // Update settings visibility for system view
    this.updateSettingsVisibility("system");
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

    // Hide system instructions in planet view
    const systemInstructions = document.getElementById("systemInstructions");
    if (systemInstructions) systemInstructions.style.display = "none";

    // Update search placeholder
    if (this.hasSearchInputTarget) {
      this.searchInputTarget.placeholder = "Search by name...";
    }

    // Update settings visibility for planet view
    this.updateSettingsVisibility("planet");
  }

  /**
   * Select and display a star system
   */
  selectSystem(system) {
    this.currentSystem = system;

    // Clean up galaxy view if transitioning from galaxy
    if (this.viewMode === "galaxy") {
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
    }

    // Render the system
    const systemInfo = this.systemRenderer.renderSystem(
      system.planets,
      this.animateOrbits,
      this.useOrbitalInclination
    );

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

    // Update info tab with system information
    this.updateInfoTab();

    // Auto-switch to info tab
    this.switchToInfoTab();
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

    // Guard against invalid orbit speed
    if (!this.orbitSpeed || this.orbitSpeed <= 0) {
      this.orbitSpeedValueTarget.textContent = "--";
      return;
    }

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

    // Ignore very fast clicks (< 100ms, likely accidental double-clicks)
    const clickDuration = Date.now() - this.clickStartTime;
    if (clickDuration < 100) {
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
          // Hide any existing tooltip
          this.hideTooltip();

          // Get the system's galactic position
          const systemPosition = this.galaxyRenderer.getSystemPosition(system);

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

          // Hide any existing tooltip
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

        // Update info tab with planet information
        this.updateInfoTab();

        // Auto-switch to info tab
        this.switchToInfoTab();

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
      // Left click - rotation
      // Immediately provide visual feedback
      this.canvasTarget.classList.add("grabbing");
      this.canvasTarget.classList.remove("grab", "pointer");
    } else if (event.button === 2) {
      // Right click - panning (disable camera following)
      this.isPanning = true;
      this.canvasTarget.classList.add("moving");
      this.canvasTarget.classList.remove("grab", "pointer");

      // Disable following when panning
      if (this.followPlanet) {
        this.followPlanet = false;
        this.lastPlanetPosition = null;
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
        if (!this.isDragging) {
          // Just started dragging - ensure cursor is updated
          this.isDragging = true;
          if (event.buttons === 1) {
            // Left button drag - ensure grabbing cursor
            this.canvasTarget.classList.add("grabbing");
            this.canvasTarget.classList.remove("grab", "pointer");
          }
        }

        // Hide tooltip when user starts dragging
        if (this.selectedObjectForTooltip) {
          this.hideTooltip();
        }
      }
    }

    // Update cursor based on hover state (only when not actively interacting)
    if (!event.buttons && !this.isPanning) {
      if (this.viewMode === "system") {
        this.updateCanvasCursor(event);
      } else if (this.viewMode === "galaxy") {
        // In galaxy view, show pointer cursor when hovering over systems
        this.updateGalaxyCursor(event);
      }
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
   * Update canvas cursor based on hover state in system view
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
   * Update canvas cursor based on hover state in galaxy view
   */
  updateGalaxyCursor(event = null) {
    if (this.viewMode !== "galaxy") {
      this.canvasTarget.classList.remove("pointer");
      this.canvasTarget.classList.add("grab");
      return;
    }

    if (event) {
      // Check if hovering over a star system
      const rect = this.canvasTarget.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
      const systemMeshes = this.galaxyRenderer.getAllSystemMeshes();
      const intersects = this.raycaster.intersectObjects(systemMeshes, true);

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

    // Update the system renderer's atmosphere setting
    if (this.systemRenderer) {
      this.systemRenderer.toggleAtmospheres(showAtmospheres);
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    // Get the entire viewer section (includes canvas and panels)
    const container = document.querySelector(".exoplanet-fullscreen-viewer");

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

  // ============================================
  // PANEL DRAGGING & TOGGLING
  // ============================================

  /**
   * Initialize panel dragging functionality
   */
  initPanelDragging() {
    // Find all drag handles
    const dragHandles = document.querySelectorAll("[data-drag-handle]");

    dragHandles.forEach((handle) => {
      handle.addEventListener("mousedown", this.boundPanelDragStart);
      handle.addEventListener("touchstart", this.boundPanelDragStart, {
        passive: false,
      });
    });
  }

  /**
   * Start dragging a panel
   */
  onPanelDragStart(event) {
    // Prevent default to avoid text selection
    event.preventDefault();

    // Find the panel container
    this.draggedPanel = event.currentTarget.closest(".exoplanet-overlay-panel");
    if (!this.draggedPanel) return;

    // Get initial mouse/touch position
    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;

    // Calculate offset from panel top-left to click position
    const rect = this.draggedPanel.getBoundingClientRect();
    this.panelOffset = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    // Add event listeners for dragging
    document.addEventListener("mousemove", this.boundPanelDrag);
    document.addEventListener("touchmove", this.boundPanelDrag, {
      passive: false,
    });
    document.addEventListener("mouseup", this.boundPanelDragEnd);
    document.addEventListener("touchend", this.boundPanelDragEnd);

    // Add visual feedback
    this.draggedPanel.style.transition = "none";
    this.draggedPanel.style.cursor = "grabbing";
  }

  /**
   * Drag the panel
   */
  onPanelDrag(event) {
    if (!this.draggedPanel) return;

    event.preventDefault();

    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;

    // Calculate new position
    let newX = clientX - this.panelOffset.x;
    let newY = clientY - this.panelOffset.y;

    // Constrain to viewport with some margin
    const margin = 20;
    const maxX = window.innerWidth - this.draggedPanel.offsetWidth - margin;
    const maxY = window.innerHeight - this.draggedPanel.offsetHeight - margin;

    newX = Math.max(margin, Math.min(newX, maxX));
    newY = Math.max(margin, Math.min(newY, maxY));

    // Apply new position
    this.draggedPanel.style.left = `${newX}px`;
    this.draggedPanel.style.top = `${newY}px`;
    this.draggedPanel.style.right = "auto";
    this.draggedPanel.style.bottom = "auto";
  }

  /**
   * End dragging
   */
  onPanelDragEnd() {
    if (!this.draggedPanel) return;

    // Remove event listeners
    document.removeEventListener("mousemove", this.boundPanelDrag);
    document.removeEventListener("touchmove", this.boundPanelDrag);
    document.removeEventListener("mouseup", this.boundPanelDragEnd);
    document.removeEventListener("touchend", this.boundPanelDragEnd);

    // Restore transition and cursor
    this.draggedPanel.style.transition = "";
    this.draggedPanel.style.cursor = "";

    // Clear dragged panel reference
    this.draggedPanel = null;
  }

  /**
   * Toggle panel minimize state
   */
  togglePanelMinimize(event) {
    const button = event.currentTarget;
    const panelName = button.dataset.panelTarget;

    let panel;
    if (panelName === "combined" && this.hasLeftPanelTarget) {
      panel = this.leftPanelTarget;
    }

    if (!panel) return;

    // Toggle minimized class
    panel.classList.toggle("minimized");
  }

  /**
   * Toggle filters section visibility
   */
  toggleFilters(event) {
    const button = event.currentTarget;

    if (!this.hasFiltersSectionTarget || !this.hasFiltersIconTarget) return;

    const filtersSection = this.filtersSectionTarget;

    // Toggle collapse
    if (filtersSection.classList.contains("show")) {
      filtersSection.classList.remove("show");
      button.setAttribute("aria-expanded", "false");
    } else {
      filtersSection.classList.add("show");
      button.setAttribute("aria-expanded", "true");
    }
  }

  /**
   * Toggle results section visibility
   */
  toggleResults(event) {
    const button = event.currentTarget;

    if (!this.hasResultsSectionTarget || !this.hasResultsIconTarget) return;

    const resultsSection = this.resultsSectionTarget;

    // Toggle collapse
    if (resultsSection.classList.contains("show")) {
      resultsSection.classList.remove("show");
      button.setAttribute("aria-expanded", "false");
    } else {
      resultsSection.classList.add("show");
      button.setAttribute("aria-expanded", "true");
    }
  }

  // ============================================
  // INFORMATION TAB UPDATES
  // ============================================

  /**
   * Switch to the info tab
   */
  switchToInfoTab() {
    const infoTab = document.getElementById("info-tab");
    if (infoTab) {
      const bsTab = new bootstrap.Tab(infoTab);
      bsTab.show();
    }
  }

  /**
   * Update information tab based on current view mode
   */
  updateInfoTab() {
    if (!this.hasInfoContentTarget) return;

    if (this.viewMode === "galaxy") {
      this.updateGalaxyInfo();
    } else if (this.viewMode === "system" && this.currentSystem) {
      this.updateSystemInfo(this.currentSystem);
    } else if (this.viewMode === "planet" && this.currentPlanet) {
      this.updatePlanetInfo(this.currentPlanet);
    }
  }

  /**
   * Update info tab with galaxy (Milky Way) information
   */
  updateGalaxyInfo() {
    if (!this.hasInfoContentTarget) return;

    const totalSystems = this.filterManager.getNotableSystems().length;
    const totalPlanets = this.filterManager.getAllExoplanets().length;

    // Calculate some statistics
    const allPlanets = this.filterManager.getAllExoplanets();
    const avgDistance =
      allPlanets.length > 0
        ? (
            allPlanets.reduce((sum, p) => sum + (p.distance || 0), 0) /
            allPlanets.length
          ).toFixed(1)
        : 0;

    const closestPlanet = allPlanets.reduce((closest, planet) => {
      if (!planet.distance) return closest;
      if (!closest || planet.distance < closest.distance) return planet;
      return closest;
    }, null);

    this.infoContentTarget.innerHTML = `
      <div class="info-galaxy">
        <h5 class="text-white mb-3 d-flex align-items-center">
          <i class="bx bx-globe me-2 text-primary"></i> Milky Way Galaxy
        </h5>
        
        <div class="info-section mb-4">
          <h6 class="text-white-50 mb-3 fs-sm text-uppercase">Overview</h6>
          <p class="text-white-50 mb-3" style="font-size: 0.9rem; line-height: 1.6;">
            Our galaxy contains an estimated 100-400 billion stars. Currently, we have confirmed 
            <strong class="text-white">${totalPlanets.toLocaleString()}</strong> exoplanets across 
            <strong class="text-white">${totalSystems.toLocaleString()}</strong> star systems.
          </p>
        </div>

        <div class="info-section mb-4">
          <h6 class="text-white-50 mb-3 fs-sm text-uppercase">Statistics</h6>
          <div class="info-stats">
            <div class="stat-item mb-3 p-3 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-white-50">Total Confirmed Exoplanets</span>
                <span class="badge bg-primary">${totalPlanets.toLocaleString()}</span>
              </div>
            </div>
            <div class="stat-item mb-3 p-3 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-white-50">Multi-Planet Systems</span>
                <span class="badge bg-info">${totalSystems.toLocaleString()}</span>
              </div>
            </div>
            <div class="stat-item mb-3 p-3 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-white-50">Average Distance</span>
                <span class="badge bg-secondary">${avgDistance} ly</span>
              </div>
            </div>
            ${
              closestPlanet
                ? `
              <div class="stat-item mb-3 p-3 rounded" style="background: rgba(255, 255, 255, 0.05);">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="text-white-50">Closest Exoplanet</span>
                  <span class="text-white fs-sm">${this.escapeHtml(
                    closestPlanet.name
                  )}</span>
                </div>
                <div class="text-end mt-1">
                  <span class="badge bg-success">${this.formatDistance(
                    closestPlanet.distance
                  )}</span>
                </div>
              </div>
            `
                : ""
            }
          </div>
        </div>

        <div class="info-section">
          <h6 class="text-white-50 mb-3 fs-sm text-uppercase">About</h6>
          <p class="text-white-50 mb-2" style="font-size: 0.85rem; line-height: 1.5;">
            The Milky Way is a barred spiral galaxy approximately 13.6 billion years old, 
            containing our Solar System. It spans about 100,000 light-years in diameter.
          </p>
          <p class="text-white-50 mb-0" style="font-size: 0.85rem; line-height: 1.5;">
            Click on any star system to explore its planets in detail.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Update info tab with system information
   */
  updateSystemInfo(system) {
    if (!this.hasInfoContentTarget) return;

    const planets = system.planets || [];
    const starName = system.starName || "Unknown";
    const distance = system.distance || planets[0]?.distance || 0;

    // Calculate system statistics
    const planetTypes = planets.reduce((acc, planet) => {
      const type = planet.type || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const avgTemp =
      planets.length > 0 && planets.some((p) => p.temperature)
        ? (
            planets
              .filter((p) => p.temperature)
              .reduce((sum, p) => sum + p.temperature, 0) /
            planets.filter((p) => p.temperature).length
          ).toFixed(0)
        : null;

    const avgRadius =
      planets.length > 0 && planets.some((p) => p.radius)
        ? (
            planets
              .filter((p) => p.radius)
              .reduce((sum, p) => sum + p.radius, 0) /
            planets.filter((p) => p.radius).length
          ).toFixed(2)
        : null;

    // Get spectral type if available
    const spectralType = planets[0]?.spectralType || null;
    const starTemp = planets[0]?.starTemperature || null;

    this.infoContentTarget.innerHTML = `
      <div class="info-system">
        <h5 class="text-white mb-3 d-flex align-items-center">
          <i class="bx bx-sun me-2 text-warning"></i> ${this.escapeHtml(
            starName
          )}
        </h5>
        
        <div class="info-section mb-4">
          <h6 class="text-white-50 mb-3 fs-sm text-uppercase">Star System</h6>
          <div class="info-stats">
            <div class="stat-item mb-2 p-3 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-white-50">Distance from Earth</span>
                <span class="badge bg-primary">${this.formatDistance(
                  distance
                )}</span>
              </div>
            </div>
            <div class="stat-item mb-2 p-3 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-white-50">Number of Planets</span>
                <span class="badge bg-info">${planets.length}</span>
              </div>
            </div>
            ${
              spectralType
                ? `
              <div class="stat-item mb-2 p-3 rounded" style="background: rgba(255, 255, 255, 0.05);">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="text-white-50">Spectral Type</span>
                  <span class="badge bg-secondary">${this.escapeHtml(
                    spectralType
                  )}</span>
                </div>
              </div>
            `
                : ""
            }
            ${
              starTemp
                ? `
              <div class="stat-item mb-2 p-3 rounded" style="background: rgba(255, 255, 255, 0.05);">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="text-white-50">Star Temperature</span>
                  <span class="badge bg-warning text-dark">${starTemp} K</span>
                </div>
              </div>
            `
                : ""
            }
          </div>
        </div>

        <div class="info-section mb-4">
          <h6 class="text-white-50 mb-3 fs-sm text-uppercase">Planetary Composition</h6>
          <div class="planet-types">
            ${Object.entries(planetTypes)
              .map(
                ([type, count]) => `
              <div class="d-flex justify-content-between align-items-center mb-2 p-2 rounded" 
                   style="background: rgba(255, 255, 255, 0.03);">
                <span class="text-white-50">${this.getPlanetTypeName(
                  type
                )}</span>
                <span class="badge bg-${this.getTypeColor(
                  type
                )}">${count}</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        ${
          avgTemp || avgRadius
            ? `
          <div class="info-section mb-4">
            <h6 class="text-white-50 mb-3 fs-sm text-uppercase">Average Values</h6>
            <div class="info-stats">
              ${
                avgTemp
                  ? `
                <div class="stat-item mb-2 p-3 rounded" style="background: rgba(255, 255, 255, 0.05);">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="text-white-50">Temperature</span>
                    <span class="badge bg-warning text-dark">${avgTemp} K</span>
                  </div>
                </div>
              `
                  : ""
              }
              ${
                avgRadius
                  ? `
                <div class="stat-item mb-2 p-3 rounded" style="background: rgba(255, 255, 255, 0.05);">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="text-white-50">Radius</span>
                    <span class="badge bg-info">${avgRadius} R⊕</span>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        `
            : ""
        }

        <div class="info-section">
          <h6 class="text-white-50 mb-3 fs-sm text-uppercase">Planets</h6>
          <div class="planet-list" style="max-height: 200px; overflow-y: auto;">
            ${planets
              .map(
                (planet) => `
              <div class="planet-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.03); cursor: pointer;"
                   onclick="this.closest('[data-controller]').dispatchEvent(new CustomEvent('planet-select', {detail: '${this.escapeHtml(
                     planet.name
                   )}'}))">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="text-white fw-semibold fs-sm">${this.escapeHtml(
                      planet.name
                    )}</div>
                    ${
                      planet.temperature
                        ? `
                      <div class="text-white-50" style="font-size: 0.75rem;">${planet.temperature.toFixed(
                        0
                      )} K</div>
                    `
                        : ""
                    }
                  </div>
                  <span class="badge bg-${this.getTypeColor(
                    planet.type
                  )}">${this.getPlanetTypeName(planet.type)}</span>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Update info tab with planet information
   */
  updatePlanetInfo(planet) {
    if (!this.hasInfoContentTarget) return;

    const name = planet.name || "Unknown";
    const hostStar = planet.hostStar || "Unknown";
    const type = this.getPlanetTypeName(planet.type);
    const temperature = planet.temperature
      ? `${planet.temperature.toFixed(0)} K`
      : "Unknown";
    const radius = planet.radius ? `${planet.radius.toFixed(2)} R⊕` : "Unknown";
    const mass = planet.mass ? `${planet.mass.toFixed(2)} M⊕` : "Unknown";
    const distance = planet.distance
      ? this.formatDistance(planet.distance)
      : "Unknown";
    const orbitalPeriod = planet.orbitalPeriod
      ? `${planet.orbitalPeriod.toFixed(2)} days`
      : "Unknown";
    const semiMajorAxis = planet.semiMajorAxis
      ? `${planet.semiMajorAxis.toFixed(3)} AU`
      : "Unknown";
    const discoveryYear = planet.discoveryYear || "Unknown";
    const discoveryMethod = planet.discoveryMethod || "Unknown";
    const discoveryFacility = planet.discoveryFacility || "Unknown";

    this.infoContentTarget.innerHTML = `
      <div class="info-planet">
        <h5 class="text-white mb-3 d-flex align-items-center">
          <i class="bx bx-planet me-2 text-primary"></i> ${this.escapeHtml(
            name
          )}
        </h5>
        
        <div class="info-section mb-4">
          <h6 class="text-white-50 mb-3 fs-sm text-uppercase">Basic Properties</h6>
          <div class="property-grid">
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Host Star</div>
              <div class="text-white fw-semibold">${this.escapeHtml(
                hostStar
              )}</div>
            </div>
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Type</div>
              <div>
                <span class="badge bg-${this.getTypeColor(
                  planet.type
                )}">${this.escapeHtml(type)}</span>
              </div>
            </div>
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Distance</div>
              <div class="text-white fw-semibold">${distance}</div>
            </div>
          </div>
        </div>

        <div class="info-section mb-4">
          <h6 class="text-white-50 mb-3 fs-sm text-uppercase">Physical Characteristics</h6>
          <div class="property-grid">
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Temperature</div>
              <div class="text-white fw-semibold">${temperature}</div>
            </div>
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Radius</div>
              <div class="text-white fw-semibold">${radius}</div>
            </div>
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Mass</div>
              <div class="text-white fw-semibold">${mass}</div>
            </div>
          </div>
        </div>

        <div class="info-section mb-4">
          <h6 class="text-white-50 mb-3 fs-sm text-uppercase">Orbital Parameters</h6>
          <div class="property-grid">
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Orbital Period</div>
              <div class="text-white fw-semibold">${orbitalPeriod}</div>
            </div>
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Semi-Major Axis</div>
              <div class="text-white fw-semibold">${semiMajorAxis}</div>
            </div>
          </div>
        </div>

        <div class="info-section mb-4">
          <h6 class="text-white-50 mb-3 fs-sm text-uppercase">Discovery Information</h6>
          <div class="property-grid">
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Discovery Year</div>
              <div class="text-white fw-semibold">${discoveryYear}</div>
            </div>
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Method</div>
              <div class="text-white fw-semibold">${this.escapeHtml(
                discoveryMethod
              )}</div>
            </div>
            <div class="property-item mb-2 p-2 rounded" style="background: rgba(255, 255, 255, 0.05);">
              <div class="text-white-50 fs-sm">Facility</div>
              <div class="text-white fw-semibold">${this.escapeHtml(
                discoveryFacility
              )}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format distance with appropriate units
   * @param {number} distanceLightYears - Distance in light years
   * @returns {string} Formatted distance string
   */
  formatDistance(distanceLightYears) {
    if (!distanceLightYears || distanceLightYears === 0) {
      // For Sun or very close objects, show in AU
      return "1 AU (Sun)";
    }

    // If distance is less than 0.01 light years, show in AU
    // 1 light year ≈ 63,241 AU
    if (distanceLightYears < 0.01) {
      const distanceAU = (distanceLightYears * 63241).toFixed(0);
      return `${distanceAU} AU`;
    }

    // Otherwise show in light years
    return `${distanceLightYears.toFixed(1)} ly`;
  }

  /**
   * Helper method to escape HTML and prevent XSS
   */
  escapeHtml(text) {
    if (text === null || text === undefined) return "";
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Get planet type display name
   */
  getPlanetTypeName(type) {
    const names = {
      terrestrial: "Terrestrial",
      "super-earth": "Super-Earth",
      neptune: "Neptune-like",
      jupiter: "Jupiter-like",
    };
    return names[type] || "Unknown";
  }

  /**
   * Get badge color for planet type
   */
  getTypeColor(type) {
    const colors = {
      terrestrial: "success",
      "super-earth": "info",
      neptune: "primary",
      jupiter: "warning",
    };
    return colors[type] || "secondary";
  }

  // ============================================
  // SETTINGS METHODS
  // ============================================

  /**
   * Toggle background stars visibility
   */
  toggleStarVisibility() {
    if (!this.hasStarVisibilityToggleTarget) return;

    this.showStars = this.starVisibilityToggleTarget.checked;

    if (this.sceneManager) {
      if (this.showStars) {
        this.sceneManager.showStars();
      } else {
        this.sceneManager.hideStars();
      }
    }
  }

  /**
   * Toggle planet labels in system view
   */
  togglePlanetLabels() {
    if (!this.hasPlanetLabelsToggleTarget) return;

    this.showPlanetLabels = this.planetLabelsToggleTarget.checked;

    if (this.systemRenderer) {
      this.systemRenderer.toggleLabels(this.showPlanetLabels);
    }
  }

  /**
   * Toggle orbit lines visibility
   */
  toggleOrbitLines() {
    if (!this.hasOrbitLinesToggleTarget) return;

    this.showOrbitLines = this.orbitLinesToggleTarget.checked;

    if (this.systemRenderer) {
      this.systemRenderer.toggleOrbitLines(this.showOrbitLines);
    }
  }

  /**
   * Update star density
   */
  updateStarDensity(event) {
    if (!this.hasStarDensitySliderTarget || !this.hasStarDensityValueTarget)
      return;

    const sliderValue = parseFloat(event.target.value);
    this.starDensity = sliderValue / 100; // Convert to 0.0-1.0 range

    // Update display
    this.starDensityValueTarget.textContent = `${sliderValue}%`;

    // Update scene manager
    if (this.sceneManager) {
      this.sceneManager.updateStarDensity(this.starDensity);
    }
  }

  /**
   * Toggle high quality rendering
   */
  toggleHighQuality() {
    if (!this.hasHighQualityToggleTarget) return;

    this.highQuality = this.highQualityToggleTarget.checked;

    // Update all renderers
    if (this.planetRenderer) {
      this.planetRenderer.setQuality(this.highQuality);
    }
    if (this.systemRenderer) {
      this.systemRenderer.setQuality(this.highQuality);
    }
    if (this.galaxyRenderer) {
      this.galaxyRenderer.setQuality(this.highQuality);
    }
  }

  /**
   * Update camera rotation speed
   */
  updateCameraSpeed(event) {
    if (!this.hasCameraSpeedSliderTarget || !this.hasCameraSpeedValueTarget)
      return;

    const sliderValue = parseFloat(event.target.value);

    // Map 0-100 to 0.1x-2.0x (logarithmic scale for better control)
    if (sliderValue <= 50) {
      // 0-50 maps to 0.1-1.0
      this.cameraSpeed = 0.1 + (sliderValue / 50) * 0.9;
    } else {
      // 50-100 maps to 1.0-2.0
      this.cameraSpeed = 1.0 + ((sliderValue - 50) / 50) * 1.0;
    }

    // Update display
    this.cameraSpeedValueTarget.textContent = `${this.cameraSpeed.toFixed(1)}x`;

    // Update controls
    if (this.sceneManager && this.sceneManager.controls) {
      this.sceneManager.controls.rotateSpeed = this.cameraSpeed;
    }
  }

  /**
   * Toggle auto-rotate camera
   */
  toggleAutoRotate() {
    if (!this.hasAutoRotateToggleTarget) return;

    this.autoRotate = this.autoRotateToggleTarget.checked;

    if (this.sceneManager && this.sceneManager.controls) {
      this.sceneManager.controls.autoRotate = this.autoRotate;
      this.sceneManager.controls.autoRotateSpeed = 0.5; // Slow rotation
    }
  }

  /**
   * Reset all settings to defaults
   */
  resetSettings() {
    // Reset state variables
    this.showStars = true;
    this.showPlanetLabels = false;
    this.showOrbitLines = true;
    this.starDensity = 0.5;
    this.highQuality = true;
    this.cameraSpeed = 1.0;
    this.autoRotate = false;
    this.orbitSpeed = 1.0;
    this.useOrbitalInclination = false;

    // Update UI controls
    if (this.hasStarVisibilityToggleTarget) {
      this.starVisibilityToggleTarget.checked = this.showStars;
    }
    if (this.hasPlanetLabelsToggleTarget) {
      this.planetLabelsToggleTarget.checked = this.showPlanetLabels;
    }
    if (this.hasOrbitLinesToggleTarget) {
      this.orbitLinesToggleTarget.checked = this.showOrbitLines;
    }
    if (this.hasStarDensitySliderTarget) {
      this.starDensitySliderTarget.value = "50";
    }
    if (this.hasStarDensityValueTarget) {
      this.starDensityValueTarget.textContent = "50%";
    }
    if (this.hasHighQualityToggleTarget) {
      this.highQualityToggleTarget.checked = this.highQuality;
    }
    if (this.hasCameraSpeedSliderTarget) {
      this.cameraSpeedSliderTarget.value = "50";
    }
    if (this.hasCameraSpeedValueTarget) {
      this.cameraSpeedValueTarget.textContent = "1.0x";
    }
    if (this.hasAutoRotateToggleTarget) {
      this.autoRotateToggleTarget.checked = this.autoRotate;
    }
    if (this.hasOrbitSpeedSliderTarget) {
      this.orbitSpeedSliderTarget.value = "50";
    }
    if (this.hasOrbitSpeedValueTarget) {
      this.orbitSpeedValueTarget.textContent = "60.0s";
    }
    if (this.hasOrbitalInclinationToggleTarget) {
      this.orbitalInclinationToggleTarget.checked = this.useOrbitalInclination;
    }
    if (this.hasAtmosphereToggleTarget) {
      this.atmosphereToggleTarget.checked = false;
    }

    // Apply settings to renderers
    this.toggleStarVisibility();
    this.togglePlanetLabels();
    this.toggleOrbitLines();
    this.updateStarDensity({ target: { value: "50" } });
    this.toggleHighQuality();
    this.updateCameraSpeed({ target: { value: "50" } });
    this.toggleAutoRotate();
    this.toggleAtmospheres();
  }

  /**
   * Update settings visibility based on current view mode
   * @param {string} viewMode - Current view mode: 'galaxy', 'system', or 'planet'
   */
  updateSettingsVisibility(viewMode) {
    // Get settings elements by ID
    const atmosphereSetting = document.getElementById("atmosphereSetting");
    const planetLabelsSetting = document.getElementById("planetLabelsSetting");
    const orbitalMechanicsSection = document.getElementById(
      "orbitalMechanicsSection"
    );

    switch (viewMode) {
      case "galaxy":
        // Galaxy view: Hide planet-specific and orbit settings
        if (atmosphereSetting) atmosphereSetting.style.display = "none";
        if (planetLabelsSetting) planetLabelsSetting.style.display = "none";
        if (orbitalMechanicsSection)
          orbitalMechanicsSection.style.display = "none";
        break;

      case "system":
        // System view: Show all orbit-related settings
        if (atmosphereSetting) atmosphereSetting.style.display = "block";
        if (planetLabelsSetting) planetLabelsSetting.style.display = "block";
        if (orbitalMechanicsSection)
          orbitalMechanicsSection.style.display = "block";
        break;

      case "planet":
        // Planet view: Show atmospheres but hide orbit settings
        if (atmosphereSetting) atmosphereSetting.style.display = "block";
        if (planetLabelsSetting) planetLabelsSetting.style.display = "none";
        if (orbitalMechanicsSection)
          orbitalMechanicsSection.style.display = "none";
        break;
    }
  }
}
