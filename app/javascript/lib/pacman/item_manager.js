/**
 * ItemManager Module
 *
 * Handles all item/dot/pellet-related functionality for the Pac-Man game.
 * This includes generation, creation, collision detection, and effect application.
 */
export class ItemManager {
  constructor(controller) {
    this.controller = controller

    // Item types configuration
    this.itemTypes = {
      speedBoost: { emoji: '⚡', name: 'Speed Boost', color: '#FFD700', points: 100, duration: 5000, positive: true },
      slowDown: { emoji: '🐌', name: 'Slow Down', color: '#8B4513', points: -50, duration: 4000, positive: false },
      shield: { emoji: '🛡️', name: 'Shield', color: '#00CED1', points: 150, duration: 6000, positive: true },
      freeze: { emoji: '❄️', name: 'Ghost Freeze', color: '#87CEEB', points: 200, duration: 3000, positive: true },
      doublePoints: { emoji: '⭐', name: 'Double Points', color: '#FF69B4', points: 100, duration: 10000, positive: true },
      extraLife: { emoji: '❤️', name: 'Extra Life', color: '#FF0000', points: 500, duration: 0, positive: true }
    }
  }

  /**
   * Generate dots across the playable area
   * Excludes locked sections
   */
  generateDots() {
    // Clear existing dots
    this.controller.dots = []
    const existingDots = this.controller.element.querySelectorAll('.pacman-dot')
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
    this.controller.sections.forEach(section => {
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
        const alreadyCollected = this.controller.collectedDotPositions.has(posKey)

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
          const tooClose = this.controller.dots.some(dot => {
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

    console.log(`Generated ${this.controller.dots.length} dots in playable area (${sections} sections, excluding locked zones) - optimized for performance`)

    // Spawn initial items after dots are generated
    this.spawnRandomItems()
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
    this.controller.gameContainerTarget.appendChild(dot)

    this.controller.dots.push({
      element: dot,
      x: x,
      y: y,
      collected: false,
      points: 10
    })
  }

  /**
   * Create a power pellet at specified position
   */
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
    this.controller.gameContainerTarget.appendChild(pellet)

    this.controller.dots.push({
      element: pellet,
      x: x,
      y: y,
      collected: false,
      points: 50,
      isPowerPellet: true
    })
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
      const isInLockedSection = this.controller.sections.some(section => {
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
    this.controller.gameContainerTarget.appendChild(item)

    this.controller.items.push({
      element: item,
      x: x,
      y: y,
      type: type,
      config: itemConfig,
      collected: false
    })
  }

  /**
   * Optimize dot visibility - only render dots within or near viewport for performance
   */
  optimizeDotVisibility() {
    // Only render dots within or near viewport for performance
    const viewportTop = window.scrollY
    const viewportBottom = viewportTop + window.innerHeight
    const renderBuffer = window.innerHeight * 0.5 // Render dots 50% viewport beyond edges

    this.controller.dots.forEach(dot => {
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

  /**
   * Check for dot collisions with Pac-Man
   */
  checkDotCollisions() {
    const collisionRadius = 25

    this.controller.dots.forEach(dot => {
      if (dot.collected) return

      const distance = Math.sqrt(
        Math.pow(this.controller.pacmanPosition.x - dot.x, 2) +
        Math.pow(this.controller.pacmanPosition.y - dot.y, 2)
      )

      if (distance < collisionRadius) {
        dot.collected = true
        dot.element.classList.add('collected')

        // Apply double points if active
        const pointsEarned = dot.points * (this.controller.activeEffects.doublePoints ? 2 : 1)
        this.controller.score += pointsEarned
        this.controller.dotsScore += dot.points // Track dots score separately for section unlocking (no double points for unlocking)
        this.controller.updateHUD()

        // Track this dot position as collected (to prevent regeneration)
        const posKey = `${Math.round(dot.x)},${Math.round(dot.y)}`
        this.controller.collectedDotPositions.add(posKey)

        // Play appropriate sound
        if (dot.isPowerPellet) {
          // Power pellet sound
          this.controller.playSound('eatFruit', true)
          this.activatePowerMode()
        } else {
          // Regular dot - play chomp sound
          this.controller.playSound('chomp', true)
        }

        // Remove dot immediately without animation for better performance
        if (dot.element && dot.element.parentNode) {
          dot.element.remove()
        }

        // Check if we reached a section threshold
        this.controller.checkSectionThreshold()
      }
    })
  }

  /**
   * Check for item collisions with Pac-Man
   */
  checkItemCollisions() {
    const collisionRadius = 30

    this.controller.items.forEach(item => {
      if (item.collected) return

      const distance = Math.sqrt(
        Math.pow(this.controller.pacmanPosition.x - item.x, 2) +
        Math.pow(this.controller.pacmanPosition.y - item.y, 2)
      )

      if (distance < collisionRadius) {
        item.collected = true
        item.element.classList.add('collected')

        // Add points (can be negative for bad items!)
        const pointsEarned = item.config.points * (this.controller.activeEffects.doublePoints ? 2 : 1)
        this.controller.score += pointsEarned
        this.controller.updateHUD()

        // Show pickup notification
        this.showItemNotification(item)

        // Apply item effect
        this.applyItemEffect(item.type, item.config)

        // Play sound
        if (item.config.positive) {
          this.controller.playSound('eatFruit', true)
        } else {
          this.controller.playSound('death', true) // Use death sound for negative items
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

  /**
   * Apply item effect based on type
   */
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
        this.controller.lives++
        this.controller.updateHUD()
        this.controller.playSound('extraPac', true)
        console.log("❤️ Extra life gained!")
        break
    }
  }

  /**
   * Activate speed boost effect
   */
  activateSpeedBoost(duration) {
    this.controller.activeEffects.speedBoost = true
    this.controller.pacmanSpeed = 180 * 1.5 // 50% faster (270 pixels/second)
    this.controller.pacmanTarget.classList.add('speed-boost')

    // Create cooldown bar under Pac-Man
    this.showEffectCooldown('speedBoost', duration)

    this.clearEffectTimer('speedBoost')
    this.controller.effectTimers.speedBoost = setTimeout(() => {
      this.controller.activeEffects.speedBoost = false
      this.controller.pacmanSpeed = 180 // Reset to normal speed
      this.controller.pacmanTarget.classList.remove('speed-boost')
      this.removeEffectCooldown('speedBoost')
    }, duration)

    console.log(`⚡ Speed boost activated for ${duration / 1000}s!`)
  }

  /**
   * Activate slow down effect
   */
  activateSlowDown(duration) {
    this.controller.activeEffects.slowDown = true
    this.controller.pacmanSpeed = 180 * 0.6 // 40% slower (108 pixels/second)
    this.controller.pacmanTarget.classList.add('slow-down')

    // Create cooldown bar under Pac-Man
    this.showEffectCooldown('slowDown', duration)

    this.clearEffectTimer('slowDown')
    this.controller.effectTimers.slowDown = setTimeout(() => {
      this.controller.activeEffects.slowDown = false
      this.controller.pacmanSpeed = 180 // Reset to normal speed
      this.controller.pacmanTarget.classList.remove('slow-down')
      this.removeEffectCooldown('slowDown')
    }, duration)

    console.log(`🐌 Slowed down for ${duration / 1000}s!`)
  }

  /**
   * Activate shield effect
   */
  activateShield(duration) {
    this.controller.activeEffects.shield = true
    this.controller.pacmanTarget.classList.add('shielded')

    // Create cooldown bar under Pac-Man
    this.showEffectCooldown('shield', duration)

    this.clearEffectTimer('shield')
    this.controller.effectTimers.shield = setTimeout(() => {
      this.controller.activeEffects.shield = false
      this.controller.pacmanTarget.classList.remove('shielded')
      this.removeEffectCooldown('shield')
    }, duration)

    console.log(`🛡️ Shield activated for ${duration / 1000}s!`)
  }

  /**
   * Activate ghost freeze effect
   */
  activateGhostFreeze(duration) {
    this.controller.activeEffects.freeze = true

    // Create cooldown bar under Pac-Man
    this.showEffectCooldown('freeze', duration)

    // Freeze all ghosts
    this.controller.ghosts.forEach(ghost => {
      if (!ghost.frozen) {
        ghost.frozen = true
        ghost.element.classList.add('frozen')
      }
    })

    this.clearEffectTimer('freeze')
    this.controller.effectTimers.freeze = setTimeout(() => {
      this.controller.activeEffects.freeze = false
      this.removeEffectCooldown('freeze')
      this.controller.ghosts.forEach(ghost => {
        ghost.frozen = false
        ghost.element.classList.remove('frozen')
      })
    }, duration)

    console.log(`❄️ Ghosts frozen for ${duration / 1000}s!`)
  }

  /**
   * Activate double points effect
   */
  activateDoublePoints(duration) {
    this.controller.activeEffects.doublePoints = true
    this.controller.pacmanTarget.classList.add('double-points')

    // Create cooldown bar under Pac-Man
    this.showEffectCooldown('doublePoints', duration)

    this.clearEffectTimer('doublePoints')
    this.controller.effectTimers.doublePoints = setTimeout(() => {
      this.controller.activeEffects.doublePoints = false
      this.controller.pacmanTarget.classList.remove('double-points')
      this.removeEffectCooldown('doublePoints')
    }, duration)

    console.log(`⭐ Double points activated for ${duration / 1000}s!`)
  }

  /**
   * Activate power mode (from power pellet)
   */
  activatePowerMode() {
    this.controller.powerMode = true
    this.controller.powerModeEnding = false
    this.controller.pacmanTarget.classList.add('powered')

    // Make ghosts frightened (not eaten ones)
    this.controller.ghosts.forEach(ghost => {
      if (!ghost.eaten) {
        ghost.frightened = true
        ghost.element.classList.add('frightened')
        // Update sprite to frightened
        const sprite = ghost.element.querySelector('.ghost-sprite')
        if (sprite) {
          sprite.src = this.controller.getFrightenedSprite(1)
        }
      }
    })

    // Clear existing timers
    if (this.controller.powerModeTimer) {
      clearTimeout(this.controller.powerModeTimer)
    }
    if (this.controller.powerModeEndingTimer) {
      clearTimeout(this.controller.powerModeEndingTimer)
    }

    // Use dynamic durations based on current difficulty
    const totalDuration = this.controller.powerModeDuration || 7000
    const warningDuration = this.controller.powerModeWarningDuration || 2000

    // Start flashing before ending
    this.controller.powerModeEndingTimer = setTimeout(() => {
      this.controller.powerModeEnding = true
    }, totalDuration - warningDuration)

    // Deactivate after duration
    this.controller.powerModeTimer = setTimeout(() => {
      this.controller.powerMode = false
      this.controller.powerModeEnding = false
      this.controller.pacmanTarget.classList.remove('powered')

      this.controller.ghosts.forEach(ghost => {
        if (!ghost.eaten) {
          ghost.frightened = false
          ghost.element.classList.remove('frightened')
          // Restore normal ghost sprite
          const sprite = ghost.element.querySelector('.ghost-sprite')
          if (sprite) {
            sprite.src = this.controller.getGhostSprite(ghost.color, ghost.direction, ghost.animationFrame)
          }
        }
      })
    }, totalDuration)
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
    this.controller.pacmanTarget.appendChild(cooldownBar)

    // Animate fill to 0
    requestAnimationFrame(() => {
      fill.style.width = '0%'
    })
  }

  /**
   * Remove effect cooldown bar
   */
  removeEffectCooldown(effectName) {
    const existingBar = this.controller.pacmanTarget.querySelector(`[data-effect="${effectName}"]`)
    if (existingBar) {
      existingBar.remove()
    }
  }

  /**
   * Clear effect timer
   */
  clearEffectTimer(effectType) {
    if (this.controller.effectTimers[effectType]) {
      clearTimeout(this.controller.effectTimers[effectType])
      delete this.controller.effectTimers[effectType]
    }
  }

  /**
   * Show item pickup notification
   */
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
      if (notification.parentNode) {
        notification.remove()
      }
    }, 1500)
  }
}
