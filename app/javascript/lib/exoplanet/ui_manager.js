/**
 * UIManager
 * Handles UI updates for info panel, results list, and loading states
 */
export class UIManager {
  constructor(targets) {
    this.targets = targets;
  }

  /**
   * Update results list
   */
  updateResultsList(filteredExoplanets, appendOnly = false) {
    const list = this.targets.resultsList;
    const displayLimit = 500;

    // Clear list if not appending
    if (!appendOnly) {
      list.innerHTML = "";
    }

    this.hideLoading();

    this.targets.resultCount.textContent = filteredExoplanets.length;

    // Determine which items to render
    let itemsToRender;
    if (appendOnly) {
      const currentItemCount = list.querySelectorAll(
        ".list-group-item-action"
      ).length;
      itemsToRender = filteredExoplanets.slice(
        currentItemCount,
        Math.min(displayLimit, filteredExoplanets.length)
      );
    } else {
      itemsToRender = filteredExoplanets.slice(0, displayLimit);
    }

    // Render items using DocumentFragment to batch DOM insertions
    const fragment = document.createDocumentFragment();
    itemsToRender.forEach((planet) => {
      const item = document.createElement("button");
      item.className = "list-group-item list-group-item-action";
      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${planet.name}</div>
            <div class="fs-sm text-muted">${planet.hostStar}</div>
          </div>
          <span class="badge bg-${this.getTypeColor(
            planet.type
          )}">${this.getPlanetTypeName(planet.type)}</span>
        </div>
      `;
      item.addEventListener("click", () => {
        if (this.onPlanetSelect) {
          this.onPlanetSelect(planet);
        }
      });
      fragment.appendChild(item);
    });
    list.appendChild(fragment);

    // Show "more results" indicator if needed
    const existingMore = list.querySelector(".more-results-indicator");
    if (existingMore) {
      existingMore.remove();
    }

    if (filteredExoplanets.length > displayLimit) {
      const more = document.createElement("div");
      more.className =
        "list-group-item text-center text-muted more-results-indicator";
      more.textContent = `+ ${
        filteredExoplanets.length - displayLimit
      } more results (use filters to narrow down)`;
      list.appendChild(more);
    }
  }

  /**
   * Update unified results list (systems and planets with expandable systems)
   */
  updateUnifiedResultsList(results, appendOnly = false) {
    const list = this.targets.resultsList;
    const displayLimit = 500;

    // Clear list if not appending
    if (!appendOnly) {
      list.innerHTML = "";
    }

    this.hideLoading();

    // Count total items (systems count as 1, planets count as 1)
    this.targets.resultCount.textContent = results.length;

    // Determine which items to render
    const itemsToRender = appendOnly ? results : results.slice(0, displayLimit);

    // Render items
    itemsToRender.forEach((result, index) => {
      if (result.type === "system") {
        // Render system with expandable planets
        this.renderSystemItem(list, result, index);
      } else {
        // Render standalone planet
        this.renderPlanetItem(list, result.planet, result.systemData);
      }
    });

    // Show "more results" indicator if needed
    if (results.length > displayLimit) {
      const more = document.createElement("div");
      more.className = "list-group-item text-center text-muted";
      more.textContent = `+ ${results.length - displayLimit} more results`;
      list.appendChild(more);
    }
  }

  /**
   * Render a system item (expandable with planets)
   */
  renderSystemItem(list, systemData, index) {
    const systemItem = document.createElement("div");
    systemItem.className = "list-group-item";

    // System header (clickable to expand/collapse)
    const systemHeader = document.createElement("button");
    systemHeader.className =
      "btn btn-link w-100 text-start p-0 text-decoration-none";
    systemHeader.innerHTML = `
      <div class="d-flex justify-content-between align-items-center py-2">
        <div>
          <i class="bx bx-chevron-right expand-icon"></i>
          <i class="bx bx-sun text-warning me-2"></i>
          <span class="fw-semibold">${systemData.starName}</span>
        </div>
        <span class="badge bg-info">${systemData.planetCount} planets</span>
      </div>
    `;

    // Planet list (initially hidden)
    const planetList = document.createElement("div");
    planetList.className = "planet-list ps-4 d-none";
    planetList.style.borderLeft = "2px solid #dee2e6";
    planetList.style.marginLeft = "10px";

    // Add planets to the list using DocumentFragment to batch DOM insertions
    const planetFragment = document.createDocumentFragment();
    systemData.planets.forEach((planet) => {
      const planetItem = document.createElement("button");
      planetItem.className = "list-group-item list-group-item-action border-0";
      planetItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${planet.name}</div>
            <div class="fs-sm text-muted">${planet.temperature.toFixed(
              0
            )} K</div>
          </div>
          <span class="badge bg-${this.getTypeColor(
            planet.type
          )}">${this.getPlanetTypeName(planet.type)}</span>
        </div>
      `;

      // Click on planet
      planetItem.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.onPlanetSelect) {
          this.onPlanetSelect(planet, systemData);
        }
      });

      planetFragment.appendChild(planetItem);
    });
    planetList.appendChild(planetFragment);

    // Toggle expansion
    systemHeader.addEventListener("click", () => {
      const isExpanded = !planetList.classList.contains("d-none");
      planetList.classList.toggle("d-none");
      const icon = systemHeader.querySelector(".expand-icon");
      icon.classList.toggle("bx-chevron-right", isExpanded);
      icon.classList.toggle("bx-chevron-down", !isExpanded);
    });

    // Click on system header also selects the system
    systemHeader.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      if (this.onSystemSelect) {
        this.onSystemSelect({
          starName: systemData.starName,
          planets: systemData.planets,
          distance: systemData.distance,
        });
      }
    });

    systemItem.appendChild(systemHeader);
    systemItem.appendChild(planetList);
    list.appendChild(systemItem);
  }

  /**
   * Render a standalone planet item
   */
  renderPlanetItem(list, planet, systemData = null) {
    const item = document.createElement("button");
    item.className = "list-group-item list-group-item-action";
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-semibold">${planet.name}</div>
          <div class="fs-sm text-muted">${planet.hostStar}</div>
        </div>
        <span class="badge bg-${this.getTypeColor(
          planet.type
        )}">${this.getPlanetTypeName(planet.type)}</span>
      </div>
    `;
    item.addEventListener("click", () => {
      if (this.onPlanetSelect) {
        this.onPlanetSelect(planet, systemData);
      }
    });
    list.appendChild(item);
  }

  /**
   * Set planet select callback
   */
  setPlanetSelectCallback(callback) {
    this.onPlanetSelect = callback;
  }

  /**
   * Update active state in the list
   */
  updateActiveListItem(planet, filteredExoplanets) {
    const list = this.targets.resultsList;
    const items = list.querySelectorAll(".list-group-item");

    items.forEach((item) => {
      item.classList.remove("active");
    });

    const planetIndex = filteredExoplanets.findIndex(
      (p) => p.name === planet.name
    );

    if (planetIndex !== -1 && planetIndex < 500) {
      items[planetIndex]?.classList.add("active");
    }
  }

  /**
   * Show planet information in the info panel
   */
  showPlanetInfo(planet) {
    if (this.targets.planetInfo) {
      this.targets.planetInfo.style.display = "none";
    }
    if (this.targets.planetDetails) {
      this.targets.planetDetails.style.display = "block";
    }

    this.targets.planetName.textContent = planet.name;
    this.targets.planetType.textContent = this.getPlanetTypeName(planet.type);
    this.targets.planetType.className = `badge bg-${this.getTypeColor(
      planet.type
    )} mb-2`;

    // Show Jupiter units for gas giants, Earth units for smaller planets
    if (planet.type === "jupiter" || planet.type === "neptune") {
      // For gas giants, show Jupiter units with Earth units in parentheses
      if (planet.radiusJupiter) {
        this.targets.radius.textContent = `${planet.radiusJupiter.toFixed(
          2
        )} R♃ (${planet.radius.toFixed(2)} R⊕)`;
      } else {
        this.targets.radius.textContent = `${planet.radius.toFixed(2)} R⊕ (${(
          planet.radius / 11.2
        ).toFixed(2)} R♃)`;
      }

      if (planet.massJupiter) {
        this.targets.mass.textContent = `${planet.massJupiter.toFixed(
          2
        )} M♃ (${planet.mass.toFixed(2)} M⊕)`;
      } else if (planet.mass) {
        this.targets.mass.textContent = `${planet.mass.toFixed(2)} M⊕ (${(
          planet.mass / 318
        ).toFixed(2)} M♃)`;
      } else {
        this.targets.mass.textContent = "Unknown";
      }
    } else {
      // For terrestrial and super-Earths, show Earth units
      this.targets.radius.textContent = `${planet.radius.toFixed(2)} R⊕`;
      this.targets.mass.textContent = planet.mass
        ? `${planet.mass.toFixed(2)} M⊕`
        : "Unknown";
    }
    this.targets.temperature.textContent = `${planet.temperature.toFixed(0)} K`;
    this.targets.orbitalPeriod.textContent = planet.orbitalPeriod
      ? `${planet.orbitalPeriod.toFixed(2)} days`
      : "Unknown";

    this.targets.starName.textContent = planet.hostStar;

    // NEW: Spectral type
    if (this.targets.spectralType && this.targets.spectralTypeRow) {
      if (planet.spectralType) {
        this.targets.spectralType.textContent = planet.spectralType;
        this.targets.spectralTypeRow.style.display = "";
      } else {
        this.targets.spectralTypeRow.style.display = "none";
      }
    }

    // NEW: Star age
    if (this.targets.starAge && this.targets.starAgeRow) {
      if (planet.stellarAge) {
        const ageText = `${planet.stellarAge.toFixed(2)} Gyr`;
        const ageComparison =
          planet.stellarAge < 1
            ? " (young)"
            : planet.stellarAge < 5
            ? " (middle-aged)"
            : " (old)";
        this.targets.starAge.textContent = ageText + ageComparison;
        this.targets.starAgeRow.style.display = "";
      } else {
        this.targets.starAgeRow.style.display = "none";
      }
    }

    this.targets.distance.textContent = `${planet.distance.toFixed(
      2
    )} light-years`;
    this.targets.discoveryYear.textContent = planet.discoveryYear;

    // NEW: Discovery context
    if (this.targets.discoveryMethod) {
      this.targets.discoveryMethod.textContent =
        planet.discoveryMethod || "Unknown";
    }
    if (this.targets.discoveryFacility) {
      this.targets.discoveryFacility.textContent =
        planet.discoveryFacility || "Unknown";
    }

    // NEW: System context (stars and planets)
    if (this.targets.systemContext && this.targets.systemContextRow) {
      const systemParts = [];
      if (planet.numberOfStars > 1) {
        systemParts.push(`${planet.numberOfStars} stars`);
      }
      if (planet.numberOfPlanets > 1) {
        systemParts.push(`${planet.numberOfPlanets} planets`);
      }

      if (systemParts.length > 0) {
        this.targets.systemContext.textContent = systemParts.join(", ");
        this.targets.systemContextRow.style.display = "";
      } else {
        this.targets.systemContextRow.style.display = "none";
      }
    }

    const nasaUrl = `https://exoplanetarchive.ipac.caltech.edu/overview/${planet.name}`;
    this.targets.nasaLink.href = nasaUrl;
  }

  /**
   * Get planet type display name
   */
  getPlanetTypeName(type) {
    const names = {
      terrestrial: "Terrestrial/Rocky",
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

  /**
   * Hide loading indicator
   */
  hideLoading() {
    if (this.targets.loadingIndicator) {
      this.targets.loadingIndicator.classList.add("exoplanet-loading-hidden");
    }
    if (this.targets.canvasLoading) {
      this.targets.canvasLoading.classList.add("exoplanet-loading-hidden");
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.hideLoading();
    this.targets.resultsList.innerHTML = `
      <div class="alert alert-danger m-3">
        <i class="bx bx-error me-2"></i>
        ${message}
      </div>
    `;
  }

  /**
   * Update results list with star systems
   */
  updateSystemsList(systems) {
    const list = this.targets.resultsList;
    list.innerHTML = "";

    this.hideLoading();

    this.targets.resultCount.textContent = systems.length;

    // Use DocumentFragment to batch DOM insertions
    const fragment = document.createDocumentFragment();
    systems.forEach((system) => {
      const item = document.createElement("button");
      item.className = "list-group-item list-group-item-action";
      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="fw-semibold">
              <i class="bx bx-planet me-1"></i>
              ${system.starName}
            </div>
            <div class="fs-sm text-muted">
              ${system.count} planets
            </div>
          </div>
          <span class="badge bg-info">${system.count}P</span>
        </div>
      `;
      item.addEventListener("click", () => {
        if (this.onSystemSelect) {
          this.onSystemSelect(system);
        }
      });
      fragment.appendChild(item);
    });
    list.appendChild(fragment);
  }

  /**
   * Set system select callback
   */
  setSystemSelectCallback(callback) {
    this.onSystemSelect = callback;
  }

  /**
   * Show system information panel
   */
  showSystemInfo(system) {
    if (this.targets.planetInfo) {
      this.targets.planetInfo.style.display = "none";
    }
    if (this.targets.planetDetails) {
      this.targets.planetDetails.style.display = "none";
    }
    if (this.targets.systemDetails) {
      this.targets.systemDetails.style.display = "block";
    }
  }

  /**
   * Update system comparison table
   */
  updateSystemComparison(planets) {
    const tbody = this.targets.systemComparisonBody;
    if (!tbody) return;

    tbody.innerHTML = "";

    // Use DocumentFragment to batch DOM insertions
    const fragment = document.createDocumentFragment();
    planets.forEach((planet) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="fw-semibold">${planet.name.split(" ").pop()}</td>
        <td>
          <span class="badge bg-${this.getTypeColor(planet.type)}">
            ${this.getPlanetTypeName(planet.type)}
          </span>
        </td>
        <td>${planet.radius.toFixed(2)} R⊕</td>
        <td>${planet.mass ? planet.mass.toFixed(2) + " M⊕" : "N/A"}</td>
        <td>${planet.temperature.toFixed(0)} K</td>
        <td>${
          planet.semiMajorAxis ? planet.semiMajorAxis.toFixed(3) + " AU" : "N/A"
        }</td>
        <td>${
          planet.orbitalPeriod
            ? planet.orbitalPeriod.toFixed(1) + " days"
            : "N/A"
        }</td>
      `;
      fragment.appendChild(row);
    });
    tbody.appendChild(fragment);
  }

  /**
   * Update system statistics display
   */
  updateSystemStats(stats) {
    if (this.targets.systemStarName) {
      this.targets.systemStarName.textContent = stats.starName;
    }
    if (this.targets.systemPlanetCount) {
      this.targets.systemPlanetCount.textContent = stats.planetCount;
    }
    if (this.targets.systemDistance) {
      this.targets.systemDistance.textContent =
        stats.planets && stats.planets[0]
          ? `${stats.planets[0].distance.toFixed(2)} light-years`
          : "Unknown";
    }
  }
}
