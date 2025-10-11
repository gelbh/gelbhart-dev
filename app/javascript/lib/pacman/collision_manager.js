/**
 * CollisionManager - Handles collision detection and hover effects
 *
 * Manages:
 * - Section boundary checking for locked sections
 * - Hover effect detection when Pac-Man moves over elements
 * - Boundary flash feedback
 */
export class CollisionManager {
  constructor() {
    this.hoveredElement = null
    this.lastBoundaryFlash = null
    this.hoverCheckFrameCounter = 0 // Throttle hover checks for performance
  }

  /**
   * Build collision map (not used for movement in free mode)
   */
  buildCollisionMap() {
    // Free movement enabled
  }

  /**
   * Check collision at position (free movement mode - no collisions)
   */
  checkCollision(x, y, vx = 0, vy = 0) {
    return null // No collision detection in free movement mode
  }

  /**
   * Check if Pac-Man is trying to enter a locked section
   * Returns the boundary Y position if blocked, null if allowed
   */
  checkSectionBoundary(pacmanPosition, sections, isGameActive) {
    if (!isGameActive) return null

    // Find the first locked section
    const lockedSection = sections.find(section => !section.unlocked)
    if (!lockedSection) return null

    const sectionElement = document.getElementById(lockedSection.id)
    if (!sectionElement) return null

    const rect = sectionElement.getBoundingClientRect()
    const sectionTop = rect.top + window.scrollY
    const buffer = 50 // Buffer zone before section

    // Check if trying to enter from above
    if (pacmanPosition.y < sectionTop && pacmanPosition.y >= sectionTop - buffer) {
      return sectionTop - buffer
    }

    return null
  }

  /**
   * Flash a boundary element to provide visual feedback
   */
  flashBoundary(type, sections) {
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
      const lockedSection = sections.find(s => !s.unlocked)
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
   * Check if Pac-Man is hovering over any interactive elements
   * Throttled to every 3 frames for better performance
   */
  checkHoverEffects(pacmanPosition) {
    // Throttle to every 3 frames for performance (document.elementsFromPoint is expensive)
    this.hoverCheckFrameCounter++
    if (this.hoverCheckFrameCounter < 3) {
      return this.hoveredElement
    }
    this.hoverCheckFrameCounter = 0

    const viewportX = pacmanPosition.x
    const viewportY = pacmanPosition.y - window.scrollY

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

    return this.hoveredElement
  }

  /**
   * Clear all hover effects (called when game stops)
   */
  clearHoverEffects() {
    if (this.hoveredElement) {
      this.hoveredElement.classList.remove('pacman-hover')
      const leaveEvent = new CustomEvent('pacman:leave', {
        detail: { element: this.hoveredElement }
      })
      this.hoveredElement.dispatchEvent(leaveEvent)
      this.hoveredElement = null
    }

    // Reset frame counter
    this.hoverCheckFrameCounter = 0

    // Remove all pacman-hover classes from any elements
    document.querySelectorAll('.pacman-hover').forEach(el => {
      el.classList.remove('pacman-hover')
    })
  }
}
