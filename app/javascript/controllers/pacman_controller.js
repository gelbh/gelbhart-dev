import { Controller } from "@hotwired/stimulus";
import { AudioManager } from "lib/pacman/audio_manager";
import { SpriteManager } from "lib/pacman/sprite_manager";
import { CollisionManager } from "lib/pacman/collision_manager";
import { GhostAI } from "lib/pacman/ghost_ai";
import { ItemManager } from "lib/pacman/item_manager";
import { SectionManager } from "lib/pacman/section_manager";
import { UIManager } from "lib/pacman/ui_manager";
import { AnimationManager } from "lib/pacman/animation_manager";

/**
 * Pac-Man Game Controller
 *
 * A fully functional Pac-Man game that plays across the entire webpage.
 * Features authentic arcade AI, smooth scrolling, and responsive gameplay.
 *
 * Key Features:
 * - 4 ghosts with unique AI personalities (Blinky, Pinky, Inky, Clyde)
 * - Scatter/Chase mode switching (5s scatter, 25s chase)
 * - Power pellets for temporary ghost-eating ability
 * - Smooth auto-scrolling to keep Pac-Man centered
 * - Respawn system with countdown
 * - Game over modal with restart functionality
 *
 * @extends Controller
 */
export default class extends Controller {
  static targets = [
    "gameContainer",
    "pacman",
    "hud",
    "score",
    "lives",
    "startHint",
    "progressItem",
    "progressLabel",
    "progressValue",
    "pageTint",
    "mutedIndicator",
  ];
  static values = { assetManifest: Object };

  /**
   * Initialize game state and setup
   */
  connect() {
    // Store asset manifest for production asset paths
    this.assetPaths = this.hasAssetManifestValue ? this.assetManifestValue : {};

    // Game state
    this.isGameActive = false;
    this.isStarting = false; // Flag to track if game is in starting phase (waiting for intro music)
    this.wasActiveBeforePause = false; // Track game state before menu was opened
    this.wasStartingBeforePause = false; // Track if game was starting before menu was opened
    this.score = 0;
    this.dotsScore = 0; // Score from dots only (for section unlocking)
    this.lives = 3;
    this.extraLifeAwarded = false; // Track if extra life at 10,000 has been awarded
    this.powerMode = false;
    this.powerModeEnding = false;
    this.dots = [];
    this.ghosts = [];
    this.items = []; // Special powerup items
    this.regeneratingDots = false; // Flag to prevent win condition during dot regeneration

    // Active powerup effects
    this.activeEffects = {
      speedBoost: false,
      slowDown: false,
      shield: false,
      freeze: false,
      doublePoints: false,
    };
    this.effectTimers = {};

    // Track collected dot positions globally (persists across section unlocks)
    this.collectedDotPositions = new Set();

    // Pac-Man position and movement
    this.pacmanPosition = { x: 0, y: 0 };
    this.initialPacmanPosition = { x: 0, y: 0 }; // Stored for respawn
    this.pacmanVelocity = { x: 0, y: 0 };
    this.pacmanDirection = "right";
    this.pacmanNextDirection = null;

    // Speed settings (pixels per second for delta-time based movement)
    // Increased from original arcade (1.9 px/frame = 114 px/s) for snappier web gameplay
    // Speed increases by 15% per section unlocked for progressive difficulty
    this.pacmanSpeed = 280; // pixels/second (base speed)
    this.ghostSpeed = 210; // pixels/second (base speed)

    // Delta time tracking for frame-rate independent movement
    this.lastFrameTime = null;

    // Power mode durations (will be reduced as difficulty increases)
    this.powerModeDuration = 7000; // 7 seconds base
    this.powerModeWarningDuration = 2000; // 2 seconds warning

    // Animation and death state
    this.isDying = false;
    this.deathAnimationFrame = 0;

    // Track intro music event listener for cleanup
    this.introMusicListener = null;
    this.introMusicTimeout = null;
    this.lastScrollUpdate = 0;

    // Animation frame counters
    this.animationFrame = 0;
    this.animationTimer = 0; // Time-based animation timer (seconds)
    this.pacmanAnimationState = 0;

    // Initialize managers
    this.audioManager = new AudioManager(this.assetPaths);
    this.audioManager.initialize();

    // Initialize audio controls UI with saved preferences
    this.initializeAudioControls();

    this.spriteManager = new SpriteManager(this.assetPaths);
    this.spriteManager.preload();

    this.collisionManager = new CollisionManager();
    this.collisionManager.buildCollisionMap();

    this.ghostAI = new GhostAI({
      spriteManager: this.spriteManager,
      audioManager: this.audioManager,
      gameContainer: this.gameContainerTarget,
    });

    this.itemManager = new ItemManager(this);

    this.sectionManager = new SectionManager(this);
    // Expose sections to controller for compatibility
    this.sections = this.sectionManager.sections;
    this.currentSection = this.sectionManager.currentSection;

    this.uiManager = new UIManager(
      {
        hud: this.hudTarget,
        score: this.scoreTarget,
        lives: this.livesTarget,
        progressItem: this.progressItemTarget,
        progressLabel: this.progressLabelTarget,
        progressValue: this.progressValueTarget,
      },
      this.assetPaths
    );

    this.animationManager = new AnimationManager(this);

    // Setup keyboard controls
    this.keydownHandler = this.handleKeydown.bind(this);
    document.addEventListener("keydown", this.keydownHandler);

    // Setup touch controls for mobile devices
    this.initializeTouchControls();

    // Position Pac-Man at the starting hint location
    this.initializePacmanPosition();

    // Don't initialize locks here - wait until game starts
  }

