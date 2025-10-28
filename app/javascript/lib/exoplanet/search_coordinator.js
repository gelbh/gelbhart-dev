/**
 * SearchCoordinator
 *
 * Coordinates search and filter operations for both planets and systems.
 * Handles debounced search, filter mode switching, and filter application.
 */
export class SearchCoordinator {
  constructor({ filterManager, uiManager, targets }) {
    this.filterManager = filterManager;
    this.uiManager = uiManager;
    this.targets = targets;
    this.searchTimeout = null;
  }

  /**
   * Perform debounced search
   */
  search() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      const query = this.targets.searchInput.value;
      const results = this.filterManager.searchUnified(query);
      this.uiManager.updateUnifiedResultsList(results);
      this.searchTimeout = null;
    }, 300);
  }

  /**
   * Search for systems specifically
   */
  searchSystems() {
    const query = this.targets.searchInput.value;
    const results = this.filterManager.searchSystems(query);
    this.uiManager.updateSystemsList(results);
  }

  /**
   * Change filter mode between planets and systems
   */
  changeFilterMode() {
    const mode = this.targets.filterMode.value;

    if (mode === "planets") {
      this.targets.planetFilters.style.display = "";
      this.targets.systemFilters.style.display = "none";
    } else {
      this.targets.planetFilters.style.display = "none";
      this.targets.systemFilters.style.display = "";
    }

    this.applyFilters();
  }

  /**
   * Apply filters based on current mode
   */
  applyFilters() {
    const filterMode = this.targets.filterMode.value;

    if (filterMode === "planets") {
      const filters = {
        type: this.targets.typeFilter.value,
        tempMin: this.targets.tempMin.value,
        tempMax: this.targets.tempMax.value,
        distMax: this.targets.distanceMax.value,
        discoveryMethod: this.targets.discoveryMethodFilter.value,
        discoveryFacility: this.targets.discoveryFacilityFilter.value,
      };

      this.filterManager.applyFilters(filters);
      const results = this.filterManager.searchUnified("");
      this.uiManager.updateUnifiedResultsList(results);
    } else {
      const systemFilters = {
        minPlanets: this.targets.minPlanets.value,
        distMax: this.targets.systemDistanceMax.value,
        spectralType: this.targets.spectralTypeFilter.value,
      };

      const results = this.filterManager.applySystemFilters(systemFilters);
      this.uiManager.updateUnifiedResultsList(results);
    }
  }

  /**
   * Clear all filters and search input
   */
  clearFilters() {
    this.targets.searchInput.value = "";

    // Clear planet filters
    this.targets.typeFilter.value = "";
    this.targets.tempMin.value = "";
    this.targets.tempMax.value = "";
    this.targets.distanceMax.value = "";
    this.targets.discoveryMethodFilter.value = "";
    this.targets.discoveryFacilityFilter.value = "";

    // Clear system filters
    this.targets.minPlanets.value = "";
    this.targets.systemDistanceMax.value = "";
    this.targets.spectralTypeFilter.value = "";

    this.applyFilters();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }
}
