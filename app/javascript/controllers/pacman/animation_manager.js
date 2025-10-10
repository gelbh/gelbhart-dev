/**
 * AnimationManager - Handles all animation-related functionality for the Pac-Man game
 *
 * Manages:
 * - Pac-Man mouth animation (chomping)
 * - Pac-Man position updates and rotation
 * - Death animation sequence
 * - Container transform for fixed positioning
 * - Smooth scrolling animations
 * - Position resets for respawning
 */
export class AnimationManager {
  constructor(controller) {
    this.controller = controller
    this.pacmanTarget = controller.pacmanTarget
    this.gameContainerTarget = controller.gameContainerTarget
    this.hudTarget = controller.hudTarget
    this.hasGameContainerTarget = controller.hasGameContainerTarget
    this.hasHudTarget = controller.hasHudTarget
    this.spriteManager = controller.spriteManager

    // Track last container translate value to avoid redundant style updates
    this._lastContainerTranslateY = null
  }

  /**
   * Update the game container transform to account for scroll position
   * The container is fixed positioned, so we shift it to render document-space coords correctly
   */
  updateContainerTransform() {
    if (this.hasGameContainerTarget) {
      const y = -window.scrollY
      if (this._lastContainerTranslateY !== y) {
        this.gameContainerTarget.style.transform = `translateY(${y}px)`
        this._lastContainerTranslateY = y
      }
    }
  }

  /**
   * Update Pac-Man's visual position and sprite
   * Updates left/top position, rotation based on direction, and sprite image
   */
  updatePacmanPosition() {
    const pacmanPosition = this.controller.pacmanPosition
    const pacmanDirection = this.controller.pacmanDirection
    const pacmanAnimationState = this.controller.pacmanAnimationState

    this.pacmanTarget.style.left = `${pacmanPosition.x}px`
    this.pacmanTarget.style.top = `${pacmanPosition.y}px`

    // Update HUD position to follow Pac-Man
    this.updateHUDPosition()

    // Update rotation based on direction
    let rotation = 0
    switch(pacmanDirection) {
      case 'right': rotation = 0; break
      case 'down': rotation = 90; break
      case 'left': rotation = 180; break
      case 'up': rotation = 270; break
    }

    const sprite = this.pacmanTarget.querySelector('.pacman-sprite')
    if (sprite) {
      sprite.style.transform = `rotate(${rotation}deg)`
      // Update sprite image based on animation state
      sprite.src = this.spriteManager.getPacmanSprite(pacmanAnimationState)
    }
  }

  /**
   * Update HUD position to stay in viewport
   * Position HUD to stay in top-right of viewport, moving with Pac-Man's scroll position
   */
  updateHUDPosition() {
    if (this.hasHudTarget) {
      const viewportTop = window.scrollY
      this.hudTarget.style.top = `${viewportTop + 20}px` // Always 20px from top of viewport
    }
  }

  /**
   * Animate Pac-Man's mouth chomping animation
   * Cycles through animation frames when Pac-Man is moving
   * @param {number} deltaTime - Time since last frame in seconds
   */
  animatePacmanMouth(deltaTime) {
    const pacmanVelocity = this.controller.pacmanVelocity

    // Only animate when moving
    if (pacmanVelocity.x === 0 && pacmanVelocity.y === 0) {
      return
    }

    // Update animation timer (cycle every 0.083 seconds = 12 times per second)
    this.controller.animationTimer += deltaTime
    const animationInterval = 0.083 // 5 frames at 60fps

    if (this.controller.animationTimer >= animationInterval) {
      this.controller.animationTimer -= animationInterval // Subtract instead of reset to avoid drift
      this.controller.pacmanAnimationState = (this.controller.pacmanAnimationState + 1) % 3
      const sprite = this.pacmanTarget.querySelector('.pacman-sprite')
      if (sprite) {
        sprite.src = this.spriteManager.getPacmanSprite(this.controller.pacmanAnimationState)
      }
    }
  }

  /**
   * Keep Pac-Man vertically centered by directly scrolling to the correct position
   * Synchronizes scroll position with Pac-Man's y-coordinate
   */
  syncScroll() {
    const pacmanPosition = this.controller.pacmanPosition
    const viewportHeight = window.innerHeight

    // Calculate where we need to scroll to keep Pac-Man centered
    let targetScroll = pacmanPosition.y - (viewportHeight / 2)

    // Clamp scroll position to page bounds
    const maxScroll = document.documentElement.scrollHeight - viewportHeight
    targetScroll = Math.max(0, Math.min(targetScroll, maxScroll))

    // Set scroll position to keep Pac-Man centered
    document.documentElement.scrollTop = targetScroll
  }

  /**
   * Smoothly scroll to a target Y position over a specified duration
   * Uses easeInOutCubic easing function for smooth animation
   * @param {number} targetY - Target scroll Y position
   * @param {number} duration - Animation duration in milliseconds
   * @returns {Promise} Resolves when animation completes
   */
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

  /**
   * Reset Pac-Man and ghosts to their initial positions
   * Used when respawning after death or starting a new level
   */
  resetPositions() {
    // Reset Pac-Man to initial starting position
    this.controller.pacmanPosition = { ...this.controller.initialPacmanPosition }
    this.updatePacmanPosition()

    // Reset ghosts to safe spawn positions (far from Pac-Man)
    const viewportWidth = window.innerWidth
    const pacmanY = this.controller.pacmanPosition.y

    // Spawn ghosts much farther away vertically (at least 800px below)
    const ghostSpawnY = pacmanY + 800

    const spawnPositions = [
      { x: viewportWidth * 0.2, y: ghostSpawnY },
      { x: viewportWidth * 0.4, y: ghostSpawnY + 100 },
      { x: viewportWidth * 0.6, y: ghostSpawnY + 100 },
      { x: viewportWidth * 0.8, y: ghostSpawnY }
    ]

    this.controller.ghosts.forEach((ghost, index) => {
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
        sprite.src = this.spriteManager.getGhostSprite(ghost.color, ghost.direction, ghost.animationFrame)
      }
    })
  }

  /**
   * Play the death animation for Pac-Man
   * Spins and shrinks Pac-Man while hiding ghosts
   * @returns {Promise} Resolves when animation completes
   */
  playDeathAnimation() {
    return new Promise((resolve) => {
      // Stop Pac-Man movement immediately
      this.controller.pacmanVelocity = { x: 0, y: 0 }

      // Hide ghosts during death animation
      this.controller.ghosts.forEach(ghost => {
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
          this.controller.ghosts.forEach(ghost => {
            ghost.element.style.opacity = '1'
          })

          resolve()
        }
      }, 100)
    })
  }
}
