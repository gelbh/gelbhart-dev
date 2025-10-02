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
  static targets = ["gameContainer", "pacman", "hud", "score", "lives", "startHint"]
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
    this.score = 0
    this.lives = 3
    this.extraLifeAwarded = false // Track if extra life at 10,000 has been awarded
    this.powerMode = false
    this.powerModeEnding = false
    this.dots = []
    this.ghosts = []
    
    // Pac-Man position and movement
    this.pacmanPosition = { x: 0, y: 0 }
    this.initialPacmanPosition = { x: 0, y: 0 } // Stored for respawn
    this.pacmanVelocity = { x: 0, y: 0 }
    this.pacmanDirection = 'right'
    this.pacmanNextDirection = null
    
    // Speed settings (matching original arcade at 60 FPS)
    // Pac-Man: 80% max speed ≈ 1.92 pixels/frame
    // Ghosts: 75% of Pac-Man ≈ 1.44 pixels/frame
    this.pacmanSpeed = 1.9
    this.ghostSpeed = 1.4
    
    // Animation and death state
    this.isDying = false
    this.deathAnimationFrame = 0
    this.lastScrollUpdate = 0
    
    // Animation frame counters
    this.animationFrame = 0
    this.animationCounter = 0
    this.pacmanAnimationState = 0
    
    // Hover detection (no collision detection for movement)
    this.collisionMap = []
    this.hoveredElement = null
    this.collisionPadding = 10
    
    // Initialize sound system
    this.initializeSoundSystem()
    
    // Setup keyboard controls
    this.keydownHandler = this.handleKeydown.bind(this)
    document.addEventListener('keydown', this.keydownHandler)
    
    // Position Pac-Man at the starting hint location
    this.initializePacmanPosition()
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
      if (this.assetPaths[assetKey]) {
        return `/assets/${this.assetPaths[assetKey]}`
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
    // Auto-start game on first movement key press
    const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D']
    
    if (movementKeys.includes(event.key) && !this.isGameActive && !this.isStarting) {
      this.startGame()
      // Don't process movement yet - wait for intro music
      event.preventDefault()
      return
    }
    
    // Prevent movement during intro music
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
      case 'Escape':
        this.stopGame()
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
  startGame() {
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
    
    // Show game container
    this.gameContainerTarget.classList.add('active')
    this.hudTarget.classList.add('active')
    
    // Reset game state
    this.score = 0
    this.lives = 3
    this.updateHUD()
    
    // Setup hover detection (no collisions)
    this.buildCollisionMap()
    
    // Generate game elements
    this.generateDots()
    this.createGhosts()
    
    // Play beginning sound and wait for it to finish
    console.log("🎵 Playing intro music...")
    this.playSound('beginning', true)
    
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
    this.gameContainerTarget.classList.remove('active')
    this.hudTarget.classList.remove('active')
    
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
    
    // Clean up dots and ghosts
    this.dots.forEach(dot => dot.element && dot.element.remove())
    this.ghosts.forEach(ghost => ghost.element && ghost.element.remove())
    this.dots = []
    this.ghosts = []
    
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId)
    }
  }

  // ============================================
  // DOT & PELLET GENERATION
  // ============================================

  /**
   * Generate dots across the playable area
   * Creates a grid of dots and strategic power pellets
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
    
    // REDUCE dot density for better performance
    const dotSpacing = 100 // Increased from 60 for fewer dots
    const margin = 80
    
    for (let x = margin; x < viewportWidth - margin; x += dotSpacing) {
      for (let y = minY; y < maxY; y += dotSpacing) {
        this.createDot(x, y)
      }
    }
    
    // Add power pellets at corners and strategic locations
    const playableHeight = maxY - minY
    const sections = Math.ceil(playableHeight / window.innerHeight)
    
    for (let i = 0; i < sections; i++) {
      const sectionY = minY + (i * window.innerHeight)
      
      // Place power pellets in corners of each section
      const pelletPositions = [
        { x: margin + 30, y: sectionY + 100 },                    // Top-left
        { x: viewportWidth - margin - 30, y: sectionY + 100 },    // Top-right
        { x: margin + 30, y: sectionY + window.innerHeight - 100 },           // Bottom-left
        { x: viewportWidth - margin - 30, y: sectionY + window.innerHeight - 100 }  // Bottom-right
      ]
      
      pelletPositions.forEach(pos => {
        if (pos.y < maxY) {
          this.createPowerPellet(pos.x, pos.y)
        }
      })
    }
    
    console.log(`Generated ${this.dots.length} dots in playable area (${sections} sections) - optimized for performance`)
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

    // Use asset manifest for production fingerprinted paths, fallback to direct path for development
    if (this.assetPaths && this.assetPaths[assetKey]) {
      // The manifest returns the path with hash, prepend /assets/
      return `/assets/${this.assetPaths[assetKey]}`
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
   * Main game loop - runs at 60 FPS
   * Handles all game logic, movement, collisions, and rendering
   */
  gameLoop() {
    if (!this.isGameActive) return
    
    // Don't allow movement during death/respawn
    if (this.isDying) {
      this.gameLoopId = requestAnimationFrame(() => this.gameLoop())
      return
    }

    // Free movement - no collision detection!
    this.pacmanPosition.x += this.pacmanVelocity.x
    this.pacmanPosition.y += this.pacmanVelocity.y

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
    
    // Clamp Pac-Man position
    if (this.pacmanPosition.y < minY) {
      this.pacmanPosition.y = minY
    }
    if (this.pacmanPosition.y > maxY) {
      this.pacmanPosition.y = maxY
    }

    // Check hover effects on page elements
    this.checkHoverEffects()

    // CRITICAL: Scroll BEFORE rendering to ensure smooth centering
    this.syncScroll()

    // Align fixed overlay with document coordinates
    this.updateContainerTransform()

    this.updatePacmanPosition()
    this.animatePacmanMouth()

    // Check dot collisions
    this.checkDotCollisions()

    // Update ghosts
    this.updateGhosts()

    // Check ghost collisions
    this.checkGhostCollisions()

    // Optimize dot rendering
    this.optimizeDotVisibility()
    
    // Check win condition
    if (this.dots.every(dot => dot.collected)) {
      this.winGame()
      return
    }

    // Continue game loop
    this.gameLoopId = requestAnimationFrame(() => this.gameLoop())
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

  animatePacmanMouth() {
    // Animate mouth opening/closing through all frames
    // Only animate when moving
    if (this.pacmanVelocity.x === 0 && this.pacmanVelocity.y === 0) {
      return
    }
    
    this.animationCounter++
    if (this.animationCounter % 5 === 0) { // Cycle every 5 frames for smooth animation
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
        this.updateHUD()

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
      }
    })
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
    
    // Start flashing 2 seconds before ending (total 7 seconds of power)
    this.powerModeEndingTimer = setTimeout(() => {
      this.powerModeEnding = true
    }, 5000)
    
    // Deactivate after 7 seconds total
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
    }, 7000)
  }

  // ============================================
  // ADVANCED GHOST AI
  // ============================================

  /**
   * Update all ghosts with advanced AI behavior
   * Implements scatter/chase modes and unique personalities
   * Scatter: 5 seconds (17% of time)
   * Chase: 25 seconds (83% of time)
   */
  updateGhosts() {
    this.animationFrame++
    
    this.ghosts.forEach((ghost, index) => {
      // Update scatter timer for mode switching
      ghost.scatterTimer = (ghost.scatterTimer || 0) + 1
      
      // Original Pac-Man scatter/chase pattern:
      // Scatter for 7 seconds, Chase for 20 seconds, Scatter for 7s, Chase for 20s, 
      // Scatter for 5s, Chase for 20s, Scatter for 5s, then Chase FOREVER
      // At 60 FPS: 420 frames = 7s, 1200 frames = 20s, 300 frames = 5s
      
      // Simplified: Short scatter periods, mostly chase (makes game harder)
      // Scatter: 5 seconds (300 frames), Chase: 25 seconds (1500 frames)
      const totalCycle = 1800 // 30 seconds total cycle
      const scatterDuration = 300 // 5 seconds scatter
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
          case 'chase': // Blinky - ALWAYS aggressive, direct chase (never scatters!)
            targetX = this.pacmanPosition.x
            targetY = this.pacmanPosition.y
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
            break
            
          case 'ambush': // Pinky - Targets ahead of Pac-Man (ambush strategy)
            const lookAhead = 120 // 4 tiles ahead
            let predictX = this.pacmanPosition.x
            let predictY = this.pacmanPosition.y
            
            switch(this.pacmanDirection) {
              case 'right': predictX += lookAhead; break
              case 'left': predictX -= lookAhead; break
              case 'down': predictY += lookAhead; break
              case 'up': predictY -= lookAhead; break
            }
            
            targetX = predictX
            targetY = predictY
            break
            
          case 'patrol': // Inky - Unpredictable flanking (uses Blinky's position)
            const blinky = this.ghosts[0]
            // Create a vector from Blinky to Pac-Man, then double it
            const vectorX = (this.pacmanPosition.x - blinky.x) * 2
            const vectorY = (this.pacmanPosition.y - blinky.y) * 2
            targetX = blinky.x + vectorX
            targetY = blinky.y + vectorY
            break
            
          case 'scatter': // Clyde - Shy ghost (chases when far, retreats when close)
            const distanceToPacman = Math.sqrt(
              Math.pow(this.pacmanPosition.x - ghost.x, 2) + 
              Math.pow(this.pacmanPosition.y - ghost.y, 2)
            )
            
            if (distanceToPacman < 200) {
              // Too close, retreat to home corner (bottom left)
              targetX = window.innerWidth * 0.1
              targetY = this.pacmanPosition.y + 500
            } else {
              // Far enough, chase
              targetX = this.pacmanPosition.x
              targetY = this.pacmanPosition.y
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
        
        if (ghost.eaten) {
          speed = this.pacmanSpeed * 1.5 // Eyes move faster
        } else if (ghost.frightened) {
          speed = this.pacmanSpeed * 0.5 // Frightened ghosts are slower
        }
        
        // Smooth acceleration instead of instant direction changes
        const targetVelX = (dx / distance) * speed
        const targetVelY = (dy / distance) * speed
        
        // Lerp towards target velocity for smoother movement
        const smoothing = ghost.eaten ? 0.3 : 0.15 // Eyes turn faster
        ghost.velocityX = ghost.velocityX * (1 - smoothing) + targetVelX * smoothing
        ghost.velocityY = ghost.velocityY * (1 - smoothing) + targetVelY * smoothing
        
        ghost.x += ghost.velocityX
        ghost.y += ghost.velocityY
        
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
          this.score += 200
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
        } else {
          // Lose a life
          this.loseLife()
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
      this.showGameOverModal(true)
    }, 100)
  }
  
  showGameOverModal(isWin) {
    // Create modal overlay
    const modal = document.createElement('div')
    modal.className = 'pacman-game-over-modal'
    
    const title = isWin ? '🎉 Victory!' : '💀 Game Over'
    const message = isWin ? 'Congratulations! You collected all the dots!' : 'Better luck next time!'
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
    this.lives = 3
    this.extraLifeAwarded = false // Reset extra life flag
    this.powerMode = false
    this.isDying = true // Set to true during restart to prevent movement
    this.isGameActive = true // Keep game active
    
    // Clear existing elements
    this.dots.forEach(dot => dot.element && dot.element.remove())
    this.ghosts.forEach(ghost => ghost.element && ghost.element.remove())
    this.dots = []
    this.ghosts = []
    
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
  }
}
