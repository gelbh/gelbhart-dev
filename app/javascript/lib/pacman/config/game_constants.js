/**
 * Game Constants Configuration
 *
 * Centralized configuration for all game constants to improve maintainability
 * and make balancing easier.
 */

export const GAME_CONSTANTS = {
  // Speed settings (pixels per second)
  SPEED: {
    PACMAN_BASE: 280,
    GHOST_BASE: 210,
    GHOST_EATEN_MULTIPLIER: 1.5, // Eyes move faster
    GHOST_FRIGHTENED_MULTIPLIER: 0.5, // Frightened ghosts are slower
    GHOST_MAX_MULTIPLIER: 0.9, // Ghosts can be at most 90% of Pac-Man speed
    DIFFICULTY_INCREASE_PERCENT: 0.15, // 15% speed increase per section
    SPEED_BOOST_MULTIPLIER: 1.5, // 50% faster
  },

  // Power mode settings (milliseconds)
  POWER_MODE: {
    DURATION_BASE: 7000, // 7 seconds base
    WARNING_DURATION_BASE: 2000, // 2 seconds warning
    DURATION_REDUCTION_PER_SECTION: 1000, // -1s per section
    WARNING_REDUCTION_PER_SECTION: 300, // -300ms per section
    DURATION_MIN: 3000, // Minimum 3 seconds
    WARNING_DURATION_MIN: 1500, // Minimum 1.5 seconds
  },

  // Ghost AI settings
  GHOST_AI: {
    SCATTER_CYCLE_TOTAL: 30, // 30 seconds total cycle
    SCATTER_DURATION: 5, // 5 seconds scatter
    CHASE_DURATION: 25, // 25 seconds chase
    PREDICTION_TIME: 0.33, // Predict 0.33 seconds ahead (Blinky)
    AMBUSH_LOOKAHEAD_TIME: 1.0, // Predict 1 second ahead (Pinky)
    SMOOTHING_RATE_NORMAL: 12, // Normal ghost smoothing
    SMOOTHING_RATE_EATEN: 20, // Eyes turn faster
    CRUISE_ELROY_THRESHOLD_1: 0.5, // 50% dots remaining
    CRUISE_ELROY_THRESHOLD_2: 0.3, // 30% dots remaining
    CRUISE_ELROY_SPEED_1: 1.15, // 15% faster
    CRUISE_ELROY_SPEED_2: 1.3, // 30% faster
  },

  // Collision detection
  COLLISION: {
    DOT_RADIUS: 25,
    ITEM_RADIUS: 30,
    KEY_RADIUS: 35,
    GHOST_RADIUS: 20,
    HOVER_CHECK_THROTTLE: 3, // Check every 3 frames
  },

  // Dot generation
  DOTS: {
    SPACING: 150, // Distance between dots
    MARGIN: 80, // Margin from edges
    SECTION_BUFFER: 80, // Buffer around sections
    POWER_PELLET_MIN_DISTANCE: 200, // Minimum distance between power pellets
    POWER_PELLETS_PER_SECTION: 3, // Power pellets per screen section
  },

  // Item spawning
  ITEMS: {
    MIN_COUNT: 3,
    MAX_COUNT: 5,
    MAX_SPAWN_ATTEMPTS: 50,
    SPAWN_BUFFER: 100, // Buffer around locked sections
  },

  // Animation timings (milliseconds)
  ANIMATION: {
    DEATH_FRAME_INTERVAL: 100,
    DEATH_FRAME_COUNT: 10,
    MOUTH_ANIMATION_INTERVAL: 0.083, // 12 times per second
    GHOST_ANIMATION_FRAME_INTERVAL: 10, // Every 10 frames
    START_HINT_FADE: 300,
    COUNTDOWN_DURATION: 3000,
    SMOOTH_SCROLL_DURATION: 800,
    ITEM_NOTIFICATION_DURATION: 1500,
    ITEM_REMOVE_DELAY: 300,
    KEY_REMOVE_DELAY: 300,
    SECTION_UNLOCK_DELAY: 600,
    DOT_FADE_DURATION: 200,
    DOT_REGENERATION_DELAY: 800,
  },

  // Game state
  GAME: {
    INITIAL_LIVES: 3,
    EXTRA_LIFE_SCORE: 10000,
    GHOST_POINTS_BASE: 200,
    GHOST_POINTS_MAX_EXPONENT: 5, // Max 6400 points per ghost
    DELTA_TIME_CAP: 1 / 30, // Max 30fps equivalent
    INTRO_MUSIC_TIMEOUT: 5000, // Fallback timeout for intro music
    RESTART_DELAY: 100,
    SCROLL_THRESHOLD: 100, // Don't scroll if within 100px
  },

  // Section progression
  SECTIONS: {
    PROJECTS_THRESHOLD: 300,
    TECHNOLOGIES_THRESHOLD: 600,
    CTA_THRESHOLD: 1000,
  },

  // Boundary detection
  BOUNDARY: {
    MARGIN: 30, // Margin for wraparound
    SECTION_BUFFER: 50, // Buffer before locked section
    FLASH_THROTTLE: 200, // Throttle boundary flashes (ms)
  },

  // Ghost spawning
  GHOST_SPAWN: {
    INITIAL_OFFSET_Y: 350, // Initial spawn offset from Pac-Man
    RESPAWN_OFFSET_Y: 800, // Respawn offset (farther away)
    HORIZONTAL_SPREAD: [0.2, 0.4, 0.6, 0.8], // X positions as viewport fractions
    VERTICAL_SPREAD: [0, 50, 50, 0], // Y offsets for initial spawn
    VERTICAL_SPREAD_RESPAWN: [0, 100, 100, 0], // Y offsets for respawn
  },
};
