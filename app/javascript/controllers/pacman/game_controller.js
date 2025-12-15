import { Controller } from "@hotwired/stimulus";
import { AudioManager } from "lib/pacman/audio_manager";
import { SpriteManager } from "lib/pacman/sprite_manager";
import { CollisionManager } from "lib/pacman/collision_manager";
import { GhostAI } from "lib/pacman/ghost_ai";
import { ItemManager } from "lib/pacman/item_manager";
import { SectionManager } from "lib/pacman/section_manager";
import { UIManager } from "lib/pacman/ui_manager";
import { AnimationManager } from "lib/pacman/animation_manager";

// Import mixins
import { GameStateMixin } from "lib/pacman/controllers/game_state_mixin";
import { GameLifecycleMixin } from "lib/pacman/controllers/game_lifecycle_mixin";
import { GameLoopMixin } from "lib/pacman/controllers/game_loop_mixin";
import { GameCollisionMixin } from "lib/pacman/controllers/game_collision_mixin";
import { GameLifeSystemMixin } from "lib/pacman/controllers/game_life_system_mixin";
import { GameAudioMixin } from "lib/pacman/controllers/game_audio_mixin";
import { GameLeaderboardMixin } from "lib/pacman/controllers/game_leaderboard_mixin";
import { GameUICoordinatorMixin } from "lib/pacman/controllers/game_ui_coordinator_mixin";

/**
 * Apply a mixin to a target object by copying all properties from the mixin's prototype.
 * This properly handles non-enumerable class methods that Object.assign would miss.
 *
 * @param {Object} target - The target object to apply the mixin to
 * @param {Function} MixinClass - The mixin class to apply
 */
function applyMixin(target, MixinClass) {
  const descriptors = Object.getOwnPropertyDescriptors(MixinClass.prototype);
  Object.defineProperties(target, descriptors);
}

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
  static outlets = ["pacman-input", "pacman-menu"];

  /**
   * Initialize game state and setup
   */
  connect() {
    // Apply mixins - compose functionality from mixin classes
    // Use applyMixin helper to properly copy all methods (including non-enumerable ones)
    applyMixin(this, GameStateMixin);
    applyMixin(this, GameLifecycleMixin);
    applyMixin(this, GameLoopMixin);
    applyMixin(this, GameCollisionMixin);
    applyMixin(this, GameLifeSystemMixin);
    applyMixin(this, GameAudioMixin);
    applyMixin(this, GameLeaderboardMixin);
    applyMixin(this, GameUICoordinatorMixin);

    // Store reference to this controller on the element for access by other controllers
    // This allows input/menu controllers on the same element to find us
    this.element._pacmanGameController = this;

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
    this.audioManager.initialize().catch((error) => {
      console.warn("Audio initialization failed:", error);
    });

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

    this.uiManager = new UIManager({
      hud: this.hudTarget,
      score: this.scoreTarget,
      lives: this.livesTarget,
      progressItem: this.progressItemTarget,
      progressLabel: this.progressLabelTarget,
      progressValue: this.progressValueTarget,
    });

    this.animationManager = new AnimationManager(this);

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
    // Clean up reference
    if (this.element._pacmanGameController) {
      delete this.element._pacmanGameController;
    }
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
  // GAME ELEMENTS (Dots, Ghosts, Items)
  // ============================================

  /**
   * Generate dots across the playable area
   */
  generateDots() {
    this.itemManager.generateDots();
    // Reinitialize ghost AI dot counts cache after regeneration
    this.ghostAI.initializeDotCounts();
    // Ensure joystick controls are still working after DOM changes (delegated to input controller)
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
}
