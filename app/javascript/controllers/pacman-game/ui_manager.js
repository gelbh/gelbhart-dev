/**
 * UIManager - Handles all UI-related functionality for the Pac-Man game
 *
 * Manages:
 * - HUD (score, lives, progress)
 * - Pause overlay
 * - Game over modal
 * - Countdown display
 * - Item notifications
 * - Effect cooldown displays
 */
export class UIManager {
  constructor(targets, assetPaths = {}) {
    // Store target references
    this.hudTarget = targets.hud
    this.scoreTarget = targets.score
    this.livesTarget = targets.lives
    this.progressItemTarget = targets.progressItem
    this.progressLabelTarget = targets.progressLabel
    this.progressValueTarget = targets.progressValue

    // Asset paths for production
    this.assetPaths = assetPaths

    // Item types configuration (for notifications and cooldowns)
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
   * Update HUD position to stay in viewport
   * Positions HUD in top-right, moving with scroll position
   */
  updateHUDPosition() {
    if (this.hudTarget) {
      const viewportTop = window.scrollY
      this.hudTarget.style.top = `${viewportTop + 20}px` // Always 20px from top of viewport
    }
  }

  /**
   * Update HUD with current game state
   * @param {Object} gameState - Current game state { score, lives, dotsScore, sections, currentSection, extraLifeAwarded }
   * @param {Object} callbacks - Callback functions { onExtraLife }
   */
  updateHUD(gameState, callbacks = {}) {
    const { score, lives, dotsScore, sections, currentSection, extraLifeAwarded } = gameState
    const { onExtraLife } = callbacks

    // Update score
    if (this.scoreTarget) {
      this.scoreTarget.textContent = score
    }

    // Award extra life at 10,000 points (classic Pac-Man)
    if (!extraLifeAwarded && score >= 10000 && onExtraLife) {
      onExtraLife()
    }

    // Update lives display
    if (this.livesTarget) {
      // Prevent negative lives display
      const livesCount = Math.max(0, lives)
      this.livesTarget.textContent = '❤️'.repeat(livesCount)
    }

    // Update progress to next section
    if (this.progressItemTarget && this.progressLabelTarget && this.progressValueTarget) {
      if (currentSection >= sections.length) {
        // All sections unlocked - show completion message
        this.progressItemTarget.style.display = 'flex'
        this.progressLabelTarget.textContent = 'Goal:'
        this.progressValueTarget.textContent = 'Clear All Dots!'
        this.progressValueTarget.style.color = '#00ff00'
        this.progressValueTarget.style.textShadow = '0 0 10px rgba(0, 255, 0, 0.8)'
      } else {
        this.progressItemTarget.style.display = 'flex'
        const nextSection = sections[currentSection]
        const pointsNeeded = Math.max(0, nextSection.threshold - dotsScore)

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

  /**
   * Show pause overlay with controls
   */
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
            <span class="control-key">L</span>
            <span class="control-desc">Leaderboard</span>
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

  /**
   * Hide pause overlay
   * @returns {Promise} Resolves when animation completes
   */
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

  /**
   * Show game over modal
   * @param {boolean} isWin - Whether the player won or lost
   * @param {number} finalScore - The final score
   * @param {Object} callbacks - Callback functions { onRestart, onQuit, onViewLeaderboard }
   */
  showGameOverModal(isWin, finalScore, callbacks = {}) {
    const { onRestart, onQuit, onViewLeaderboard } = callbacks

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
          <span class="score-value">${finalScore}</span>
        </div>
        <div class="modal-buttons">
          <button class="modal-btn modal-btn-primary" data-action="restart">
            <i class="bx bx-refresh"></i>
            Play Again
          </button>
          ${onViewLeaderboard ? `
            <button class="modal-btn modal-btn-secondary" data-action="leaderboard">
              <i class="bx bx-trophy"></i>
              Leaderboard
            </button>
          ` : ''}
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
    if (onRestart) {
      modal.querySelector('[data-action="restart"]').addEventListener('click', () => {
        modal.remove()
        onRestart()
      })
    }

    if (onViewLeaderboard) {
      const leaderboardBtn = modal.querySelector('[data-action="leaderboard"]')
      if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', () => {
          modal.remove()
          onViewLeaderboard()
        })
      }
    }

    if (onQuit) {
      modal.querySelector('[data-action="quit"]').addEventListener('click', () => {
        modal.remove()
        onQuit()
      })
    }
  }

  /**
   * Show countdown before game start/restart
   * @returns {Promise} Resolves when countdown completes
   */
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

      document.body.appendChild(countdown)

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

  /**
   * Show item notification when item is collected
   * @param {Object} item - Item object with config property
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
      notification.remove()
    }, 1500)
  }

  /**
   * Show effect cooldown bar under Pac-Man
   * @param {string} effectName - Name of the effect
   * @param {number} duration - Duration of the effect in milliseconds
   * @param {HTMLElement} pacmanElement - The Pac-Man element to attach cooldown to
   */
  showEffectCooldown(effectName, duration, pacmanElement) {
    // Remove existing cooldown bar if any
    this.removeEffectCooldown(effectName, pacmanElement)

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
    pacmanElement.appendChild(cooldownBar)

    // Animate fill to 0
    requestAnimationFrame(() => {
      fill.style.width = '0%'
    })
  }

  /**
   * Remove effect cooldown bar
   * @param {string} effectName - Name of the effect
   * @param {HTMLElement} pacmanElement - The Pac-Man element to remove cooldown from
   */
  removeEffectCooldown(effectName, pacmanElement) {
    const existingBar = pacmanElement.querySelector(`[data-effect="${effectName}"]`)
    if (existingBar) {
      existingBar.remove()
    }
  }

  /**
   * Show player name prompt modal
   * @returns {Promise<string>} Resolves with player name when submitted
   */
  showPlayerNamePrompt() {
    return new Promise((resolve) => {
      const modal = document.createElement('div')
      modal.className = 'pacman-game-over-modal'

      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-emoji">🎮</div>
          <h2 class="modal-title">Welcome!</h2>
          <p class="modal-message">Enter your name to save your scores to the leaderboard</p>
          <div class="modal-input-group">
            <input
              type="text"
              id="playerNameInput"
              class="modal-input"
              placeholder="Your Name"
              maxlength="50"
              autocomplete="off"
            />
          </div>
          <div class="modal-buttons">
            <button class="modal-btn modal-btn-primary" data-action="submit">
              <i class="bx bx-check"></i>
              Continue
            </button>
          </div>
        </div>
      `

      document.body.appendChild(modal)

      // Animate in
      requestAnimationFrame(() => {
        modal.classList.add('show')
      })

      const input = modal.querySelector('#playerNameInput')
      const submitBtn = modal.querySelector('[data-action="submit"]')

      // Focus input
      setTimeout(() => input.focus(), 300)

      const handleSubmit = () => {
        const name = input.value.trim()
        if (name.length > 0) {
          modal.remove()
          resolve(name)
        } else {
          input.classList.add('error')
          setTimeout(() => input.classList.remove('error'), 500)
        }
      }

      // Handle submit button click
      submitBtn.addEventListener('click', handleSubmit)

      // Handle enter key
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleSubmit()
        }
      })
    })
  }

  /**
   * Show leaderboard modal
   * @param {Object} leaderboardData - { global: [], player: { name, scores: [] } }
   * @param {Function} onClose - Callback when modal is closed
   */
  async showLeaderboardModal(leaderboardData, onClose) {
    const modal = document.createElement('div')
    modal.className = 'pacman-game-over-modal leaderboard-modal'

    const { global, player } = leaderboardData

    // Create global leaderboard HTML
    const globalHTML = global.length > 0 ? global.map((entry, index) => `
      <div class="leaderboard-row ${player && entry.player_name === player.name ? 'highlighted' : ''}">
        <span class="rank">#${index + 1}</span>
        <span class="player-name">${this.escapeHtml(entry.player_name)}</span>
        <span class="win-badge">${entry.is_win ? '🏆' : ''}</span>
        <span class="score">${entry.score}</span>
      </div>
    `).join('') : '<div class="no-scores">No scores yet. Be the first!</div>'

    // Create player leaderboard HTML
    const playerHTML = player && player.scores.length > 0 ? player.scores.map((entry, index) => `
      <div class="leaderboard-row">
        <span class="rank">#${index + 1}</span>
        <span class="score">${entry.score}</span>
        <span class="win-badge">${entry.is_win ? '🏆' : ''}</span>
        <span class="date">${this.formatDate(entry.played_at)}</span>
      </div>
    `).join('') : '<div class="no-scores">Play to see your scores here!</div>'

    modal.innerHTML = `
      <div class="modal-content leaderboard-content">
        <div class="modal-emoji">🏆</div>
        <h2 class="modal-title">Leaderboard</h2>

        <div class="leaderboard-tabs">
          <button class="leaderboard-tab active" data-tab="global">Global Top 100</button>
          ${player ? `<button class="leaderboard-tab" data-tab="player">My Scores</button>` : ''}
        </div>

        <div class="leaderboard-container">
          <div class="leaderboard-panel active" data-panel="global">
            <div class="leaderboard-header">
              <span>Rank</span>
              <span>Player</span>
              <span></span>
              <span>Score</span>
            </div>
            <div class="leaderboard-list">
              ${globalHTML}
            </div>
          </div>

          ${player ? `
            <div class="leaderboard-panel" data-panel="player">
              <div class="leaderboard-header player-header">
                <span>Rank</span>
                <span>Score</span>
                <span></span>
                <span>Date</span>
              </div>
              <div class="leaderboard-list">
                ${playerHTML}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="modal-buttons">
          <button class="modal-btn modal-btn-secondary" data-action="close">
            <i class="bx bx-x"></i>
            Close
          </button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('show')
    })

    // Tab switching
    const tabs = modal.querySelectorAll('.leaderboard-tab')
    const panels = modal.querySelectorAll('.leaderboard-panel')

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab

        tabs.forEach(t => t.classList.remove('active'))
        panels.forEach(p => p.classList.remove('active'))

        tab.classList.add('active')
        modal.querySelector(`[data-panel="${targetTab}"]`).classList.add('active')
      })
    })

    // Close button
    modal.querySelector('[data-action="close"]').addEventListener('click', () => {
      modal.remove()
      if (onClose) onClose()
    })
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  /**
   * Show confirmation modal
   * @param {string} title - Modal title
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback when user confirms
   * @param {Function} onCancel - Callback when user cancels
   */
  showConfirmationModal(title, message, onConfirm, onCancel) {
    const modal = document.createElement('div')
    modal.className = 'pacman-game-over-modal confirmation-modal'

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-emoji">⚠️</div>
        <h2 class="modal-title">${this.escapeHtml(title)}</h2>
        <p class="modal-message">${this.escapeHtml(message)}</p>
        <div class="modal-buttons">
          <button class="modal-btn modal-btn-primary" data-action="confirm">
            <i class="bx bx-check"></i>
            Yes, Quit
          </button>
          <button class="modal-btn modal-btn-secondary" data-action="cancel">
            <i class="bx bx-x"></i>
            Cancel
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
    modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      modal.remove()
      if (onConfirm) onConfirm()
    })

    modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      modal.remove()
      if (onCancel) onCancel()
    })

    // Allow Escape key to cancel
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove()
        if (onCancel) onCancel()
        document.removeEventListener('keydown', escapeHandler)
      }
    }
    document.addEventListener('keydown', escapeHandler)
  }
}
