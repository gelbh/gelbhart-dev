/**
 * GhostAI - Advanced ghost AI and behavior management for Pac-Man game
 *
 * Manages:
 * - Ghost creation and initialization with unique personalities
 * - Advanced AI with scatter/chase modes
 * - Ghost movement and pathfinding with wraparound support
 * - Collision detection between Pac-Man and ghosts
 * - Ghost respawn system
 * - Off-screen ghost indicators
 * - Power mode (frightened) behavior
 * - Individual ghost personalities:
 *   - Blinky (Red): Aggressive chaser with prediction
 *   - Pinky (Pink): Ambusher targeting ahead of Pac-Man
 *   - Inky (Cyan): Flanker coordinating with Blinky
 *   - Clyde (Orange): Zone controller with unpredictable behavior
 */
import { GhostBoundaryHandler } from "lib/pacman/ghosts/boundary_handler";
import {
  calculateChaseTarget,
  calculateAmbushTarget,
  calculatePatrolTarget,
  calculateScatterTarget,
  calculateFrightenedTarget,
  calculateScatterModeTarget,
} from "lib/pacman/ghosts/personalities";
import { GhostIndicators } from "lib/pacman/ghosts/indicators";
import { GhostCollision } from "lib/pacman/ghosts/collision";

export class GhostAI {
  constructor(dependencies = {}) {
    this.spriteManager = dependencies.spriteManager;
    this.audioManager = dependencies.audioManager;
    this.gameContainer = dependencies.gameContainer;

    // Ghost state
    this.ghosts = [];
    this.animationFrame = 0;
    this.ghostRespawnTimers = []; // Track ghost respawn timers for cleanup

    // References to game state (will be updated from controller)
    this.pacmanPosition = { x: 0, y: 0 };
    this.pacmanVelocity = { x: 0, y: 0 };
    this.pacmanSpeed = 180;
    this.ghostSpeed = 135;
    this.powerMode = false;
    this.powerModeEnding = false;
    this.dots = [];
    this.activeEffects = {};

    // Cached dot counts for performance (avoid filtering every frame)
    this.dotsRemaining = 0;
    this.totalDots = 0;

    // Initialize helper modules
    this.boundaryHandler = new GhostBoundaryHandler();
    this.indicators = new GhostIndicators(this.gameContainer);
    this.collision = new GhostCollision(this.audioManager);
  }

  /**
   * Update references to game state
   * Called by the controller to keep AI in sync with game state
   */
  updateGameState(state) {
    this.pacmanPosition = state.pacmanPosition;
    this.pacmanVelocity = state.pacmanVelocity;
    this.pacmanSpeed = state.pacmanSpeed;
    this.ghostSpeed = state.ghostSpeed;
    this.powerMode = state.powerMode;
    this.powerModeEnding = state.powerModeEnding;
    this.dots = state.dots;
    this.activeEffects = state.activeEffects;
  }

  /**
   * Initialize dot counts cache
   * Call this once when dots are first generated
   */
  initializeDotCounts() {
    this.totalDots = this.dots.length;
    this.dotsRemaining = this.dots.filter((d) => !d.collected).length;
  }

  /**
   * Decrement dots remaining cache
   * Call this when a dot is collected for performance
   */
  decrementDotsRemaining() {
    if (this.dotsRemaining > 0) {
      this.dotsRemaining--;
    }
  }

