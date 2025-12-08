/**
 * GhostCollision - Handles collision detection between Pac-Man and ghosts
 *
 * Manages:
 * - Collision detection with configurable radius
 * - Ghost eating when frightened
 * - Life loss when not shielded
 */
export class GhostCollision {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.collisionRadius = 25;
  }

  /**
   * Check for collisions between Pac-Man and ghosts
   * Handles eating ghosts or losing a life
   * @param {Array} ghosts - Array of ghost objects
   * @param {Object} pacmanPosition - Pac-Man's position {x, y}
   * @param {Object} activeEffects - Active powerup effects {shield: boolean}
   * @param {function} onEatGhost - Callback when ghost is eaten
   * @param {function} onLoseLife - Callback when Pac-Man loses a life
   * @param {function} respawnGhost - Callback to respawn a ghost after delay
   * @param {Array} respawnTimers - Array to track respawn timers for cleanup
   * @returns {boolean} - True if a life was lost
   */
  check(
    ghosts,
    pacmanPosition,
    activeEffects,
    onEatGhost = null,
    onLoseLife = null,
    respawnGhost = null,
    respawnTimers = []
  ) {
    let lifeLost = false;

    ghosts.forEach((ghost) => {
      if (ghost.eaten) return; // Skip already eaten ghosts

      const distance = Math.sqrt(
        Math.pow(pacmanPosition.x - ghost.x, 2) +
          Math.pow(pacmanPosition.y - ghost.y, 2)
      );

      if (distance < this.collisionRadius) {
        if (ghost.frightened) {
          // Eat the ghost
          ghost.eaten = true;
          ghost.frightened = false;
          ghost.element.classList.remove("frightened");
          ghost.element.classList.add("eaten");

          // Play eat ghost sound
          if (this.audioManager) {
            this.audioManager.play("eatGhost", true);
          }

          // Notify controller of ghost eaten
          if (onEatGhost) {
            onEatGhost(ghost);
          }

          // Respawn after reaching home - store timer for cleanup
          if (respawnGhost) {
            const respawnTimer = setTimeout(() => {
              respawnGhost(ghost);
              // Remove this timer from tracking array
              const index = respawnTimers.indexOf(respawnTimer);
              if (index > -1) {
                respawnTimers.splice(index, 1);
              }
            }, 3000);
            respawnTimers.push(respawnTimer);
          }
        } else if (!activeEffects.shield) {
          // Lose a life (unless shielded)
          lifeLost = true;
          if (onLoseLife) {
            onLoseLife();
          }
        }
        // Shield deflects ghost - no action needed
      }
    });

    return lifeLost;
  }
}
