import { Controller } from "@hotwired/stimulus"
import { AudioManager } from "../lib/pacman/audio_manager"
import { SpriteManager } from "../lib/pacman/sprite_manager"
import { CollisionManager } from "../lib/pacman/collision_manager"
import { GhostAI } from "../lib/pacman/ghost_ai"
import { ItemManager } from "../lib/pacman/item_manager"
import { SectionManager } from "../lib/pacman/section_manager"
import { UIManager } from "../lib/pacman/ui_manager"
import { AnimationManager } from "../lib/pacman/animation_manager"

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
  static targets = ["gameContainer", "pacman", "hud", "score", "lives", "startHint", "progressItem", "progressLabel", "progressValue", "pageTint", "mutedIndicator"]
  static values = { assetManifest: Object }

  /**
   * Initialize game state and setup
   */
  connect() {
    // Store asset manifest for production asset paths
    this.assetPaths = this.hasAssetManifestValue ? this.assetManifestValue : {}

    // Game state
    this.isGameActive = false
    this.isStarting = false // Flag to track if game is in starting phase (waiting for intro music)
    this.wasActiveBeforePause = false // Track game state before menu was opened
    this.score = 0
    this.dotsScore = 0 // Score from dots only (for section unlocking)
    this.lives = 3
    this.extraLifeAwarded = false // Track if extra life at 10,000 has been awarded
    this.powerMode = false
    this.powerModeEnding = false
    this.dots = []
    this.ghosts = []
    this.items = [] // Special powerup items
    this.regeneratingDots = false // Flag to prevent win condition during dot regeneration

    // Active powerup effects
    this.activeEffects = {
      speedBoost: false,
      slowDown: false,
      shield: false,
      freeze: false,
      doublePoints: false
    }
    this.effectTimers = {}

    // Track collected dot positions globally (persists across section unlocks)
    this.collectedDotPositions = new Set()

    // Pac-Man position and movement
    this.pacmanPosition = { x: 0, y: 0 }
    this.initialPacmanPosition = { x: 0, y: 0 } // Stored for respawn
    this.pacmanVelocity = { x: 0, y: 0 }
    this.pacmanDirection = 'right'
    this.pacmanNextDirection = null

    // Speed settings (pixels per second for delta-time based movement)
    // Increased from original arcade (1.9 px/frame = 114 px/s) for snappier web gameplay
    // Speed increases by 15% per section unlocked for progressive difficulty
    this.pacmanSpeed = 280 // pixels/second (base speed)
    this.ghostSpeed = 210  // pixels/second (base speed)

    // Delta time tracking for frame-rate independent movement
    this.lastFrameTime = null

    // Power mode durations (will be reduced as difficulty increases)
    this.powerModeDuration = 7000 // 7 seconds base
    this.powerModeWarningDuration = 2000 // 2 seconds warning

    // Animation and death state
    this.isDying = false
    this.deathAnimationFrame = 0

    // Track intro music event listener for cleanup
    this.introMusicListener = null
    this.introMusicTimeout = null
    this.lastScrollUpdate = 0

    // Animation frame counters
    this.animationFrame = 0
    this.animationTimer = 0 // Time-based animation timer (seconds)
    this.pacmanAnimationState = 0

    // Initialize managers
    this.audioManager = new AudioManager(this.assetPaths)
    this.audioManager.initialize()

    // Initialize audio controls UI with saved preferences
    this.initializeAudioControls()

    this.spriteManager = new SpriteManager(this.assetPaths)
    this.spriteManager.preload()

    this.collisionManager = new CollisionManager()
    this.collisionManager.buildCollisionMap()

    this.ghostAI = new GhostAI({
      spriteManager: this.spriteManager,
      audioManager: this.audioManager,
      gameContainer: this.gameContainerTarget
    })

    this.itemManager = new ItemManager(this)

    this.sectionManager = new SectionManager(this)
    // Expose sections to controller for compatibility
    this.sections = this.sectionManager.sections
    this.currentSection = this.sectionManager.currentSection

    this.uiManager = new UIManager({
      hud: this.hudTarget,
      score: this.scoreTarget,
      lives: this.livesTarget,
      progressItem: this.progressItemTarget,
      progressLabel: this.progressLabelTarget,
      progressValue: this.progressValueTarget
    }, this.assetPaths)

    this.animationManager = new AnimationManager(this)

    // Setup keyboard controls
    this.keydownHandler = this.handleKeydown.bind(this)
    document.addEventListener('keydown', this.keydownHandler)

    // Position Pac-Man at the starting hint location
    this.initializePacmanPosition()

    // Don't initialize locks here - wait until game starts
  }

  /**
   * Cleanup when controller disconnects
   */
  disconnect() {
    this.stopGame()
    this.audioManager.stopAll()
    document.removeEventListener('keydown', this.keydownHandler)
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Position Pac-Man at the starting hint location
   */
  initializePacmanPosition() {
    if (this.hasStartHintTarget) {
      const hintRect = this.startHintTarget.getBoundingClientRect()

      // Position Pac-Man at the hint's center (in document coordinates)
      this.pacmanPosition.x = hintRect.left + hintRect.width / 2
      this.pacmanPosition.y = hintRect.top + window.scrollY + hintRect.height / 2

      // Store initial position for respawn
      this.initialPacmanPosition = { ...this.pacmanPosition }

      // Set initial Pac-Man position
      this.animationManager.updatePacmanPosition()
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
    if ((event.key === 'm' || event.key === 'M') && (this.isGameActive || this.isStarting)) {
      this.toggleMute()
      event.preventDefault()
      return
    }

    // Handle menu (Escape key)
    if (event.key === 'Escape') {
      if (this.isGameActive || this.isStarting) {
        // Check if menu modal is already open
        if (!document.querySelector('.pacman-menu-modal')) {
          this.showMenu()
          event.preventDefault()
        }
        return
      }
    }

    // Auto-start game on first movement key press
    const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D']

    if (movementKeys.includes(event.key) && !this.isGameActive && !this.isStarting) {
      this.startGame()
      // Don't process movement yet - wait for intro music
      event.preventDefault()
      return
    }

    // Prevent movement during intro music or death
    if (this.isStarting || !this.isGameActive || this.isDying) {
      if (movementKeys.includes(event.key)) {
        event.preventDefault()
      }
      return
    }

    // Immediately apply movement for responsive controls
    switch(event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.pacmanVelocity = { x: 0, y: -this.pacmanSpeed }
        this.pacmanDirection = 'up'
        event.preventDefault()
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        this.pacmanVelocity = { x: 0, y: this.pacmanSpeed }
        this.pacmanDirection = 'down'
        event.preventDefault()
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.pacmanVelocity = { x: -this.pacmanSpeed, y: 0 }
        this.pacmanDirection = 'left'
        event.preventDefault()
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.pacmanVelocity = { x: this.pacmanSpeed, y: 0 }
        this.pacmanDirection = 'right'
        event.preventDefault()
        break
    }
  }


  // ============================================
  // GAME LIFECYCLE (Start/Stop)
  // ============================================

  /**
   * Start the game
   * Initializes game state, generates dots/ghosts, starts game loop
   */
  async startGame() {
    if (this.isGameActive || this.isStarting) return

    this.isStarting = true // Flag to prevent multiple start attempts
    this.isGameActive = false // Game is not yet active (waiting for intro music)

    // Disable page scrolling during game
    document.body.style.overflow = 'hidden'

    // Hide start hint with fade out
    if (this.hasStartHintTarget) {
      this.startHintTarget.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
      this.startHintTarget.style.opacity = '0'
      this.startHintTarget.style.transform = 'scale(0.9)'
      setTimeout(() => {
        this.startHintTarget.style.display = 'none'
      }, 300)
    }

    // Show game container and page tint
    this.gameContainerTarget.classList.add('active')
    this.hudTarget.classList.add('active')
    if (this.hasPageTintTarget) {
      this.pageTintTarget.classList.add('active')
    }

    // Reset game state
    this.score = 0
    this.dotsScore = 0
    this.lives = 3
    this.extraLifeAwarded = false
    this.updateHUD()

    // Reset difficulty settings to base speeds
    this.pacmanSpeed = 280 // pixels/second
    this.ghostSpeed = 210 // pixels/second
    this.powerModeDuration = 7000
    this.powerModeWarningDuration = 2000

    // Reset section progression
    this.sectionManager.sections.forEach(s => s.unlocked = false)
    this.sectionManager.currentSection = 0
    this.sectionManager.keySpawned = false
    this.sectionManager.keyCollected = false
    this.sections = this.sectionManager.sections
    this.currentSection = this.sectionManager.currentSection

    // Reset Pac-Man position to initial position
    this.pacmanPosition = { ...this.initialPacmanPosition }
    this.pacmanVelocity = { x: 0, y: 0 }
    this.animationManager.updatePacmanPosition()

    // Clear collected dot positions for fresh start
    this.collectedDotPositions.clear()

    // Initialize locked sections (only when game starts)
    this.sectionManager.initializeLockedSections()

    // Setup hover detection (no collisions)
    this.collisionManager.buildCollisionMap()

    // Generate game elements
    this.generateDots()
    this.createGhosts()

    // Smoothly scroll to starting position before beginning
    const targetScrollY = this.initialPacmanPosition.y - (window.innerHeight / 2)
    const clampedTargetY = Math.max(0, Math.min(targetScrollY, document.documentElement.scrollHeight - window.innerHeight))

    // Only scroll if we're not already near the starting position
    if (Math.abs(window.scrollY - clampedTargetY) > 100) {
      await this.animationManager.smoothScrollTo(clampedTargetY, 800)
    }

    // Play beginning sound
    this.audioManager.play('beginning', true)

    // Show countdown while intro music plays
    await this.uiManager.showCountdown()

    // Wait for the beginning sound to finish before starting gameplay
    const beginningAudio = this.audioManager.getAudio('beginning')

    const onBeginningEnded = () => {
      this.isGameActive = true
      this.isStarting = false

      // Start game loop
      this.gameLoop()

      // Remove event listener
      beginningAudio.removeEventListener('ended', onBeginningEnded)
      this.introMusicListener = null
      this.introMusicTimeout = null
    }

    // Store listener for cleanup
    this.introMusicListener = { audio: beginningAudio, handler: onBeginningEnded }
    beginningAudio.addEventListener('ended', onBeginningEnded)

    // Fallback: Start anyway after 5 seconds if sound doesn't fire ended event
    this.introMusicTimeout = setTimeout(() => {
      if (!this.isGameActive && this.isStarting) {
        beginningAudio.removeEventListener('ended', onBeginningEnded)
        this.isGameActive = true
        this.isStarting = false

        this.gameLoop()
        this.introMusicListener = null
        this.introMusicTimeout = null
      }
    }, 5000)
  }

  /**
   * Stop the game and cleanup
   */
  stopGame() {
    this.isGameActive = false
    this.isStarting = false
    this.wasActiveBeforePause = false // Reset pause state

    // Clean up intro music listener and timeout if they exist
    if (this.introMusicListener) {
      this.introMusicListener.audio.removeEventListener('ended', this.introMusicListener.handler)
      this.introMusicListener = null
    }
    if (this.introMusicTimeout) {
      clearTimeout(this.introMusicTimeout)
      this.introMusicTimeout = null
    }

    // Remove countdown overlay if it exists
    const countdownOverlay = document.querySelector('.pacman-countdown')
    if (countdownOverlay) {
      countdownOverlay.remove()
    }

    this.gameContainerTarget.classList.remove('active')
    this.hudTarget.classList.remove('active')
    if (this.hasPageTintTarget) {
      this.pageTintTarget.classList.remove('active')
    }

    // Re-enable page scrolling
    document.body.style.overflow = ''

    // Clean up game elements
    this.dots.forEach(dot => {
      if (dot.element && dot.element.parentNode) {
        dot.element.remove()
      }
    })
    this.dots = []

    // Clean up items
    this.items.forEach(item => {
      if (item.element && item.element.parentNode) {
        item.element.remove()
      }
    })
    this.items = []

    // Clean up ghosts
    this.ghostAI.cleanup()
    this.ghosts = []

    // Clean up section key if exists
    if (this.sectionManager.key && this.sectionManager.key.element) {
      this.sectionManager.key.element.remove()
      this.sectionManager.key = null
    }

    // Remove all section locks
    this.sectionManager.removeAllSectionLocks()

    // Clear hover effects
    this.collisionManager.clearHoverEffects()

    // Clear any active effect timers
    Object.values(this.effectTimers).forEach(timer => clearTimeout(timer))
    this.effectTimers = {}

    // Stop all sounds
    this.audioManager.stopAll()

    // Show start hint again with fade in
    if (this.hasStartHintTarget) {
      this.startHintTarget.style.display = 'flex'
      // Trigger reflow
      this.startHintTarget.offsetHeight
      this.startHintTarget.style.opacity = '1'
      this.startHintTarget.style.transform = 'scale(1)'
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
    if (!this.isGameActive) return

    // Calculate delta time in seconds (for frame-rate independent movement)
    const deltaTime = this.lastFrameTime ? (timestamp - this.lastFrameTime) / 1000 : 1/60
    this.lastFrameTime = timestamp

    // Cap delta time to prevent huge jumps (e.g., when tab is inactive)
    const cappedDeltaTime = Math.min(deltaTime, 1/30) // Max 30fps equivalent

    // Update container transform for fixed positioning
    this.animationManager.updateContainerTransform()

    // Update Pac-Man movement
    if (!this.isDying) {
      this.updatePacmanMovement(cappedDeltaTime)
    }

    // Update Pac-Man position and animation
    this.animationManager.updatePacmanPosition()
    this.animationManager.animatePacmanMouth(cappedDeltaTime)

    // Sync scroll position to keep Pac-Man centered
    this.animationManager.syncScroll()

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
        activeEffects: this.activeEffects
      })

      // Update ghosts
      this.ghostAI.updateGhosts(cappedDeltaTime, (x, y) => this.checkSectionBoundary(x, y))
      this.ghosts = this.ghostAI.getGhosts()

      // Update ghost indicators
      this.ghostAI.updateGhostIndicators()
    }

    // Check collisions
    if (!this.isDying) {
      this.itemManager.checkDotCollisions()
      this.itemManager.checkItemCollisions()

      // Check ghost collisions
      const lifeLost = this.ghostAI.checkGhostCollisions(
        (ghost) => this.onGhostEaten(ghost),
        () => this.loseLife()
      )

      // Check key collection
      this.sectionManager.checkKeyCollection()
    }

    // Check hover effects
    this.collisionManager.checkHoverEffects(this.pacmanPosition)

    // Optimize dot visibility for performance
    this.itemManager.optimizeDotVisibility()

    // Check win condition
    this.checkWinCondition()

    // Continue game loop - only if still active
    if (this.isGameActive) {
      requestAnimationFrame((ts) => this.gameLoop(ts))
    }
  }

  /**
   * Update Pac-Man's position based on velocity
   */
  updatePacmanMovement(deltaTime) {
    // Calculate next position with delta-time based movement
    const nextX = this.pacmanPosition.x + (this.pacmanVelocity.x * deltaTime)
    const nextY = this.pacmanPosition.y + (this.pacmanVelocity.y * deltaTime)

    // Check if next position would enter a locked section
    const boundary = this.checkSectionBoundary(nextX, nextY)

    if (boundary) {
      // Stop at boundary
      this.pacmanPosition.y = boundary
      this.pacmanVelocity = { x: 0, y: 0 }
      this.collisionManager.flashBoundary('section', this.sections)
    } else {
      this.pacmanPosition.x = nextX
      this.pacmanPosition.y = nextY
    }

    // Wrap around screen edges horizontally
    const margin = 30
    if (this.pacmanPosition.x < -margin) {
      this.pacmanPosition.x = window.innerWidth + margin
    } else if (this.pacmanPosition.x > window.innerWidth + margin) {
      this.pacmanPosition.x = -margin
    }

    // Keep Pac-Man within playable area (between header and footer)
    const header = document.querySelector('.header')
    const footer = document.querySelector('.footer')

    let minY = margin
    let maxY = document.documentElement.scrollHeight - margin

    if (header) {
      const headerRect = header.getBoundingClientRect()
      minY = Math.max(minY, headerRect.top + window.scrollY + headerRect.height + margin)
    }

    if (footer) {
      const footerRect = footer.getBoundingClientRect()
      maxY = Math.min(maxY, footerRect.top + window.scrollY - margin)
    }

    // Stop at boundaries
    if (this.pacmanPosition.y <= minY) {
      this.pacmanPosition.y = minY
      this.pacmanVelocity = { x: 0, y: 0 }
      this.collisionManager.flashBoundary('header', this.sections)
    } else if (this.pacmanPosition.y >= maxY) {
      this.pacmanPosition.y = maxY
      this.pacmanVelocity = { x: 0, y: 0 }
      this.collisionManager.flashBoundary('footer', this.sections)
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
    )
  }

  // ============================================
  // GAME ELEMENTS (Dots, Ghosts, Items)
  // ============================================

  /**
   * Generate dots across the playable area
   */
  generateDots() {
    this.itemManager.generateDots()
  }

  /**
   * Create all 4 ghosts with unique AI personalities
   */
  createGhosts() {
    this.ghostAI.createGhosts()
    this.ghosts = this.ghostAI.getGhosts()
  }

  /**
   * Get asset path for production/development
   */
  getAssetPath(filename) {
    return this.spriteManager.getAssetPath(filename)
  }

  // ============================================
  // COLLISION CALLBACKS
  // ============================================

  /**
   * Called when a ghost is eaten
   */
  onGhostEaten(ghost) {
    // Award points for eating ghost (200, 400, 800, 1600)
    const baseGhostPoints = 200 * Math.pow(2, this.ghostsEatenThisPowerMode || 0)
    const ghostPoints = baseGhostPoints * (this.activeEffects.doublePoints ? 2 : 1)
    this.score += ghostPoints
    this.ghostsEatenThisPowerMode = (this.ghostsEatenThisPowerMode || 0) + 1
    this.updateHUD()
  }

  /**
   * Check if all sections unlocked and all dots collected
   */
  checkWinCondition() {
    // Don't check win condition during dot regeneration
    if (this.regeneratingDots) return

    const allSectionsUnlocked = this.sections.every(s => s.unlocked)
    const allDotsCollected = this.dots.every(d => d.collected)

    if (allSectionsUnlocked && allDotsCollected) {
      this.winGame()
    }
  }

  /**
   * Check if score reached a section threshold
   */
  checkSectionThreshold() {
    this.sectionManager.checkSectionThreshold()
    // Sync section state back to controller
    this.sections = this.sectionManager.sections
    this.currentSection = this.sectionManager.currentSection
  }

  // ============================================
  // LIFE SYSTEM
  // ============================================

  /**
   * Lose a life and respawn or game over
   */
  async loseLife() {
    if (this.isDying) return // Prevent multiple death triggers

    this.isDying = true
    this.lives--

    // Stop all sounds except death sound
    this.audioManager.stopAll()
    this.audioManager.play('death', true)

    // Reset power mode
    this.powerMode = false
    this.powerModeEnding = false
    this.pacmanTarget.classList.remove('powered')
    this.ghostsEatenThisPowerMode = 0

    // Play death animation
    await this.animationManager.playDeathAnimation()

    // Update HUD
    this.updateHUD()

    if (this.lives <= 0) {
      // Game over
      this.gameOver()
    } else {
      // Respawn

      // Show countdown
      await this.uiManager.showCountdown()

      // Reset positions
      this.animationManager.resetPositions()

      // Exit all ghost modes
      this.ghostAI.exitPowerMode()
      this.ghosts.forEach(ghost => {
        ghost.frightened = false
        ghost.frozen = false
        ghost.element.classList.remove('frightened', 'frozen')
      })

      // Reset state
      this.isDying = false
      this.lastFrameTime = null // Reset frame time to prevent huge delta
    }
  }

  /**
   * Game over - player lost
   */
  async gameOver() {
    this.isGameActive = false
    this.isDying = false

    // Handle score submission
    await this.handleGameEnd(false)
  }

  /**
   * Win game - player cleared all dots
   */
  async winGame() {
    this.isGameActive = false

    // Handle score submission (celebration sound played in handleGameEnd)
    await this.handleGameEnd(true)
  }

  /**
   * Handle game end - prompt for name if needed, submit score, show modal
   */
  async handleGameEnd(isWin) {
    // Hide game visuals (but keep game state for potential restart)
    this.gameContainerTarget.classList.remove('active')
    this.hudTarget.classList.remove('active')
    if (this.hasPageTintTarget) {
      this.pageTintTarget.classList.remove('active')
    }

    // Stop all sounds
    this.audioManager.stopAll()

    // Play celebration sound if win
    if (isWin) {
      this.audioManager.play('intermission', true)
    }

    // Check if player name exists
    let playerName = this.getPlayerName()

    // If no player name, prompt for it
    if (!playerName) {
      playerName = await this.uiManager.showPlayerNamePrompt()
      this.savePlayerName(playerName)
    }

    // Submit score to leaderboard
    await this.submitScore(playerName, this.score, isWin)

    // Show game over modal with leaderboard option
    this.uiManager.showGameOverModal(isWin, this.score, {
      onRestart: () => this.restartGame(),
      onQuit: () => this.stopGame(),
      onViewLeaderboard: () => this.showLeaderboardFromGameEnd()
    })
  }

  /**
   * Show leaderboard after game ends (calls stopGame when closed)
   */
  async showLeaderboardFromGameEnd() {
    const data = await this.fetchLeaderboardData()
    this.uiManager.showLeaderboardModal(data, () => {
      this.stopGame()
    })
  }

  /**
   * Restart the game
   */
  restartGame() {
    this.stopGame()
    setTimeout(() => {
      this.startGame()
    }, 100)
  }

  // ============================================
  // HUD & UI
  // ============================================

  /**
   * Update HUD with current score, lives, and progress
   */
  updateHUD() {
    this.uiManager.updateHUD({
      score: this.score,
      lives: this.lives,
      dotsScore: this.dotsScore,
      sections: this.sections,
      currentSection: this.currentSection,
      extraLifeAwarded: this.extraLifeAwarded
    }, {
      onExtraLife: () => {
        this.lives++
        this.extraLifeAwarded = true
        this.audioManager.play('extraPac', true)
        this.updateHUD()
      }
    })
  }

  // ============================================
  // HELPER METHODS (for ItemManager compatibility)
  // ============================================

  /**
   * Play sound (delegated to AudioManager)
   */
  playSound(soundName, restart = false) {
    this.audioManager.play(soundName, restart)
  }

  /**
   * Get frightened sprite (delegated to SpriteManager)
   */
  getFrightenedSprite(frame) {
    return this.spriteManager.getFrightenedSprite(frame, this.powerModeEnding)
  }

  /**
   * Get ghost sprite (delegated to SpriteManager)
   */
  getGhostSprite(color, direction, frame) {
    return this.spriteManager.getGhostSprite(color, direction, frame)
  }

  // ============================================
  // LEADERBOARD METHODS
  // ============================================

  /**
   * Get player name from localStorage
   */
  getPlayerName() {
    try {
      return localStorage.getItem('pacman_player_name')
    } catch (e) {
      console.error('Error reading player name from localStorage:', e)
      return null
    }
  }

  /**
   * Save player name to localStorage
   */
  savePlayerName(name) {
    try {
      localStorage.setItem('pacman_player_name', name)
    } catch (e) {
      console.error('Error saving player name to localStorage:', e)
    }
  }

  /**
   * Submit score to leaderboard API
   */
  async submitScore(playerName, score, isWin) {
    try {
      const response = await fetch('/api/pacman_scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pacman_score: {
            player_name: playerName,
            score: score,
            is_win: isWin
          }
        })
      })

      const data = await response.json()

      if (!data.success) {
        console.error('❌ Error submitting score:', data.errors)
      }

      return data
    } catch (error) {
      console.error('❌ Error submitting score:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Fetch leaderboard data from API
   */
  async fetchLeaderboardData() {
    try {
      const playerName = this.getPlayerName()

      // Fetch global leaderboard
      const globalResponse = await fetch('/api/pacman_scores/global')
      const globalData = await globalResponse.json()

      let playerData = null
      if (playerName) {
        // Fetch player scores
        const playerResponse = await fetch(`/api/pacman_scores/player/${encodeURIComponent(playerName)}`)
        const playerScoreData = await playerResponse.json()
        playerData = {
          name: playerName,
          scores: playerScoreData.scores || []
        }
      }

      return {
        global: globalData.leaderboard || [],
        player: playerData
      }
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error)
      return {
        global: [],
        player: null
      }
    }
  }

  /**
   * Show leaderboard modal
   */
  async showLeaderboard() {
    const data = await this.fetchLeaderboardData()
    this.uiManager.showLeaderboardModal(data, () => {
      // Leaderboard closed
    })
  }


  // ============================================
  // AUDIO CONTROLS
  // ============================================

  /**
   * Initialize audio controls with saved preferences
   */
  initializeAudioControls() {
    // Update muted indicator visibility
    this.updateMutedIndicator()
  }

  /**
   * Toggle mute on/off
   */
  toggleMute(event) {
    if (event) event.preventDefault()

    this.audioManager.toggleMute()
    this.updateMutedIndicator()
  }

  /**
   * Update muted indicator visibility in HUD
   */
  updateMutedIndicator() {
    if (!this.hasMutedIndicatorTarget) return

    if (this.audioManager.isMuted) {
      this.mutedIndicatorTarget.style.display = 'flex'
    } else {
      this.mutedIndicatorTarget.style.display = 'none'
    }
  }

  /**
   * Update music volume
   */
  updateMusicVolume(volume) {
    this.audioManager.setMusicVolume(volume)

    // If adjusting volume, unmute automatically
    if (this.audioManager.isMuted && volume > 0) {
      this.audioManager.setMute(false)
      this.updateMutedIndicator()
    }
  }

  /**
   * Update SFX volume
   */
  updateSFXVolume(volume) {
    this.audioManager.setSFXVolume(volume)

    // If adjusting volume, unmute automatically
    if (this.audioManager.isMuted && volume > 0) {
      this.audioManager.setMute(false)
      this.updateMutedIndicator()
    }
  }

  /**
   * Show main menu
   */
  showMenu() {
    // Capture original game state only if not already paused for menu
    // This preserves the state across Settings -> Back to Menu transitions
    if (this.isGameActive) {
      this.wasActiveBeforePause = true
      this.isGameActive = false
    }

    // Show menu modal
    this.uiManager.showMenuModal({
      onSettings: () => this.showSettings(),
      onControls: () => this.showControls(),
      onLeaderboard: () => this.showLeaderboardFromMenu(),
      onResume: () => {
        // Resume game if it was active before pause
        if (this.wasActiveBeforePause) {
          this.isGameActive = true
          this.wasActiveBeforePause = false
          this.lastFrameTime = null // Reset to prevent huge delta
          this.gameLoop()
        }
      },
      onQuit: () => {
        // Show confirmation modal
        this.uiManager.showConfirmationModal(
          'Quit Game',
          'Are you sure you want to quit? Your progress will be lost.',
          () => {
            // Confirmed quit
            this.wasActiveBeforePause = false
            this.stopGame()
          },
          () => {
            // Cancelled - reopen menu
            this.showMenu()
          }
        )
      }
    })
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
          this.showMenu()
        }
      }
    )
  }

  /**
   * Show controls modal from menu
   */
  showControls() {
    this.uiManager.showControlsModal(() => {
      // Return to menu
      this.showMenu()
    })
  }

  /**
   * Show leaderboard from menu
   */
  async showLeaderboardFromMenu() {
    const data = await this.fetchLeaderboardData()
    this.uiManager.showLeaderboardModal(data, () => {
      // Return to menu
      this.showMenu()
    })
  }
}