  /**
   * Create all 4 ghosts with unique AI personalities
   * - Blinky (Red): Aggressive chaser
   * - Pinky (Pink): Ambusher (targets ahead)
   * - Inky (Cyan): Flanker (uses Blinky's position)
   * - Clyde (Orange): Shy (retreats when close)
   */
  createGhosts() {
    const ghostConfigs = [
      { color: "red", personality: "chase", name: "Blinky" },
      { color: "pink", personality: "ambush", name: "Pinky" },
      { color: "cyan", personality: "patrol", name: "Inky" },
      { color: "orange", personality: "scatter", name: "Clyde" },
    ];
    const viewportWidth = window.innerWidth;

    // Spawn ghosts CLOSER to Pac-Man (300-400px away instead of 1000px)
    const pacmanY = this.pacmanPosition.y;
    const ghostSpawnY = pacmanY + 350; // Much closer - just off initial screen

    const startPositions = [
      { x: viewportWidth * 0.2, y: ghostSpawnY },
      { x: viewportWidth * 0.4, y: ghostSpawnY + 50 },
      { x: viewportWidth * 0.6, y: ghostSpawnY + 50 },
      { x: viewportWidth * 0.8, y: ghostSpawnY },
    ];

    ghostConfigs.forEach((config, index) => {
      const ghost = document.createElement("div");
      ghost.className = `pacman-ghost ghost-${config.color}`;
      const img = document.createElement("img");
      img.className = "ghost-sprite";
      img.alt = config.name;
      img.src = this.spriteManager.getGhostSprite(config.color, "right", 1);
      ghost.appendChild(img);
      ghost.style.left = `${startPositions[index].x}px`;
      ghost.style.top = `${startPositions[index].y}px`;
      this.gameContainer.appendChild(ghost);

      this.ghosts.push({
        element: ghost,
        x: startPositions[index].x,
        y: startPositions[index].y,
        color: config.color,
        personality: config.personality,
        name: config.name,
        direction: "right",
        velocityX: 0,
        velocityY: 0,
        frightened: false,
        eaten: false,
        animationFrame: 1,
        scatterTimer: 0,
      });
    });
  }

  /**
   * Check if a position would cross a boundary
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {function} checkSectionBoundary - Callback to check section boundaries
   * @returns {Object|null} - Boundary info {type: 'section'|'header'|'footer', y: boundaryY} or null
   */
  checkBoundary(x, y, checkSectionBoundary) {
    return this.boundaryHandler.checkBoundary(x, y, checkSectionBoundary);
  }

  /**
   * Find alternative target for frightened ghost when blocked by boundary
   * Prefers horizontal escape routes
   * @param {Object} ghost - Ghost object
   * @param {Object} boundary - Boundary info {type, y}
   * @param {function} checkSectionBoundary - Callback to check section boundaries
   * @returns {Object} - Alternative target {x, y}
   */
  findFrightenedAlternativeTarget(
    ghost,
    boundary,
    checkSectionBoundary = null
  ) {
    return this.boundaryHandler.findFrightenedAlternativeTarget(
      ghost,
      boundary,
      this.pacmanPosition,
      checkSectionBoundary
    );
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
    return this.boundaryHandler.adjustTargetForBoundary(
      ghost,
      targetX,
      targetY,
      boundary,
      checkSectionBoundary
    );
  }