  /**
   * Cleanup when controller disconnects
   */
  disconnect() {
    this.stopGame();
    this.audioManager.stopAll();
    document.removeEventListener("keydown", this.keydownHandler);
    this.cleanupTouchControls();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Position Pac-Man at the starting hint location
   */
  initializePacmanPosition() {
    if (this.hasStartHintTarget) {
      const hintRect = this.startHintTarget.getBoundingClientRect();

      // Position Pac-Man at the hint's center (in document coordinates)
      this.pacmanPosition.x = hintRect.left + hintRect.width / 2;
      this.pacmanPosition.y =
        hintRect.top + window.scrollY + hintRect.height / 2;

      // Store initial position for respawn
      this.initialPacmanPosition = { ...this.pacmanPosition };

      // Set initial Pac-Man position
      this.animationManager.updatePacmanPosition();
    }
  }

  // ============================================
  // KEYBOARD CONTROLS
  // ============================================

  /**
   * Handle keyboard input for movement and controls
   */
  handleKeydown(event) {
    // Handle mute toggle (M key)
    if (
      (event.key === "m" || event.key === "M") &&
      (this.isGameActive || this.isStarting)
    ) {
      this.toggleMute();
      event.preventDefault();
      return;
    }

    // Handle menu (Escape key)
    if (event.key === "Escape") {
      if (this.isGameActive || this.isStarting) {
        // Check if menu modal is already open
        if (!document.querySelector(".pacman-menu-modal")) {
          this.showMenu();
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

    if (
      movementKeys.includes(event.key) &&
      !this.isGameActive &&
      !this.isStarting
    ) {
      this.startGame();
      // Don't process movement yet - wait for intro music
      event.preventDefault();
      return;
    }

    // Prevent movement during intro music or death
    if (this.isStarting || !this.isGameActive || this.isDying) {
      if (movementKeys.includes(event.key)) {
        event.preventDefault();
      }
      return;
    }

    // Immediately apply movement for responsive controls
    switch (event.key) {
      case "ArrowUp":
      case "w":
      case "W":
        this.pacmanVelocity = { x: 0, y: -this.pacmanSpeed };
        this.pacmanDirection = "up";
        event.preventDefault();
        break;
      case "ArrowDown":
      case "s":
      case "S":
        this.pacmanVelocity = { x: 0, y: this.pacmanSpeed };
        this.pacmanDirection = "down";
        event.preventDefault();
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        this.pacmanVelocity = { x: -this.pacmanSpeed, y: 0 };
        this.pacmanDirection = "left";
        event.preventDefault();
        break;
      case "ArrowRight":
      case "d":
      case "D":
        this.pacmanVelocity = { x: this.pacmanSpeed, y: 0 };
        this.pacmanDirection = "right";
        event.preventDefault();
        break;
    }
  }

  // ============================================
  // TOUCH CONTROLS (D-PAD)
  // ============================================

  /**
   * Initialize touch controls (joystick) for mobile devices
   */
  initializeTouchControls() {
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
      // Reinitialize if missing
      this.initializeTouchControls();
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

    this.dpadElement = joystick; // Keep same property name for compatibility
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
      this.cleanupTouchControls();
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

      if (!this.isGameActive && !this.isStarting) return;

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
      this.pacmanVelocity = { x: 0, y: 0 };
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
    // Auto-start game on first movement
    if (
      !this.isGameActive &&
      !this.isStarting &&
      (Math.abs(normalizedX) > 0.1 || Math.abs(normalizedY) > 0.1)
    ) {
      this.startGame();
      // Wait a moment for game to start
      setTimeout(() => {
        this.applyJoystickMovement(normalizedX, normalizedY);
      }, 100);
      return;
    }

    // Prevent movement during intro music or death
    if (this.isStarting || !this.isGameActive || this.isDying) {
      return;
    }

    // Dead zone - ignore very small movements
    const deadZone = 0.15;
    if (Math.abs(normalizedX) < deadZone && Math.abs(normalizedY) < deadZone) {
      this.pacmanVelocity = { x: 0, y: 0 };
      return;
    }

    // Calculate velocity based on joystick position
    // Use the larger component to determine primary direction
    const absX = Math.abs(normalizedX);
    const absY = Math.abs(normalizedY);

    if (absX > absY) {
      // Horizontal movement
      this.pacmanVelocity = {
        x: normalizedX * this.pacmanSpeed,
        y: 0,
      };
      this.pacmanDirection = normalizedX > 0 ? "right" : "left";
    } else {
      // Vertical movement
      this.pacmanVelocity = {
        x: 0,
        y: normalizedY * this.pacmanSpeed,
      };
      this.pacmanDirection = normalizedY > 0 ? "down" : "up";
    }
  }

  /**
   * Cleanup touch controls
   */
  cleanupTouchControls() {
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

  // ============================================
  // GAME LIFECYCLE (Start/Stop)
  // ============================================

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

    // Hide joystick when game stops
    if (this.dpadElement) {
      this.dpadElement.classList.remove("active");
      this.isJoystickActive = false;
      this.activePointerId = null;
      if (this.joystickStick) {
        this.joystickStick.classList.remove("active");
        this.joystickStick.style.transform = "translate(-50%, -50%)";
      }
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

  // ============================================
  // GAME LOOP
  // ============================================

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

  // ============================================
  // GAME ELEMENTS (Dots, Ghosts, Items)
  // ============================================

  /**
   * Generate dots across the playable area
   */
  generateDots() {
    this.itemManager.generateDots();
    // Reinitialize ghost AI dot counts cache after regeneration
    this.ghostAI.initializeDotCounts();
    // Ensure joystick controls are still working after DOM changes
    this.ensureTouchControls();
  }

  /**
   * Create all 4 ghosts with unique AI personalities
   */
  createGhosts() {
    this.ghostAI.createGhosts();
    this.ghosts = this.ghostAI.getGhosts();
  }

  /**
   * Get asset path for production/development
   */
  getAssetPath(filename) {
    return this.spriteManager.getAssetPath(filename);
  }

  // ============================================
  // COLLISION CALLBACKS
  // ============================================

  /**
   * Called when a ghost is eaten
   */
  onGhostEaten(ghost) {
    // Award points for eating ghost (200, 400, 800, 1600, 3200, 6400)
    // Cap exponent at 5 to prevent integer overflow (max 6400 points per ghost)
    const exponent = Math.min(this.ghostsEatenThisPowerMode || 0, 5);
    const baseGhostPoints = 200 * Math.pow(2, exponent);
    const ghostPoints =
      baseGhostPoints * (this.activeEffects.doublePoints ? 2 : 1);
    this.score += ghostPoints;
    this.ghostsEatenThisPowerMode = (this.ghostsEatenThisPowerMode || 0) + 1;
    this.updateHUD();
  }

  /**
   * Check if all sections unlocked and all dots collected
   */
  checkWinCondition() {
    // Don't check win condition during dot regeneration
    if (this.regeneratingDots) return;

    const allSectionsUnlocked = this.sections.every((s) => s.unlocked);
    const allDotsCollected =
      this.dots.length > 0 && this.dots.every((d) => d.collected);

    if (allSectionsUnlocked && allDotsCollected) {
      this.winGame();
    }
  }

  /**
   * Check if score reached a section threshold
   */
  checkSectionThreshold() {
    this.sectionManager.checkSectionThreshold();
    // Sync section state back to controller
    this.sections = this.sectionManager.sections;
    this.currentSection = this.sectionManager.currentSection;
  }

  // ============================================
  // LIFE SYSTEM
  // ============================================

  /**
   * Lose a life and respawn or game over
   */
  async loseLife() {
    if (this.isDying) return; // Prevent multiple death triggers

    this.isDying = true;
    this.lives--;

    // Stop all sounds except death sound
    this.audioManager.stopAll();
    this.audioManager.play("death", true);

    // Reset power mode and clear timers
    this.powerMode = false;
    this.powerModeEnding = false;
    this.pacmanTarget.classList.remove("powered");
    this.ghostsEatenThisPowerMode = 0;

    // Clear power mode timers to prevent them firing after death
    if (this.powerModeTimer) {
      clearTimeout(this.powerModeTimer);
      this.powerModeTimer = null;
    }
    if (this.powerModeEndingTimer) {
      clearTimeout(this.powerModeEndingTimer);
      this.powerModeEndingTimer = null;
    }

    // Play death animation
    await this.animationManager.playDeathAnimation();

    // Update HUD
    this.updateHUD();

    if (this.lives <= 0) {
      // Game over
      this.gameOver();
    } else {
      // Respawn

      // Show countdown
      await this.uiManager.showCountdown();

      // Reset positions
      this.animationManager.resetPositions();

      // Exit all ghost modes
      this.ghostAI.exitPowerMode();
      this.ghosts.forEach((ghost) => {
        ghost.frightened = false;
        ghost.frozen = false;
        ghost.element.classList.remove("frightened", "frozen");
      });

      // Reset state
      this.isDying = false;
      this.lastFrameTime = null; // Reset frame time to prevent huge delta
    }
  }

  /**
   * Game over - player lost
   */
  async gameOver() {
    this.isGameActive = false;
    this.isDying = false;

    // Handle score submission
    await this.handleGameEnd(false);
  }

  /**
   * Win game - player cleared all dots
   */
  async winGame() {
    this.isGameActive = false;

    // Handle score submission (celebration sound played in handleGameEnd)
    await this.handleGameEnd(true);
  }

  /**
   * Handle game end - prompt for name if needed, submit score, show modal
   */
  async handleGameEnd(isWin) {
    // Hide game visuals (but keep game state for potential restart)
    this.gameContainerTarget.classList.remove("active");
    this.hudTarget.classList.remove("active");
    if (this.hasPageTintTarget) {
      this.pageTintTarget.classList.remove("active");
    }

    // Stop all sounds
    this.audioManager.stopAll();

    // Play celebration sound if win
    if (isWin) {
      this.audioManager.play("intermission", true);
    }

    // Check if player name exists
    let playerName = this.getPlayerName();

    // If no player name, prompt for it
    if (!playerName) {
      playerName = await this.uiManager.showPlayerNamePrompt();
      this.savePlayerName(playerName);
    }

    // Submit score to leaderboard
    await this.submitScore(playerName, this.score, isWin);

    // Show game over modal with leaderboard option
    this.uiManager.showGameOverModal(isWin, this.score, {
      onRestart: () => this.restartGame(),
      onQuit: () => this.stopGame(),
      onViewLeaderboard: () => this.showLeaderboardFromGameEnd(),
    });
  }

  /**
   * Show leaderboard after game ends (calls stopGame when closed)
   */
  async showLeaderboardFromGameEnd() {
    const data = await this.fetchLeaderboardData();
    this.uiManager.showLeaderboardModal(data, () => {
      this.stopGame();
    });
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

  // ============================================
  // HUD & UI
  // ============================================

  /**
   * Update HUD with current score, lives, and progress
   */
  updateHUD() {
    this.uiManager.updateHUD(
      {
        score: this.score,
        lives: this.lives,
        dotsScore: this.dotsScore,
        sections: this.sections,
        currentSection: this.currentSection,
        extraLifeAwarded: this.extraLifeAwarded,
      },
      {
        onExtraLife: () => {
          this.lives++;
          this.extraLifeAwarded = true;
          this.audioManager.play("extraPac", true);
          this.updateHUD();
        },
      }
    );
  }

  // ============================================
  // HELPER METHODS (for ItemManager compatibility)
  // ============================================

  /**
   * Play sound (delegated to AudioManager)
   */
  playSound(soundName, restart = false) {
    this.audioManager.play(soundName, restart);
  }

  /**
   * Get frightened sprite (delegated to SpriteManager)
   */
  getFrightenedSprite(frame) {
    return this.spriteManager.getFrightenedSprite(frame, this.powerModeEnding);
  }

  /**
   * Get ghost sprite (delegated to SpriteManager)
   */
  getGhostSprite(color, direction, frame) {
    return this.spriteManager.getGhostSprite(color, direction, frame);
  }

  // ============================================
  // LEADERBOARD METHODS
  // ============================================

  /**
   * Get player name from localStorage
   */
  getPlayerName() {
    try {
      return localStorage.getItem("pacman_player_name");
    } catch (e) {
      console.error("Error reading player name from localStorage:", e);
      return null;
    }
  }

  /**
   * Save player name to localStorage
   */
  savePlayerName(name) {
    try {
      localStorage.setItem("pacman_player_name", name);
    } catch (e) {
      console.error("Error saving player name to localStorage:", e);
    }
  }

  /**
   * Submit score to leaderboard API
   */
  async submitScore(playerName, score, isWin) {
    try {
      const response = await fetch("/api/pacman_scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pacman_score: {
            player_name: playerName,
            score: score,
            is_win: isWin,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("❌ Error submitting score:", data.errors);
      }

      return data;
    } catch (error) {
      console.error("❌ Error submitting score:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch leaderboard data from API
   */
  async fetchLeaderboardData() {
    try {
      const playerName = this.getPlayerName();

      // Fetch global leaderboard
      const globalResponse = await fetch("/api/pacman_scores/global");
      const globalData = await globalResponse.json();

      let playerData = null;
      if (playerName) {
        // Fetch player scores
        const playerResponse = await fetch(
          `/api/pacman_scores/player/${encodeURIComponent(playerName)}`
        );
        const playerScoreData = await playerResponse.json();
        playerData = {
          name: playerName,
          scores: playerScoreData.scores || [],
        };
      }

      return {
        global: globalData.leaderboard || [],
        player: playerData,
      };
    } catch (error) {
      console.error("❌ Error fetching leaderboard:", error);
      return {
        global: [],
        player: null,
      };
    }
  }

  /**
   * Show leaderboard modal
   */
  async showLeaderboard() {
    const data = await this.fetchLeaderboardData();
    this.uiManager.showLeaderboardModal(data, () => {
      // Leaderboard closed
    });
  }

  // ============================================
  // AUDIO CONTROLS
  // ============================================

  /**
   * Initialize audio controls with saved preferences
   */
  initializeAudioControls() {
    // Update muted indicator visibility
    this.updateMutedIndicator();
  }

  /**
   * Toggle mute on/off
   */
  toggleMute(event) {
    if (event) event.preventDefault();

    this.audioManager.toggleMute();
    this.updateMutedIndicator();
  }

  /**
   * Update muted indicator visibility in HUD
   */
  updateMutedIndicator() {
    if (!this.hasMutedIndicatorTarget) return;

    if (this.audioManager.isMuted) {
      this.mutedIndicatorTarget.style.display = "flex";
    } else {
      this.mutedIndicatorTarget.style.display = "none";
    }
  }

  /**
   * Update music volume
   */
  updateMusicVolume(volume) {
    this.audioManager.setMusicVolume(volume);

    // If adjusting volume, unmute automatically
    if (this.audioManager.isMuted && volume > 0) {
      this.audioManager.setMute(false);
      this.updateMutedIndicator();
    }
  }

  /**
   * Update SFX volume
   */
  updateSFXVolume(volume) {
    this.audioManager.setSFXVolume(volume);

    // If adjusting volume, unmute automatically
    if (this.audioManager.isMuted && volume > 0) {
      this.audioManager.setMute(false);
      this.updateMutedIndicator();
    }
  }

  /**
   * Show main menu
   */
  showMenu() {
    // Capture original game state only if not already paused for menu
    // This preserves the state across Settings -> Back to Menu transitions
    if (this.isGameActive) {
      this.wasActiveBeforePause = true;
      this.isGameActive = false;
    } else if (this.isStarting) {
      // If game is starting (during countdown), pause the starting sequence
      this.wasStartingBeforePause = true;
      this.isStarting = false;

      // Cancel the countdown
      const countdownOverlay = document.querySelector(".pacman-countdown");
      if (countdownOverlay && countdownOverlay._cancel) {
        countdownOverlay._cancel();
      }

      // Stop intro music
      this.audioManager.stopAll();

      // Clean up intro music listener
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
    }

    // Show menu modal
    this.uiManager.showMenuModal({
      onSettings: () => this.showSettings(),
      onControls: () => this.showControls(),
      onLeaderboard: () => this.showLeaderboardFromMenu(),
      onResume: () => {
        // Resume game if it was active before pause
        if (this.wasActiveBeforePause) {
          this.isGameActive = true;
          this.wasActiveBeforePause = false;
          this.lastFrameTime = null; // Reset to prevent huge delta
          this.gameLoop();
        } else if (this.wasStartingBeforePause) {
          // Resume starting sequence
          this.wasStartingBeforePause = false;
          this.resumeStartingSequence();
        }
      },
      onQuit: () => {
        // Show confirmation modal
        this.uiManager.showConfirmationModal(
          "Quit Game",
          "Are you sure you want to quit? Your progress will be lost.",
          () => {
            // Confirmed quit
            this.wasActiveBeforePause = false;
            this.wasStartingBeforePause = false;
            this.stopGame();
          },
          () => {
            // Cancelled - reopen menu
            this.showMenu();
          }
        );
      },
    });
  }

  /**
   * Resume the starting sequence after pausing during countdown
   */
  async resumeStartingSequence() {
    this.isStarting = true;

    // Restart intro music
    this.audioManager.play("beginning", true);

    // Show countdown again
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
   * Show settings modal from menu
   */
  showSettings() {
    // Game state is already captured in wasActiveBeforePause by showMenu()
    // No need to capture it again here

    this.uiManager.showSettingsModal(
      this.audioManager.musicVolume,
      this.audioManager.sfxVolume,
      this.audioManager.isMuted,
      {
        onMusicVolumeChange: (volume) => this.updateMusicVolume(volume),
        onSFXVolumeChange: (volume) => this.updateSFXVolume(volume),
        onMuteToggle: () => this.toggleMute(),
        onClose: () => {
          // Return to menu
          this.showMenu();
        },
      }
    );
  }

  /**
   * Show controls modal from menu
   */
  showControls() {
    this.uiManager.showControlsModal(() => {
      // Return to menu
      this.showMenu();
    });
  }

  /**
   * Show leaderboard from menu
   */
  async showLeaderboardFromMenu() {
    const data = await this.fetchLeaderboardData();
    this.uiManager.showLeaderboardModal(data, () => {
      // Return to menu
      this.showMenu();
    });
  }
}
