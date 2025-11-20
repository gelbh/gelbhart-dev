import { Controller } from "@hotwired/stimulus";
import { TouchControlsManager } from "lib/pacman/touch_controls_manager";

/**
 * Pac-Man Input Controller
 *
 * Handles all input for the Pac-Man game:
 * - Keyboard input (arrow keys, WASD)
 * - Touch/joystick controls (mobile)
 * - Menu controls (Escape for menu, M for mute)
 *
 * Uses outlet to communicate with pacman-game controller
 *
 * @extends Controller
 */
export default class extends Controller {
  static outlets = ["pacman-game"];

  connect() {
    // Initialize touch controls manager
    this.touchControlsManager = new TouchControlsManager();

    // Setup keyboard controls
    this.keydownHandler = this.handleKeydown.bind(this);
    document.addEventListener("keydown", this.keydownHandler);

    // Get game controller reference (controllers on same element can access each other)
    this.getGameController();

    // Setup touch controls
    if (this.gameController) {
      this.initializeTouchControls();
    } else {
      // Retry after a short delay if not available yet
      setTimeout(() => {
        this.getGameController();
        if (this.gameController) {
          this.initializeTouchControls();
        }
      }, 100);
    }
  }

  /**
   * Get game controller reference from the same element
   */
  getGameController() {
    // Try outlet first (if available)
    if (this.hasPacmanGameOutlet) {
      this.gameController = this.pacmanGameOutlet;
      return;
    }

    // Fallback: access controller reference stored on element by game controller
    // This is set when game controller connects
    if (this.element && this.element._pacmanGameController) {
      this.gameController = this.element._pacmanGameController;
      return;
    }

    // Last resort: find controller through Stimulus application
    if (this.application && this.element) {
      try {
        // Use getControllerForElementAndIdentifier to find the game controller
        const gameController =
          this.application.getControllerForElementAndIdentifier(
            this.element,
            "pacman-game"
          );
        if (gameController) {
          this.gameController = gameController;
        }
      } catch (e) {
        // Fallback failed, will retry later
      }
    }
  }

  /**
   * Called when pacman-game outlet connects
   */
  pacmanGameOutletConnected() {
    this.getGameController();
    // Initialize touch controls now that outlet is available
    if (this.gameController) {
      this.initializeTouchControls();
    }
  }

  disconnect() {
    document.removeEventListener("keydown", this.keydownHandler);
    if (this.touchControlsManager) {
      this.touchControlsManager.cleanup();
    }
  }

  /**
   * Initialize touch controls (joystick) for mobile devices
   */
  initializeTouchControls() {
    if (!this.gameController) {
      this.getGameController();
      if (!this.gameController) return;
    }

    // Initialize with callbacks
    this.touchControlsManager.initialize(
      (normalizedX, normalizedY, velocity, direction) =>
        this.handleMovement(normalizedX, normalizedY, velocity, direction),
      () => this.getGameState(),
      () => this.requestGameStart()
    );
  }

  /**
   * Get game state from game controller
   * @returns {Object} Game state {isGameActive, isStarting, isDying}
   */
  getGameState() {
    if (!this.gameController) {
      this.getGameController();
      if (!this.gameController) {
        return { isGameActive: false, isStarting: false, isDying: false };
      }
    }
    return this.gameController.getGameState();
  }

  /**
   * Request game start from game controller
   */
  requestGameStart() {
    if (!this.gameController) {
      this.getGameController();
    }
    if (this.gameController) {
      this.gameController.requestStart();
    }
  }

  /**
   * Handle movement from input sources
   * @param {number} normalizedX - Normalized X direction (-1 to 1)
   * @param {number} normalizedY - Normalized Y direction (-1 to 1)
   * @param {Object} velocity - Velocity object {x, y}
   * @param {string} direction - Direction string ("up", "down", "left", "right")
   */
  handleMovement(normalizedX, normalizedY, velocity, direction) {
    if (!this.gameController) {
      this.getGameController();
      if (!this.gameController) return;
    }

    const gameState = this.getGameState();

    // Prevent movement during intro music or death
    if (gameState.isStarting || !gameState.isGameActive || gameState.isDying) {
      return;
    }

    // Apply movement to game controller
    this.gameController.handleMovement(velocity, direction);
  }

  /**
   * Handle keyboard input for movement and controls
   */
  handleKeydown(event) {
    // Ensure game controller reference is available
    if (!this.gameController) {
      this.getGameController();
    }

    // Handle mute toggle (M key) - delegate to game controller
    if (event.key === "m" || event.key === "M") {
      if (!this.gameController) return;
      const gameState = this.getGameState();
      if (gameState.isGameActive || gameState.isStarting) {
        this.gameController.toggleMute();
        event.preventDefault();
        return;
      }
    }

    // Handle menu (Escape key) - delegate to game controller
    if (event.key === "Escape") {
      if (!this.gameController) return;
      const gameState = this.getGameState();
      if (gameState.isGameActive || gameState.isStarting) {
        // Check if menu modal is already open
        if (!document.querySelector(".pacman-menu-modal")) {
          this.gameController.showMenu();
          event.preventDefault();
        }
        return;
      }
    }

    // Auto-start game on first movement key press
    const movementKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "W",
      "a",
      "A",
      "s",
      "S",
      "d",
      "D",
    ];

    if (movementKeys.includes(event.key)) {
      // Ensure game controller is available
      if (!this.gameController) {
        this.getGameController();
        // If still not available, try one more time in next frame
        if (!this.gameController) {
          requestAnimationFrame(() => {
            this.getGameController();
            if (
              this.gameController &&
              !this.getGameState().isGameActive &&
              !this.getGameState().isStarting
            ) {
              this.gameController.requestStart();
            }
          });
          event.preventDefault();
          return;
        }
      }

      const gameState = this.getGameState();
      if (!gameState.isGameActive && !gameState.isStarting) {
        this.gameController.requestStart();
        // Don't process movement yet - wait for intro music
        event.preventDefault();
        return;
      }

      // Prevent movement during intro music or death
      if (
        gameState.isStarting ||
        !gameState.isGameActive ||
        gameState.isDying
      ) {
        if (movementKeys.includes(event.key)) {
          event.preventDefault();
        }
        return;
      }

      // Immediately apply movement for responsive controls
      let velocity = { x: 0, y: 0 };
      let direction = null;

      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          direction = "up";
          velocity = { x: 0, y: -1 }; // Normalized, game controller will apply speed
          break;
        case "ArrowDown":
        case "s":
        case "S":
          direction = "down";
          velocity = { x: 0, y: 1 };
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          direction = "left";
          velocity = { x: -1, y: 0 };
          break;
        case "ArrowRight":
        case "d":
        case "D":
          direction = "right";
          velocity = { x: 1, y: 0 };
          break;
      }

      if (direction && this.gameController) {
        this.gameController.handleMovement(velocity, direction);
        event.preventDefault();
      }
    }
  }

  /**
   * Ensure touch controls are still working (called after DOM changes)
   */
  ensureTouchControls() {
    if (this.touchControlsManager) {
      this.touchControlsManager.ensureTouchControls();
    }
  }

  /**
   * Hide joystick when game stops
   */
  hideJoystick() {
    if (this.touchControlsManager) {
      this.touchControlsManager.hide();
    }
  }
}