  /**
   * Update all ghosts with advanced AI behavior
   * Implements scatter/chase modes and unique personalities
   * Scatter: 5 seconds (17% of time)
   * Chase: 25 seconds (83% of time)
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {function} checkSectionBoundary - Callback to check section boundaries
   */
  updateGhosts(deltaTime = 1 / 60, checkSectionBoundary = null) {
    this.animationFrame++;

    this.ghosts.forEach((ghost, index) => {
      // Skip frozen ghosts
      if (ghost.frozen) return;

      // Update scatter timer for mode switching (time-based, not frame-based)
      ghost.scatterTimer = (ghost.scatterTimer || 0) + deltaTime;

      // Simplified: Short scatter periods, mostly chase (makes game harder)
      // Scatter: 5 seconds, Chase: 25 seconds
      const totalCycle = 30; // 30 seconds total cycle
      const scatterDuration = 5; // 5 seconds scatter
      const currentPhase = ghost.scatterTimer % totalCycle;
      const isScatterMode = currentPhase < scatterDuration; // Only scatter for first 5 seconds of each 30s cycle

      // Get target position based on ghost personality and mode
      let targetX, targetY;

      // Check if ghost is currently at a boundary (stuck state)
      const currentBoundary = this.checkBoundary(
        ghost.x,
        ghost.y,
        checkSectionBoundary
      );
      const wasAtBoundary =
        ghost.lastBoundaryHit &&
        ghost.lastBoundaryHit.y === currentBoundary?.y &&
        Math.abs(ghost.y - currentBoundary.y) < 5; // Within 5px of boundary

      if (ghost.frightened) {
        // Run away from Pac-Man with more erratic movement
        const frightenedTarget = calculateFrightenedTarget(ghost, {
          pacmanPosition: this.pacmanPosition,
        });
        targetX = frightenedTarget.x;
        targetY = frightenedTarget.y;

        // If ghost is stuck at boundary or target would cross boundary, find alternative
        if (currentBoundary || wasAtBoundary) {
          const alternative = this.findFrightenedAlternativeTarget(
            ghost,
            currentBoundary || ghost.lastBoundaryHit,
            checkSectionBoundary
          );
          targetX = alternative.x;
          targetY = alternative.y;
          // Track that we're avoiding a boundary
          ghost.lastBoundaryHit = currentBoundary || ghost.lastBoundaryHit;
        } else {
          // Check if target would cross a boundary
          const targetBoundary = this.checkBoundary(
            targetX,
            targetY,
            checkSectionBoundary
          );
          if (targetBoundary) {
            const alternative = this.findFrightenedAlternativeTarget(
              ghost,
              targetBoundary,
              checkSectionBoundary
            );
            targetX = alternative.x;
            targetY = alternative.y;
            ghost.lastBoundaryHit = targetBoundary;
          } else {
            ghost.lastBoundaryHit = null; // Clear boundary tracking if not blocked
          }
        }
      } else if (ghost.eaten) {
        // Return to center fast
        targetX = window.innerWidth / 2;
        targetY = window.scrollY + window.innerHeight / 2;
      } else if (isScatterMode && ghost.personality !== "chase") {
        // Brief scatter mode - each ghost goes to their home corner
        // Blinky NEVER scatters - always aggressive!
        const scatterTarget = calculateScatterModeTarget(index, {
          pacmanPosition: this.pacmanPosition,
        });
        targetX = scatterTarget.x;
        targetY = scatterTarget.y;
      } else {
        // Chase mode (default) - use personality-based AI
        const gameState = {
          pacmanPosition: this.pacmanPosition,
          pacmanVelocity: this.pacmanVelocity,
          dotsRemaining: this.dotsRemaining,
          totalDots: this.totalDots,
        };

        switch (ghost.personality) {
          case "chase": // Blinky - Relentless pursuer with prediction
            const chaseResult = calculateChaseTarget(ghost, gameState);
            targetX = chaseResult.x;
            targetY = chaseResult.y;
            ghost.speedBoost = chaseResult.speedBoost;
            break;

          case "ambush": // Pinky - Advanced prediction ambush
            const ambushTarget = calculateAmbushTarget(
              ghost,
              gameState,
              ghost.scatterTimer
            );
            targetX = ambushTarget.x;
            targetY = ambushTarget.y;
            break;

          case "patrol": // Inky - Coordinated flanking with Blinky
            const patrolTarget = calculatePatrolTarget(
              ghost,
              gameState,
              this.ghosts,
              ghost.scatterTimer
            );
            targetX = patrolTarget.x;
            targetY = patrolTarget.y;
            break;

          case "scatter": // Clyde - Unpredictable ambusher with zone control
            const scatterTarget = calculateScatterTarget(
              ghost,
              gameState,
              ghost.scatterTimer,
              deltaTime
            );
            targetX = scatterTarget.x;
            targetY = scatterTarget.y;
            break;

          default:
            targetX = this.pacmanPosition.x;
            targetY = this.pacmanPosition.y;
        }

        // For non-frightened ghosts, adjust target if it would cross a boundary
        if (currentBoundary || wasAtBoundary) {
          const adjusted = this.adjustTargetForBoundary(
            ghost,
            targetX,
            targetY,
            currentBoundary || ghost.lastBoundaryHit,
            checkSectionBoundary
          );
          targetX = adjusted.x;
          targetY = adjusted.y;
          ghost.lastBoundaryHit = currentBoundary || ghost.lastBoundaryHit;
        } else {
          // Check if target would cross a boundary
          const targetBoundary = this.checkBoundary(
            targetX,
            targetY,
            checkSectionBoundary
          );
          if (targetBoundary) {
            const adjusted = this.adjustTargetForBoundary(
              ghost,
              targetX,
              targetY,
              targetBoundary,
              checkSectionBoundary
            );
            targetX = adjusted.x;
            targetY = adjusted.y;
            ghost.lastBoundaryHit = targetBoundary;
          } else {
            ghost.lastBoundaryHit = null; // Clear boundary tracking if not blocked
          }
        }
      }

      // Calculate direction to target with wraparound consideration
      // Check both direct path and wraparound path, use the shorter one
      let dx = targetX - ghost.x;
      const dy = targetY - ghost.y;

      // Consider horizontal wraparound (tunnel mechanic)
      const screenWidth = window.innerWidth;
      const margin = 30;
      const dxDirect = dx;
      const dxWrapLeft = targetX + screenWidth - ghost.x; // Target wraps from right
      const dxWrapRight = targetX - screenWidth - ghost.x; // Target wraps from left

      // Choose the shortest horizontal path
      const distances = [
        { dx: dxDirect, dist: Math.abs(dxDirect) },
        { dx: dxWrapLeft, dist: Math.abs(dxWrapLeft) },
        { dx: dxWrapRight, dist: Math.abs(dxWrapRight) },
      ];
      const shortest = distances.reduce((min, curr) =>
        curr.dist < min.dist ? curr : min
      );
      dx = shortest.dx;

      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        // Speed modifiers based on state
        let speed = this.ghostSpeed * (ghost.speedBoost || 1);

        // Cap ghost speed to always be slower than Pac-Man (90% max)
        // This ensures the game remains winnable even with Cruise Elroy mode
        const maxSpeed = this.pacmanSpeed * 0.9;
        speed = Math.min(speed, maxSpeed);

        if (ghost.eaten) {
          speed = this.pacmanSpeed * 1.5; // Eyes move faster
        } else if (ghost.frightened) {
          speed = this.pacmanSpeed * 0.5; // Frightened ghosts are slower
        }

        // Smooth acceleration instead of instant direction changes
        const targetVelX = (dx / distance) * speed;
        const targetVelY = (dy / distance) * speed;

        // Time-based lerp for frame-rate independent smoothing
        // Higher smoothing rate = faster response (10 ≈ 0.15 smoothing at 60fps)
        const smoothingRate = ghost.eaten ? 20 : 12; // Eyes turn faster
        const smoothing = 1 - Math.exp(-smoothingRate * deltaTime);
        ghost.velocityX =
          ghost.velocityX * (1 - smoothing) + targetVelX * smoothing;
        ghost.velocityY =
          ghost.velocityY * (1 - smoothing) + targetVelY * smoothing;

        // Calculate next position with delta-time based movement
        const nextX = ghost.x + ghost.velocityX * deltaTime;
        const nextY = ghost.y + ghost.velocityY * deltaTime;

        // Check if next position would hit any boundary (section, header, or footer)
        const nextBoundary = this.checkBoundary(
          nextX,
          nextY,
          checkSectionBoundary
        );

        if (nextBoundary) {
          // Hit a boundary - clamp position and reset velocity more aggressively
          ghost.y = nextBoundary.y;

          // Track boundary hit for target recalculation
          ghost.lastBoundaryHit = nextBoundary;

          // Reset velocity more aggressively to break out of stuck state
          // For frightened ghosts, prefer horizontal escape
          if (ghost.frightened) {
            // Strong horizontal push away from boundary
            const horizontalPush = (Math.random() - 0.5) * speed * 0.8;
            ghost.velocityX = horizontalPush;
            ghost.velocityY = 0; // Clear vertical velocity
          } else {
            // Reverse and significantly reduce velocity
            ghost.velocityY = -ghost.velocityY * 0.3; // More aggressive reduction
            ghost.velocityX = ghost.velocityX * 0.7; // Also reduce horizontal to allow new direction
          }
        } else {
          ghost.x = nextX;
          ghost.y = nextY;
          // Clear boundary tracking if we're no longer at a boundary
          if (ghost.lastBoundaryHit) {
            const currentBoundary = this.checkBoundary(
              ghost.x,
              ghost.y,
              checkSectionBoundary
            );
            if (
              !currentBoundary ||
              currentBoundary.y !== ghost.lastBoundaryHit.y
            ) {
              ghost.lastBoundaryHit = null;
            }
          }
        }

        // Determine direction based on velocity (for sprite)
        const absDx = Math.abs(ghost.velocityX);
        const absDy = Math.abs(ghost.velocityY);

        if (absDx > absDy) {
          ghost.direction = ghost.velocityX > 0 ? "right" : "left";
        } else {
          ghost.direction = ghost.velocityY > 0 ? "down" : "up";
        }

        // Wrap around screen edges
        const margin = 30;
        if (ghost.x < -margin) {
          ghost.x = window.innerWidth + margin;
        } else if (ghost.x > window.innerWidth + margin) {
          ghost.x = -margin;
        }

        // Keep ghosts within playable area (between header and footer)
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

        // Clamp ghost position to playable area and track boundary hits
        const oldY = ghost.y;
        ghost.y = Math.max(minY, Math.min(maxY, ghost.y));

        // If position was clamped, we hit a header/footer boundary
        if (ghost.y !== oldY) {
          if (ghost.y <= minY) {
            ghost.lastBoundaryHit = { type: "header", y: minY };
            // Reset velocity to prevent getting stuck
            if (ghost.frightened) {
              ghost.velocityY = 0;
              ghost.velocityX = (Math.random() - 0.5) * speed * 0.8;
            } else {
              ghost.velocityY = 0;
            }
          } else if (ghost.y >= maxY) {
            ghost.lastBoundaryHit = { type: "footer", y: maxY };
            // Reset velocity to prevent getting stuck
            if (ghost.frightened) {
              ghost.velocityY = 0;
              ghost.velocityX = (Math.random() - 0.5) * speed * 0.8;
            } else {
              ghost.velocityY = 0;
            }
          }
        }

        ghost.element.style.left = `${ghost.x}px`;
        ghost.element.style.top = `${ghost.y}px`;

        // Update ghost sprite animation (alternate between frame 1 and 2 every 10 frames)
        if (this.animationFrame % 10 === 0) {
          ghost.animationFrame = ghost.animationFrame === 1 ? 2 : 1;
        }

        const sprite = ghost.element.querySelector(".ghost-sprite");
        if (sprite) {
          // Add or remove flip class for left direction
          if (ghost.direction === "left") {
            sprite.classList.add("flip-horizontal");
          } else {
            sprite.classList.remove("flip-horizontal");
          }

          if (ghost.eaten) {
            // Show only eyes when eaten
            sprite.src = this.spriteManager.getEyesSprite(ghost.direction);
          } else if (ghost.frightened) {
            // Show frightened sprite (blue or flashing white)
            sprite.src = this.spriteManager.getFrightenedSprite(
              ghost.animationFrame,
              this.powerModeEnding
            );
          } else {
            // Show normal ghost sprite
            sprite.src = this.spriteManager.getGhostSprite(
              ghost.color,
              ghost.direction,
              ghost.animationFrame
            );
          }
        }
      }
    });
  }

  /**
   * Update off-screen ghost indicators
   * Shows arrows at screen edges pointing to ghosts that are off-screen
   */
  updateGhostIndicators() {
    this.indicators.update(this.ghosts);
  }

  /**
   * Get ghost color hex value by color name
   */
  getGhostColor(colorName) {
    return this.indicators.getGhostColor(colorName);
  }

  /**
   * Check for collisions between Pac-Man and ghosts
   * Handles eating ghosts or losing a life
   * @param {function} onEatGhost - Callback when ghost is eaten
   * @param {function} onLoseLife - Callback when Pac-Man loses a life
   * @returns {boolean} - True if a life was lost
   */
  checkGhostCollisions(onEatGhost = null, onLoseLife = null) {
    return this.collision.check(
      this.ghosts,
      this.pacmanPosition,
      this.activeEffects,
      onEatGhost,
      onLoseLife,
      (ghost) => this.respawnGhost(ghost),
      this.ghostRespawnTimers
    );
  }

  /**
   * Respawn ghost at center of screen after being eaten
   */
  respawnGhost(ghost) {
    // Respawn ghost at center of screen
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY;

    ghost.x = viewportWidth / 2;
    ghost.y = scrollY + window.innerHeight / 2;

    ghost.element.style.left = `${ghost.x}px`;
    ghost.element.style.top = `${ghost.y}px`;

    // Reset all ghost states
    ghost.frightened = false;
    ghost.eaten = false;
    ghost.element.classList.remove("frightened", "eaten");

    // Update sprite to normal
    const sprite = ghost.element.querySelector(".ghost-sprite");
    if (sprite) {
      sprite.src = this.spriteManager.getGhostSprite(
        ghost.color,
        ghost.direction,
        ghost.animationFrame
      );
    }
  }

  /**
   * Enter power mode - make all ghosts frightened
   */
  enterPowerMode() {
    this.ghosts.forEach((ghost) => {
      if (!ghost.eaten) {
        ghost.frightened = true;
        ghost.element.classList.add("frightened");

        // Update sprite to frightened
        const sprite = ghost.element.querySelector(".ghost-sprite");
        if (sprite) {
          sprite.src = this.spriteManager.getFrightenedSprite(
            ghost.animationFrame,
            false
          );
        }
      }
    });
  }

  /**
   * Exit power mode - restore normal ghost behavior
   */
  exitPowerMode() {
    this.ghosts.forEach((ghost) => {
      if (!ghost.eaten) {
        ghost.frightened = false;
        ghost.element.classList.remove("frightened");

        // Restore normal ghost sprite
        const sprite = ghost.element.querySelector(".ghost-sprite");
        if (sprite) {
          sprite.src = this.spriteManager.getGhostSprite(
            ghost.color,
            ghost.direction,
            ghost.animationFrame
          );
        }
      }
    });
  }

  /**
   * Freeze all ghosts (for freeze powerup)
   */
  freezeGhosts() {
    this.ghosts.forEach((ghost) => {
      ghost.frozen = true;
    });
  }

  /**
   * Unfreeze all ghosts
   */
  unfreezeGhosts() {
    this.ghosts.forEach((ghost) => {
      ghost.frozen = false;
    });
  }

  /**
   * Clean up all ghosts and indicators
   */
  cleanup() {
    // Clear all ghost respawn timers
    this.ghostRespawnTimers.forEach((timer) => clearTimeout(timer));
    this.ghostRespawnTimers = [];

    this.ghosts.forEach((ghost) => {
      if (ghost.element && ghost.element.parentNode) {
        ghost.element.parentNode.removeChild(ghost.element);
      }
      if (ghost.indicator && ghost.indicator.parentNode) {
        ghost.indicator.parentNode.removeChild(ghost.indicator);
      }
    });
    this.ghosts = [];
  }

  /**
   * Get all ghosts (for external access)
   */
  getGhosts() {
    return this.ghosts;
  }
}
