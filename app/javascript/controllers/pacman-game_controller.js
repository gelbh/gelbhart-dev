import { Controller } from "@hotwired/stimulus"

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
  static targets = ["gameContainer", "pacman", "hud", "score", "lives", "startHint", "progressItem", "progressLabel", "progressValue", "pageTint"]
  static values = { assetManifest: Object }

  /**
   * Initialize game state and setup
   */
  connect() {
    // Store asset manifest for production asset paths
    this.assetPaths = this.hasAssetManifestValue ? this.assetManifestValue : {}
    
    console.log("🎮 Pac-Man game controller connected!")
    
    // Game state
    this.isGameActive = false
    this.isStarting = false // Flag to track if game is in starting phase (waiting for intro music)
    this.isPaused = false // Flag to track if game is paused
    this.score = 0
    this.dotsScore = 0 // Score from dots only (for section unlocking)
    this.lives = 3
    this.extraLifeAwarded = false // Track if extra life at 10,000 has been awarded
    this.powerMode = false
    this.powerModeEnding = false
    this.dots = []
    this.ghosts = []
    this.items = [] // Special powerup items

    // Active powerup effects
    this.activeEffects = {
      speedBoost: false,
      slowDown: false,
      shield: false,
      freeze: false,
      doublePoints: false
    }
    this.effectTimers = {}

    // Item types configuration
    this.itemTypes = {
      speedBoost: { emoji: '⚡', name: 'Speed Boost', color: '#FFD700', points: 100, duration: 5000, positive: true },
      slowDown: { emoji: '🐌', name: 'Slow Down', color: '#8B4513', points: -50, duration: 4000, positive: false },
      shield: { emoji: '🛡️', name: 'Shield', color: '#00CED1', points: 150, duration: 6000, positive: true },
      freeze: { emoji: '❄️', name: 'Ghost Freeze', color: '#87CEEB', points: 200, duration: 3000, positive: true },
      doublePoints: { emoji: '⭐', name: 'Double Points', color: '#FF69B4', points: 100, duration: 10000, positive: true },
      extraLife: { emoji: '❤️', name: 'Extra Life', color: '#FF0000', points: 500, duration: 0, positive: true }
    }

    // Section progression system
    this.sections = [
      { id: 'projects', unlocked: false, threshold: 300, name: 'Projects' },
      { id: 'technologies', unlocked: false, threshold: 600, name: 'Technologies' },
      { id: 'cta', unlocked: false, threshold: 1000, name: 'Contact' }
    ]
    this.currentSection = 0
    this.keySpawned = false
    this.keyCollected = false
    this.key = null

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
    this.pacmanSpeed = 180 // pixels/second (was 114)
    this.ghostSpeed = 135  // pixels/second (was 84)

    // Delta time tracking for frame-rate independent movement
    this.lastFrameTime = null

    // Power mode durations (will be reduced as difficulty increases)
    this.powerModeDuration = 7000 // 7 seconds base
    this.powerModeWarningDuration = 2000 // 2 seconds warning
    
    // Animation and death state
    this.isDying = false
    this.deathAnimationFrame = 0
    this.lastScrollUpdate = 0
    
    // Animation frame counters
    this.animationFrame = 0
    this.animationTimer = 0 // Time-based animation timer (seconds)
    this.pacmanAnimationState = 0
    
    // Hover detection (no collision detection for movement)
    this.collisionMap = []
    this.hoveredElement = null
    this.collisionPadding = 10
    
    // Initialize sound system
    this.initializeSoundSystem()

    // Preload all sprite images to prevent HTTP requests during gameplay
    this.preloadSprites()

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
    this.stopAllSounds()
    document.removeEventListener('keydown', this.keydownHandler)
  }

  // ============================================
  // SOUND SYSTEM
  // ============================================

  /**
   * Initialize audio system with preloaded sound effects
   * Uses authentic Pac-Man arcade sounds
   */
  initializeSoundSystem() {
    // Helper function to get asset path (handles both dev and production)
    const getAudioPath = (filename) => {
      // In production, use the digested asset path from manifest
      const assetKey = `pacman-game/sounds/${filename}`
      if (this.assetPaths && this.assetPaths[assetKey]) {
        // Rails asset_path() already includes /assets/ prefix
        return this.assetPaths[assetKey]
      }
      // In development, use direct path
      return `/assets/pacman-game/sounds/${filename}`
    }

    try {
      // Create Audio objects for each sound effect
      this.audioFiles = {
        beginning: new Audio(getAudioPath('pacman_beginning.wav')),
        chomp: new Audio(getAudioPath('pacman_chomp.wav')),
        death: new Audio(getAudioPath('pacman_death.wav')),
        eatFruit: new Audio(getAudioPath('pacman_eatfruit.wav')),
        eatGhost: new Audio(getAudioPath('pacman_eatghost.wav')),
        extraPac: new Audio(getAudioPath('pacman_extrapac.wav')),
        intermission: new Audio(getAudioPath('pacman_intermission.wav'))
      }

      // Configure audio properties
      Object.values(this.audioFiles).forEach(audio => {
        audio.volume = 0.4 // Set volume to 40% (not too loud)
        audio.preload = 'auto' // Preload for instant playback
      })

      // Track sound state
      this.soundsEnabled = true
      
      console.log("🔊 Sound system initialized with authentic Pac-Man sounds!")
    } catch (error) {
      console.warn("⚠️ Could not initialize audio system:", error)
      this.soundsEnabled = false
    }
  }

  /**
   * Play a sound effect
   * @param {string} soundName - Name of the sound to play
   * @param {boolean} restart - Whether to restart if already playing
   */
  playSound(soundName, restart = false) {
    if (!this.soundsEnabled || !this.audioFiles[soundName]) return

    try {
      const audio = this.audioFiles[soundName]
      
      if (restart) {
        audio.currentTime = 0
      }
      
      // Only play if not already playing or if restart is requested
      if (audio.paused || restart) {
        audio.play().catch(err => {
          // Silently handle autoplay policy restrictions
          console.warn(`Could not play ${soundName}:`, err.message)
        })
      }
    } catch (error) {
      console.warn(`Error playing ${soundName}:`, error)
    }
  }

  /**
   * Stop a specific sound
   * @param {string} soundName - Name of the sound to stop
   */
  stopSound(soundName) {
    if (!this.soundsEnabled || !this.audioFiles[soundName]) return

    try {
      const audio = this.audioFiles[soundName]
      audio.pause()
      audio.currentTime = 0
    } catch (error) {
      console.warn(`Error stopping ${soundName}:`, error)
    }
  }

  /**
   * Stop all currently playing sounds
   */
  stopAllSounds() {
    if (!this.soundsEnabled) return

    try {
      Object.values(this.audioFiles).forEach(audio => {
        audio.pause()
        audio.currentTime = 0
      })
      this.chompPlaying = false
    } catch (error) {
      console.warn("Error stopping sounds:", error)
    }
  }

  // ============================================
  // SPRITE PRELOADING
  // ============================================

  /**
   * Preload all sprite images to prevent HTTP requests during gameplay
   * This is critical for production performance on limited resources
   */
  preloadSprites() {
    this.spriteCache = {}

    // Preload Pac-Man sprites
    const pacmanSprites = ['pacman/pacman_open_more.png', 'pacman/pacman_open_less.png', 'pacman/pacman_closed.png']
    pacmanSprites.forEach(sprite => {
      const img = new Image()
      img.src = this.getAssetPath(sprite)
      this.spriteCache[sprite] = img.src
    })

    // Preload all ghost sprites
    const ghostColors = ['blinky', 'pinky', 'inky', 'clyde']
    const directions = ['right', 'down', 'up']
    const frames = [1, 2]

    ghostColors.forEach(ghost => {
      directions.forEach(dir => {
        frames.forEach(frame => {
          const sprite = `ghosts/${ghost}-${dir}-${frame}.png`
          const img = new Image()
          img.src = this.getAssetPath(sprite)
          this.spriteCache[sprite] = img.src
        })
      })
    })

    // Preload frightened sprites
    ;['blue', 'white'].forEach(color => {
      frames.forEach(frame => {
        const sprite = `ghosts/frightened-${color}-${frame}.png`
        const img = new Image()
        img.src = this.getAssetPath(sprite)
        this.spriteCache[sprite] = img.src
      })
    })

    // Preload eyes sprites
    directions.forEach(dir => {
      const sprite = `ghosts/eyes-${dir}.png`
      const img = new Image()
      img.src = this.getAssetPath(sprite)
      this.spriteCache[sprite] = img.src
    })

    console.log("🎨 Preloaded", Object.keys(this.spriteCache).length, "sprite images")
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize Pac-Man's starting position from the preview hint
   */
  initializePacmanPosition() {
    // Position Pac-Man exactly where the preview Pac-Man is in the hint element
    const hintElement = document.querySelector('.pacman-idle-hint')
    const previewPacman = document.querySelector('.pacman-preview')
    
    if (previewPacman) {
      // Get the exact position of the preview Pac-Man sprite
      const rect = previewPacman.getBoundingClientRect()
      
      this.pacmanPosition = {
        x: rect.left + (rect.width / 2), // Center of the preview Pac-Man
        y: rect.top + window.scrollY + (rect.height / 2) // Center with scroll offset
      }
      // Store initial position for respawn
      this.initialPacmanPosition = { ...this.pacmanPosition }
      this.updatePacmanPosition()
    } else if (hintElement) {
      // Fallback: position near the hint element
      const rect = hintElement.getBoundingClientRect()
      
      this.pacmanPosition = {
        x: rect.left + 20, // Position at the start of the hint
        y: rect.top + window.scrollY + (rect.height / 2)
      }
      this.initialPacmanPosition = { ...this.pacmanPosition }
      this.updatePacmanPosition()
    } else {
      // Final fallback: center of viewport
      this.pacmanPosition = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 + window.scrollY
      }
      this.initialPacmanPosition = { ...this.pacmanPosition }
    }
  }

  /**
   * Initialize locked sections with blur overlays and lock icons
   */
  initializeLockedSections() {
    this.sections.forEach(section => {
      const sectionElement = document.getElementById(section.id)
      if (sectionElement && !section.unlocked) {
        // Create lock overlay
        const lockOverlay = document.createElement('div')
        lockOverlay.className = 'pacman-section-lock'
        lockOverlay.dataset.sectionId = section.id
        lockOverlay.innerHTML = `
          <div class="lock-content">
            <i class="bx bxs-lock-alt lock-icon"></i>
            <div class="lock-text">Collect more dots to unlock</div>
            <div class="lock-subtext">${section.threshold} points needed</div>
          </div>
        `

        // Add blur effect to section
        sectionElement.classList.add('section-locked')
        sectionElement.style.position = 'relative'

        // Append lock overlay
        sectionElement.appendChild(lockOverlay)

        console.log(`🔒 Section "${section.name}" locked (requires ${section.threshold} points)`)
      }
    })
  }

  /**
   * Unlock a section when threshold is reached
   */
  unlockSection(sectionIndex) {
    const section = this.sections[sectionIndex]
    const sectionElement = document.getElementById(section.id)

    if (sectionElement && !section.unlocked) {
      section.unlocked = true

      // Remove lock overlay with animation
      const lockOverlay = sectionElement.querySelector('.pacman-section-lock')
      if (lockOverlay) {
        lockOverlay.classList.add('unlocking')
        setTimeout(() => {
          lockOverlay.remove()
          sectionElement.classList.remove('section-locked')
        }, 600)
      }

      console.log(`🔓 Section "${section.name}" unlocked!`)
    }
  }

  /**
   * Remove all section locks (when game ends)
   */
  removeAllSectionLocks() {
    this.sections.forEach(section => {
      const sectionElement = document.getElementById(section.id)
      if (sectionElement) {
        // Remove lock overlay
        const lockOverlay = sectionElement.querySelector('.pacman-section-lock')
        if (lockOverlay) {
          lockOverlay.remove()
        }
        // Remove blur effect
        sectionElement.classList.remove('section-locked')
      }
    })
  }

  /**
   * Increase difficulty as sections are unlocked
   * Makes ghosts faster and reduces power mode duration
   */
  increaseDifficulty() {
    // Increase ghost speed by 15% per section unlocked
    const speedMultiplier = 1 + (this.currentSection * 0.15)
    this.ghostSpeed = 135 * speedMultiplier // Base 135 pixels/second

    // Cap ghost speed to 85% of Pac-Man's speed to keep game winnable
    const maxGhostSpeed = this.pacmanSpeed * 0.85
    this.ghostSpeed = Math.min(this.ghostSpeed, maxGhostSpeed)

    // Reduce power mode duration (7s base, -1s per section, minimum 3s)
    this.powerModeDuration = Math.max(3000, 7000 - (this.currentSection * 1000))
    this.powerModeWarningDuration = Math.max(1500, 2000 - (this.currentSection * 300))

    console.log(`⚡ Difficulty increased! Ghost speed: ${this.ghostSpeed.toFixed(0)} px/s, Power mode: ${this.powerModeDuration/1000}s`)
  }

  /**
   * Flash red indicator when hitting a boundary
   * @param {string} type - 'header', 'footer', or 'section'
   */
  flashBoundary(type) {
    // Throttle flashes to prevent spam
    const now = Date.now()
    if (this.lastBoundaryFlash && now - this.lastBoundaryFlash < 200) return
    this.lastBoundaryFlash = now

    let element = null

    if (type === 'header') {
      element = document.querySelector('.header')
    } else if (type === 'footer') {
      element = document.querySelector('.footer')
    } else if (type === 'section') {
      // Flash the locked section
      const lockedSection = this.sections.find(s => !s.unlocked)
      if (lockedSection) {
        element = document.getElementById(lockedSection.id)
      }
    }

    if (element) {
      element.classList.add('boundary-flash')
      setTimeout(() => {
        element.classList.remove('boundary-flash')
      }, 300)
    }
  }

  /**
   * Check if Pac-Man is trying to enter a locked section
   * Returns the boundary Y position if blocked, null if allowed
   */
  checkSectionBoundary(x, y) {
    // Only check boundaries if game is active
    if (!this.isGameActive) return null

    // Find the first locked section
    const lockedSection = this.sections.find(section => !section.unlocked)
    if (!lockedSection) return null

    const sectionElement = document.getElementById(lockedSection.id)
    if (!sectionElement) return null

    const rect = sectionElement.getBoundingClientRect()
    const sectionTop = rect.top + window.scrollY
    const sectionBottom = sectionTop + rect.height

    const buffer = 50 // Buffer zone before section

    // Check if trying to enter from above
    if (this.pacmanPosition.y < sectionTop && y >= sectionTop - buffer) {
      return sectionTop - buffer
    }

    return null
  }

  // ============================================
  // COLLISION & HOVER DETECTION
  // ============================================
  
  /**
   * Build collision map (not used for movement, only for potential hover effects)
   */
  buildCollisionMap() {
    // Free movement mode - no collision detection
    // Could be extended for hover effect tracking if needed
    console.log(`🎮 Free movement enabled`)
  }

  /**
   * Check collision at position (always returns null - free movement)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {null} Always null (no collisions)
   */
  checkCollision(x, y, vx = 0, vy = 0) {
    return null // No collision detection
  }

  /**
   * Update collision visuals (not used in free movement mode)
   */
  updateCollisionVisuals() {
    // No visual indicators needed
  }

  checkHoverEffects() {
    // Check if Pac-Man is over any hoverable element using real-time detection
    const viewportX = this.pacmanPosition.x
    const viewportY = this.pacmanPosition.y - window.scrollY
    
    // Get all elements at Pac-Man's position
    const elements = document.elementsFromPoint(viewportX, viewportY)
    
    let newHoveredElement = null
    
    for (let element of elements) {
      // Skip game elements
      if (element.closest('.pacman-game-container') || 
          element.closest('.pacman-hud') ||
          element.classList.contains('pacman-idle-hint') ||
          element.classList.contains('pacman-dot') ||
          element.classList.contains('pacman-ghost')) {
        continue
      }
      
      // Check if this is a hoverable element
      if (element.classList.contains('btn') ||
          element.classList.contains('project-card') ||
          element.classList.contains('tech-card') ||
          element.classList.contains('badge-hover') ||
          element.tagName === 'A') {
        newHoveredElement = element
        break
      }
      
      // Check if parent is hoverable
      const hoverableParent = element.closest('.btn, .project-card, .tech-card, .badge-hover, a')
      if (hoverableParent) {
        newHoveredElement = hoverableParent
        break
      }
    }
    
    // Update hover state
    if (newHoveredElement !== this.hoveredElement) {
      // Remove old hover
      if (this.hoveredElement) {
        this.hoveredElement.classList.remove('pacman-hover')
        
        const leaveEvent = new CustomEvent('pacman:leave', { 
          detail: { element: this.hoveredElement }
        })
        this.hoveredElement.dispatchEvent(leaveEvent)
      }
      
      // Add new hover
      if (newHoveredElement) {
        newHoveredElement.classList.add('pacman-hover')
        
        const hoverEvent = new CustomEvent('pacman:hover', { 
          detail: { element: newHoveredElement }
        })
        newHoveredElement.dispatchEvent(hoverEvent)
      }
      
      this.hoveredElement = newHoveredElement
    }
  }

  // ============================================
  // KEYBOARD CONTROLS
  // ============================================

  /**
   * Handle keyboard input for Pac-Man movement
   * Supports WASD and arrow keys
   */
  handleKeydown(event) {
    // Handle pause toggle (P key)
    if ((event.key === 'p' || event.key === 'P') && this.isGameActive && !this.isStarting && !this.isDying) {
      this.togglePause()
      event.preventDefault()
      return
    }

    // Handle quit (Escape key)
    if (event.key === 'Escape') {
      if (this.isPaused) {
        // If paused, unpause first (without countdown), then quit
        this.isPaused = false
        const pauseOverlay = document.querySelector('.pacman-pause-overlay')
        if (pauseOverlay) {
          pauseOverlay.remove()
        }
      }
      this.stopGame()
      event.preventDefault()
      return
    }

    // Auto-start game on first movement key press
    const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D']

    if (movementKeys.includes(event.key) && !this.isGameActive && !this.isStarting) {
      this.startGame()
      // Don't process movement yet - wait for intro music
      event.preventDefault()
      return
    }

    // Prevent movement during intro music, pause, or death
    if (this.isStarting || !this.isGameActive || this.isDying || this.isPaused) {
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
    
    console.log("🎮 Starting Pac-Man game!")
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
    this.updateHUD()

    // Reset difficulty settings
    this.ghostSpeed = 135 // pixels/second
    this.powerModeDuration = 7000
    this.powerModeWarningDuration = 2000

    // Reset Pac-Man position to initial position
    this.pacmanPosition = { ...this.initialPacmanPosition }
    this.pacmanVelocity = { x: 0, y: 0 }
    this.updatePacmanPosition()

    // Clear collected dot positions for fresh start
    this.collectedDotPositions.clear()

    // Initialize locked sections (only when game starts)
    this.initializeLockedSections()

    // Setup hover detection (no collisions)
    this.buildCollisionMap()

    // Generate game elements
    this.generateDots()
    this.createGhosts()
    
    // Smoothly scroll to starting position before beginning
    const targetScrollY = this.initialPacmanPosition.y - (window.innerHeight / 2)
    const clampedTargetY = Math.max(0, Math.min(targetScrollY, document.documentElement.scrollHeight - window.innerHeight))
    
    // Only scroll if we're not already near the starting position
    if (Math.abs(window.scrollY - clampedTargetY) > 100) {
      console.log("📜 Scrolling to starting position...")
      await this.smoothScrollTo(clampedTargetY, 800)
    }
    
    // Play beginning sound
    console.log("🎵 Playing intro music...")
    this.playSound('beginning', true)
    
    // Show countdown while intro music plays
    await this.showCountdown()
    
    // Wait for the beginning sound to finish before starting gameplay
    const beginningAudio = this.audioFiles.beginning
    
    const onBeginningEnded = () => {
      console.log("🎵 Intro music finished, starting gameplay!")
      this.isGameActive = true
      this.isStarting = false

      // Start game loop
      this.gameLoop()

      // Remove event listener
      beginningAudio.removeEventListener('ended', onBeginningEnded)
    }

    beginningAudio.addEventListener('ended', onBeginningEnded)

    // Fallback: Start anyway after 5 seconds if sound doesn't fire ended event
    setTimeout(() => {
      if (!this.isGameActive && this.isStarting) {
        console.log("⚠️ Intro music timeout, starting gameplay anyway")
        beginningAudio.removeEventListener('ended', onBeginningEnded)
        this.isGameActive = true
        this.isStarting = false

        this.gameLoop()
      }
    }, 5000)
  }

  stopGame() {
    console.log("🛑 Stopping Pac-Man game!")
    this.isGameActive = false
    this.isStarting = false
    this.isPaused = false
    this.gameContainerTarget.classList.remove('active')
    this.hudTarget.classList.remove('active')
    if (this.hasPageTintTarget) {
      this.pageTintTarget.classList.remove('active')
    }

    // Remove pause overlay if it exists
    const pauseOverlay = document.querySelector('.pacman-pause-overlay')
    if (pauseOverlay) {
      pauseOverlay.remove()
    }
    
    // Clear any active hover effects
    if (this.hoveredElement) {
      this.hoveredElement.classList.remove('pacman-hover')
      const leaveEvent = new CustomEvent('pacman:leave', { 
        detail: { element: this.hoveredElement }
      })
      this.hoveredElement.dispatchEvent(leaveEvent)
      this.hoveredElement = null
    }
    
    // Remove all pacman-hover classes from any elements
    document.querySelectorAll('.pacman-hover').forEach(el => {
      el.classList.remove('pacman-hover')
    })

    // Stop all sounds
    this.stopAllSounds()

    // Re-enable page scrolling
    document.body.style.overflow = ''

    // Show start hint again with fade in
    if (this.hasStartHintTarget) {
      this.startHintTarget.style.display = 'block'
      this.startHintTarget.style.opacity = '0'
      this.startHintTarget.style.transform = 'scale(0.9)'
      setTimeout(() => {
        this.startHintTarget.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
        this.startHintTarget.style.opacity = '1'
        this.startHintTarget.style.transform = 'scale(1)'
      }, 10)
    }

    // Remove wall indicators
    document.querySelectorAll('.pacman-wall').forEach(el => {
      el.classList.remove('pacman-wall')
    })

    // Remove section locks
    this.removeAllSectionLocks()

    // Clean up dots, items, and ghosts
    this.dots.forEach(dot => dot.element && dot.element.remove())
    this.items.forEach(item => item.element && item.element.remove())
    this.ghosts.forEach(ghost => {
      if (ghost.element) ghost.element.remove()
      if (ghost.indicator) ghost.indicator.remove()
    })
    this.dots = []
    this.items = []
    this.ghosts = []

    // Clear all effect timers
    Object.keys(this.effectTimers).forEach(key => {
      clearTimeout(this.effectTimers[key])
    })
    this.effectTimers = {}

    // Reset active effects
    this.activeEffects = {
      speedBoost: false,
      slowDown: false,
      shield: false,
      freeze: false,
      doublePoints: false
    }

    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId)
    }
  }

  async togglePause() {
    if (this.isPaused) {
      // Unpausing - keep paused during countdown
      console.log("▶️ Game resuming...")
      await this.hidePauseOverlay()
      // Show countdown before resuming (game stays paused)
      await this.showCountdown()
      // Only unpause after countdown completes
      this.isPaused = false
      console.log("▶️ Game resumed")
    } else {
      // Pausing
      this.isPaused = true
      console.log("⏸️ Game paused")
      this.showPauseOverlay()
    }
  }

  showPauseOverlay() {
    // Create pause overlay
    const pauseOverlay = document.createElement('div')
    pauseOverlay.className = 'pacman-pause-overlay'
    pauseOverlay.innerHTML = `
      <div class="pause-content">
        <div class="pause-title">⏸️ PAUSED</div>
        <div class="pause-message">Press P to resume</div>
        <div class="pause-controls">
          <div class="control-row">
            <span class="control-key">WASD / Arrows</span>
            <span class="control-desc">Move</span>
          </div>
          <div class="control-row">
            <span class="control-key">P</span>
            <span class="control-desc">Pause/Resume</span>
          </div>
          <div class="control-row">
            <span class="control-key">Esc</span>
            <span class="control-desc">Quit Game</span>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(pauseOverlay)

    // Animate in
    requestAnimationFrame(() => {
      pauseOverlay.classList.add('show')
    })
  }

  hidePauseOverlay() {
    return new Promise((resolve) => {
      const pauseOverlay = document.querySelector('.pacman-pause-overlay')
      if (pauseOverlay) {
        pauseOverlay.classList.remove('show')
        setTimeout(() => {
          pauseOverlay.remove()
          resolve()
        }, 300)
      } else {
        resolve()
      }
    })
  }

  // ============================================
  // DOT & PELLET GENERATION
  // ============================================

  /**
   * Generate dots across the playable area
   * Creates a grid of dots and strategic power pellets
   * Excludes locked sections
   */
  generateDots() {
    // Clear existing dots
    this.dots = []
    const existingDots = this.element.querySelectorAll('.pacman-dot')
    existingDots.forEach(dot => dot.remove())

    // Get full page dimensions
    const viewportWidth = window.innerWidth
    const pageHeight = document.documentElement.scrollHeight

    // Get header and footer boundaries
    const header = document.querySelector('.header')
    const footer = document.querySelector('.footer')

    let minY = 50
    let maxY = pageHeight - 50

    if (header) {
      const headerRect = header.getBoundingClientRect()
      minY = headerRect.top + window.scrollY + headerRect.height + 50
    }

    if (footer) {
      const footerRect = footer.getBoundingClientRect()
      maxY = footerRect.top + window.scrollY - 50
    }

    // Get boundaries of ALL sections (to add buffer zones at bottom)
    const sectionZones = []
    this.sections.forEach(section => {
      const sectionElement = document.getElementById(section.id)
      if (sectionElement) {
        const rect = sectionElement.getBoundingClientRect()
        sectionZones.push({
          top: rect.top + window.scrollY - 80, // Top buffer
          bottom: rect.top + window.scrollY + rect.height + 80, // Bottom buffer
          locked: !section.unlocked
        })
      }
    })

    // REDUCE dot density for better performance
    const dotSpacing = 100 // Increased from 60 for fewer dots
    const margin = 80

    for (let x = margin; x < viewportWidth - margin; x += dotSpacing) {
      for (let y = minY; y < maxY; y += dotSpacing) {
        // Check if this position is in any section buffer zone
        const inBufferZone = sectionZones.some(zone => {
          // Skip dots in locked sections or in buffer zones
          return (zone.locked && y >= zone.top && y <= zone.bottom) ||
                 (y >= zone.bottom - 80 && y <= zone.bottom) // Bottom buffer of all sections
        })

        // Check if this position was already collected
        const posKey = `${Math.round(x)},${Math.round(y)}`
        const alreadyCollected = this.collectedDotPositions.has(posKey)

        if (!inBufferZone && !alreadyCollected) {
          this.createDot(x, y)
        }
      }
    }

    // Add power pellets at random strategic locations (not just corners)
    const playableHeight = maxY - minY
    const sections = Math.ceil(playableHeight / window.innerHeight)
    const pelletsPerSection = 3 // Fewer pellets, more spread out

    for (let i = 0; i < sections; i++) {
      const sectionY = minY + (i * window.innerHeight)
      const sectionHeight = Math.min(window.innerHeight, maxY - sectionY)

      // Generate random positions for pellets, ensuring good spread
      const pelletPositions = []
      for (let j = 0; j < pelletsPerSection; j++) {
        // Divide section into horizontal thirds and place one pellet in each
        const third = Math.floor(viewportWidth / 3)
        const xPos = third * j + margin + Math.random() * (third - margin * 2)

        // Random vertical position within the section
        const yPos = sectionY + 150 + Math.random() * (sectionHeight - 300)

        pelletPositions.push({ x: xPos, y: yPos })
      }

      pelletPositions.forEach(pos => {
        if (pos.y < maxY && pos.y > minY) {
          // Check if pellet position is in any buffer zone or too close to another pellet
          const inBufferZone = sectionZones.some(zone => {
            return (zone.locked && pos.y >= zone.top && pos.y <= zone.bottom) ||
                   (pos.y >= zone.bottom - 80 && pos.y <= zone.bottom)
          })

          // Check if too close to existing pellets (minimum 200px apart)
          const tooClose = this.dots.some(dot => {
            if (dot.isPowerPellet) {
              const dist = Math.sqrt(Math.pow(pos.x - dot.x, 2) + Math.pow(pos.y - dot.y, 2))
              return dist < 200
            }
            return false
          })

          if (!inBufferZone && !tooClose) {
            this.createPowerPellet(pos.x, pos.y)
          }
        }
      })
    }

    console.log(`Generated ${this.dots.length} dots in playable area (${sections} sections, excluding locked zones) - optimized for performance`)

    // Spawn initial items after dots are generated
    this.spawnRandomItems()
  }

  /**
   * Spawn random powerup items across the playable area
   * Avoids locked sections
   */
  spawnRandomItems() {
    const viewportWidth = window.innerWidth
    const pageHeight = document.documentElement.scrollHeight

    // Get playable boundaries (same as dots)
    const header = document.querySelector('.header')
    const footer = document.querySelector('.footer')

    let minY = 50
    let maxY = pageHeight - 50

    if (header) {
      const headerRect = header.getBoundingClientRect()
      minY = headerRect.top + window.scrollY + headerRect.height + 50
    }

    if (footer) {
      const footerRect = footer.getBoundingClientRect()
      maxY = footerRect.top + window.scrollY - 50
    }

    // Spawn 3-5 random items across the playable area
    const itemCount = 3 + Math.floor(Math.random() * 3)
    let spawned = 0
    let attempts = 0
    const maxAttempts = 50 // Prevent infinite loop

    while (spawned < itemCount && attempts < maxAttempts) {
      attempts++

      // Random position
      const x = 80 + Math.random() * (viewportWidth - 160)
      const y = minY + Math.random() * (maxY - minY)

      // Check if position is in a locked section
      const isInLockedSection = this.sections.some(section => {
        if (section.unlocked) return false // Skip unlocked sections

        const sectionElement = document.getElementById(section.id)
        if (!sectionElement) return false

        const rect = sectionElement.getBoundingClientRect()
        const sectionTop = rect.top + window.scrollY
        const sectionBottom = sectionTop + rect.height

        // Add 100px buffer above and below locked section
        return y >= (sectionTop - 100) && y <= (sectionBottom + 100)
      })

      // Skip this position if it's in a locked section
      if (isInLockedSection) {
        continue
      }

      // Random item type (weighted probabilities)
      const itemTypeKeys = Object.keys(this.itemTypes)
      const weights = [25, 10, 15, 20, 20, 10] // Speed, Slow, Shield, Freeze, Double, Life

      let totalWeight = weights.reduce((a, b) => a + b, 0)
      let random = Math.random() * totalWeight

      let selectedType = itemTypeKeys[0]
      for (let j = 0; j < weights.length; j++) {
        if (random < weights[j]) {
          selectedType = itemTypeKeys[j]
          break
        }
        random -= weights[j]
      }

      this.createItem(x, y, selectedType)
      spawned++
    }

    console.log(`🎁 Spawned ${spawned} powerup items (avoided locked sections)`)
  }

  /**
   * Create a powerup item at specified position
   */
  createItem(x, y, type) {
    const itemConfig = this.itemTypes[type]
    if (!itemConfig) return

    const item = document.createElement('div')
    item.className = `pacman-item ${itemConfig.positive ? 'item-positive' : 'item-negative'}`
    item.innerHTML = `
      <div class="item-emoji" style="color: ${itemConfig.color}">${itemConfig.emoji}</div>
      <div class="item-label" style="color: ${itemConfig.color}">${itemConfig.name}</div>
    `
    item.style.left = `${x}px`
    item.style.top = `${y}px`
    this.gameContainerTarget.appendChild(item)

    this.items.push({
      element: item,
      x: x,
      y: y,
      type: type,
      config: itemConfig,
      collected: false
    })
  }

  /**
   * Create a collectible dot at specified position
   * Uses custom SVG for better performance than images
   */
  createDot(x, y) {
    const dot = document.createElement('div')
    dot.className = 'pacman-dot'
    // Simpler SVG dot for better performance
    dot.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" class="dot-sprite">
        <circle cx="6" cy="6" r="5" fill="#ffd700" />
      </svg>
    `
    dot.style.left = `${x}px`
    dot.style.top = `${y}px`
    this.gameContainerTarget.appendChild(dot)
    
    this.dots.push({
      element: dot,
      x: x,
      y: y,
      collected: false,
      points: 10
    })
  }

  createPowerPellet(x, y) {
    const pellet = document.createElement('div')
    pellet.className = 'pacman-dot pacman-power-pellet'
    // Simpler SVG power pellet for better performance
    pellet.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="pellet-sprite">
        <circle cx="10" cy="10" r="9" fill="#6366f1" opacity="0.9"/>
        <circle cx="10" cy="10" r="5" fill="#ffffff" opacity="0.6"/>
      </svg>
    `
    pellet.style.left = `${x}px`
    pellet.style.top = `${y}px`
    this.gameContainerTarget.appendChild(pellet)
    
    this.dots.push({
      element: pellet,
      x: x,
      y: y,
      collected: false,
      points: 50,
      isPowerPellet: true
    })
  }

  // ============================================
  // GHOST CREATION & PERSONALITIES
  // ============================================

  /**
   * Create all 4 ghosts with unique AI personalities
   * - Blinky (Red): Aggressive chaser
   * - Pinky (Pink): Ambusher (targets ahead)
   * - Inky (Cyan): Flanker (uses Blinky's position)
   * - Clyde (Orange): Shy (retreats when close)
   */
  createGhosts() {
    const ghostConfigs = [
      { color: 'red', personality: 'chase', name: 'Blinky' },
      { color: 'pink', personality: 'ambush', name: 'Pinky' },
      { color: 'cyan', personality: 'patrol', name: 'Inky' },
      { color: 'orange', personality: 'scatter', name: 'Clyde' }
    ]
    const viewportWidth = window.innerWidth
    
    // Spawn ghosts CLOSER to Pac-Man (300-400px away instead of 1000px)
    const pacmanY = this.pacmanPosition.y
    const ghostSpawnY = pacmanY + 350 // Much closer - just off initial screen
    
    const startPositions = [
      { x: viewportWidth * 0.2, y: ghostSpawnY },
      { x: viewportWidth * 0.4, y: ghostSpawnY + 50 },
      { x: viewportWidth * 0.6, y: ghostSpawnY + 50 },
      { x: viewportWidth * 0.8, y: ghostSpawnY }
    ]
    
    ghostConfigs.forEach((config, index) => {
      const ghost = document.createElement('div')
      ghost.className = `pacman-ghost ghost-${config.color}`
      const img = document.createElement('img')
      img.className = 'ghost-sprite'
      img.alt = config.name
      img.src = this.getGhostSprite(config.color, 'right', 1)
      ghost.appendChild(img)
      ghost.style.left = `${startPositions[index].x}px`
      ghost.style.top = `${startPositions[index].y}px`
      this.gameContainerTarget.appendChild(ghost)
      
      this.ghosts.push({
        element: ghost,
        x: startPositions[index].x,
        y: startPositions[index].y,
        color: config.color,
        personality: config.personality,
        name: config.name,
        direction: 'right',
        velocityX: 0,
        velocityY: 0,
        frightened: false,
        eaten: false,
        animationFrame: 1,
        scatterTimer: 0
      })
    })
  }

  // ============================================
  // ASSET PATH HELPERS
  // ============================================

  /**
   * Get asset path for Pac-Man game sprites
   */
  getAssetPath(filename) {
    // Build the key to lookup in the manifest
    const assetKey = `pacman-game/${filename}`

    // Use asset manifest for production fingerprinted paths (Rails asset_path already includes /assets/)
    if (this.assetPaths && this.assetPaths[assetKey]) {
      // The manifest value from Rails asset_path() already includes /assets/ prefix
      return this.assetPaths[assetKey]
    }
    // Fallback to direct asset path (for development)
    return `/assets/${assetKey}`
  }
  
  getPacmanSprite() {
    // Cycle through Pac-Man animation frames
    const sprites = ['pacman/pacman_open_more.png', 'pacman/pacman_open_less.png', 'pacman/pacman_closed.png']
    return this.getAssetPath(sprites[this.pacmanAnimationState])
  }
  
  getGhostSprite(color, direction, frame) {
    // Get the appropriate ghost sprite based on color, direction, and animation frame
    const ghostName = color === 'red' ? 'blinky' : 
                      color === 'pink' ? 'pinky' : 
                      color === 'cyan' ? 'inky' : 'clyde'
    
    // For left direction, we use right sprites but will flip with CSS
    const spriteDirection = direction === 'left' ? 'right' : direction
    
    return this.getAssetPath(`ghosts/${ghostName}-${spriteDirection}-${frame}.png`)
  }
  
  getFrightenedSprite(frame, ending = false) {
    // Get frightened ghost sprite (blue or white when ending)
    const color = ending ? 'white' : 'blue'
    return this.getAssetPath(`ghosts/frightened-${color}-${frame}.png`)
  }
  
  getEyesSprite(direction) {
    // Get ghost eyes sprite for when ghost is eaten
    // For left direction, we use right sprites but will flip with CSS
    const spriteDirection = direction === 'left' ? 'right' : direction
    return this.getAssetPath(`ghosts/eyes-${spriteDirection}.png`)
  }

  // ============================================
  // MAIN GAME LOOP
  // ============================================

  /**
   * Main game loop - frame-rate independent using delta time
   * Handles all game logic, movement, collisions, and rendering
   */
  gameLoop(timestamp = performance.now()) {
    if (!this.isGameActive) return

    // Don't allow movement during death/respawn or pause
    if (this.isDying || this.isPaused) {
      this.lastFrameTime = null // Reset time tracking when paused
      this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts))
      return
    }

    // Calculate delta time (time since last frame in seconds)
    if (this.lastFrameTime === null) {
      this.lastFrameTime = timestamp
      // Skip first frame to avoid deltaTime = 0
      this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts))
      return
    }

    const deltaTime = (timestamp - this.lastFrameTime) / 1000 // Convert to seconds
    this.lastFrameTime = timestamp

    // Cap delta time to prevent huge jumps (e.g., when tab loses focus)
    const cappedDelta = Math.min(deltaTime, 0.1) // Max 100ms per frame

    // Calculate next position with delta-time based movement
    const nextX = this.pacmanPosition.x + (this.pacmanVelocity.x * cappedDelta)
    const nextY = this.pacmanPosition.y + (this.pacmanVelocity.y * cappedDelta)

    // Check if next position would enter a locked section
    const sectionBoundary = this.checkSectionBoundary(nextX, nextY)

    if (sectionBoundary) {
      // Stop at the boundary
      this.pacmanPosition.y = sectionBoundary
      this.pacmanVelocity.y = 0 // Stop vertical movement
      this.flashBoundary('section') // Visual feedback
    } else {
      // Free movement
      this.pacmanPosition.x = nextX
      this.pacmanPosition.y = nextY
    }

    // Wrap around screen edges (Pac-Man style!)
    const margin = 30
    if (this.pacmanPosition.x < -margin) {
      this.pacmanPosition.x = window.innerWidth + margin
    } else if (this.pacmanPosition.x > window.innerWidth + margin) {
      this.pacmanPosition.x = -margin
    }

    // Clamp vertical position to stay between header and footer
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

    // Clamp Pac-Man position and flash on boundary hit
    if (this.pacmanPosition.y < minY) {
      this.pacmanPosition.y = minY
      if (this.pacmanVelocity.y < 0) {
        this.flashBoundary('header')
      }
    }
    if (this.pacmanPosition.y > maxY) {
      this.pacmanPosition.y = maxY
      if (this.pacmanVelocity.y > 0) {
        this.flashBoundary('footer')
      }
    }

    // Check hover effects on page elements
    this.checkHoverEffects()

    // CRITICAL: Scroll BEFORE rendering to ensure smooth centering
    this.syncScroll()

    // Align fixed overlay with document coordinates
    this.updateContainerTransform()

    this.updatePacmanPosition()
    this.animatePacmanMouth(cappedDelta)

    // Check dot collisions
    this.checkDotCollisions()

    // Check item collisions
    this.checkItemCollisions()

    // Check key collection
    this.checkKeyCollection()

    // Update ghosts with delta time for frame-rate independent movement
    this.updateGhosts(cappedDelta)

    // Update off-screen ghost indicators
    this.updateGhostIndicators()

    // Check ghost collisions
    this.checkGhostCollisions()

    // Optimize dot rendering
    this.optimizeDotVisibility()

    // Check win condition (all dots collected AND array not empty AND not regenerating)
    if (!this.regeneratingDots && this.dots.length > 0 && this.dots.every(dot => dot.collected)) {
      this.winGame()
      return
    }

    // Continue game loop
    this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts))
  }

  updateContainerTransform() {
    // Our container is fixed; shift it so document-space y coords render correctly
    if (this.hasGameContainerTarget) {
      const y = -window.scrollY
      if (this._lastContainerTranslateY !== y) {
        this.gameContainerTarget.style.transform = `translateY(${y}px)`
        this._lastContainerTranslateY = y
      }
    }
  }

  updatePacmanPosition() {
    this.pacmanTarget.style.left = `${this.pacmanPosition.x}px`
    this.pacmanTarget.style.top = `${this.pacmanPosition.y}px`
    
    // Update HUD position to follow Pac-Man
    this.updateHUDPosition()
    
    // Update rotation based on direction
    let rotation = 0
    switch(this.pacmanDirection) {
      case 'right': rotation = 0; break
      case 'down': rotation = 90; break
      case 'left': rotation = 180; break
      case 'up': rotation = 270; break
    }
    
    const sprite = this.pacmanTarget.querySelector('.pacman-sprite')
    if (sprite) {
      sprite.style.transform = `rotate(${rotation}deg)`
      // Update sprite image based on animation state
      sprite.src = this.getPacmanSprite()
    }
  }
  
  updateHUDPosition() {
    // Position HUD to stay in top-right of viewport, moving with Pac-Man's scroll position
    if (this.hasHudTarget) {
      const viewportTop = window.scrollY
      this.hudTarget.style.top = `${viewportTop + 20}px` // Always 20px from top of viewport
    }
  }

  animatePacmanMouth(deltaTime) {
    // Animate mouth opening/closing through all frames
    // Only animate when moving
    if (this.pacmanVelocity.x === 0 && this.pacmanVelocity.y === 0) {
      return
    }

    // Update animation timer (cycle every 0.083 seconds = 12 times per second)
    this.animationTimer += deltaTime
    const animationInterval = 0.083 // 5 frames at 60fps

    if (this.animationTimer >= animationInterval) {
      this.animationTimer -= animationInterval // Subtract instead of reset to avoid drift
      this.pacmanAnimationState = (this.pacmanAnimationState + 1) % 3
      const sprite = this.pacmanTarget.querySelector('.pacman-sprite')
      if (sprite) {
        sprite.src = this.getPacmanSprite()
      }
    }
  }

  syncScroll() {
    // Keep Pac-Man vertically centered by directly scrolling to the correct position
    const viewportHeight = window.innerHeight

    // Calculate where we need to scroll to keep Pac-Man centered
    let targetScroll = this.pacmanPosition.y - (viewportHeight / 2)

    // Clamp scroll position to page bounds
    const maxScroll = document.documentElement.scrollHeight - viewportHeight
    targetScroll = Math.max(0, Math.min(targetScroll, maxScroll))

    // Set scroll position to keep Pac-Man centered
    document.documentElement.scrollTop = targetScroll
  }
  
  optimizeDotVisibility() {
    // Only render dots within or near viewport for performance
    const viewportTop = window.scrollY
    const viewportBottom = viewportTop + window.innerHeight
    const renderBuffer = window.innerHeight * 0.5 // Render dots 50% viewport beyond edges
    
    this.dots.forEach(dot => {
      if (dot.collected) return
      
      const inRenderRange = dot.y >= viewportTop - renderBuffer && 
                           dot.y <= viewportBottom + renderBuffer
      
      if (inRenderRange) {
        dot.element.style.display = 'block'
      } else {
        dot.element.style.display = 'none'
      }
    })
  }

  checkDotCollisions() {
    const collisionRadius = 25

    this.dots.forEach(dot => {
      if (dot.collected) return

      const distance = Math.sqrt(
        Math.pow(this.pacmanPosition.x - dot.x, 2) +
        Math.pow(this.pacmanPosition.y - dot.y, 2)
      )

      if (distance < collisionRadius) {
        dot.collected = true
        dot.element.classList.add('collected')
        this.score += dot.points
        this.dotsScore += dot.points // Track dots score separately for section unlocking
        this.updateHUD()

        // Track this dot position as collected (to prevent regeneration)
        const posKey = `${Math.round(dot.x)},${Math.round(dot.y)}`
        this.collectedDotPositions.add(posKey)

        // Play appropriate sound
        if (dot.isPowerPellet) {
          // Power pellet sound
          this.playSound('eatFruit', true)
          this.activatePowerMode()
        } else {
          // Regular dot - play chomp sound
          this.playSound('chomp', true)
        }

        // Remove dot immediately without animation for better performance
        if (dot.element && dot.element.parentNode) {
          dot.element.remove()
        }

        // Check if we reached a section threshold
        this.checkSectionThreshold()
      }
    })
  }

  checkItemCollisions() {
    const collisionRadius = 30

    this.items.forEach(item => {
      if (item.collected) return

      const distance = Math.sqrt(
        Math.pow(this.pacmanPosition.x - item.x, 2) +
        Math.pow(this.pacmanPosition.y - item.y, 2)
      )

      if (distance < collisionRadius) {
        item.collected = true
        item.element.classList.add('collected')

        // Add points (can be negative for bad items!)
        const pointsEarned = item.config.points * (this.activeEffects.doublePoints ? 2 : 1)
        this.score += pointsEarned
        this.updateHUD()

        // Show pickup notification
        this.showItemNotification(item)

        // Apply item effect
        this.applyItemEffect(item.type, item.config)

        // Play sound
        if (item.config.positive) {
          this.playSound('eatFruit', true)
        } else {
          this.playSound('death', true) // Use death sound for negative items
        }

        // Remove item with animation
        setTimeout(() => {
          if (item.element && item.element.parentNode) {
            item.element.remove()
          }
        }, 300)
      }
    })
  }

  applyItemEffect(type, config) {
    switch (type) {
      case 'speedBoost':
        this.activateSpeedBoost(config.duration)
        break
      case 'slowDown':
        this.activateSlowDown(config.duration)
        break
      case 'shield':
        this.activateShield(config.duration)
        break
      case 'freeze':
        this.activateGhostFreeze(config.duration)
        break
      case 'doublePoints':
        this.activateDoublePoints(config.duration)
        break
      case 'extraLife':
        this.lives++
        this.updateHUD()
        this.playSound('extraPac', true)
        console.log("❤️ Extra life gained!")
        break
    }
  }

  activateSpeedBoost(duration) {
    this.activeEffects.speedBoost = true
    this.pacmanSpeed = 180 * 1.5 // 50% faster (270 pixels/second)
    this.pacmanTarget.classList.add('speed-boost')

    // Create cooldown bar under Pac-Man
    this.showEffectCooldown('speedBoost', duration)

    this.clearEffectTimer('speedBoost')
    this.effectTimers.speedBoost = setTimeout(() => {
      this.activeEffects.speedBoost = false
      this.pacmanSpeed = 180 // Reset to normal speed
      this.pacmanTarget.classList.remove('speed-boost')
      this.removeEffectCooldown('speedBoost')
    }, duration)

    console.log(`⚡ Speed boost activated for ${duration / 1000}s!`)
  }

  activateSlowDown(duration) {
    this.activeEffects.slowDown = true
    this.pacmanSpeed = 180 * 0.6 // 40% slower (108 pixels/second)
    this.pacmanTarget.classList.add('slow-down')

    // Create cooldown bar under Pac-Man
    this.showEffectCooldown('slowDown', duration)

    this.clearEffectTimer('slowDown')
    this.effectTimers.slowDown = setTimeout(() => {
      this.activeEffects.slowDown = false
      this.pacmanSpeed = 180 // Reset to normal speed
      this.pacmanTarget.classList.remove('slow-down')
      this.removeEffectCooldown('slowDown')
    }, duration)

    console.log(`🐌 Slowed down for ${duration / 1000}s!`)
  }

  activateShield(duration) {
    this.activeEffects.shield = true
    this.pacmanTarget.classList.add('shielded')
    
    // Create cooldown bar under Pac-Man
    this.showEffectCooldown('shield', duration)

    this.clearEffectTimer('shield')
    this.effectTimers.shield = setTimeout(() => {
      this.activeEffects.shield = false
      this.pacmanTarget.classList.remove('shielded')
      this.removeEffectCooldown('shield')
    }, duration)

    console.log(`🛡️ Shield activated for ${duration / 1000}s!`)
  }
  
  /**
   * Show effect cooldown bar under Pac-Man
   */
  showEffectCooldown(effectName, duration) {
    // Remove existing cooldown bar if any
    this.removeEffectCooldown(effectName)
    
    const config = this.itemTypes[effectName]
    const cooldownBar = document.createElement('div')
    cooldownBar.className = 'pacman-effect-cooldown'
    cooldownBar.dataset.effect = effectName
    cooldownBar.style.cssText = `
      position: absolute;
      bottom: -15px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 6px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 3px;
      overflow: hidden;
      z-index: 10;
    `
    
    const fill = document.createElement('div')
    fill.className = 'effect-cooldown-fill'
    fill.style.cssText = `
      width: 100%;
      height: 100%;
      background: ${config.color};
      box-shadow: 0 0 8px ${config.color};
      border-radius: 3px;
      transition: width ${duration}ms linear;
    `
    
    cooldownBar.appendChild(fill)
    this.pacmanTarget.appendChild(cooldownBar)
    
    // Animate fill to 0
    requestAnimationFrame(() => {
      fill.style.width = '0%'
    })
  }
  
  /**
   * Remove effect cooldown bar
   */
  removeEffectCooldown(effectName) {
    const existingBar = this.pacmanTarget.querySelector(`[data-effect="${effectName}"]`)
    if (existingBar) {
      existingBar.remove()
    }
  }

  activateGhostFreeze(duration) {
    this.activeEffects.freeze = true
    
    // Create cooldown bar under Pac-Man
    this.showEffectCooldown('freeze', duration)

    // Freeze all ghosts
    this.ghosts.forEach(ghost => {
      if (!ghost.frozen) {
        ghost.frozen = true
        ghost.element.classList.add('frozen')
      }
    })

    this.clearEffectTimer('freeze')
    this.effectTimers.freeze = setTimeout(() => {
      this.activeEffects.freeze = false
      this.removeEffectCooldown('freeze')
      this.ghosts.forEach(ghost => {
        ghost.frozen = false
        ghost.element.classList.remove('frozen')
      })
    }, duration)

    console.log(`❄️ Ghosts frozen for ${duration / 1000}s!`)
  }

  activateDoublePoints(duration) {
    this.activeEffects.doublePoints = true
    this.pacmanTarget.classList.add('double-points')
    
    // Create cooldown bar under Pac-Man
    this.showEffectCooldown('doublePoints', duration)

    this.clearEffectTimer('doublePoints')
    this.effectTimers.doublePoints = setTimeout(() => {
      this.activeEffects.doublePoints = false
      this.pacmanTarget.classList.remove('double-points')
      this.removeEffectCooldown('doublePoints')
    }, duration)

    console.log(`⭐ Double points activated for ${duration / 1000}s!`)
  }

  clearEffectTimer(effectType) {
    if (this.effectTimers[effectType]) {
      clearTimeout(this.effectTimers[effectType])
      delete this.effectTimers[effectType]
    }
  }

  showItemNotification(item) {
    const notification = document.createElement('div')
    notification.className = 'item-notification'
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2.5rem;
      font-weight: 800;
      color: ${item.config.color};
      text-shadow: 0 0 20px ${item.config.color}, 0 0 40px ${item.config.color};
      z-index: 10005;
      animation: itemNotification 1.5s ease-out forwards;
      pointer-events: none;
    `
    notification.textContent = `${item.config.emoji} ${item.config.name}`

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.remove()
    }, 1500)
  }

  /**
   * Check if score reached a section threshold and spawn key
   */
  checkSectionThreshold() {
    if (this.currentSection >= this.sections.length) return
    if (this.keySpawned) return // Already spawned key for this section

    const section = this.sections[this.currentSection]

    if (this.dotsScore >= section.threshold) {
      // Clear ALL dots (collected and uncollected) to prepare for key
      this.dots.forEach(dot => {
        if (dot.element && dot.element.parentNode) {
          dot.element.remove()
        }
      })

      // Clear the dots array completely - we'll regenerate after key is collected
      this.dots = []

      // Spawn the key
      this.spawnKey()
    }
  }

  /**
   * Spawn a key in the center of the screen
   */
  spawnKey() {
    this.keySpawned = true

    // Create key element
    const key = document.createElement('div')
    key.className = 'pacman-key'

    const keyImg = document.createElement('img')
    keyImg.src = this.getAssetPath('items/key.png')
    keyImg.alt = 'Key'
    keyImg.className = 'key-sprite'
    key.appendChild(keyImg)

    // Position at center of viewport
    const keyX = window.innerWidth / 2
    const keyY = window.scrollY + window.innerHeight / 2

    key.style.left = `${keyX}px`
    key.style.top = `${keyY}px`

    this.gameContainerTarget.appendChild(key)

    this.key = {
      element: key,
      x: keyX,
      y: keyY,
      collected: false
    }

    console.log(`🔑 Key spawned! Collect it to unlock "${this.sections[this.currentSection].name}"`)
  }

  /**
   * Check if Pac-Man collected the key
   */
  checkKeyCollection() {
    if (!this.key || this.key.collected) return

    const collisionRadius = 35

    const distance = Math.sqrt(
      Math.pow(this.pacmanPosition.x - this.key.x, 2) +
      Math.pow(this.pacmanPosition.y - this.key.y, 2)
    )

    if (distance < collisionRadius) {
      this.key.collected = true
      this.keyCollected = true

      // Play sound
      this.playSound('eatFruit', true)

      // Remove key with animation
      this.key.element.classList.add('collected')
      setTimeout(() => {
        if (this.key.element && this.key.element.parentNode) {
          this.key.element.remove()
        }
      }, 300)

      // Unlock the section
      this.unlockSection(this.currentSection)

      // Move to next section
      this.currentSection++
      this.keySpawned = false
      this.keyCollected = false

      // Increase difficulty as sections unlock
      this.increaseDifficulty()

      // Regenerate dots for next section
      if (this.currentSection < this.sections.length) {
        this.regeneratingDots = true // Flag to prevent win condition during regeneration
        setTimeout(() => {
          this.generateDots()
          this.regeneratingDots = false
        }, 800)
      } else {
        // All sections unlocked, regenerate dots one final time
        this.regeneratingDots = true
        setTimeout(() => {
          this.generateDots()
          this.regeneratingDots = false
        }, 800)
      }

      console.log(`🎉 Key collected! Section unlocked!`)
    }
  }

  activatePowerMode() {
    this.powerMode = true
    this.powerModeEnding = false
    this.pacmanTarget.classList.add('powered')

    // Make ghosts frightened (not eaten ones)
    this.ghosts.forEach(ghost => {
      if (!ghost.eaten) {
        ghost.frightened = true
        ghost.element.classList.add('frightened')
        // Update sprite to frightened
        const sprite = ghost.element.querySelector('.ghost-sprite')
        if (sprite) {
          sprite.src = this.getFrightenedSprite(1)
        }
      }
    })

    // Clear existing timers
    if (this.powerModeTimer) {
      clearTimeout(this.powerModeTimer)
    }
    if (this.powerModeEndingTimer) {
      clearTimeout(this.powerModeEndingTimer)
    }

    // Use dynamic durations based on current difficulty
    const totalDuration = this.powerModeDuration || 7000
    const warningDuration = this.powerModeWarningDuration || 2000

    // Start flashing before ending
    this.powerModeEndingTimer = setTimeout(() => {
      this.powerModeEnding = true
    }, totalDuration - warningDuration)

    // Deactivate after duration
    this.powerModeTimer = setTimeout(() => {
      this.powerMode = false
      this.powerModeEnding = false
      this.pacmanTarget.classList.remove('powered')

      this.ghosts.forEach(ghost => {
        if (!ghost.eaten) {
          ghost.frightened = false
          ghost.element.classList.remove('frightened')
          // Restore normal ghost sprite
          const sprite = ghost.element.querySelector('.ghost-sprite')
          if (sprite) {
            sprite.src = this.getGhostSprite(ghost.color, ghost.direction, ghost.animationFrame)
          }
        }
      })
    }, totalDuration)
  }

  // ============================================
  // ADVANCED GHOST AI
  // ============================================

  /**
   * Update all ghosts with advanced AI behavior
   * Implements scatter/chase modes and unique personalities
   * Scatter: 5 seconds (17% of time)
   * Chase: 25 seconds (83% of time)
   * @param {number} deltaTime - Time since last frame in seconds
   */
  updateGhosts(deltaTime = 1/60) {
    this.animationFrame++

    this.ghosts.forEach((ghost, index) => {
      // Skip frozen ghosts
      if (ghost.frozen) return

      // Update scatter timer for mode switching (time-based, not frame-based)
      ghost.scatterTimer = (ghost.scatterTimer || 0) + deltaTime

      // Simplified: Short scatter periods, mostly chase (makes game harder)
      // Scatter: 5 seconds, Chase: 25 seconds
      const totalCycle = 30 // 30 seconds total cycle
      const scatterDuration = 5 // 5 seconds scatter
      const currentPhase = ghost.scatterTimer % totalCycle
      const isScatterMode = currentPhase < scatterDuration // Only scatter for first 5 seconds of each 30s cycle
      
      // Get target position based on ghost personality and mode
      let targetX, targetY
      
      if (ghost.frightened) {
        // Run away from Pac-Man with more erratic movement
        const fleeAngle = Math.atan2(ghost.y - this.pacmanPosition.y, ghost.x - this.pacmanPosition.x)
        const fleeDistance = 200
        targetX = ghost.x + Math.cos(fleeAngle) * fleeDistance
        targetY = ghost.y + Math.sin(fleeAngle) * fleeDistance
      } else if (ghost.eaten) {
        // Return to center fast
        targetX = window.innerWidth / 2
        targetY = window.scrollY + window.innerHeight / 2
      } else if (isScatterMode && ghost.personality !== 'chase') {
        // Brief scatter mode - each ghost goes to their home corner
        // Blinky NEVER scatters - always aggressive!
        const corners = [
          { x: window.innerWidth * 0.9, y: this.pacmanPosition.y - 300 }, // Blinky: unused
          { x: window.innerWidth * 0.1, y: this.pacmanPosition.y - 300 }, // Pinky: top-left
          { x: window.innerWidth * 0.9, y: this.pacmanPosition.y + 500 }, // Inky: bottom-right
          { x: window.innerWidth * 0.1, y: this.pacmanPosition.y + 500 }  // Clyde: bottom-left
        ]
        const corner = corners[index]
        targetX = corner.x
        targetY = corner.y
      } else {
        // Chase mode (default) - use personality-based AI
        switch (ghost.personality) {
          case 'chase': // Blinky - Relentless pursuer with prediction
            // Direct chase with slight prediction based on Pac-Man's momentum
            const predictionTime = 0.33 // Predict 0.33 seconds ahead (20 frames at 60fps)
            targetX = this.pacmanPosition.x + (this.pacmanVelocity.x * predictionTime)
            targetY = this.pacmanPosition.y + (this.pacmanVelocity.y * predictionTime)

            // Speed boost when few dots remain (Cruise Elroy mode)
            const dotsRemaining = this.dots.filter(d => !d.collected).length
            const totalDots = this.dots.length
            if (dotsRemaining < totalDots * 0.3) { // Less than 30% dots remaining
              ghost.speedBoost = 1.3 // 30% faster
            } else if (dotsRemaining < totalDots * 0.5) { // Less than 50% dots
              ghost.speedBoost = 1.15 // 15% faster
            } else {
              ghost.speedBoost = 1
            }

            // Add slight randomness to prevent perfect prediction avoidance
            if (Math.random() < 0.1) { // 10% chance every frame
              targetX += (Math.random() - 0.5) * 100
              targetY += (Math.random() - 0.5) * 100
            }
            break
            
          case 'ambush': // Pinky - Advanced prediction ambush
            // Predict Pac-Man's position based on velocity AND acceleration
            const lookAheadTime = 1.0 // Predict 1 second ahead
            const velocityMagnitude = Math.sqrt(
              Math.pow(this.pacmanVelocity.x, 2) +
              Math.pow(this.pacmanVelocity.y, 2)
            )

            // If Pac-Man is moving, predict future position
            if (velocityMagnitude > 0) {
              targetX = this.pacmanPosition.x + (this.pacmanVelocity.x * lookAheadTime)
              targetY = this.pacmanPosition.y + (this.pacmanVelocity.y * lookAheadTime)

              // Add flanking behavior - try to cut off from the side
              const angleToIntercept = Math.atan2(
                targetY - ghost.y,
                targetX - ghost.x
              )
              const flankOffset = 150
              targetX += Math.cos(angleToIntercept + Math.PI / 2) * flankOffset
              targetY += Math.sin(angleToIntercept + Math.PI / 2) * flankOffset
            } else {
              // If Pac-Man is stationary, circle around to cut off escape
              const circleAngle = (ghost.scatterTimer * 1.2) + (Math.PI / 2) // 0.02 * 60 = 1.2 rad/s
              targetX = this.pacmanPosition.x + Math.cos(circleAngle) * 150
              targetY = this.pacmanPosition.y + Math.sin(circleAngle) * 150
            }
            break
            
          case 'patrol': // Inky - Coordinated flanking with Blinky
            const blinky = this.ghosts[0]

            // Calculate where Pac-Man is trying to escape
            const escapeAngle = Math.atan2(
              this.pacmanPosition.y - blinky.y,
              this.pacmanPosition.x - blinky.x
            )

            // Position perpendicular to Blinky's chase to create a pincer attack
            const distanceFromPacman = 100
            const perpAngle = escapeAngle + Math.PI / 2

            // Alternate sides based on timer for unpredictability (every 3 seconds)
            const side = Math.floor(ghost.scatterTimer / 3) % 2 === 0 ? 1 : -1

            targetX = this.pacmanPosition.x + Math.cos(perpAngle) * distanceFromPacman * side
            targetY = this.pacmanPosition.y + Math.sin(perpAngle) * distanceFromPacman * side

            // Add vertical advantage - prefer being above Pac-Man in open field
            if (Math.abs(ghost.y - this.pacmanPosition.y) < 100) {
              targetY = this.pacmanPosition.y - 200 // Position above
            }
            break
            
          case 'scatter': // Clyde - Unpredictable ambusher with zone control
            const distanceToPacman = Math.sqrt(
              Math.pow(this.pacmanPosition.x - ghost.x, 2) +
              Math.pow(this.pacmanPosition.y - ghost.y, 2)
            )

            // Zone-based behavior: Chase from optimal distance
            if (distanceToPacman < 150) {
              // Too close, maintain distance while cutting off escape
              const retreatAngle = Math.atan2(ghost.y - this.pacmanPosition.y, ghost.x - this.pacmanPosition.x)
              const maintainDistance = 200

              // Don't just flee - position to block escape routes
              const blockAngle = retreatAngle + (Math.sin(ghost.scatterTimer * 3) * Math.PI / 3) // 0.05 * 60 = 3 rad/s
              targetX = this.pacmanPosition.x + Math.cos(blockAngle) * maintainDistance
              targetY = this.pacmanPosition.y + Math.sin(blockAngle) * maintainDistance
            } else if (distanceToPacman > 400) {
              // Too far, close in aggressively
              targetX = this.pacmanPosition.x
              targetY = this.pacmanPosition.y
            } else {
              // Optimal zone - orbit and wait for opportunity
              // Initialize orbit angle if not set
              if (!ghost.orbitAngle) ghost.orbitAngle = Math.atan2(this.pacmanPosition.y - ghost.y, this.pacmanPosition.x - ghost.x)

              // Rotate orbit angle at constant angular velocity (1.8 rad/s)
              ghost.orbitAngle += 1.8 * deltaTime

              const orbitRadius = 250
              targetX = this.pacmanPosition.x + Math.cos(ghost.orbitAngle) * orbitRadius
              targetY = this.pacmanPosition.y + Math.sin(ghost.orbitAngle) * orbitRadius
            }
            break
            
          default:
            targetX = this.pacmanPosition.x
            targetY = this.pacmanPosition.y
        }
      }
      
      // Calculate direction to target with wraparound consideration
      // Check both direct path and wraparound path, use the shorter one
      let dx = targetX - ghost.x
      const dy = targetY - ghost.y
      
      // Consider horizontal wraparound (tunnel mechanic)
      const screenWidth = window.innerWidth
      const margin = 30
      const dxDirect = dx
      const dxWrapLeft = (targetX + screenWidth) - ghost.x  // Target wraps from right
      const dxWrapRight = (targetX - screenWidth) - ghost.x // Target wraps from left
      
      // Choose the shortest horizontal path
      const distances = [
        { dx: dxDirect, dist: Math.abs(dxDirect) },
        { dx: dxWrapLeft, dist: Math.abs(dxWrapLeft) },
        { dx: dxWrapRight, dist: Math.abs(dxWrapRight) }
      ]
      const shortest = distances.reduce((min, curr) => curr.dist < min.dist ? curr : min)
      dx = shortest.dx
      
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 0) {
        // Speed modifiers based on state
        let speed = this.ghostSpeed * (ghost.speedBoost || 1)
        
        // Cap ghost speed to always be slower than Pac-Man (90% max)
        // This ensures the game remains winnable even with Cruise Elroy mode
        const maxSpeed = this.pacmanSpeed * 0.9
        speed = Math.min(speed, maxSpeed)
        
        if (ghost.eaten) {
          speed = this.pacmanSpeed * 1.5 // Eyes move faster
        } else if (ghost.frightened) {
          speed = this.pacmanSpeed * 0.5 // Frightened ghosts are slower
        }
        
        // Smooth acceleration instead of instant direction changes
        const targetVelX = (dx / distance) * speed
        const targetVelY = (dy / distance) * speed

        // Time-based lerp for frame-rate independent smoothing
        // Higher smoothing rate = faster response (10 ≈ 0.15 smoothing at 60fps)
        const smoothingRate = ghost.eaten ? 20 : 12 // Eyes turn faster
        const smoothing = 1 - Math.exp(-smoothingRate * deltaTime)
        ghost.velocityX = ghost.velocityX * (1 - smoothing) + targetVelX * smoothing
        ghost.velocityY = ghost.velocityY * (1 - smoothing) + targetVelY * smoothing

        // Calculate next position with delta-time based movement
        const nextX = ghost.x + (ghost.velocityX * deltaTime)
        const nextY = ghost.y + (ghost.velocityY * deltaTime)

        // Check if next position would enter a locked section
        const ghostBoundary = this.checkSectionBoundary(nextX, nextY)

        if (ghostBoundary) {
          // Stop at boundary - ghosts bounce back slightly
          ghost.y = ghostBoundary
          ghost.velocityY = -ghost.velocityY * 0.5 // Reverse and reduce velocity
        } else {
          ghost.x = nextX
          ghost.y = nextY
        }

        // Determine direction based on velocity (for sprite)
        const absDx = Math.abs(ghost.velocityX)
        const absDy = Math.abs(ghost.velocityY)

        if (absDx > absDy) {
          ghost.direction = ghost.velocityX > 0 ? 'right' : 'left'
        } else {
          ghost.direction = ghost.velocityY > 0 ? 'down' : 'up'
        }

        // Wrap around screen edges
        const margin = 30
        if (ghost.x < -margin) {
          ghost.x = window.innerWidth + margin
        } else if (ghost.x > window.innerWidth + margin) {
          ghost.x = -margin
        }

        // Keep ghosts within playable area (between header and footer)
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

        // Clamp ghost position to playable area
        ghost.y = Math.max(minY, Math.min(maxY, ghost.y))
        
        ghost.element.style.left = `${ghost.x}px`
        ghost.element.style.top = `${ghost.y}px`
        
        // Update ghost sprite animation (alternate between frame 1 and 2 every 10 frames)
        if (this.animationFrame % 10 === 0) {
          ghost.animationFrame = ghost.animationFrame === 1 ? 2 : 1
        }
        
        const sprite = ghost.element.querySelector('.ghost-sprite')
        if (sprite) {
          // Add or remove flip class for left direction
          if (ghost.direction === 'left') {
            sprite.classList.add('flip-horizontal')
          } else {
            sprite.classList.remove('flip-horizontal')
          }
          
          if (ghost.eaten) {
            // Show only eyes when eaten
            sprite.src = this.getEyesSprite(ghost.direction)
          } else if (ghost.frightened) {
            // Show frightened sprite (blue or flashing white)
            sprite.src = this.getFrightenedSprite(ghost.animationFrame, this.powerModeEnding)
          } else {
            // Show normal ghost sprite
            sprite.src = this.getGhostSprite(ghost.color, ghost.direction, ghost.animationFrame)
          }
        }
      }
    })
  }

  /**
   * Update off-screen ghost indicators
   * Shows arrows at screen edges pointing to ghosts that are off-screen
   */
  updateGhostIndicators() {
    const viewportTop = window.scrollY
    const viewportBottom = viewportTop + window.innerHeight
    const viewportLeft = 0
    const viewportRight = window.innerWidth
    const edgeMargin = 30 // Distance from edge to show indicator

    this.ghosts.forEach((ghost, index) => {
      // Check if ghost is off-screen
      const isOffScreenTop = ghost.y < viewportTop - 50
      const isOffScreenBottom = ghost.y > viewportBottom + 50
      const isOffScreenLeft = ghost.x < viewportLeft - 50
      const isOffScreenRight = ghost.x > viewportRight + 50

      const isOffScreen = isOffScreenTop || isOffScreenBottom || isOffScreenLeft || isOffScreenRight

      // Get or create indicator for this ghost
      let indicator = ghost.indicator
      if (!indicator) {
        indicator = document.createElement('div')
        indicator.className = 'ghost-indicator'
        indicator.innerHTML = `
          <div class="indicator-arrow"></div>
          <div class="indicator-dot" style="background: ${this.getGhostColor(ghost.color)}"></div>
        `
        this.gameContainerTarget.appendChild(indicator)
        ghost.indicator = indicator
      }

      if (isOffScreen && !ghost.eaten) {
        // Calculate direction angle from center of screen to ghost
        const centerX = viewportLeft + (viewportRight - viewportLeft) / 2
        const centerY = viewportTop + window.innerHeight / 2

        const angle = Math.atan2(ghost.y - centerY, ghost.x - centerX)

        // Calculate position on screen edge
        let indicatorX, indicatorY

        // Determine which edge and position
        const absAngle = Math.abs(angle)
        const isMoreVertical = absAngle > Math.PI / 4 && absAngle < (3 * Math.PI) / 4

        if (isMoreVertical) {
          // Top or bottom edge
          if (angle < 0) {
            // Top edge
            indicatorY = edgeMargin
            indicatorX = Math.max(edgeMargin, Math.min(viewportRight - edgeMargin, ghost.x))
          } else {
            // Bottom edge
            indicatorY = window.innerHeight - edgeMargin
            indicatorX = Math.max(edgeMargin, Math.min(viewportRight - edgeMargin, ghost.x))
          }
        } else {
          // Left or right edge
          if (angle > -Math.PI / 2 && angle < Math.PI / 2) {
            // Right edge
            indicatorX = viewportRight - edgeMargin
            indicatorY = Math.max(edgeMargin, Math.min(window.innerHeight - edgeMargin, ghost.y - viewportTop))
          } else {
            // Left edge
            indicatorX = edgeMargin
            indicatorY = Math.max(edgeMargin, Math.min(window.innerHeight - edgeMargin, ghost.y - viewportTop))
          }
        }

        // Update indicator position and rotation
        indicator.style.display = 'flex'
        indicator.style.left = `${indicatorX}px`
        indicator.style.top = `${indicatorY + viewportTop}px`

        // Rotate arrow to point towards ghost
        const arrowRotation = (angle * 180 / Math.PI) + 90 // +90 because arrow points up by default
        const arrow = indicator.querySelector('.indicator-arrow')
        if (arrow) {
          arrow.style.transform = `rotate(${arrowRotation}deg)`
        }

        // Add pulsing for frightened ghosts
        if (ghost.frightened) {
          indicator.classList.add('frightened')
        } else {
          indicator.classList.remove('frightened')
        }
      } else {
        // Ghost is on screen, hide indicator
        if (indicator) {
          indicator.style.display = 'none'
        }
      }
    })
  }

  getGhostColor(colorName) {
    const colors = {
      'red': '#FF0000',
      'pink': '#FFB8D1',
      'cyan': '#00FFFF',
      'orange': '#FFA500'
    }
    return colors[colorName] || '#FFFFFF'
  }

  // ============================================
  // COLLISION DETECTION
  // ============================================

  /**
   * Check for collisions between Pac-Man and ghosts
   * Handles eating ghosts or losing a life
   */
  checkGhostCollisions() {
    const collisionRadius = 25
    
    this.ghosts.forEach(ghost => {
      if (ghost.eaten) return // Skip already eaten ghosts
      
      const distance = Math.sqrt(
        Math.pow(this.pacmanPosition.x - ghost.x, 2) + 
        Math.pow(this.pacmanPosition.y - ghost.y, 2)
      )
      
      if (distance < collisionRadius) {
        if (ghost.frightened) {
          // Eat the ghost
          const ghostPoints = 200 * (this.activeEffects.doublePoints ? 2 : 1)
          this.score += ghostPoints
          this.updateHUD()
          ghost.eaten = true
          ghost.frightened = false
          ghost.element.classList.remove('frightened')
          ghost.element.classList.add('eaten')

          // Play eat ghost sound
          this.playSound('eatGhost', true)

          // Respawn after reaching home
          setTimeout(() => {
            this.respawnGhost(ghost)
          }, 3000)
        } else if (!this.activeEffects.shield) {
          // Lose a life (unless shielded)
          this.loseLife()
        } else {
          // Shield deflects ghost
          console.log("🛡️ Shield deflected ghost!")
        }
      }
    })
  }

  respawnGhost(ghost) {
    // Respawn ghost at center of screen
    const viewportWidth = window.innerWidth
    const scrollY = window.scrollY
    
    ghost.x = viewportWidth / 2
    ghost.y = scrollY + window.innerHeight / 2
    
    ghost.element.style.left = `${ghost.x}px`
    ghost.element.style.top = `${ghost.y}px`
    
    // Reset all ghost states
    ghost.frightened = false
    ghost.eaten = false
    ghost.element.classList.remove('frightened', 'eaten')
    
    // Update sprite to normal
    const sprite = ghost.element.querySelector('.ghost-sprite')
    if (sprite) {
      sprite.src = this.getGhostSprite(ghost.color, ghost.direction, ghost.animationFrame)
    }
  }

  // ============================================
  // DEATH & RESPAWN SYSTEM
  // ============================================

  /**
   * Handle losing a life
   * Plays death animation and either respawns or ends game
   */
  loseLife() {
    if (this.isDying) return // Prevent multiple death triggers
    
    this.isDying = true
    this.pacmanVelocity = { x: 0, y: 0 }
    this.lives--
    this.updateHUD()
    
    // Play death sound
    this.playSound('death', true)
    
    // Play death animation
    this.playDeathAnimation().then(() => {
      if (this.lives <= 0) {
        this.isDying = false
        this.isGameActive = false // Stop the game loop
        this.gameOver()
      } else {
        // Respawn with countdown
        this.respawnWithCountdown()
      }
    })
  }
  
  async respawnWithCountdown() {
    // Stop all movement during respawn
    this.pacmanVelocity = { x: 0, y: 0 }
    
    // Hide game assets during respawn to prevent visual glitches
    this.gameContainerTarget.style.opacity = '0'
    this.pacmanTarget.style.opacity = '0'
    
    // Smoothly scroll back to starting position
    const targetScrollY = this.initialPacmanPosition.y - (window.innerHeight / 2)
    
    // Clamp to valid scroll range
    const clampedTargetY = Math.max(0, Math.min(targetScrollY, document.documentElement.scrollHeight - window.innerHeight))
    
    // Smooth scroll to starting position
    await this.smoothScrollTo(clampedTargetY, 800) // 800ms smooth scroll
    
    // Reset positions after scroll (while still dying so no movement)
    this.resetPositions()
    
    // Add invincibility immediately
    this.pacmanTarget.classList.add('invincible')
    
    // Show countdown overlay (now visible since we're at top)
    await this.showCountdown()
    
    // Show game assets again with fade in
    this.gameContainerTarget.style.transition = 'opacity 0.3s ease'
    this.pacmanTarget.style.transition = 'opacity 0.3s ease'
    this.gameContainerTarget.style.opacity = '1'
    this.pacmanTarget.style.opacity = '1'
    
    // Resume game after countdown
    this.isDying = false
    
    // Start Pac-Man moving in a random direction after countdown
    const directions = [
      { x: this.pacmanSpeed, y: 0, dir: 'right' },
      { x: -this.pacmanSpeed, y: 0, dir: 'left' },
      { x: 0, y: this.pacmanSpeed, dir: 'down' },
      { x: 0, y: -this.pacmanSpeed, dir: 'up' }
    ]
    const randomDirection = directions[Math.floor(Math.random() * directions.length)]
    this.pacmanVelocity = { x: randomDirection.x, y: randomDirection.y }
    this.pacmanDirection = randomDirection.dir
    
    // Keep invincibility for a bit longer after countdown
    setTimeout(() => {
      this.pacmanTarget.classList.remove('invincible')
    }, 2000)
  }
  
  smoothScrollTo(targetY, duration) {
    return new Promise((resolve) => {
      const startY = window.scrollY
      const distance = targetY - startY
      const startTime = performance.now()
      
      const easeInOutCubic = (t) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      }
      
      const scroll = () => {
        const currentTime = performance.now()
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = easeInOutCubic(progress)
        
        window.scrollTo(0, startY + (distance * eased))
        
        if (progress < 1) {
          requestAnimationFrame(scroll)
        } else {
          resolve()
        }
      }
      
      requestAnimationFrame(scroll)
    })
  }
  
  resetPositions() {
    // Reset Pac-Man to initial starting position
    this.pacmanPosition = { ...this.initialPacmanPosition }
    this.updatePacmanPosition()
    
    // Reset ghosts to safe spawn positions (far from Pac-Man)
    const viewportWidth = window.innerWidth
    const pacmanY = this.pacmanPosition.y
    
    // Spawn ghosts much farther away vertically (at least 800px below)
    const ghostSpawnY = pacmanY + 800
    
    const spawnPositions = [
      { x: viewportWidth * 0.2, y: ghostSpawnY },
      { x: viewportWidth * 0.4, y: ghostSpawnY + 100 },
      { x: viewportWidth * 0.6, y: ghostSpawnY + 100 },
      { x: viewportWidth * 0.8, y: ghostSpawnY }
    ]
    
    this.ghosts.forEach((ghost, index) => {
      ghost.x = spawnPositions[index].x
      ghost.y = spawnPositions[index].y
      ghost.element.style.left = `${ghost.x}px`
      ghost.element.style.top = `${ghost.y}px`
      ghost.element.style.opacity = '1'
      
      // Reset ghost states
      ghost.frightened = false
      ghost.eaten = false
      ghost.element.classList.remove('frightened', 'eaten')
      
      // Update sprite to normal
      const sprite = ghost.element.querySelector('.ghost-sprite')
      if (sprite) {
        sprite.src = this.getGhostSprite(ghost.color, ghost.direction, ghost.animationFrame)
      }
    })
  }
  
  showCountdown() {
    return new Promise((resolve) => {
      // Create countdown overlay - position it in center of VIEWPORT (not page)
      const countdown = document.createElement('div')
      countdown.className = 'pacman-countdown'
      countdown.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 6rem;
        font-weight: 800;
        color: #ffd700;
        text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6);
        z-index: 10003;
        animation: countdownPulse 1s ease-in-out;
        pointer-events: none;
      `
      
      document.body.appendChild(countdown) // Add to body, not game container
      
      let count = 3
      
      const updateCountdown = () => {
        if (count > 0) {
          countdown.textContent = count
          countdown.style.animation = 'none'
          // Trigger reflow to restart animation
          countdown.offsetHeight
          countdown.style.animation = 'countdownPulse 1s ease-in-out'
          count--
          setTimeout(updateCountdown, 1000)
        } else {
          countdown.textContent = 'GO!'
          countdown.style.animation = 'countdownGo 0.8s ease-out'
          setTimeout(() => {
            countdown.remove()
            resolve()
          }, 800)
        }
      }
      
      updateCountdown()
    })
  }
  
  playDeathAnimation() {
    return new Promise((resolve) => {
      // Stop Pac-Man movement immediately
      this.pacmanVelocity = { x: 0, y: 0 }
      
      // Hide ghosts during death animation
      this.ghosts.forEach(ghost => {
        ghost.element.style.opacity = '0'
      })
      
      const sprite = this.pacmanTarget.querySelector('.pacman-sprite')
      if (!sprite) {
        resolve()
        return
      }
      
      // Death animation sequence (spin and fade)
      let frame = 0
      const animationInterval = setInterval(() => {
        frame++
        
        // Rotate and scale down
        const rotation = frame * 45 // Spin
        const scale = Math.max(0.1, 1 - (frame * 0.1)) // Shrink
        sprite.style.transform = `rotate(${rotation}deg) scale(${scale})`
        sprite.style.opacity = scale
        
        if (frame >= 10) {
          clearInterval(animationInterval)
          
          // Reset sprite
          sprite.style.transform = 'rotate(0deg) scale(1)'
          sprite.style.opacity = '1'
          
          // Show ghosts again
          this.ghosts.forEach(ghost => {
            ghost.element.style.opacity = '1'
          })
          
          resolve()
        }
      }, 100)
    })
  }

  // ============================================
  // GAME OVER & VICTORY
  // ============================================

  /**
   * Handle game over (all lives lost)
   */
  gameOver() {
    setTimeout(() => {
      // Ensure game is stopped
      this.isGameActive = false
      if (this.gameLoopId) {
        cancelAnimationFrame(this.gameLoopId)
        this.gameLoopId = null
      }
      
      // Clear any active hover effects
      if (this.hoveredElement) {
        this.hoveredElement.classList.remove('pacman-hover')
        const leaveEvent = new CustomEvent('pacman:leave', { 
          detail: { element: this.hoveredElement }
        })
        this.hoveredElement.dispatchEvent(leaveEvent)
        this.hoveredElement = null
      }
      
      // Remove all pacman-hover classes
      document.querySelectorAll('.pacman-hover').forEach(el => {
        el.classList.remove('pacman-hover')
      })
      
      // Hide game assets
      this.gameContainerTarget.classList.remove('active')
      this.pacmanTarget.style.opacity = '0'
      
      this.showGameOverModal(false)
    }, 100)
  }

  winGame() {
    // Play intermission sound for victory
    this.stopAllSounds()
    this.playSound('intermission', true)
    
    setTimeout(() => {
      // Ensure game is stopped
      this.isGameActive = false
      if (this.gameLoopId) {
        cancelAnimationFrame(this.gameLoopId)
        this.gameLoopId = null
      }
      
      // Clear any active hover effects
      if (this.hoveredElement) {
        this.hoveredElement.classList.remove('pacman-hover')
        const leaveEvent = new CustomEvent('pacman:leave', { 
          detail: { element: this.hoveredElement }
        })
        this.hoveredElement.dispatchEvent(leaveEvent)
        this.hoveredElement = null
      }
      
      // Remove all pacman-hover classes
      document.querySelectorAll('.pacman-hover').forEach(el => {
        el.classList.remove('pacman-hover')
      })
      
      // Hide game assets
      this.gameContainerTarget.classList.remove('active')
      this.pacmanTarget.style.opacity = '0'
      
      this.showGameOverModal(true)
    }, 100)
  }
  
  showGameOverModal(isWin) {
    // Create modal overlay
    const modal = document.createElement('div')
    modal.className = 'pacman-game-over-modal'

    const title = isWin ? '🎉 Victory!' : '💀 Game Over'
    const message = isWin ? 'Congratulations! You unlocked all sections!' : 'Better luck next time!'
    const emoji = isWin ? '🏆' : '👾'

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-emoji">${emoji}</div>
        <h2 class="modal-title">${title}</h2>
        <p class="modal-message">${message}</p>
        <div class="modal-score">
          <span class="score-label">Final Score</span>
          <span class="score-value">${this.score}</span>
        </div>
        <div class="modal-buttons">
          <button class="modal-btn modal-btn-primary" data-action="restart">
            <i class="bx bx-refresh"></i>
            Play Again
          </button>
          <button class="modal-btn modal-btn-secondary" data-action="quit">
            <i class="bx bx-x"></i>
            Quit
          </button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('show')
    })

    // Add event listeners
    modal.querySelector('[data-action="restart"]').addEventListener('click', () => {
      modal.remove()
      this.restartGame()
    })

    modal.querySelector('[data-action="quit"]').addEventListener('click', () => {
      modal.remove()
      this.stopGame()
    })
  }
  
  restartGame() {
    // Reset game state
    this.score = 0
    this.dotsScore = 0
    this.lives = 3
    this.extraLifeAwarded = false // Reset extra life flag
    this.powerMode = false
    this.isDying = true // Set to true during restart to prevent movement
    this.isGameActive = true // Keep game active

    // Reset difficulty settings
    this.ghostSpeed = 135 // pixels/second
    this.powerModeDuration = 7000
    this.powerModeWarningDuration = 2000

    // Reset section progression
    this.currentSection = 0
    this.keySpawned = false
    this.keyCollected = false
    this.sections.forEach(section => {
      section.unlocked = false
    })

    // Clear collected dot positions for fresh start
    this.collectedDotPositions.clear()

    // Clear existing elements
    this.dots.forEach(dot => dot.element && dot.element.remove())
    this.items.forEach(item => item.element && item.element.remove())
    this.ghosts.forEach(ghost => {
      if (ghost.element) ghost.element.remove()
      if (ghost.indicator) ghost.indicator.remove()
    })
    if (this.key && this.key.element) {
      this.key.element.remove()
    }
    this.dots = []
    this.items = []
    this.ghosts = []
    this.key = null

    // Clear all effect timers
    Object.keys(this.effectTimers).forEach(key => {
      clearTimeout(this.effectTimers[key])
    })
    this.effectTimers = {}

    // Reset active effects
    this.activeEffects = {
      speedBoost: false,
      slowDown: false,
      shield: false,
      freeze: false,
      doublePoints: false
    }
    this.pacmanSpeed = 180 // Reset speed (pixels/second)

    // Re-lock all sections
    this.initializeLockedSections()

    // Reset to starting position
    this.pacmanPosition = { ...this.initialPacmanPosition }
    this.pacmanVelocity = { x: 0, y: 0 }
    this.updatePacmanPosition()
    this.updateHUD()

    // Smooth scroll to start
    this.smoothScrollTo(this.initialPacmanPosition.y - (window.innerHeight / 2), 600).then(async () => {
      // Regenerate game elements
      this.generateDots()
      this.createGhosts()

      // Add invincibility
      this.pacmanTarget.classList.add('invincible')

      // Show countdown before starting
      await this.showCountdown()

      // Start the game
      this.isDying = false

      // Start Pac-Man moving in a random direction
      const directions = [
        { x: this.pacmanSpeed, y: 0, dir: 'right' },
        { x: -this.pacmanSpeed, y: 0, dir: 'left' },
        { x: 0, y: this.pacmanSpeed, dir: 'down' },
        { x: 0, y: -this.pacmanSpeed, dir: 'up' }
      ]
      const randomDirection = directions[Math.floor(Math.random() * directions.length)]
      this.pacmanVelocity = { x: randomDirection.x, y: randomDirection.y }
      this.pacmanDirection = randomDirection.dir
      
      // Keep invincibility for a bit longer
      setTimeout(() => {
        this.pacmanTarget.classList.remove('invincible')
      }, 2000)
      
      // Start game loop if not already running
      if (!this.gameLoopId) {
        this.gameLoop()
      }
    })
  }

  updateHUD() {
    if (this.hasScoreTarget) {
      this.scoreTarget.textContent = this.score
    }

    // Award extra life at 10,000 points (classic Pac-Man)
    if (!this.extraLifeAwarded && this.score >= 10000) {
      this.extraLifeAwarded = true
      this.lives++
      this.playSound('extraPac', true)
      console.log("🎉 Extra life awarded!")
    }

    if (this.hasLivesTarget) {
      // Prevent negative lives display
      const livesCount = Math.max(0, this.lives)
      this.livesTarget.textContent = '❤️'.repeat(livesCount)
    }

    // Update progress to next section
    if (this.hasProgressItemTarget && this.hasProgressLabelTarget && this.hasProgressValueTarget) {
      if (this.currentSection >= this.sections.length) {
        // All sections unlocked - show completion message
        this.progressItemTarget.style.display = 'flex'
        this.progressLabelTarget.textContent = 'Goal:'
        this.progressValueTarget.textContent = 'Clear All Dots!'
        this.progressValueTarget.style.color = '#00ff00'
        this.progressValueTarget.style.textShadow = '0 0 10px rgba(0, 255, 0, 0.8)'
      } else {
        this.progressItemTarget.style.display = 'flex'
        const nextSection = this.sections[this.currentSection]
        const pointsNeeded = Math.max(0, nextSection.threshold - this.dotsScore)

        if (pointsNeeded === 0) {
          // Key available
          this.progressLabelTarget.textContent = 'Unlock:'
          this.progressValueTarget.textContent = '🔑 Get Key!'
          this.progressValueTarget.style.color = '#ffd700'
          this.progressValueTarget.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8)'
        } else {
          // Show points needed (dots only)
          this.progressLabelTarget.textContent = 'Need:'
          this.progressValueTarget.textContent = `${pointsNeeded} pts`
          this.progressValueTarget.style.color = ''
          this.progressValueTarget.style.textShadow = ''
        }
      }
    }
  }
}
