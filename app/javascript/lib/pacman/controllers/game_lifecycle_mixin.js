/**
 * Game Lifecycle Mixin
 *
 * Handles game lifecycle events: start, stop, restart, and initialization.
 */

export class GameLifecycleMixin {
  /**
   * Start the game
   * Initializes game state, generates dots/ghosts, starts game loop
   */
  async startGame() {
    if (this.isGameActive || this.isStarting) return;

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
      setTimeout(() => {
        this.startHintTarget.style.display = "none";
      }, 300);
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
    this.sectionManager.initializeLockedSections();

    // Setup hover detection (no collisions)
    this.collisionManager.buildCollisionMap();

    // Generate game elements
    this.generateDots();
    this.createGhosts();

    // Smoothly scroll to starting position before beginning
    const targetScrollY = this.initialPacmanPosition.y - window.innerHeight / 2;
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
      beginningAudio.removeEventListener("ended", onBeginningEnded);
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
        beginningAudio.removeEventListener("ended", onBeginningEnded);
        this.isGameActive = true;
        this.isStarting = false;

        this.gameLoop();
        this.introMusicListener = null;
        this.introMusicTimeout = null;
      }
    }, 5000);
  }

  /**
   * Stop the game and cleanup
   */
  stopGame() {
    this.isGameActive = false;
    this.isStarting = false;
    this.wasActiveBeforePause = false; // Reset pause state
    this.wasStartingBeforePause = false; // Reset starting pause state

    // Clean up intro music listener and timeout if they exist
    if (this.introMusicListener) {
      this.introMusicListener.audio.removeEventListener(
        "ended",
        this.introMusicListener.handler
      );
      this.introMusicListener = null;
    }
    if (this.introMusicTimeout) {
      clearTimeout(this.introMusicTimeout);
      this.introMusicTimeout = null;
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

    // Clean up game elements
    this.dots.forEach((dot) => {
      if (dot.element && dot.element.parentNode) {
        dot.element.remove();
      }
    });
    this.dots = [];

    // Clean up items
    this.items.forEach((item) => {
      if (item.element && item.element.parentNode) {
        item.element.remove();
      }
    });
    this.items = [];

    // Clean up ghosts
    this.ghostAI.cleanup();
    this.ghosts = [];

    // Clean up section key if exists
    if (this.sectionManager.key && this.sectionManager.key.element) {
      this.sectionManager.key.element.remove();
      this.sectionManager.key = null;
    }

    // Remove all section locks
    this.sectionManager.removeAllSectionLocks();

    // Clean up section manager timers
    this.sectionManager.cleanup();

    // Clear hover effects
    this.collisionManager.clearHoverEffects();

    // Clear any active effect timers
    Object.values(this.effectTimers).forEach((timer) => clearTimeout(timer));
    this.effectTimers = {};

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
   */
  restartGame() {
    this.stopGame();
    setTimeout(() => {
      this.startGame();
    }, 100);
  }
}
