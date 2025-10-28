/**
 * TooltipManager
 *
 * Manages tooltip creation, display, and hiding for the exoplanet viewer.
 * Handles automatic hiding and smooth transitions.
 */
export class TooltipManager {
  constructor(container) {
    this.container = container;
    this.tooltip = null;
    this.tooltipTimeout = null;
    this.selectedObjectForTooltip = null;

    this.createTooltip();
  }

  /**
   * Create tooltip element
   */
  createTooltip() {
    this.tooltip = document.createElement("div");
    this.tooltip.className =
      "exoplanet-tooltip position-absolute bg-dark text-white p-3 rounded shadow-lg";
    this.tooltip.style.display = "none";
    this.tooltip.style.zIndex = "1000";
    this.tooltip.style.maxWidth = "300px";
    this.tooltip.style.pointerEvents = "none";
    this.tooltip.style.opacity = "0.9";
    this.tooltip.style.transition = "opacity 0.3s ease";
    this.container.appendChild(this.tooltip);
  }

  /**
   * Show tooltip with object information
   * @param {Object} objectData - Data about the object to show
   * @param {number} x - X position in pixels
   * @param {number} y - Y position in pixels
   */
  show(objectData, x, y) {
    if (!this.tooltip) return;

    // Clear any existing auto-hide timer
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }

    this.selectedObjectForTooltip = objectData;

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
      this.hide();
    }, 4000);
  }

  /**
   * Hide tooltip
   */
  hide() {
    if (this.tooltip) {
      this.tooltip.style.opacity = "0";
      setTimeout(() => {
        if (this.tooltip) {
          this.tooltip.style.display = "none";
        }
      }, 300);
    }
    this.selectedObjectForTooltip = null;

    // Clear auto-hide timer
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

  /**
   * Get currently selected object for tooltip
   * @returns {Object|null}
   */
  getSelectedObject() {
    return this.selectedObjectForTooltip;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
    if (this.tooltip && this.tooltip.parentElement) {
      this.tooltip.parentElement.removeChild(this.tooltip);
    }
    this.tooltip = null;
  }
}
