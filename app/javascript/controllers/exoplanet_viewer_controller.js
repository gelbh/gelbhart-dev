import { Controller } from "@hotwired/stimulus";
import * as THREE from "three";
import { SceneManager } from "../lib/exoplanet/scene_manager";
import { PlanetRenderer } from "../lib/exoplanet/planet_renderer";
import { SystemRenderer } from "../lib/exoplanet/system_renderer";
import { GalaxyRenderer } from "../lib/exoplanet/galaxy_renderer";
import { ApiManager } from "../lib/exoplanet/api_manager";
import { FilterManager } from "../lib/exoplanet/filter_manager";
import { UIManager } from "../lib/exoplanet/ui_manager";
import { TooltipManager } from "../lib/exoplanet/tooltip_manager";
import { SettingsManager } from "../lib/exoplanet/settings_manager";
import { CameraManager } from "../lib/exoplanet/camera_manager";
import { InfoTabManager } from "../lib/exoplanet/info_tab_manager";
import { PanelManager } from "../lib/exoplanet/panel_manager";
import { SearchCoordinator } from "../lib/exoplanet/search_coordinator";

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
    "realisticDistancesToggle",
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
    this.animationId = null;

    // Raycaster for planet click detection
    this.raycaster = null;
    this.mouse = null;

    // Two-click selection system
    this.clickStartTime = 0; // Track click duration to detect accidental clicks
    this.clickStartPos = { x: 0, y: 0 }; // Track click position for drag detection

    // Event listener references for cleanup
    this.boundEventListeners = {};

    // Animation state
    this.isTabVisible = true;

    // Initialize managers
    this.tooltipManager = new TooltipManager(this.canvasTarget);
    this.settingsManager = new SettingsManager();
    this.cameraManager = null; // Will be initialized after sceneManager
    this.infoTabManager = new InfoTabManager(
      this.hasInfoContentTarget ? this.infoContentTarget : null
    );
    this.panelManager = new PanelManager();
    this.searchCoordinator = null; // Initialize after targets are available

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

        // Initialize SearchCoordinator after targets are available
        this.searchCoordinator = new SearchCoordinator({
          filterManager: this.filterManager,
          uiManager: this.uiManager,
          targets: {
            searchInput: this.searchInputTarget,
            filterMode: this.filterModeTarget,
            planetFilters: this.planetFiltersTarget,
            systemFilters: this.systemFiltersTarget,
            typeFilter: this.typeFilterTarget,
            tempMin: this.tempMinTarget,
            tempMax: this.tempMaxTarget,
            distanceMax: this.distanceMaxTarget,
            discoveryMethodFilter: this.discoveryMethodFilterTarget,
            discoveryFacilityFilter: this.discoveryFacilityFilterTarget,
            minPlanets: this.minPlanetsTarget,
            systemDistanceMax: this.systemDistanceMaxTarget,
            spectralTypeFilter: this.spectralTypeFilterTarget,
          },
        });

        this.panelManager.initialize();
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
    if (this.tooltipManager) {
      this.tooltipManager.cleanup();
    }
    if (this.panelManager) {
      this.panelManager.cleanup();
    }
    if (this.searchCoordinator) {
      this.searchCoordinator.cleanup();
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
   * Show tooltip with object information (delegates to TooltipManager)
   */
  showTooltip(objectData, x, y) {
    this.tooltipManager.show(objectData, x, y);
  }

  /**
   * Hide tooltip (delegates to TooltipManager)
   */
  hideTooltip() {
    this.tooltipManager.hide();
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

    // Initialize camera manager now that sceneManager is ready
    this.cameraManager = new CameraManager(this.sceneManager);
    this.cameraManager.setCallbacks({
      onSwitchToSystemView: (system) => this.selectSystem(system),
      onSwitchToGalaxyView: () => this.switchToGalaxyView(),
    });

    // Set renderer references for managers
    this.settingsManager.setRenderers({
      sceneManager: this.sceneManager,
      planetRenderer: this.planetRenderer,
      systemRenderer: this.systemRenderer,
      galaxyRenderer: this.galaxyRenderer,
    });
    this.infoTabManager.setFilterManager(this.filterManager);

    // Setup raycaster for planet click detection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

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
      if (this.cameraManager.followPlanet) {
        this.cameraManager.setFollowPlanet(false);
      }

      // Hide tooltip when zooming
      if (this.tooltipManager.getSelectedObject()) {
        this.tooltipManager.hide();
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
      this.cameraManager.checkZoomOutToSystemView(
        this.currentPlanet,
        this.filterManager
      );
    } else if (this.viewMode === "system" && this.currentSystem) {
      this.cameraManager.checkZoomOutToGalaxyView();
    }

    // Handle different view modes
    if (this.viewMode === "planet") {
      // Check if we're in unified system view (planet focused) or standalone planet view
      if (this.currentSystem && this.systemRenderer.systemPlanets.length > 0) {
        // Unified view: use systemRenderer
        // Don't animate orbits in planet view (just rotate the planet on its axis)
        // Always rotate planets realistically
        this.systemRenderer.rotatePlanets(0.005);

        // Update shader uniforms for realistic rendering
        this.systemRenderer.updateShaderUniforms(this.sceneManager.camera);
      } else {
        // Standalone planet view: use planetRenderer
        // Always rotate planet realistically
        this.planetRenderer.rotatePlanet(0.005);

        // Animate effects (clouds, lava glow)
        this.planetRenderer.animateEffects();

        // Update shader uniforms for realistic rendering
        this.planetRenderer.updateShaderUniforms(this.sceneManager.camera);
      }
    } else if (this.viewMode === "system") {
      // Animate orbital motion if enabled
      if (this.animateOrbits) {
        // Apply speed multiplier and inclination setting to animation
        this.systemRenderer.animateOrbits(
          0.016,
          this.settingsManager.orbitSpeed,
          this.settingsManager.useOrbitalInclination
        );
      }

      // Always rotate planets realistically
      this.systemRenderer.rotatePlanets(0.005);

      // Update shader uniforms for realistic rendering
      this.systemRenderer.updateShaderUniforms(this.sceneManager.camera);
    } else if (
      this.viewMode === "galaxy" ||
      this.viewMode === "galacticCenter"
    ) {
      // Animate galaxy (subtle rotation and star pulsing, galactic center effects)
      this.galaxyRenderer.animateGalaxy(0.016);
    }

    // Follow planet if enabled (camera tracks orbiting planet in both planet and system view)
    if (this.cameraManager.followPlanet && this.currentPlanet) {
      this.cameraManager.updateCameraFollowing(
        this.currentPlanet,
        this.systemRenderer
      );
    }

    // Animate stars
    this.sceneManager.animateStars();

    // Render scene
    this.sceneManager.render();
  }

  // Camera methods delegated to CameraManager
  // CameraManager handles:
  // - updateCameraFollowing
  // - checkZoomOutToSystemView (with callbacks to controller)
  // - checkZoomOutToGalaxyView (with callbacks to controller)
  // - resetCamera

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
    this.searchCoordinator.search();
  }

  /**
   * Change filter mode (planet vs system filters)
   */
  changeFilterMode() {
    this.searchCoordinator.changeFilterMode();
  }

  /**
   * Apply filters (handles both planet and system filters)
   */
  applyFilters() {
    this.searchCoordinator.applyFilters();
  }

  /**
   * Clear all filters (handles both planet and system filters)
   */
  clearFilters() {
    this.searchCoordinator.clearFilters();
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
    this.cameraManager.setTransitioning(true);

    // If systemData is not provided, try to get planets for this system
    if (!systemData && planet.hostStar) {
      const systemPlanets = this.filterManager.getPlanetsForSystem(
        planet.hostStar
      );

      if (systemPlanets.length > 0) {
        systemData = {
          starName: planet.hostStar,
          planets: systemPlanets,
          distance: planet.distance,
        };
      }
    }

    // If we have system data, always navigate through system view first
    if (systemData) {
      // Check if we're already viewing this system
      const alreadyInSystem =
        this.viewMode === "system" &&
        this.currentSystem &&
        this.currentSystem.starName === systemData.starName;

      if (!alreadyInSystem) {
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
          } else {
            console.error("Could not find planet mesh for:", planet.name);
          }
        }, 1500); // Wait for system view to load
      } else {
        // Already in the right system, just focus on the planet
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
        } else {
          console.error("Could not find planet mesh for:", planet.name);
        }
      }

      return;
    }

    // Fallback: Standard planet view rendering (for standalone planets without system data)
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
        this.cameraManager.updateLastCameraDistance(targetDistance);
        setTimeout(() => {
          this.cameraManager.setTransitioning(false);
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
    this.cameraManager.resetCamera(this.viewMode, {
      currentSystem: this.currentSystem,
      currentPlanet: this.currentPlanet,
      galaxyRenderer: this.galaxyRenderer,
      systemRenderer: this.systemRenderer,
    });
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
    this.cameraManager.setFollowPlanet(false);

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
    this.cameraManager.setFollowPlanet(false);

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
    this.cameraManager.setTransitioning(true);

    // Enable camera following for system view
    // (will follow the current planet if one is set)
    if (this.currentPlanet) {
      this.cameraManager.setFollowPlanet(true);
    }

    // Render the system
    const systemInfo = this.systemRenderer.renderSystem(
      system.planets,
      this.animateOrbits,
      this.settingsManager.useOrbitalInclination
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
        this.cameraManager.updateLastCameraDistance(cameraDistance);
        setTimeout(() => {
          this.cameraManager.setTransitioning(false);
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
    this.searchCoordinator.searchSystems();
  }

  /**
   * Update orbit animation speed
   */
  updateOrbitSpeed(event) {
    const sliderValue = parseFloat(event.target.value);
    const displayText = this.settingsManager.updateOrbitSpeed(sliderValue);

    if (this.hasOrbitSpeedValueTarget) {
      this.orbitSpeedValueTarget.textContent = displayText;
    }
  }

  /**
   * Update orbit speed display with time representation
   */
  updateOrbitSpeedDisplay() {
    if (!this.hasOrbitSpeedValueTarget) return;
    const displayText = this.settingsManager.getOrbitSpeedDisplay();
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
    if (this.viewMode === "galaxy" || this.viewMode === "galacticCenter") {
      // Check for clicks on all clickable objects (systems + galactic center)
      const clickableObjects = this.galaxyRenderer.getAllClickableObjects();
      const intersects = this.raycaster.intersectObjects(
        clickableObjects,
        true
      );

      if (intersects.length > 0) {
        let clickedMesh = intersects[0].object;

        // Check if clicked on galactic center (Sagittarius A*)
        let galacticCenterParent = clickedMesh;
        while (galacticCenterParent) {
          if (galacticCenterParent.userData?.isGalacticCenter) {
            // Clicked on Sagittarius A* - only zoom if not already in galacticCenter view
            if (this.viewMode !== "galacticCenter") {
              this.hideTooltip();
              this.zoomToGalacticCenter();
            }
            return;
          }
          galacticCenterParent = galacticCenterParent.parent;
        }

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
            this.cameraManager.setTransitioning(true);

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
                  this.cameraManager.setTransitioning(false);
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
    this.cameraManager.setTransitioning(true);

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
        this.cameraManager.updateLastCameraDistance(currentDistance);

        // Disable camera following initially (will be enabled if user turns on orbit)
        this.cameraManager.setFollowPlanet(false);

        // Update info tab with planet information
        this.updateInfoTab();

        // Auto-switch to info tab
        this.switchToInfoTab();

        // Clear transition flag
        setTimeout(() => {
          this.cameraManager.setTransitioning(false);
        }, 500);
      }
    );
  }

  /**
   * Zoom to Sagittarius A* (galactic center)
   * Creates a close-up view of the supermassive black hole
   */
  zoomToGalacticCenter() {
    const galacticCenterPos = this.galaxyRenderer.getGalacticCenterPosition();

    if (!galacticCenterPos) {
      console.warn("Galactic center position not found");
      return;
    }

    // Set transitioning flag
    this.cameraManager.setTransitioning(true);

    // Track that we're viewing galactic center
    this.viewMode = "galacticCenter";

    // Calculate camera position for dramatic close-up
    const zoomDistance = 25; // Close enough to see details
    const currentDir = this.sceneManager.camera.position
      .clone()
      .sub(galacticCenterPos)
      .normalize();

    // Position camera at an angle for better view of accretion disk
    const targetCameraPos = galacticCenterPos.clone().add(
      new THREE.Vector3(
        currentDir.x * zoomDistance,
        zoomDistance * 0.3, // Slightly above for dramatic angle
        currentDir.z * zoomDistance
      )
    );

    // Smooth transition
    this.sceneManager.smoothCameraTransitionWithTarget(
      targetCameraPos,
      galacticCenterPos,
      1500, // Longer transition for dramatic effect
      () => {
        // Update info tab with galactic center information
        this.displayGalacticCenterInfo();
        this.switchToInfoTab();

        // Clear transition flag
        setTimeout(() => {
          this.cameraManager.setTransitioning(false);
        }, 300);
      }
    );
  }

  /**
   * Display galactic center information in info tab
   */
  displayGalacticCenterInfo() {
    const marker = this.galaxyRenderer.galacticCenterMarker;
    if (!marker) return;

    const info = marker.userData;

    const html = `
      <div class="space-y-4">
        <div>
          <h3 class="text-xl font-bold text-purple-300 mb-2">${info.name}</h3>
          <p class="text-gray-300 text-sm mb-4">${info.description}</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-gray-400 uppercase">Mass</p>
            <p class="text-lg text-white font-semibold">${info.mass}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase">Distance</p>
            <p class="text-lg text-white font-semibold">${info.distance}</p>
          </div>
        </div>

        <div class="space-y-2 mt-4">
          <div class="bg-gray-800/50 p-3 rounded">
            <p class="text-xs text-gray-400 uppercase mb-1">Type</p>
            <p class="text-white">Supermassive Black Hole</p>
          </div>
          
          <div class="bg-gray-800/50 p-3 rounded">
            <p class="text-xs text-gray-400 uppercase mb-1">Schwarzschild Radius</p>
            <p class="text-white">~12 million km</p>
            <p class="text-xs text-gray-400 mt-1">Approximately 17 times the Sun's radius</p>
          </div>
          
          <div class="bg-gray-800/50 p-3 rounded">
            <p class="text-xs text-gray-400 uppercase mb-1">First Image</p>
            <p class="text-white">May 12, 2022</p>
            <p class="text-xs text-gray-400 mt-1">By Event Horizon Telescope collaboration</p>
          </div>
          
          <div class="bg-gray-800/50 p-3 rounded">
            <p class="text-xs text-gray-400 uppercase mb-1">About</p>
            <p class="text-white text-sm leading-relaxed">
              Sagittarius A* is the supermassive black hole at the center of our galaxy. 
              It has a mass of 4.15 million times that of our Sun and is surrounded by 
              a superheated accretion disk of gas and dust spiraling into the event horizon 
              at near light speed.
            </p>
          </div>
        </div>

        <button 
          class="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
          data-action="click->exoplanet-viewer#returnToGalaxyView"
        >
          ← Return to Galaxy View
        </button>
      </div>
    `;

    this.infoContentTarget.innerHTML = html;
  }

  /**
   * Return from galactic center view to galaxy view
   */
  returnToGalaxyView() {
    // Set transitioning flag
    this.cameraManager.setTransitioning(true);

    // Reset view mode
    this.viewMode = "galaxy";

    // Clear current planet/system to reset state
    this.currentPlanet = null;
    this.currentSystem = null;

    // Calculate zoom-out camera position
    const currentPos = this.sceneManager.camera.position.clone();
    const targetCameraPos = currentPos.multiplyScalar(3); // Zoom out

    // Smooth transition back
    this.sceneManager.smoothCameraTransitionWithTarget(
      targetCameraPos,
      new THREE.Vector3(0, 0, 0), // Look at origin (Earth/Sun)
      1000,
      () => {
        // Update settings visibility
        this.updateSettingsVisibility("galaxy");

        // Clear info tab
        this.clearInfoTab();

        // Clear transition flag
        setTimeout(() => {
          this.cameraManager.setTransitioning(false);
        }, 300);
      }
    );
  }

  /**
   * Clear the info tab content
   */
  clearInfoTab() {
    if (this.infoContentTarget) {
      this.infoContentTarget.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <p>Click on a star system or Sagittarius A* to view details</p>
        </div>
      `;
    }
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
      if (this.cameraManager.followPlanet) {
        this.cameraManager.setFollowPlanet(false);
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
      } else if (
        this.viewMode === "galaxy" ||
        this.viewMode === "galacticCenter"
      ) {
        // In galaxy/galacticCenter view, show pointer cursor when hovering over systems or Sag A*
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
    if (this.viewMode !== "galaxy" && this.viewMode !== "galacticCenter") {
      this.canvasTarget.classList.remove("pointer");
      this.canvasTarget.classList.add("grab");
      return;
    }

    if (event) {
      // Check if hovering over a star system or galactic center
      const rect = this.canvasTarget.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
      const clickableObjects = this.galaxyRenderer.getAllClickableObjects();
      const intersects = this.raycaster.intersectObjects(
        clickableObjects,
        true
      );

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
    const checked = this.orbitalInclinationToggleTarget.checked;
    this.settingsManager.toggleOrbitalInclination(
      checked,
      this.currentSystem,
      this.animateOrbits
    );
  }

  /**
   * Toggle realistic orbital distances
   */
  toggleRealisticDistances() {
    const checked = this.realisticDistancesToggleTarget.checked;

    if (this.systemRenderer && this.currentSystem) {
      // Store current camera distance
      const currentDistance = this.sceneManager.camera.position.length();

      // Update camera manager zoom threshold for realistic distances
      this.cameraManager.setRealisticDistancesMode(checked);

      // Set realistic distances (this will trigger re-render)
      this.systemRenderer.setRealisticDistances(checked);

      // Wait a frame for cleanup to complete, then re-render and adjust camera
      requestAnimationFrame(() => {
        // Re-render the system with new settings
        this.systemRenderer.rerenderSystem();

        // Calculate appropriate camera distance based on mode
        const targetDistance = checked
          ? currentDistance * 2.0
          : currentDistance * 0.5;

        // Smooth camera adjustment
        const currentPos = this.sceneManager.camera.position.clone();
        const direction = currentPos.normalize();
        const targetPos = direction.multiplyScalar(targetDistance);

        // Animate camera transition
        this.sceneManager.smoothCameraTransition(targetPos, 800);
      });
    }
  }

  /**
   * Toggle atmosphere visibility
   */
  toggleAtmospheres() {
    const checked = this.atmosphereToggleTarget.checked;
    this.settingsManager.toggleAtmospheres(checked);
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
  // PANEL TOGGLING
  // ============================================

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
    this.infoTabManager.switchToInfoTab();
  }

  /**
   * Update information tab based on current view mode
   */
  updateInfoTab() {
    this.infoTabManager.updateInfoTab(this.viewMode, {
      currentSystem: this.currentSystem,
      currentPlanet: this.currentPlanet,
    });
  }

  // ============================================
  // SETTINGS METHODS
  // ============================================

  /**
   * Toggle background stars visibility
   */
  toggleStarVisibility() {
    if (!this.hasStarVisibilityToggleTarget) return;
    this.settingsManager.toggleStarVisibility(
      this.starVisibilityToggleTarget.checked
    );
  }

  /**
   * Toggle planet labels in system view
   */
  togglePlanetLabels() {
    if (!this.hasPlanetLabelsToggleTarget) return;
    this.settingsManager.togglePlanetLabels(
      this.planetLabelsToggleTarget.checked
    );
  }

  /**
   * Toggle orbit lines visibility
   */
  toggleOrbitLines() {
    if (!this.hasOrbitLinesToggleTarget) return;
    this.settingsManager.toggleOrbitLines(this.orbitLinesToggleTarget.checked);
  }

  /**
   * Update star density
   */
  updateStarDensity(event) {
    if (!this.hasStarDensitySliderTarget || !this.hasStarDensityValueTarget)
      return;

    const sliderValue = parseFloat(event.target.value);
    const displayText = this.settingsManager.updateStarDensity(sliderValue);
    this.starDensityValueTarget.textContent = displayText;
  }

  /**
   * Toggle high quality rendering
   */
  toggleHighQuality() {
    if (!this.hasHighQualityToggleTarget) return;
    this.settingsManager.toggleHighQuality(
      this.highQualityToggleTarget.checked
    );
  }

  /**
   * Update camera rotation speed
   */
  updateCameraSpeed(event) {
    if (!this.hasCameraSpeedSliderTarget || !this.hasCameraSpeedValueTarget)
      return;

    const sliderValue = parseFloat(event.target.value);
    const displayText = this.settingsManager.updateCameraSpeed(sliderValue);
    this.cameraSpeedValueTarget.textContent = displayText;
  }

  /**
   * Toggle auto-rotate camera
   */
  toggleAutoRotate() {
    if (!this.hasAutoRotateToggleTarget) return;
    this.settingsManager.toggleAutoRotate(this.autoRotateToggleTarget.checked);
  }

  /**
   * Reset all settings to defaults
   */
  resetSettings() {
    const defaults = this.settingsManager.reset();

    // Update UI controls to match reset values
    if (this.hasStarVisibilityToggleTarget) {
      this.starVisibilityToggleTarget.checked = defaults.showStars;
    }
    if (this.hasPlanetLabelsToggleTarget) {
      this.planetLabelsToggleTarget.checked = defaults.showPlanetLabels;
    }
    if (this.hasOrbitLinesToggleTarget) {
      this.orbitLinesToggleTarget.checked = defaults.showOrbitLines;
    }
    if (this.hasStarDensitySliderTarget) {
      this.starDensitySliderTarget.value = defaults.starDensity;
    }
    if (this.hasStarDensityValueTarget) {
      this.starDensityValueTarget.textContent = defaults.starDensityText;
    }
    if (this.hasHighQualityToggleTarget) {
      this.highQualityToggleTarget.checked = defaults.highQuality;
    }
    if (this.hasCameraSpeedSliderTarget) {
      this.cameraSpeedSliderTarget.value = defaults.cameraSpeed;
    }
    if (this.hasCameraSpeedValueTarget) {
      this.cameraSpeedValueTarget.textContent = defaults.cameraSpeedText;
    }
    if (this.hasAutoRotateToggleTarget) {
      this.autoRotateToggleTarget.checked = defaults.autoRotate;
    }
    if (this.hasOrbitSpeedSliderTarget) {
      this.orbitSpeedSliderTarget.value = defaults.orbitSpeed;
    }
    if (this.hasOrbitSpeedValueTarget) {
      this.orbitSpeedValueTarget.textContent = defaults.orbitSpeedText;
    }
    if (this.hasOrbitalInclinationToggleTarget) {
      this.orbitalInclinationToggleTarget.checked =
        defaults.useOrbitalInclination;
    }
    if (this.hasAtmosphereToggleTarget) {
      this.atmosphereToggleTarget.checked = defaults.showAtmospheres;
    }
  }

  /**
   * Update settings visibility based on current view mode
   * @param {string} viewMode - Current view mode: 'galaxy', 'system', or 'planet'
   */
  updateSettingsVisibility(viewMode) {
    this.settingsManager.updateSettingsVisibility(viewMode);
  }
}
