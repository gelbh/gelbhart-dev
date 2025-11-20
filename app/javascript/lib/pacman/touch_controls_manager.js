/**
 * TouchControlsManager - Handles touch/joystick controls for mobile devices
 *
 * Manages:
 * - Joystick UI creation and positioning
 * - Pointer event handling
 * - Joystick movement calculation
 * - Normalized direction output
 */
export class TouchControlsManager {
  constructor() {
    this.dpadElement = null;
    this.joystickBase = null;
    this.joystickStick = null;
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickRadius = 0;
    this.isJoystickActive = false;
    this.activePointerId = null;
    this.joystickInitialTouch = null;
    this.joystickHandlers = null;
    this.onMovementCallback = null;
    this.checkGameStateCallback = null;
    this.requestStartCallback = null;
  }

  /**
   * Initialize touch controls (joystick) for mobile devices
   * @param {Function} onMovement - Callback function called with (normalizedX, normalizedY, velocity, direction)
   * @param {Function} checkGameState - Callback to check game state, returns {isGameActive, isStarting, isDying}
   * @param {Function} requestStart - Callback to request game start
   */
  initialize(onMovement, checkGameState, requestStart) {
    this.onMovementCallback = onMovement;
    this.checkGameStateCallback = checkGameState;
    this.requestStartCallback = requestStart;
    // Check if device supports touch
    const isTouchDevice = window.matchMedia("(any-pointer: coarse)").matches;
    if (!isTouchDevice) return;

    // Create joystick if it doesn't exist
    this.createDpad();

    // Setup pointer event handlers for joystick
    this.setupDpadHandlers();
  }

  /**
   * Reinitialize touch controls if they're missing (called after section unlocks)
   */
  ensureTouchControls() {
    const isTouchDevice = window.matchMedia("(any-pointer: coarse)").matches;
    if (!isTouchDevice) return;

    // Check if joystick exists and handlers are set up
    const joystickExists = document.getElementById("pacman-joystick");
    const handlersExist =
      this.joystickHandlers !== null && this.joystickHandlers !== undefined;

    if (!joystickExists || !handlersExist) {
      // Reinitialize if missing (callbacks should already be stored)
      this.initialize(
        this.onMovementCallback,
        this.checkGameStateCallback,
        this.requestStartCallback
      );
    } else {
      // Just verify references are still valid
      this.dpadElement = document.getElementById("pacman-joystick");
      if (this.dpadElement) {
        this.joystickBase = this.dpadElement.querySelector(".joystick-base");
        this.joystickStick = this.dpadElement.querySelector(".joystick-stick");
      }
    }
  }

  /**
   * Create joystick UI element
   */
  createDpad() {
    // Remove existing joystick if it exists (to recreate fresh)
    const existing = document.getElementById("pacman-joystick");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const joystick = document.createElement("div");
    joystick.id = "pacman-joystick";
    joystick.className = "pacman-joystick";
    joystick.innerHTML = `
      <div class="joystick-base" aria-label="Joystick control">
        <div class="joystick-stick"></div>
      </div>
    `;

    // Append to body to ensure position: fixed works correctly
    // and to avoid clipping issues with game container
    document.body.appendChild(joystick);

    this.dpadElement = joystick;
    this.joystickBase = joystick.querySelector(".joystick-base");
    this.joystickStick = joystick.querySelector(".joystick-stick");
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickRadius = 0;
    this.isJoystickActive = false;
    this.activePointerId = null;
    this.joystickInitialTouch = null;
  }

