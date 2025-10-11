/**
 * GhostAI - Advanced ghost AI and behavior management for Pac-Man game
 *
 * Manages:
 * - Ghost creation and initialization with unique personalities
 * - Advanced AI with scatter/chase modes
 * - Ghost movement and pathfinding with wraparound support
 * - Collision detection between Pac-Man and ghosts
 * - Ghost respawn system
 * - Off-screen ghost indicators
 * - Power mode (frightened) behavior
 * - Individual ghost personalities:
 *   - Blinky (Red): Aggressive chaser with prediction
 *   - Pinky (Pink): Ambusher targeting ahead of Pac-Man
 *   - Inky (Cyan): Flanker coordinating with Blinky
 *   - Clyde (Orange): Zone controller with unpredictable behavior
 */
export class GhostAI {
  constructor(dependencies = {}) {
    this.spriteManager = dependencies.spriteManager
    this.audioManager = dependencies.audioManager
    this.gameContainer = dependencies.gameContainer

    // Ghost state
    this.ghosts = []
    this.animationFrame = 0

    // References to game state (will be updated from controller)
    this.pacmanPosition = { x: 0, y: 0 }
    this.pacmanVelocity = { x: 0, y: 0 }
    this.pacmanSpeed = 180
    this.ghostSpeed = 135
    this.powerMode = false
    this.powerModeEnding = false
    this.dots = []
    this.activeEffects = {}
  }

  /**
   * Update references to game state
   * Called by the controller to keep AI in sync with game state
   */
  updateGameState(state) {
    this.pacmanPosition = state.pacmanPosition
    this.pacmanVelocity = state.pacmanVelocity
    this.pacmanSpeed = state.pacmanSpeed
    this.ghostSpeed = state.ghostSpeed
    this.powerMode = state.powerMode
    this.powerModeEnding = state.powerModeEnding
    this.dots = state.dots
    this.activeEffects = state.activeEffects
  }

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
      img.src = this.spriteManager.getGhostSprite(config.color, 'right', 1)
      ghost.appendChild(img)
      ghost.style.left = `${startPositions[index].x}px`
      ghost.style.top = `${startPositions[index].y}px`
      this.gameContainer.appendChild(ghost)

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

  /**
   * Update all ghosts with advanced AI behavior
   * Implements scatter/chase modes and unique personalities
   * Scatter: 5 seconds (17% of time)
   * Chase: 25 seconds (83% of time)
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {function} checkSectionBoundary - Callback to check section boundaries
   */
  updateGhosts(deltaTime = 1/60, checkSectionBoundary = null) {
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
        const ghostBoundary = checkSectionBoundary ? checkSectionBoundary(nextX, nextY) : null

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
            sprite.src = this.spriteManager.getEyesSprite(ghost.direction)
          } else if (ghost.frightened) {
            // Show frightened sprite (blue or flashing white)
            sprite.src = this.spriteManager.getFrightenedSprite(ghost.animationFrame, this.powerModeEnding)
          } else {
            // Show normal ghost sprite
            sprite.src = this.spriteManager.getGhostSprite(ghost.color, ghost.direction, ghost.animationFrame)
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
        this.gameContainer.appendChild(indicator)
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

  /**
   * Get ghost color hex value by color name
   */
  getGhostColor(colorName) {
    const colors = {
      'red': '#FF0000',
      'pink': '#FFB8D1',
      'cyan': '#00FFFF',
      'orange': '#FFA500'
    }
    return colors[colorName] || '#FFFFFF'
  }

  /**
   * Check for collisions between Pac-Man and ghosts
   * Handles eating ghosts or losing a life
   * @param {function} onEatGhost - Callback when ghost is eaten
   * @param {function} onLoseLife - Callback when Pac-Man loses a life
   * @returns {boolean} - True if a life was lost
   */
  checkGhostCollisions(onEatGhost = null, onLoseLife = null) {
    const collisionRadius = 25
    let lifeLost = false

    this.ghosts.forEach(ghost => {
      if (ghost.eaten) return // Skip already eaten ghosts

      const distance = Math.sqrt(
        Math.pow(this.pacmanPosition.x - ghost.x, 2) +
        Math.pow(this.pacmanPosition.y - ghost.y, 2)
      )

      if (distance < collisionRadius) {
        if (ghost.frightened) {
          // Eat the ghost
          ghost.eaten = true
          ghost.frightened = false
          ghost.element.classList.remove('frightened')
          ghost.element.classList.add('eaten')

          // Play eat ghost sound
          if (this.audioManager) {
            this.audioManager.play('eatGhost', true)
          }

          // Notify controller of ghost eaten
          if (onEatGhost) {
            onEatGhost(ghost)
          }

          // Respawn after reaching home
          setTimeout(() => {
            this.respawnGhost(ghost)
          }, 3000)
        } else if (!this.activeEffects.shield) {
          // Lose a life (unless shielded)
          lifeLost = true
          if (onLoseLife) {
            onLoseLife()
          }
        } else {
          // Shield deflects ghost
        }
      }
    })

    return lifeLost
  }

  /**
   * Respawn ghost at center of screen after being eaten
   */
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
      sprite.src = this.spriteManager.getGhostSprite(ghost.color, ghost.direction, ghost.animationFrame)
    }
  }

  /**
   * Enter power mode - make all ghosts frightened
   */
  enterPowerMode() {
    this.ghosts.forEach(ghost => {
      if (!ghost.eaten) {
        ghost.frightened = true
        ghost.element.classList.add('frightened')

        // Update sprite to frightened
        const sprite = ghost.element.querySelector('.ghost-sprite')
        if (sprite) {
          sprite.src = this.spriteManager.getFrightenedSprite(ghost.animationFrame, false)
        }
      }
    })
  }

  /**
   * Exit power mode - restore normal ghost behavior
   */
  exitPowerMode() {
    this.ghosts.forEach(ghost => {
      if (!ghost.eaten) {
        ghost.frightened = false
        ghost.element.classList.remove('frightened')

        // Restore normal ghost sprite
        const sprite = ghost.element.querySelector('.ghost-sprite')
        if (sprite) {
          sprite.src = this.spriteManager.getGhostSprite(ghost.color, ghost.direction, ghost.animationFrame)
        }
      }
    })
  }

  /**
   * Freeze all ghosts (for freeze powerup)
   */
  freezeGhosts() {
    this.ghosts.forEach(ghost => {
      ghost.frozen = true
    })
  }

  /**
   * Unfreeze all ghosts
   */
  unfreezeGhosts() {
    this.ghosts.forEach(ghost => {
      ghost.frozen = false
    })
  }

  /**
   * Clean up all ghosts and indicators
   */
  cleanup() {
    this.ghosts.forEach(ghost => {
      if (ghost.element && ghost.element.parentNode) {
        ghost.element.parentNode.removeChild(ghost.element)
      }
      if (ghost.indicator && ghost.indicator.parentNode) {
        ghost.indicator.parentNode.removeChild(ghost.indicator)
      }
    })
    this.ghosts = []
  }

  /**
   * Get all ghosts (for external access)
   */
  getGhosts() {
    return this.ghosts
  }
}
