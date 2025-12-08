/**
 * GhostBoundaryHandler - Handles boundary checking and target adjustment for ghosts
 *
 * Manages:
 * - Boundary detection (section, header, footer)
 * - Target adjustment for non-frightened ghosts
 * - Alternative target finding for frightened ghosts
 */
export class GhostBoundaryHandler {
  /**
   * Check if a position would cross a boundary
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {function} checkSectionBoundary - Callback to check section boundaries
   * @returns {Object|null} - Boundary info {type: 'section'|'header'|'footer', y: boundaryY} or null
   */
  checkBoundary(x, y, checkSectionBoundary) {
    // Check section boundary
    if (checkSectionBoundary) {
      const sectionBoundary = checkSectionBoundary(x, y);
      if (sectionBoundary !== null && sectionBoundary !== undefined) {
        return { type: "section", y: sectionBoundary };
      }
    }

    // Check header/footer boundaries
    const header = document.querySelector(".header");
    const footer = document.querySelector(".footer");
    const margin = 30;

    let minY = margin;
    let maxY = document.documentElement.scrollHeight - margin;

    if (header) {
      const headerRect = header.getBoundingClientRect();
      minY = Math.max(
        minY,
        headerRect.top + window.scrollY + headerRect.height + margin
      );
    }

    if (footer) {
      const footerRect = footer.getBoundingClientRect();
      maxY = Math.min(maxY, footerRect.top + window.scrollY - margin);
    }

    if (y <= minY) {
      return { type: "header", y: minY };
    } else if (y >= maxY) {
      return { type: "footer", y: maxY };
    }

    return null;
  }

  /**
   * Find alternative target for frightened ghost when blocked by boundary
   * Prefers horizontal escape routes
   * @param {Object} ghost - Ghost object
   * @param {Object} boundary - Boundary info {type, y}
   * @param {Object} pacmanPosition - Pac-Man's current position {x, y}
   * @param {function} checkSectionBoundary - Callback to check section boundaries
   * @returns {Object} - Alternative target {x, y}
   */
  findFrightenedAlternativeTarget(
    ghost,
    boundary,
    pacmanPosition,
    checkSectionBoundary = null
  ) {
    const fleeDistance = 200;
    const horizontalDistance = 300; // Prefer horizontal movement

    // Try horizontal escape first (left or right)
    const horizontalOptions = [
      { x: ghost.x - horizontalDistance, y: ghost.y }, // Left
      { x: ghost.x + horizontalDistance, y: ghost.y }, // Right
    ];

    // Try opposite vertical direction if blocked
    let verticalOption = null;
    if (boundary.type === "section" || boundary.type === "header") {
      // Blocked from above, try going down
      verticalOption = { x: ghost.x, y: ghost.y + fleeDistance };
    } else if (boundary.type === "footer") {
      // Blocked from below, try going up
      verticalOption = { x: ghost.x, y: ghost.y - fleeDistance };
    }

    // Combine options and pick one that doesn't cross boundary
    const options = [...horizontalOptions];
    if (verticalOption) {
      options.push(verticalOption);
    }

    // Add some randomness to escape direction
    const randomAngle = Math.random() * Math.PI * 2;
    options.push({
      x: ghost.x + Math.cos(randomAngle) * fleeDistance,
      y: ghost.y + Math.sin(randomAngle) * fleeDistance,
    });

    // Find first option that doesn't cross a boundary
    for (const option of options) {
      const testBoundary = this.checkBoundary(
        option.x,
        option.y,
        checkSectionBoundary
      );
      if (!testBoundary || testBoundary.y !== boundary.y) {
        return option;
      }
    }

    // Fallback: just move horizontally away from Pac-Man
    const dx = ghost.x - pacmanPosition.x;
    return {
      x: ghost.x + (dx > 0 ? horizontalDistance : -horizontalDistance),
      y: ghost.y,
    };
  }

  /**
   * Adjust target to avoid boundary for non-frightened ghosts
   * @param {Object} ghost - Ghost object
   * @param {number} targetX - Original target X
   * @param {number} targetY - Original target Y
   * @param {Object} boundary - Boundary info {type, y}
   * @param {function} checkSectionBoundary - Callback to check section boundaries
   * @returns {Object} - Adjusted target {x, y}
   */
  adjustTargetForBoundary(
    ghost,
    targetX,
    targetY,
    boundary,
    checkSectionBoundary
  ) {
    // If target would cross boundary, adjust it
    const targetBoundary = this.checkBoundary(
      targetX,
      targetY,
      checkSectionBoundary
    );

    if (targetBoundary && targetBoundary.y === boundary.y) {
      // Target crosses the same boundary, adjust it
      if (boundary.type === "section" || boundary.type === "header") {
        // Blocked from above, keep target below boundary
        targetY = Math.max(targetY, boundary.y + 50);
      } else if (boundary.type === "footer") {
        // Blocked from below, keep target above boundary
        targetY = Math.min(targetY, boundary.y - 50);
      }

      // Also try to move horizontally around the boundary
      const horizontalOffset = 200;
      if (Math.abs(targetX - ghost.x) < horizontalOffset) {
        // If target is close horizontally, add horizontal component
        const dx = targetX - ghost.x;
        targetX = ghost.x + (dx > 0 ? horizontalOffset : -horizontalOffset);
      }
    }

    return { x: targetX, y: targetY };
  }
}
