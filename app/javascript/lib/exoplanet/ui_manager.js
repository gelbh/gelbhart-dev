/**
 * UIManager
 * Handles UI updates for results list and loading states
 */
export class UIManager {
  constructor(targets) {
    this.targets = targets;
  }

  /**
   * Sanitize HTML to prevent XSS attacks
   * Escapes HTML special characters
   */
  sanitizeHTML(str) {
    if (str === null || str === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  /**
   * Sanitize URL component for safe use in URLs
   */
  sanitizeURL(str) {
    if (str === null || str === undefined) return "";
    return encodeURIComponent(String(str));
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
      // Security: Sanitize data before inserting to prevent XSS
      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${this.sanitizeHTML(planet.name)}</div>
            <div class="fs-sm text-muted">${this.sanitizeHTML(
              planet.hostStar
            )}</div>
          </div>
          <span class="badge bg-${this.getTypeColor(
            planet.type
          )}">${this.sanitizeHTML(this.getPlanetTypeName(planet.type))}</span>
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
    // Security: Sanitize data before inserting to prevent XSS
    systemHeader.innerHTML = `
      <div class="d-flex justify-content-between align-items-center py-2">
        <div>
          <i class="bx bx-chevron-right expand-icon"></i>
          <i class="bx bx-sun text-warning me-2"></i>
          <span class="fw-semibold">${this.sanitizeHTML(
            systemData.starName
          )}</span>
        </div>
        <span class="badge bg-info">${this.sanitizeHTML(
          systemData.planetCount
        )} planets</span>
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
      // Security: Sanitize data before inserting to prevent XSS
      planetItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${this.sanitizeHTML(planet.name)}</div>
            <div class="fs-sm text-muted">${this.sanitizeHTML(
              planet.temperature.toFixed(0)
            )} K</div>
          </div>
          <span class="badge bg-${this.getTypeColor(
            planet.type
          )}">${this.sanitizeHTML(this.getPlanetTypeName(planet.type))}</span>
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
    // Security: Sanitize data before inserting to prevent XSS
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-semibold">${this.sanitizeHTML(planet.name)}</div>
          <div class="fs-sm text-muted">${this.sanitizeHTML(
            planet.hostStar
          )}</div>
        </div>
        <span class="badge bg-${this.getTypeColor(
          planet.type
        )}">${this.sanitizeHTML(this.getPlanetTypeName(planet.type))}</span>
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
      // Security: Sanitize data before inserting to prevent XSS
      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="fw-semibold">
              <i class="bx bx-planet me-1"></i>
              ${this.sanitizeHTML(system.starName)}
            </div>
            <div class="fs-sm text-muted">
              ${this.sanitizeHTML(system.count)} planets
            </div>
          </div>
          <span class="badge bg-info">${this.sanitizeHTML(system.count)}P</span>
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
   * Update info panel with galaxy view information
   */
  updateInfoForGalaxyView(systemCount, totalPlanets) {
    const infoContent = document.querySelector(
      '[data-exoplanet-viewer-target="infoContent"]'
    );
    if (!infoContent) return;

    infoContent.innerHTML = `
      <div class="info-galaxy">
        <h5 class="text-white mb-3"><i class="bx bx-bullseye me-2"></i>Galaxy View</h5>
        
        <div class="info-section">
          <h6 class="text-white mb-2">Overview</h6>
          <p class="text-white-50 fs-sm">
            You are viewing a 3D representation of discovered exoplanet systems mapped to their 
            galactic coordinates relative to Earth (at the center).
          </p>
        </div>

        <div class="info-section">
          <h6 class="text-white mb-2">Statistics</h6>
          <div class="stat-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
            <div class="d-flex justify-content-between">
              <span class="text-white-50"><i class="bx bx-sun me-1"></i>Star Systems</span>
              <strong class="text-white">${this.sanitizeHTML(
                systemCount
              )}</strong>
            </div>
          </div>
          <div class="stat-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
            <div class="d-flex justify-content-between">
              <span class="text-white-50"><i class="bx bx-planet me-1"></i>Total Planets</span>
              <strong class="text-white">${this.sanitizeHTML(
                totalPlanets
              )}</strong>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h6 class="text-white mb-2">Interactions</h6>
          <ul class="text-white-50 fs-sm ps-3 mb-0">
            <li>Click a star system to zoom in and view its planets</li>
            <li>Drag to rotate the view</li>
            <li>Scroll to zoom in/out</li>
            <li>Search for specific systems in the Search tab</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Update info panel with system view information
   */
  updateInfoForSystemView(system) {
    const infoContent = document.querySelector(
      '[data-exoplanet-viewer-target="infoContent"]'
    );
    if (!infoContent) return;

    const planetListHTML = system.planets
      .map(
        (planet) => `
      <div class="planet-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong class="text-white d-block">${this.sanitizeHTML(
              planet.name
            )}</strong>
            <small class="text-white-50">
              <i class="bx bx-thermometer me-1"></i>${this.sanitizeHTML(
                (planet.temperature || 0).toFixed(0)
              )} K
              ${
                planet.radius
                  ? `<span class="ms-2"><i class="bx bx-planet me-1"></i>${this.sanitizeHTML(
                      planet.radius.toFixed(2)
                    )} R⊕</span>`
                  : ""
              }
            </small>
          </div>
          <span class="badge bg-${this.getTypeColor(
            planet.type
          )}">${this.sanitizeHTML(this.getPlanetTypeName(planet.type))}</span>
        </div>
      </div>
    `
      )
      .join("");

    infoContent.innerHTML = `
      <div class="info-system">
        <h5 class="text-white mb-3">
          <i class="bx bx-sun text-warning me-2"></i>${this.sanitizeHTML(
            system.starName || system.name
          )}
        </h5>
        
        <div class="info-section">
          <h6 class="text-white mb-2">System Overview</h6>
          <div class="property-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
            <div class="d-flex justify-content-between">
              <span class="text-white-50"><i class="bx bx-planet me-1"></i>Planets</span>
              <strong class="text-white">${this.sanitizeHTML(
                system.planets.length
              )}</strong>
            </div>
          </div>
          ${
            system.distance
              ? `
          <div class="property-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
            <div class="d-flex justify-content-between">
              <span class="text-white-50"><i class="bx bx-trip me-1"></i>Distance</span>
              <strong class="text-white">${this.sanitizeHTML(
                system.distance.toFixed(1)
              )} ly</strong>
            </div>
          </div>
          `
              : ""
          }
        </div>

        <div class="info-section">
          <h6 class="text-white mb-2">Planets in System</h6>
          <div class="planet-list" style="max-height: 300px; overflow-y: auto;">
            ${planetListHTML}
          </div>
        </div>

        <div class="info-section">
          <h6 class="text-white mb-2">Interactions</h6>
          <ul class="text-white-50 fs-sm ps-3 mb-0">
            <li>Click a planet to view its details</li>
            <li>Watch planets orbit their star in real-time</li>
            <li>Adjust orbit speed with the slider below</li>
            <li>Toggle 3D orbits to see inclinations</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Update info panel with planet view information
   */
  updateInfoForPlanetView(planet) {
    const infoContent = document.querySelector(
      '[data-exoplanet-viewer-target="infoContent"]'
    );
    if (!infoContent) return;

    const properties = [];

    if (planet.radius) {
      properties.push(`
        <div class="property-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
          <div class="d-flex justify-content-between">
            <span class="text-white-50"><i class="bx bx-planet me-1"></i>Radius</span>
            <strong class="text-white">${this.sanitizeHTML(
              planet.radius.toFixed(2)
            )} R⊕</strong>
          </div>
        </div>
      `);
    }

    if (planet.mass) {
      properties.push(`
        <div class="property-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
          <div class="d-flex justify-content-between">
            <span class="text-white-50"><i class="bx bx-dumbbell me-1"></i>Mass</span>
            <strong class="text-white">${this.sanitizeHTML(
              planet.mass.toFixed(2)
            )} M⊕</strong>
          </div>
        </div>
      `);
    }

    if (planet.temperature) {
      properties.push(`
        <div class="property-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
          <div class="d-flex justify-content-between">
            <span class="text-white-50"><i class="bx bx-thermometer me-1"></i>Temperature</span>
            <strong class="text-white">${this.sanitizeHTML(
              planet.temperature.toFixed(0)
            )} K</strong>
          </div>
        </div>
      `);
    }

    if (planet.orbitalPeriod) {
      properties.push(`
        <div class="property-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
          <div class="d-flex justify-content-between">
            <span class="text-white-50"><i class="bx bx-time me-1"></i>Orbital Period</span>
            <strong class="text-white">${this.sanitizeHTML(
              planet.orbitalPeriod.toFixed(1)
            )} days</strong>
          </div>
        </div>
      `);
    }

    if (planet.semiMajorAxis) {
      properties.push(`
        <div class="property-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
          <div class="d-flex justify-content-between">
            <span class="text-white-50"><i class="bx bx-trip me-1"></i>Distance from Star</span>
            <strong class="text-white">${this.sanitizeHTML(
              planet.semiMajorAxis.toFixed(3)
            )} AU</strong>
          </div>
        </div>
      `);
    }

    if (planet.discoveryMethod) {
      properties.push(`
        <div class="property-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
          <div class="d-flex justify-content-between">
            <span class="text-white-50"><i class="bx bx-search me-1"></i>Discovery Method</span>
            <strong class="text-white">${this.sanitizeHTML(
              planet.discoveryMethod
            )}</strong>
          </div>
        </div>
      `);
    }

    if (planet.discoveryYear) {
      properties.push(`
        <div class="property-item p-2 rounded mb-2" style="background: rgba(255, 255, 255, 0.05);">
          <div class="d-flex justify-content-between">
            <span class="text-white-50"><i class="bx bx-calendar me-1"></i>Discovered</span>
            <strong class="text-white">${this.sanitizeHTML(
              planet.discoveryYear
            )}</strong>
          </div>
        </div>
      `);
    }

    infoContent.innerHTML = `
      <div class="info-planet">
        <h5 class="text-white mb-3">
          <i class="bx bx-planet text-primary me-2"></i>${this.sanitizeHTML(
            planet.name
          )}
        </h5>
        
        <div class="info-section">
          <h6 class="text-white mb-2">Classification</h6>
          <div class="mb-3">
            <span class="badge bg-${this.getTypeColor(
              planet.type
            )} fs-sm px-3 py-2">
              ${this.sanitizeHTML(this.getPlanetTypeName(planet.type))}
            </span>
          </div>
        </div>

        <div class="info-section">
          <h6 class="text-white mb-2">Host Star</h6>
          <p class="text-white fs-6 mb-1">
            <i class="bx bx-sun text-warning me-2"></i>${this.sanitizeHTML(
              planet.hostStar
            )}
          </p>
          ${
            planet.distance
              ? `
          <p class="text-white-50 fs-sm mb-0">
            <i class="bx bx-trip me-1"></i>${this.sanitizeHTML(
              planet.distance.toFixed(1)
            )} light-years from Earth
          </p>
          `
              : ""
          }
        </div>

        ${
          properties.length > 0
            ? `
        <div class="info-section">
          <h6 class="text-white mb-2">Physical Properties</h6>
          ${properties.join("")}
        </div>
        `
            : ""
        }

        <div class="info-section">
          <h6 class="text-white mb-2">About This View</h6>
          <p class="text-white-50 fs-sm mb-0">
            This is a procedurally generated visualization based on real NASA data. 
            The planet's appearance is computed from its known properties like radius, 
            mass, temperature, and host star characteristics.
          </p>
        </div>
      </div>
    `;
  }
}
