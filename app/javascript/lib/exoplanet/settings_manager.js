/**
 * SettingsManager
 *
 * Manages all view settings for the exoplanet viewer including:
 * - Star visibility and density
 * - Planet labels and orbit lines
 * - Quality settings
 * - Camera speed and auto-rotate
 * - Orbit speed and inclination
 * - Atmosphere visibility
 */
export class SettingsManager {
  constructor() {
    // Default settings
    this.showStars = true;
    this.showPlanetLabels = false;
    this.showOrbitLines = true;
    this.starDensity = 0.5;
    this.highQuality = true;
    this.cameraSpeed = 1.0;
    this.autoRotate = false;
    this.orbitSpeed = 1.0;
    this.useOrbitalInclination = false;
    this.showAtmospheres = false;

    // References to renderers and managers (set later)
    this.sceneManager = null;
    this.planetRenderer = null;
    this.systemRenderer = null;
    this.galaxyRenderer = null;
  }

  /**
   * Set renderer references
   */
  setRenderers({ sceneManager, planetRenderer, systemRenderer, galaxyRenderer }) {
    this.sceneManager = sceneManager;
    this.planetRenderer = planetRenderer;
    this.systemRenderer = systemRenderer;
    this.galaxyRenderer = galaxyRenderer;
  }

