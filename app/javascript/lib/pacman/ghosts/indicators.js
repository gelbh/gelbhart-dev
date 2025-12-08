/**
 * GhostIndicators - Manages off-screen ghost indicators
 *
 * Shows arrows at screen edges pointing to ghosts that are off-screen
 */
export class GhostIndicators {
  constructor(gameContainer) {
    this.gameContainer = gameContainer;
  }

  /**
   * Get ghost color hex value by color name
   * @param {string} colorName - Color name (red, pink, cyan, orange)
   * @returns {string} - Hex color value
   */
  getGhostColor(colorName) {
    const colors = {
      red: "#FF0000",
      pink: "#FFB8D1",
      cyan: "#00FFFF",
      orange: "#FFA500",
    };
    return colors[colorName] || "#FFFFFF";
  }

  /**
   * Update off-screen ghost indicators
   * Shows arrows at screen edges pointing to ghosts that are off-screen
   * @param {Array} ghosts - Array of ghost objects
   */
  update(ghosts) {
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    const viewportLeft = 0;
    const viewportRight = window.innerWidth;
    const edgeMargin = 30; // Distance from edge to show indicator

    ghosts.forEach((ghost) => {
      // Check if ghost is off-screen
      const isOffScreenTop = ghost.y < viewportTop - 50;
      const isOffScreenBottom = ghost.y > viewportBottom + 50;
      const isOffScreenLeft = ghost.x < viewportLeft - 50;
      const isOffScreenRight = ghost.x > viewportRight + 50;

      const isOffScreen =
        isOffScreenTop ||
        isOffScreenBottom ||
        isOffScreenLeft ||
        isOffScreenRight;

      // Get or create indicator for this ghost
      let indicator = ghost.indicator;
      if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "ghost-indicator";
        indicator.innerHTML = `
          <div class="indicator-arrow"></div>
          <div class="indicator-dot" style="background: ${this.getGhostColor(
            ghost.color
          )}"></div>
        `;
        this.gameContainer.appendChild(indicator);
        ghost.indicator = indicator;
      }

      if (isOffScreen && !ghost.eaten) {
        // Calculate direction angle from center of screen to ghost
        const centerX = viewportLeft + (viewportRight - viewportLeft) / 2;
        const centerY = viewportTop + window.innerHeight / 2;

        const angle = Math.atan2(ghost.y - centerY, ghost.x - centerX);

        // Calculate position on screen edge
        let indicatorX, indicatorY;

        // Determine which edge and position
        const absAngle = Math.abs(angle);
        const isMoreVertical =
          absAngle > Math.PI / 4 && absAngle < (3 * Math.PI) / 4;

        if (isMoreVertical) {
          // Top or bottom edge
          if (angle < 0) {
            // Top edge
            indicatorY = edgeMargin;
            indicatorX = Math.max(
              edgeMargin,
              Math.min(viewportRight - edgeMargin, ghost.x)
            );
          } else {
            // Bottom edge
            indicatorY = window.innerHeight - edgeMargin;
            indicatorX = Math.max(
              edgeMargin,
              Math.min(viewportRight - edgeMargin, ghost.x)
            );
          }
        } else {
          // Left or right edge
          if (angle > -Math.PI / 2 && angle < Math.PI / 2) {
            // Right edge
            indicatorX = viewportRight - edgeMargin;
            indicatorY = Math.max(
              edgeMargin,
              Math.min(window.innerHeight - edgeMargin, ghost.y - viewportTop)
            );
          } else {
            // Left edge
            indicatorX = edgeMargin;
            indicatorY = Math.max(
              edgeMargin,
              Math.min(window.innerHeight - edgeMargin, ghost.y - viewportTop)
            );
          }
        }

        // Update indicator position and rotation
        indicator.style.display = "flex";
        indicator.style.left = `${indicatorX}px`;
        indicator.style.top = `${indicatorY + viewportTop}px`;

        // Rotate arrow to point towards ghost
        const arrowRotation = (angle * 180) / Math.PI + 90; // +90 because arrow points up by default
        const arrow = indicator.querySelector(".indicator-arrow");
        if (arrow) {
          arrow.style.transform = `rotate(${arrowRotation}deg)`;
        }

        // Add pulsing for frightened ghosts
        if (ghost.frightened) {
          indicator.classList.add("frightened");
        } else {
          indicator.classList.remove("frightened");
        }
      } else {
        // Ghost is on screen, hide indicator
        if (indicator) {
          indicator.style.display = "none";
        }
      }
    });
  }
}