  /**
   * Setup pointer event handlers for joystick
   * Joystick appears wherever user touches on the screen
   */
  setupDpadHandlers() {
    // Ensure joystick elements exist, recreate if needed
    if (!this.dpadElement || !document.getElementById("pacman-joystick")) {
      this.createDpad();
    }

    // Re-get references in case they were lost
    this.dpadElement = document.getElementById("pacman-joystick");
    if (!this.dpadElement) return;

    this.joystickBase = this.dpadElement.querySelector(".joystick-base");
    this.joystickStick = this.dpadElement.querySelector(".joystick-stick");

    if (!this.joystickBase || !this.joystickStick) return;

    // Remove any existing handlers to prevent duplicates
    if (this.joystickHandlers) {
      this.cleanup();
    }

    const isInteractiveElement = (target) => {
      // Only block touches on game UI elements, allow touches on general page elements
      return (
        target.closest(".pacman-hud") ||
        target.closest(".pacman-menu-modal") ||
        target.closest(".pacman-modal") ||
        (target.closest(".modal") && target.closest(".pacman-game-container"))
      );
    };

    const getJoystickRadius = () => {
      const rect = this.joystickBase.getBoundingClientRect();
      return rect.width / 2 - 35;
    };

    const handleStart = (e) => {
      // Only handle on touch devices
      const isTouchDevice = window.matchMedia("(any-pointer: coarse)").matches;
      if (!isTouchDevice) return;

      // Ensure joystick elements are still valid
      if (!this.dpadElement || !this.joystickBase || !this.joystickStick) {
        // Recreate if missing
        this.createDpad();
        this.joystickBase = this.dpadElement?.querySelector(".joystick-base");
        this.joystickStick = this.dpadElement?.querySelector(".joystick-stick");
        if (!this.joystickBase || !this.joystickStick) return;
      }

      // Check game state via callback
      if (this.checkGameStateCallback) {
        const gameState = this.checkGameStateCallback();
        if (!gameState.isGameActive && !gameState.isStarting) return;
      }

      // Don't create joystick if touching interactive elements
      if (isInteractiveElement(e.target)) return;

      // Only handle one pointer at a time
      if (this.isJoystickActive && this.activePointerId !== e.pointerId) {
        return;
      }

      // Get touch coordinates
      let clientX, clientY;
      if (e instanceof TouchEvent && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e instanceof PointerEvent || e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return;
      }

      this.joystickInitialTouch = { x: clientX, y: clientY };
      this.joystickCenter = { x: clientX, y: clientY };
      this.joystickRadius = getJoystickRadius();

      this.dpadElement.style.left = `${clientX}px`;
      this.dpadElement.style.top = `${clientY}px`;
      this.dpadElement.classList.add("active");

      e.preventDefault();
      this.isJoystickActive = true;
      this.activePointerId = e.pointerId;
      this.joystickStick.classList.add("active");

      this.handleJoystickMove(e);
    };

    const handleMove = (e) => {
      if (!this.isJoystickActive || this.activePointerId !== e.pointerId) {
        return;
      }

      if (!this.joystickStick || !this.joystickBase) {
        this.dpadElement = document.getElementById("pacman-joystick");
        if (this.dpadElement) {
          this.joystickBase = this.dpadElement.querySelector(".joystick-base");
          this.joystickStick =
            this.dpadElement.querySelector(".joystick-stick");
        }
        if (!this.joystickStick || !this.joystickBase) {
          handleEnd(e);
          return;
        }
      }

      e.preventDefault();
      this.handleJoystickMove(e);
    };

    const handleEnd = (e) => {
      if (!this.isJoystickActive || this.activePointerId !== e.pointerId) {
        return;
      }

      e.preventDefault();
      this.isJoystickActive = false;
      this.activePointerId = null;
      this.joystickStick.classList.remove("active");
      this.dpadElement.classList.remove("active");
      this.joystickInitialTouch = null;

      this.joystickStick.style.transform = "translate(-50%, -50%)";

      // Notify movement stop
      if (this.onMovementCallback) {
        this.onMovementCallback(0, 0, { x: 0, y: 0 }, null);
      }
    };

    // Use Pointer Events API (modern approach)
    if (window.PointerEvent) {
      document.addEventListener("pointerdown", handleStart, {
        passive: false,
      });
      document.addEventListener("pointermove", handleMove, { passive: false });
      document.addEventListener("pointerup", handleEnd, { passive: false });
      document.addEventListener("pointercancel", handleEnd, { passive: false });
    } else {
      // Fallback for older browsers
      document.addEventListener("mousedown", handleStart);
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);

      if ("ontouchstart" in window) {
        document.addEventListener("touchstart", handleStart, {
          passive: false,
        });
        document.addEventListener("touchmove", handleMove, { passive: false });
        document.addEventListener("touchend", handleEnd, { passive: false });
        document.addEventListener("touchcancel", handleEnd, { passive: false });
      }
    }

