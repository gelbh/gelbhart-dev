/**
 * Game Lifecycle Mixin
 *
 * Handles game lifecycle events: start, stop, restart, and initialization.
 *
 * @mixin
 */
export class GameLifecycleMixin {
  /**
   * Start the game
   * Initializes game state, generates dots/ghosts, starts game loop
   *
   * @returns {Promise<void>} Resolves when game start sequence completes
   * @throws {Error} If game initialization fails
   */
  async startGame() {
    // Prevent multiple simultaneous start attempts
    if (this.isGameActive || this.isStarting) {
      return;
    }

    // Use a promise-based lock to prevent race conditions
    if (this._startGamePromise) {
      return this._startGamePromise;
    }

    this._startGamePromise = (async () => {
      try {
        this.isStarting = true; // Flag to prevent multiple start attempts
        this.isGameActive = false; // Game is not yet active (waiting for intro music)

        // Disable page scrolling during game
        document.body.style.overflow = "hidden";

        // Hide start hint with fade out
        if (this.hasStartHintTarget) {
          this.startHintTarget.style.transition =
            "opacity 0.3s ease, transform 0.3s ease";
          this.startHintTarget.style.opacity = "0";
          this.startHintTarget.style.transform = "scale(0.9)";
          // Track this timer for cleanup
          if (!this._startHintTimer) {
            this._startHintTimer = setTimeout(() => {
              if (this.hasStartHintTarget) {
                this.startHintTarget.style.display = "none";
              }
              this._startHintTimer = null;
            }, 300);
          }
        }

        // Show game container and page tint
        this.gameContainerTarget.classList.add("active");
        this.hudTarget.classList.add("active");
        if (this.hasPageTintTarget) {
          this.pageTintTarget.classList.add("active");
        }

        // Add class to body to disable footer interactions via CSS
        document.body.classList.add("pacman-game-active");

        // Joystick will appear when user touches screen (no need to show it here)

        // Reset game state
        this.score = 0;
        this.dotsScore = 0;
        this.lives = 3;
        this.extraLifeAwarded = false;
        this.updateHUD();

        // Reset difficulty settings to base speeds
        this.pacmanSpeed = 280; // pixels/second
        this.ghostSpeed = 210; // pixels/second
        this.powerModeDuration = 7000;
        this.powerModeWarningDuration = 2000;

        // Reset section progression
        this.sectionManager.sections.forEach((s) => (s.unlocked = false));
        this.sectionManager.currentSection = 0;
        this.sectionManager.keySpawned = false;
        this.sectionManager.keyCollected = false;
        this.sections = this.sectionManager.sections;
        this.currentSection = this.sectionManager.currentSection;

        // Reset Pac-Man position to initial position
        this.pacmanPosition = { ...this.initialPacmanPosition };
        this.pacmanVelocity = { x: 0, y: 0 };
        this.animationManager.updatePacmanPosition();

        // Clear collected dot positions for fresh start
        this.collectedDotPositions.clear();

        // Initialize locked sections (only when game starts)
        try {
          this.sectionManager.initializeLockedSections();
        } catch (error) {
          console.warn("Error initializing locked sections:", error);
          // Continue even if section initialization fails
        }

        // Setup hover detection (no collisions)
        this.collisionManager.buildCollisionMap();

        // Generate game elements
        this.generateDots();
        this.createGhosts();

        // Smoothly scroll to starting position before beginning
        try {
          const targetScrollY =
            this.initialPacmanPosition.y - window.innerHeight / 2;
          const clampedTargetY = Math.max(
            0,
            Math.min(
              targetScrollY,
              document.documentElement.scrollHeight - window.innerHeight
            )
          );

          // Only scroll if we're not already near the starting position
          if (Math.abs(window.scrollY - clampedTargetY) > 100) {
            await this.animationManager.smoothScrollTo(clampedTargetY, 800);
          }
        } catch (error) {
          console.warn("Error during smooth scroll:", error);
          // Continue even if scroll fails
        }

        // Play beginning sound
        this.audioManager.play("beginning", true);

        // Show countdown while intro music plays
        await this.uiManager.showCountdown();

        // Wait for the beginning sound to finish before starting gameplay
        const beginningAudio = this.audioManager.getAudio("beginning");

        const onBeginningEnded = () => {
          this.isGameActive = true;
          this.isStarting = false;

          // Start game loop
          this.gameLoop();

          // Remove event listener
          try {
            beginningAudio.removeEventListener("ended", onBeginningEnded);
          } catch (e) {
            // Ignore errors if audio element is already removed
          }
          this.introMusicListener = null;

          // Clear timeout to prevent memory leak
          if (this.introMusicTimeout) {
            clearTimeout(this.introMusicTimeout);
            this.introMusicTimeout = null;
          }
        };

        // Store listener for cleanup
        this.introMusicListener = {
          audio: beginningAudio,
          handler: onBeginningEnded,
        };
        beginningAudio.addEventListener("ended", onBeginningEnded);

        // Fallback: Start anyway after 5 seconds if sound doesn't fire ended event
        this.introMusicTimeout = setTimeout(() => {
          if (!this.isGameActive && this.isStarting) {
            try {
              beginningAudio.removeEventListener("ended", onBeginningEnded);
            } catch (e) {
              // Ignore errors if audio element is already removed
            }
            this.isGameActive = true;
            this.isStarting = false;

            this.gameLoop();
            this.introMusicListener = null;
            this.introMusicTimeout = null;
          }
        }, 5000);
      } catch (error) {
        console.error("Error starting game:", error);
        // Reset state on error
        this.isStarting = false;
        this.isGameActive = false;
        throw error;
      } finally {
        this._startGamePromise = null;
      }
    })();

    return this._startGamePromise;
  }