  /**
   * Toggle background stars visibility
   */
  toggleStarVisibility(checked) {
    this.showStars = checked;

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
  togglePlanetLabels(checked) {
    this.showPlanetLabels = checked;

    if (this.systemRenderer) {
      this.systemRenderer.toggleLabels(this.showPlanetLabels);
    }
  }

  /**
   * Toggle orbit lines visibility
   */
  toggleOrbitLines(checked) {
    this.showOrbitLines = checked;

    if (this.systemRenderer) {
      this.systemRenderer.toggleOrbitLines(this.showOrbitLines);
    }
  }

  /**
   * Update star density
   */
  updateStarDensity(sliderValue) {
    this.starDensity = sliderValue / 100;

    if (this.sceneManager) {
      this.sceneManager.updateStarDensity(this.starDensity);
    }

    return `${sliderValue}%`;
  }

  /**
   * Toggle high quality rendering
   */
  toggleHighQuality(checked) {
    this.highQuality = checked;

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
   * @returns {string} Display text for speed value
   */
  updateCameraSpeed(sliderValue) {
    // Map 0-100 to 0.1x-2.0x (logarithmic scale for better control)
    if (sliderValue <= 50) {
      this.cameraSpeed = 0.1 + (sliderValue / 50) * 0.9;
    } else {
      this.cameraSpeed = 1.0 + ((sliderValue - 50) / 50) * 1.0;
    }

    if (this.sceneManager && this.sceneManager.controls) {
      this.sceneManager.controls.rotateSpeed = this.cameraSpeed;
    }

    return `${this.cameraSpeed.toFixed(1)}x`;
  }

  /**
   * Toggle auto-rotate camera
   */
  toggleAutoRotate(checked) {
    this.autoRotate = checked;

    if (this.sceneManager && this.sceneManager.controls) {
      this.sceneManager.controls.autoRotate = this.autoRotate;
      this.sceneManager.controls.autoRotateSpeed = 0.5;
    }
  }

  /**
   * Update orbit animation speed
   * @returns {string} Display text for orbit speed
   */
  updateOrbitSpeed(sliderValue) {
    // Map slider value (0-100) to speed multiplier
    if (sliderValue <= 50) {
      this.orbitSpeed = 0.1 + (sliderValue / 50) * 0.9;
    } else {
      this.orbitSpeed = 1.0 + ((sliderValue - 50) / 50) * 9.0;
    }

    return this.getOrbitSpeedDisplay();
  }

  /**
   * Get orbit speed display text
   * @returns {string}
   */
  getOrbitSpeedDisplay() {
    if (!this.orbitSpeed || this.orbitSpeed <= 0) {
      return "--";
    }

    const secondsPerOrbit = 60 / this.orbitSpeed;

    if (secondsPerOrbit < 1) {
      return `${(secondsPerOrbit * 1000).toFixed(0)}ms`;
    } else if (secondsPerOrbit < 60) {
      return `${secondsPerOrbit.toFixed(1)}s`;
    } else if (secondsPerOrbit < 3600) {
      return `${(secondsPerOrbit / 60).toFixed(1)}m`;
    } else {
      return `${(secondsPerOrbit / 3600).toFixed(1)}h`;
    }
  }

  /**
   * Toggle orbital inclination (3D orbits)
   */
  toggleOrbitalInclination(checked, currentSystem, animateOrbits) {
    this.useOrbitalInclination = checked;

    if (this.systemRenderer) {
      this.systemRenderer.useInclination = this.useOrbitalInclination;

      // Re-render current system if provided
      if (currentSystem) {
        this.systemRenderer.renderSystem(
          currentSystem.planets,
          animateOrbits,
          this.useOrbitalInclination
        );
      }
    }
  }

  /**
   * Toggle atmosphere visibility
   */
  toggleAtmospheres(checked) {
    this.showAtmospheres = checked;

    if (this.systemRenderer) {
      this.systemRenderer.toggleAtmospheres(checked);
    }
  }

  /**
   * Reset all settings to defaults
   * @returns {Object} Default values for UI updates
   */
  reset() {
    this.showStars = true;
    this.showPlanetLabels = false;
    this.showOrbitLines = true;
    this.starDensity = 0.5;
    this.highQuality = true;
    this.cameraSpeed = 1.0;
    this.autoRotate = false;
    this.orbitSpeed = 1.0;
    this.useOrbitalInclination = false;
    this.showAtmospheres = false;

    // Apply settings
    this.toggleStarVisibility(this.showStars);
    this.togglePlanetLabels(this.showPlanetLabels);
    this.toggleOrbitLines(this.showOrbitLines);
    this.updateStarDensity(50);
    this.toggleHighQuality(this.highQuality);
    this.updateCameraSpeed(50);
    this.toggleAutoRotate(this.autoRotate);
    this.toggleAtmospheres(this.showAtmospheres);

    return {
      showStars: this.showStars,
      showPlanetLabels: this.showPlanetLabels,
      showOrbitLines: this.showOrbitLines,
      starDensity: 50,
      starDensityText: "50%",
      highQuality: this.highQuality,
      cameraSpeed: 50,
      cameraSpeedText: "1.0x",
      autoRotate: this.autoRotate,
      orbitSpeed: 50,
      orbitSpeedText: "60.0s",
      useOrbitalInclination: this.useOrbitalInclination,
      showAtmospheres: this.showAtmospheres,
    };
  }

  /**
   * Update settings visibility based on current view mode
   * @param {string} viewMode - Current view mode: 'galaxy', 'system', or 'planet'
   */
  updateSettingsVisibility(viewMode) {
    const atmosphereSetting = document.getElementById("atmosphereSetting");
    const planetLabelsSetting = document.getElementById("planetLabelsSetting");
    const orbitalMechanicsSection = document.getElementById("orbitalMechanicsSection");

    switch (viewMode) {
      case "galaxy":
        if (atmosphereSetting) atmosphereSetting.style.display = "none";
        if (planetLabelsSetting) planetLabelsSetting.style.display = "none";
        if (orbitalMechanicsSection) orbitalMechanicsSection.style.display = "none";
        break;

      case "system":
        if (atmosphereSetting) atmosphereSetting.style.display = "block";
        if (planetLabelsSetting) planetLabelsSetting.style.display = "block";
        if (orbitalMechanicsSection) orbitalMechanicsSection.style.display = "block";
        break;

      case "planet":
        if (atmosphereSetting) atmosphereSetting.style.display = "block";
        if (planetLabelsSetting) planetLabelsSetting.style.display = "none";
        if (orbitalMechanicsSection) orbitalMechanicsSection.style.display = "none";
        break;
    }
  }
}
