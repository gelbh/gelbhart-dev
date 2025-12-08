/**
 * Game State Mixin
 *
 * Provides state management methods for the Pac-Man game controller.
 * Handles game state queries, movement input, and outlet communication.
 */

export class GameStateMixin {
  /**
   * Get current game state (for input controller)
   * @returns {Object} Game state {isGameActive, isStarting, isDying}
   */
  getGameState() {
    return {
      isGameActive: this.isGameActive,
      isStarting: this.isStarting,
      isDying: this.isDying,
    };
  }

  /**
   * Request game start (called by input controller)
   */
  requestStart() {
    if (!this.isGameActive && !this.isStarting) {
      this.startGame();
    }
  }

  /**
   * Handle movement from input controller
   * @param {Object} velocity - Normalized velocity {x, y} (-1 to 1)
   * @param {string} direction - Direction string ("up", "down", "left", "right")
   */
  handleMovement(velocity, direction) {
    // Prevent movement during intro music or death
    if (this.isStarting || !this.isGameActive || this.isDying) {
      return;
    }

    // Apply velocity with game speed
    this.pacmanVelocity = {
      x: velocity.x * this.pacmanSpeed,
      y: velocity.y * this.pacmanSpeed,
    };
    this.pacmanDirection = direction;
  }

  /**
   * Ensure touch controls are still working (delegated to input controller)
   */
  ensureTouchControls() {
    if (this.hasPacmanInputOutlet) {
      this.pacmanInputOutlet.ensureTouchControls();
    }
  }
}
