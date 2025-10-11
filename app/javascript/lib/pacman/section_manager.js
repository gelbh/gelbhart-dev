/**
 * SectionManager
 *
 * Manages section locking/unlocking, key spawning, and difficulty progression
 * for the Pac-Man game.
 */
export class SectionManager {
  /**
   * Initialize the SectionManager
   * @param {Object} controller - The parent Pac-Man game controller
   */
  constructor(controller) {
    this.controller = controller

    // Section progression configuration
    this.sections = [
      { id: 'projects', unlocked: false, threshold: 300, name: 'Projects' },
      { id: 'technologies', unlocked: false, threshold: 600, name: 'Technologies' },
      { id: 'cta', unlocked: false, threshold: 1000, name: 'Contact' }
    ]

    this.currentSection = 0
    this.keySpawned = false
    this.keyCollected = false
    this.key = null
  }

  /**
   * Initialize locked sections with blur overlays and lock icons
   */
  initializeLockedSections() {
    this.sections.forEach(section => {
      const sectionElement = document.getElementById(section.id)
      if (sectionElement && !section.unlocked) {
        // Wrap section content in a blur container
        const contentWrapper = document.createElement('div')
        contentWrapper.className = 'section-locked-content'

        // Move all existing children into the wrapper
        while (sectionElement.firstChild) {
          contentWrapper.appendChild(sectionElement.firstChild)
        }

        // Add wrapper back to section
        sectionElement.appendChild(contentWrapper)

        // Create lock overlay (as sibling to blurred content)
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

        // Set section as positioned container
        sectionElement.style.position = 'relative'

        // Append lock overlay (as sibling to blurred content, not child)
        sectionElement.appendChild(lockOverlay)
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
      const contentWrapper = sectionElement.querySelector('.section-locked-content')

      if (lockOverlay) {
        lockOverlay.classList.add('unlocking')
        setTimeout(() => {
          lockOverlay.remove()

          // Unwrap the content
          if (contentWrapper) {
            while (contentWrapper.firstChild) {
              sectionElement.insertBefore(contentWrapper.firstChild, contentWrapper)
            }
            contentWrapper.remove()
          }
        }, 600)
      }
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

        // Unwrap the blurred content wrapper
        const contentWrapper = sectionElement.querySelector('.section-locked-content')
        if (contentWrapper) {
          while (contentWrapper.firstChild) {
            sectionElement.insertBefore(contentWrapper.firstChild, contentWrapper)
          }
          contentWrapper.remove()
        }

        // Reset section position style if it was set
        if (sectionElement.style.position === 'relative') {
          sectionElement.style.position = ''
        }
      }
    })
  }

  /**
   * Check if score reached a section threshold and spawn key
   */
  checkSectionThreshold() {
    if (this.currentSection >= this.sections.length) return
    if (this.keySpawned) return // Already spawned key for this section

    const section = this.sections[this.currentSection]

    if (this.controller.dotsScore >= section.threshold) {
      // Clear ALL dots (collected and uncollected) to prepare for key
      this.controller.dots.forEach(dot => {
        if (dot.element && dot.element.parentNode) {
          dot.element.remove()
        }
      })

      // Clear the dots array completely - we'll regenerate after key is collected
      this.controller.dots = []

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
    keyImg.src = this.controller.getAssetPath('items/key.png')
    keyImg.alt = 'Key'
    keyImg.className = 'key-sprite'
    key.appendChild(keyImg)

    // Position at center of viewport
    const keyX = window.innerWidth / 2
    const keyY = window.scrollY + window.innerHeight / 2

    key.style.left = `${keyX}px`
    key.style.top = `${keyY}px`

    this.controller.gameContainerTarget.appendChild(key)

    this.key = {
      element: key,
      x: keyX,
      y: keyY,
      collected: false
    }
  }

  /**
   * Check if Pac-Man collected the key
   */
  checkKeyCollection() {
    if (!this.key || this.key.collected) return

    const collisionRadius = 35

    const distance = Math.sqrt(
      Math.pow(this.controller.pacmanPosition.x - this.key.x, 2) +
      Math.pow(this.controller.pacmanPosition.y - this.key.y, 2)
    )

    if (distance < collisionRadius) {
      this.key.collected = true
      this.keyCollected = true

      // Play sound
      this.controller.playSound('eatFruit', true)

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
        this.controller.regeneratingDots = true // Flag to prevent win condition during regeneration
        setTimeout(() => {
          this.controller.generateDots()
          this.controller.regeneratingDots = false
        }, 800)
      } else {
        // All sections unlocked, regenerate dots one final time
        this.controller.regeneratingDots = true
        setTimeout(() => {
          this.controller.generateDots()
          this.controller.regeneratingDots = false
        }, 800)
      }
    }
  }

  /**
   * Increase difficulty as sections are unlocked
   * Makes game progressively faster and reduces power mode duration
   */
  increaseDifficulty() {
    // Base speeds
    const basePacmanSpeed = 220 // pixels/second
    const baseGhostSpeed = 165   // pixels/second

    // Increase overall game speed by 15% per section unlocked
    const speedMultiplier = 1 + (this.currentSection * 0.15)

    // Increase Pac-Man speed
    this.controller.pacmanSpeed = basePacmanSpeed * speedMultiplier

    // Increase ghost speed (maintaining relative speed difference)
    this.controller.ghostSpeed = baseGhostSpeed * speedMultiplier

    // Cap ghost speed at 85% of Pac-Man's speed to keep game winnable
    const maxGhostSpeed = this.controller.pacmanSpeed * 0.85
    this.controller.ghostSpeed = Math.min(this.controller.ghostSpeed, maxGhostSpeed)

    // Reduce power mode duration (7s base, -1s per section, minimum 3s)
    this.controller.powerModeDuration = Math.max(3000, 7000 - (this.currentSection * 1000))
    this.controller.powerModeWarningDuration = Math.max(1500, 2000 - (this.currentSection * 300))
  }
}
