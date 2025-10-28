import * as THREE from "three";

/**
 * CameraManager
 *
 * Manages camera positioning, following, and automatic view transitions based on zoom level.
 * Handles:
 * - Camera reset for different view modes
 * - Camera following orbiting planets
 * - Automatic view switching on zoom out (planet → system → galaxy)
 */
export class CameraManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;

    // Camera following state
    this.followPlanet = false;
    this.lastPlanetPosition = null;

    // Zoom thresholds for auto-switching views
    this.systemZoomThreshold = 18;
    this.baseGalaxyZoomThreshold = 60;
    this.realisticDistancesGalaxyZoomThreshold = 200; // Much higher for realistic distances
    this.galaxyZoomThreshold = this.baseGalaxyZoomThreshold;
    this.lastCameraDistance = 5;
    this.isTransitioning = false;
    this.useRealisticDistances = false; // Track if realistic distances are enabled

    // Callbacks for view transitions
    this.onSwitchToSystemView = null;
    this.onSwitchToGalaxyView = null;
  }

  /**
   * Set callbacks for view transitions
   */
  setCallbacks({ onSwitchToSystemView, onSwitchToGalaxyView }) {
    this.onSwitchToSystemView = onSwitchToSystemView;
    this.onSwitchToGalaxyView = onSwitchToGalaxyView;
  }

  /**
   * Update zoom threshold based on realistic distances mode
   */
  setRealisticDistancesMode(enabled) {
    this.useRealisticDistances = enabled;
    this.galaxyZoomThreshold = enabled
      ? this.realisticDistancesGalaxyZoomThreshold
      : this.baseGalaxyZoomThreshold;
  }

  /**
   * Enable/disable camera following of orbiting planet
   */
  setFollowPlanet(enabled) {
    this.followPlanet = enabled;
    if (!enabled) {
      this.lastPlanetPosition = null;
    }
  }

  /**
   * Update camera position to follow orbiting planet
   */
  updateCameraFollowing(currentPlanet, systemRenderer) {
    if (!this.followPlanet || !currentPlanet) return;
    if (!systemRenderer || !systemRenderer.systemPlanets.length) return;

    const planetMesh = systemRenderer.getPlanetMesh(currentPlanet);
    if (!planetMesh) return;

    const planetPosition = new THREE.Vector3();
    planetMesh.getWorldPosition(planetPosition);

    if (!this.lastPlanetPosition) {
      this.lastPlanetPosition = planetPosition.clone();
      return;
    }

    const planetDelta = planetPosition.clone().sub(this.lastPlanetPosition);

    this.sceneManager.camera.position.add(planetDelta);
    this.sceneManager.controls.target.add(planetDelta);

    this.lastPlanetPosition.copy(planetPosition);
  }

  /**
   * Check if camera has zoomed out far enough to switch from planet to system view
   */
  checkZoomOutToSystemView(currentPlanet, filterManager) {
    if (this.isTransitioning || !currentPlanet) return false;

    const cameraDistance = this.sceneManager.camera.position.length();

    if (
      cameraDistance > this.systemZoomThreshold &&
      cameraDistance > this.lastCameraDistance + 0.1
    ) {
      const systemPlanets = filterManager.getPlanetsForSystem(
        currentPlanet.hostStar
      );

      if (systemPlanets.length > 1) {
        this.isTransitioning = true;
        this.lastCameraDistance = cameraDistance;

        if (this.onSwitchToSystemView) {
          this.onSwitchToSystemView({
            starName: currentPlanet.hostStar,
            planets: systemPlanets,
            count: systemPlanets.length,
          });
        }

        setTimeout(() => {
          this.isTransitioning = false;
        }, 1000);

        return true;
      } else {
        this.lastCameraDistance = cameraDistance;
      }
    } else {
      this.lastCameraDistance = cameraDistance;
    }

    return false;
  }

  /**
   * Check if camera has zoomed out far enough to switch from system to galaxy view
   */
  checkZoomOutToGalaxyView() {
    if (this.isTransitioning) return false;

    const cameraDistance = this.sceneManager.camera.position.length();

    if (
      cameraDistance > this.galaxyZoomThreshold &&
      cameraDistance > this.lastCameraDistance + 0.1
    ) {
      this.isTransitioning = true;
      this.followPlanet = false;
      this.lastPlanetPosition = null;

      if (this.onSwitchToGalaxyView) {
        this.onSwitchToGalaxyView();
      }

      this.lastCameraDistance = 200;

      setTimeout(() => {
        this.isTransitioning = false;
      }, 1500);

      return true;
    } else {
      this.lastCameraDistance = cameraDistance;
    }

    return false;
  }

  /**
   * Reset camera to default position based on view mode
   */
  resetCamera(
    viewMode,
    { currentSystem, currentPlanet, galaxyRenderer, systemRenderer }
  ) {
    if (!this.sceneManager) return;

    this.isTransitioning = true;

    if (viewMode === "galaxy") {
      const maxDistance = galaxyRenderer.calculateMaxSystemDistance();
      const optimalDistance = Math.max(150, maxDistance * 2.5);

      this.sceneManager.camera.position.set(
        0,
        optimalDistance * 0.3,
        optimalDistance * 0.3
      );
      this.sceneManager.camera.lookAt(0, 0, 0);
      this.sceneManager.controls.target.set(0, 0, 0);
      this.sceneManager.controls.update();
    } else if (viewMode === "system" && currentSystem) {
      const maxOrbitRadius = systemRenderer.calculateMaxOrbitRadius(
        currentSystem.planets
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

      this.lastCameraDistance = optimalDistance;
    } else if (viewMode === "planet" && currentPlanet) {
      const planetRadius = Math.max(
        0.5,
        Math.min(3, currentPlanet.radius * 0.5)
      );
      const optimalDistance =
        this.sceneManager.calculateOptimalCameraDistance(planetRadius);

      this.sceneManager.resetCamera(optimalDistance);
      this.lastCameraDistance = optimalDistance;
    } else {
      this.sceneManager.resetCamera(5);
    }

    setTimeout(() => {
      this.isTransitioning = false;
    }, 500);
  }

  /**
   * Set transitioning state (used during view changes)
   */
  setTransitioning(value) {
    this.isTransitioning = value;
  }

  /**
   * Update last camera distance (used for zoom detection)
   */
  updateLastCameraDistance(distance) {
    this.lastCameraDistance = distance;
  }
}