  /**
   * Stop the game and cleanup
   * Cleans up all timers, animations, DOM elements, and event listeners
   *
   * @returns {void}
   */
  stopGame() {
    this.isGameActive = false;
    this.isStarting = false;
    this.wasActiveBeforePause = false; // Reset pause state
    this.wasStartingBeforePause = false; // Reset starting pause state

    // Clean up intro music listener and timeout if they exist
    if (this.introMusicListener) {
      try {
        this.introMusicListener.audio.removeEventListener(
          "ended",
          this.introMusicListener.handler
        );
      } catch (e) {
        // Ignore errors if audio element is already removed
      }
      this.introMusicListener = null;
    }
    if (this.introMusicTimeout) {
      clearTimeout(this.introMusicTimeout);
      this.introMusicTimeout = null;
    }

    // Clear start hint timer
    if (this._startHintTimer) {
      clearTimeout(this._startHintTimer);
      this._startHintTimer = null;
    }

    // Remove countdown overlay if it exists and cancel its timers
    const countdownOverlay = document.querySelector(".pacman-countdown");
    if (countdownOverlay) {
      if (countdownOverlay._cancel) {
        countdownOverlay._cancel();
      } else {
        countdownOverlay.remove();
      }
    }

    this.gameContainerTarget.classList.remove("active");
    this.hudTarget.classList.remove("active");
    if (this.hasPageTintTarget) {
      this.pageTintTarget.classList.remove("active");
    }

    // Remove class from body to re-enable footer interactions
    document.body.classList.remove("pacman-game-active");

    // Hide joystick when game stops (delegated to input controller)
    if (this.hasPacmanInputOutlet) {
      this.pacmanInputOutlet.hideJoystick();
    }

    // Re-enable page scrolling
    document.body.style.overflow = "";

    // Clean up game elements (dots)
    if (this.dots) {
      this.dots.forEach((dot) => {
        try {
          if (dot && dot.element && dot.element.parentNode) {
            dot.element.remove();
          }
        } catch (error) {
          // Ignore errors during cleanup
        }
      });
      this.dots = [];
    }

    // Clean up items
    if (this.items) {
      this.items.forEach((item) => {
        try {
          if (item && item.element && item.element.parentNode) {
            item.element.remove();
          }
        } catch (error) {
          // Ignore errors during cleanup
        }
      });
      this.items = [];
    }

    // Clean up ghosts
    if (this.ghostAI && typeof this.ghostAI.cleanup === "function") {
      try {
        this.ghostAI.cleanup();
      } catch (error) {
        console.warn("Error cleaning up ghosts:", error);
      }
    }
    this.ghosts = [];

    // Clean up section key if exists
    if (
      this.sectionManager &&
      this.sectionManager.key &&
      this.sectionManager.key.element
    ) {
      try {
        this.sectionManager.key.element.remove();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.sectionManager.key = null;
    }

    // Remove all section locks
    if (this.sectionManager) {
      try {
        if (typeof this.sectionManager.removeAllSectionLocks === "function") {
          this.sectionManager.removeAllSectionLocks();
        }
        if (typeof this.sectionManager.cleanup === "function") {
          this.sectionManager.cleanup();
        }
      } catch (error) {
        console.warn("Error cleaning up section manager:", error);
      }
    }

    // Clear hover effects
    if (
      this.collisionManager &&
      typeof this.collisionManager.clearHoverEffects === "function"
    ) {
      try {
        this.collisionManager.clearHoverEffects();
      } catch (error) {
        console.warn("Error clearing hover effects:", error);
      }
    }

    // Clear any active effect timers
    if (this.effectTimers) {
      Object.values(this.effectTimers).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      this.effectTimers = {};
    }

    // Clear power mode timers
    if (this.powerModeTimer) {
      clearTimeout(this.powerModeTimer);
      this.powerModeTimer = null;
    }
    if (this.powerModeEndingTimer) {
      clearTimeout(this.powerModeEndingTimer);
      this.powerModeEndingTimer = null;
    }

    // Cancel game loop animation frame
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }

    // Clean up animation manager (death animation, smooth scroll)
    if (
      this.animationManager &&
      typeof this.animationManager.cleanup === "function"
    ) {
      this.animationManager.cleanup();
    }

    // Clean up item manager (effect timers, cooldown bars, notifications)
    if (this.itemManager && typeof this.itemManager.cleanup === "function") {
      this.itemManager.cleanup();
    }

    // Clear restart timer if exists
    if (this._restartTimer) {
      clearTimeout(this._restartTimer);
      this._restartTimer = null;
    }

    // Reset speed modification tracking
    this.baseSpeedBeforeEffect = null;

    // Stop all sounds
    this.audioManager.stopAll();

    // Show start hint again with fade in
    if (this.hasStartHintTarget) {
      this.startHintTarget.style.display = "flex";
      // Trigger reflow
      this.startHintTarget.offsetHeight;
      this.startHintTarget.style.opacity = "1";
      this.startHintTarget.style.transform = "scale(1)";
    }
  }

  /**
   * Restart the game
   * Stops current game and starts a new one after a short delay
   *
   * @returns {void}
   */
  restartGame() {
    this.stopGame();
    // Clear any existing restart timer
    if (this._restartTimer) {
      clearTimeout(this._restartTimer);
    }
    this._restartTimer = setTimeout(() => {
      this._restartTimer = null;
      this.startGame();
    }, 100);
  }
}