    // Store handlers for cleanup
    this.joystickHandlers = {
      handleStart,
      handleMove,
      handleEnd,
    };
  }

  /**
   * Handle joystick movement
   * @param {Event} e - Pointer or touch event
   */
  handleJoystickMove(e) {
    if (!this.isJoystickActive || !this.joystickCenter) return;

    // Ensure joystick elements are still valid
    if (!this.joystickStick || !this.joystickBase) {
      // Recreate if missing
      this.createDpad();
      this.joystickBase = this.dpadElement?.querySelector(".joystick-base");
      this.joystickStick = this.dpadElement?.querySelector(".joystick-stick");
      if (!this.joystickBase || !this.joystickStick) return;
    }

    let clientX, clientY;
    if (e instanceof TouchEvent && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e instanceof PointerEvent || e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    // Recalculate radius in case of resize (but center stays at initial touch)
    this.joystickRadius = this.joystickBase
      ? this.joystickBase.getBoundingClientRect().width / 2 - 35
      : 55;

    // Calculate offset from center (using viewport coordinates)
    const deltaX = clientX - this.joystickCenter.x;
    const deltaY = clientY - this.joystickCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Clamp to joystick radius
    const clampedDistance = Math.min(distance, this.joystickRadius);
    const angle = Math.atan2(deltaY, deltaX);

    // Calculate stick position
    const stickX = Math.cos(angle) * clampedDistance;
    const stickY = Math.sin(angle) * clampedDistance;

    // Update stick visual position
    this.joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

    // Calculate normalized direction (-1 to 1)
    const normalizedX = clampedDistance > 0 ? stickX / this.joystickRadius : 0;
    const normalizedY = clampedDistance > 0 ? stickY / this.joystickRadius : 0;

    // Apply movement based on joystick position
    this.applyJoystickMovement(normalizedX, normalizedY);
  }

  /**
   * Apply movement based on joystick input
   * @param {number} normalizedX - Normalized X direction (-1 to 1)
   * @param {number} normalizedY - Normalized Y direction (-1 to 1)
   */
  applyJoystickMovement(normalizedX, normalizedY) {
    // Check game state via callback if available
    let gameState = { isGameActive: false, isStarting: false, isDying: false };
    if (this.checkGameStateCallback) {
      gameState = this.checkGameStateCallback();
    }

    // Auto-start game on first movement
    if (
      !gameState.isGameActive &&
      !gameState.isStarting &&
      (Math.abs(normalizedX) > 0.1 || Math.abs(normalizedY) > 0.1)
    ) {
      if (this.requestStartCallback) {
        this.requestStartCallback();
      }
      // Wait a moment for game to start
      setTimeout(() => {
        this.applyJoystickMovement(normalizedX, normalizedY);
      }, 100);
      return;
    }

    // Prevent movement during intro music or death
    if (gameState.isStarting || !gameState.isGameActive || gameState.isDying) {
      return;
    }

    // Dead zone - ignore very small movements
    const deadZone = 0.15;
    if (Math.abs(normalizedX) < deadZone && Math.abs(normalizedY) < deadZone) {
      if (this.onMovementCallback) {
        this.onMovementCallback(0, 0, { x: 0, y: 0 }, null);
      }
      return;
    }

    // Calculate velocity based on joystick position and game speed
    // Use the larger component to determine primary direction
    const absX = Math.abs(normalizedX);
    const absY = Math.abs(normalizedY);

    let velocity, direction;
    if (absX > absY) {
      // Horizontal movement
      direction = normalizedX > 0 ? "right" : "left";
      velocity = { x: normalizedX, y: 0 };
    } else {
      // Vertical movement
      direction = normalizedY > 0 ? "down" : "up";
      velocity = { x: 0, y: normalizedY };
    }

    // Call movement callback with normalized values (controller will apply speed)
    if (this.onMovementCallback) {
      this.onMovementCallback(normalizedX, normalizedY, velocity, direction);
    }
  }

  /**
   * Hide joystick when game stops
   */
  hide() {
    if (this.dpadElement) {
      this.dpadElement.classList.remove("active");
      this.isJoystickActive = false;
      this.activePointerId = null;
      if (this.joystickStick) {
        this.joystickStick.classList.remove("active");
        this.joystickStick.style.transform = "translate(-50%, -50%)";
      }
    }
  }

  /**
   * Cleanup touch controls
   */
  cleanup() {
    // Remove event listeners
    if (this.joystickHandlers) {
      const { handleStart, handleMove, handleEnd } = this.joystickHandlers;

      if (window.PointerEvent) {
        document.removeEventListener("pointerdown", handleStart);
        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleEnd);
        document.removeEventListener("pointercancel", handleEnd);
      } else {
        document.removeEventListener("mousedown", handleStart);
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);

        if ("ontouchstart" in window) {
          document.removeEventListener("touchstart", handleStart);
          document.removeEventListener("touchmove", handleMove);
          document.removeEventListener("touchend", handleEnd);
          document.removeEventListener("touchcancel", handleEnd);
        }
      }

      this.joystickHandlers = null;
    }

    if (this.dpadElement && this.dpadElement.parentNode) {
      this.dpadElement.parentNode.removeChild(this.dpadElement);
    }
    this.dpadElement = null;
    this.joystickBase = null;
    this.joystickStick = null;
    this.isJoystickActive = false;
    this.activePointerId = null;
    this.joystickInitialTouch = null;
  }
}
