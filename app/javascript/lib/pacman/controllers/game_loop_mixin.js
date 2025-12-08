/**
 * Game Loop Mixin
 *
 * Handles the main game loop, movement updates, and physics.
 */

export class GameLoopMixin {
  /**
   * Main game loop - runs every frame
   * Handles all game updates and rendering
   */
  gameLoop(timestamp = performance.now()) {
    // Exit if game is no longer active
    // Important: Check BEFORE scheduling next frame to prevent multiple loops
    if (!this.isGameActive) return;

    // Calculate delta time in seconds (for frame-rate independent movement)
    const deltaTime = this.lastFrameTime
      ? (timestamp - this.lastFrameTime) / 1000
      : 1 / 60;
    this.lastFrameTime = timestamp;

    // Cap delta time to prevent huge jumps (e.g., when tab is inactive)
    const cappedDeltaTime = Math.min(deltaTime, 1 / 30); // Max 30fps equivalent

    // Update container transform for fixed positioning
    this.animationManager.updateContainerTransform();

    // Update Pac-Man movement
    if (!this.isDying) {
      this.updatePacmanMovement(cappedDeltaTime);
    }

    // Update Pac-Man position and animation
    this.animationManager.updatePacmanPosition();
    this.animationManager.animatePacmanMouth(cappedDeltaTime);

    // Sync scroll position to keep Pac-Man centered
    this.animationManager.syncScroll();

    // Update ghosts with AI
    if (!this.isDying) {
      // Update ghost AI game state
      this.ghostAI.updateGameState({
        pacmanPosition: this.pacmanPosition,
        pacmanVelocity: this.pacmanVelocity,
        pacmanSpeed: this.pacmanSpeed,
        ghostSpeed: this.ghostSpeed,
        powerMode: this.powerMode,
        powerModeEnding: this.powerModeEnding,
        dots: this.dots,
        activeEffects: this.activeEffects,
      });

      // Update ghosts
      this.ghostAI.updateGhosts(cappedDeltaTime, (x, y) =>
        this.checkSectionBoundary(x, y)
      );
      this.ghosts = this.ghostAI.getGhosts();

      // Update ghost indicators
      this.ghostAI.updateGhostIndicators();
    }

    // Check collisions
    if (!this.isDying) {
      this.itemManager.checkDotCollisions();
      this.itemManager.checkItemCollisions();

      // Check ghost collisions
      const lifeLost = this.ghostAI.checkGhostCollisions(
        (ghost) => this.onGhostEaten(ghost),
        () => this.loseLife()
      );

      // Check key collection
      this.sectionManager.checkKeyCollection();
    }

    // Check hover effects
    this.collisionManager.checkHoverEffects(this.pacmanPosition);

    // Optimize dot visibility for performance
    this.itemManager.optimizeDotVisibility();

    // Check win condition
    this.checkWinCondition();

    // Continue game loop - only if still active
    if (this.isGameActive) {
      requestAnimationFrame((ts) => this.gameLoop(ts));
    }
  }

  /**
   * Update Pac-Man's position based on velocity
   */
  updatePacmanMovement(deltaTime) {
    // Calculate next position with delta-time based movement
    const nextX = this.pacmanPosition.x + this.pacmanVelocity.x * deltaTime;
    const nextY = this.pacmanPosition.y + this.pacmanVelocity.y * deltaTime;

    // Check if next position would enter a locked section
    const boundary = this.checkSectionBoundary(nextX, nextY);

    if (boundary) {
      // Stop at boundary
      this.pacmanPosition.y = boundary;
      this.pacmanVelocity = { x: 0, y: 0 };
      this.collisionManager.flashBoundary("section", this.sections);
    } else {
      this.pacmanPosition.x = nextX;
      this.pacmanPosition.y = nextY;
    }

    // Wrap around screen edges horizontally
    const margin = 30;
    if (this.pacmanPosition.x < -margin) {
      this.pacmanPosition.x = window.innerWidth + margin;
    } else if (this.pacmanPosition.x > window.innerWidth + margin) {
      this.pacmanPosition.x = -margin;
    }

    // Keep Pac-Man within playable area (between header and footer)
    const header = document.querySelector(".header");
    const footer = document.querySelector(".footer");

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

    // Stop at boundaries
    if (this.pacmanPosition.y <= minY) {
      this.pacmanPosition.y = minY;
      this.pacmanVelocity = { x: 0, y: 0 };
      this.collisionManager.flashBoundary("header", this.sections);
    } else if (this.pacmanPosition.y >= maxY) {
      this.pacmanPosition.y = maxY;
      this.pacmanVelocity = { x: 0, y: 0 };
      this.collisionManager.flashBoundary("footer", this.sections);
    }
  }

  /**
   * Check if position would enter a locked section
   */
  checkSectionBoundary(x, y) {
    return this.collisionManager.checkSectionBoundary(
      { x, y },
      this.sections,
      this.isGameActive
    );
  }
}
