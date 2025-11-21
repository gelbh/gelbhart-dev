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
import he from "he";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import format from "date-fns/format";
import differenceInDays from "date-fns/differenceInDays";

const EXTRA_LIFE_THRESHOLD = 10000;
const HUD_OFFSET_TOP = 20;

export class UIManager {
  constructor(targets, assetPaths = {}) {
    this.hudTarget = targets.hud;
    this.scoreTarget = targets.score;
    this.livesTarget = targets.lives;
    this.progressItemTarget = targets.progressItem;
    this.progressLabelTarget = targets.progressLabel;
    this.progressValueTarget = targets.progressValue;
    this.assetPaths = assetPaths;

    this.itemTypes = {
      speedBoost: {
        emoji: "⚡",
        name: "Speed Boost",
        color: "#FFD700",
        points: 100,
        duration: 5000,
        positive: true,
      },
      slowDown: {
        emoji: "🐌",
        name: "Slow Down",
        color: "#8B4513",
        points: -50,
        duration: 4000,
        positive: false,
      },
      shield: {
        emoji: "🛡️",
        name: "Shield",
        color: "#00CED1",
        points: 150,
        duration: 6000,
        positive: true,
      },
      freeze: {
        emoji: "❄️",
        name: "Ghost Freeze",
        color: "#87CEEB",
        points: 200,
        duration: 3000,
        positive: true,
      },
      doublePoints: {
        emoji: "⭐",
        name: "Double Points",
        color: "#FF69B4",
        points: 100,
        duration: 10000,
        positive: true,
      },
      extraLife: {
        emoji: "❤️",
        name: "Extra Life",
        color: "#FF0000",
        points: 500,
        duration: 0,
        positive: true,
      },
    };
  }

  /**
   * Update HUD position to stay in viewport
   */
  updateHUDPosition() {
    if (this.hudTarget) {
      const viewportTop = window.scrollY;
      this.hudTarget.style.top = `${viewportTop + HUD_OFFSET_TOP}px`;
    }
  }

  /**
   * Update HUD with current game state
   * @param {Object} gameState - Current game state { score, lives, dotsScore, sections, currentSection, extraLifeAwarded }
   * @param {Object} callbacks - Callback functions { onExtraLife }
   */
  updateHUD(gameState, callbacks = {}) {
    const {
      score,
      lives,
      dotsScore,
      sections,
      currentSection,
      extraLifeAwarded,
    } = gameState;
    const { onExtraLife } = callbacks;

    if (this.scoreTarget) {
      this.scoreTarget.textContent = score;
    }

    if (!extraLifeAwarded && score >= EXTRA_LIFE_THRESHOLD && onExtraLife) {
      onExtraLife();
    }

    if (this.livesTarget) {
      const livesCount = Math.max(0, lives);
      this.livesTarget.textContent = "❤️".repeat(livesCount);
    }

    if (
      this.progressItemTarget &&
      this.progressLabelTarget &&
      this.progressValueTarget
    ) {
      if (currentSection >= sections.length) {
        this.progressItemTarget.style.display = "flex";
        this.progressLabelTarget.textContent = "Goal:";
        this.progressValueTarget.textContent = "Clear All Dots!";
        this.progressValueTarget.style.color = "#00ff00";
        this.progressValueTarget.style.textShadow =
          "0 0 10px rgba(0, 255, 0, 0.8)";
      } else {
        this.progressItemTarget.style.display = "flex";
        const nextSection = sections[currentSection];
        const pointsNeeded = Math.max(0, nextSection.threshold - dotsScore);

        if (pointsNeeded === 0) {
          this.progressLabelTarget.textContent = "Unlock:";
          this.progressValueTarget.textContent = "🔑 Get Key!";
          this.progressValueTarget.style.color = "#ffd700";
          this.progressValueTarget.style.textShadow =
            "0 0 10px rgba(255, 215, 0, 0.8)";
        } else {
          this.progressLabelTarget.textContent = "Need:";
          this.progressValueTarget.textContent = `${pointsNeeded} pts`;
          this.progressValueTarget.style.color = "";
          this.progressValueTarget.style.textShadow = "";
        }
      }
    }
  }

  /**
   * Create and show a modal with common structure
   * @private
   * @param {string} className - Additional CSS class for the modal
   * @param {string} html - HTML content for the modal
   * @returns {HTMLElement} The created modal element
   */
  _createModal(className, html) {
    const modal = document.createElement("div");
    modal.className = `pacman-game-over-modal ${className}`.trim();
    modal.innerHTML = html;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
      modal.classList.add("show");
    });

    return modal;
  }

  /**
   * Setup modal close handler with cleanup
   * @private
   * @param {HTMLElement} modal - Modal element
   * @param {Function} onClose - Callback when modal closes
   * @param {Function} keyboardHandler - Optional keyboard handler to remove
   * @returns {Function} The close handler function
   */
  _setupModalCloseHandler(modal, onClose, keyboardHandler = null) {
    return () => {
      modal.remove();
      onClose?.();
      if (keyboardHandler) {
        document.removeEventListener("keydown", keyboardHandler);
      }
    };
  }

  /**
   * Setup keyboard handler for modal
   * @private
   * @param {Object} handlers - Object mapping keys to handler functions
   * @param {Function} onClose - Optional close handler to call on Escape
   * @returns {Function} The keyboard handler function
   */
  _setupKeyboardHandler(handlers = {}, onClose = null) {
    const keydownHandler = (e) => {
      const handler = handlers[e.key] || handlers[e.key.toLowerCase()];
      if (handler) {
        e.preventDefault();
        handler(e);
      } else if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", keydownHandler);
    return keydownHandler;
  }

  /**
   * Bind action buttons in modal
   * @private
   * @param {HTMLElement} modal - Modal element
   * @param {Object} actions - Object mapping data-action values to callbacks
   */
  _bindModalActions(modal, actions) {
    Object.entries(actions).forEach(([action, callback]) => {
      const button = modal.querySelector(`[data-action="${action}"]`);
      if (button && callback) {
        button.addEventListener("click", callback);
      }
    });
  }

  /**
   * Check if a modal with given class already exists
   * @private
   * @param {string} className - CSS class to check
   * @returns {boolean} True if modal exists
   */
  _modalExists(className) {
    return !!document.querySelector(`.${className}`);
  }

  /**
   * Create modal button HTML
   * @private
   * @param {string} action - Data action attribute value
   * @param {string} label - Button label text
   * @param {string} icon - Boxicons class (e.g., 'bx-refresh')
   * @param {string} variant - Button variant ('primary' or 'secondary')
   * @returns {string} Button HTML
   */
  _createModalButton(action, label, icon, variant = "primary") {
    return `
      <button class="modal-btn modal-btn-${variant}" data-action="${action}">
        <i class="bx ${icon}"></i>
        ${label}
      </button>
    `;
  }

  /**
   * Create modal buttons container
   * @private
   * @param {string} buttonsHtml - HTML for buttons
   * @returns {string} Buttons container HTML
   */
  _createModalButtons(buttonsHtml) {
    return `<div class="modal-buttons">${buttonsHtml}</div>`;
  }

  /**
   * Create modal header (emoji and title)
   * @private
   * @param {string} emoji - Emoji character
   * @param {string} title - Modal title
   * @returns {string} Header HTML
   */
  _createModalHeader(emoji, title) {
    return `
      <div class="modal-emoji">${emoji}</div>
      <h2 class="modal-title">${title}</h2>
    `;
  }

  /**
   * Create modal message
   * @private
   * @param {string} message - Message text (will be escaped)
   * @returns {string} Message HTML
   */
  _createModalMessage(message) {
    return `<p class="modal-message">${he.encode(message)}</p>`;
  }

  /**
   * Create modal content wrapper
   * @private
   * @param {string} content - Inner HTML content
   * @param {string} additionalClass - Additional CSS class for content div
   * @returns {string} Modal content HTML
   */
  _createModalContent(content, additionalClass = "") {
    const classAttr = additionalClass ? ` ${additionalClass}` : "";
    return `<div class="modal-content${classAttr}">${content}</div>`;
  }

  /**
   * Show game over modal
   * @param {boolean} isWin - Whether the player won or lost
   * @param {number} finalScore - The final score
   * @param {Object} callbacks - Callback functions { onRestart, onQuit, onViewLeaderboard }
   */
  showGameOverModal(isWin, finalScore, callbacks = {}) {
    const { onRestart, onQuit, onViewLeaderboard } = callbacks;

    const title = isWin ? "🎉 Victory!" : "💀 Game Over";
    const message = isWin
      ? "Congratulations! You unlocked all sections!"
      : "Better luck next time!";
    const emoji = isWin ? "🏆" : "👾";

    const buttons = [
      this._createModalButton("restart", "Play Again", "bx-refresh", "primary"),
      onViewLeaderboard
        ? this._createModalButton(
            "leaderboard",
            "Leaderboard",
            "bx-trophy",
            "secondary"
          )
        : "",
      this._createModalButton("quit", "Quit", "bx-x", "secondary"),
    ]
      .filter(Boolean)
      .join("");

    const content = [
      this._createModalHeader(emoji, title),
      this._createModalMessage(message),
      `<div class="modal-score">
        <span class="score-label">Final Score</span>
        <span class="score-value">${finalScore}</span>
      </div>`,
      this._createModalButtons(buttons),
    ].join("");

    const modal = this._createModal("", this._createModalContent(content));

    this._bindModalActions(modal, {
      restart: () => {
        modal.remove();
        onRestart?.();
      },
      leaderboard: () => {
        modal.remove();
        onViewLeaderboard?.();
      },
      quit: () => {
        modal.remove();
        onQuit?.();
      },
    });
  }

  /**
   * Show countdown before game start/restart
   * @returns {Promise} Resolves when countdown completes
   */
  showCountdown() {
    return new Promise((resolve) => {
      const countdown = document.createElement("div");
      countdown.className = "pacman-countdown";
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
      `;

      document.body.appendChild(countdown);

      let count = 3;
      let countdownTimer1 = null;
      let countdownTimer2 = null;
      let cancelled = false;

      countdown._cancel = () => {
        cancelled = true;
        if (countdownTimer1) clearTimeout(countdownTimer1);
        if (countdownTimer2) clearTimeout(countdownTimer2);
        countdown.remove();
        resolve();
      };

      const updateCountdown = () => {
        if (cancelled) return;

        if (count > 0) {
          countdown.textContent = count;
          countdown.style.animation = "none";
          countdown.offsetHeight;
          countdown.style.animation = "countdownPulse 1s ease-in-out";
          count--;
          countdownTimer1 = setTimeout(updateCountdown, 1000);
        } else {
          countdown.textContent = "GO!";
          countdown.style.animation = "countdownGo 0.8s ease-out";
          countdownTimer2 = setTimeout(() => {
            if (!cancelled) {
              countdown.remove();
              resolve();
            }
          }, 800);
        }
      };

      updateCountdown();
    });
  }

  /**
   * Show item notification when item is collected
   * @param {Object} item - Item object with config property
   */
  showItemNotification(item) {
    const notification = document.createElement("div");
    notification.className = "item-notification";
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
    `;
    notification.textContent = `${item.config.emoji} ${item.config.name}`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 1500);
  }

  /**
   * Show effect cooldown bar under Pac-Man
   * @param {string} effectName - Name of the effect
   * @param {number} duration - Duration of the effect in milliseconds
   * @param {HTMLElement} pacmanElement - The Pac-Man element to attach cooldown to
   */
  showEffectCooldown(effectName, duration, pacmanElement) {
    this.removeEffectCooldown(effectName, pacmanElement);

    const config = this.itemTypes[effectName];
    const cooldownBar = document.createElement("div");
    cooldownBar.className = "pacman-effect-cooldown";
    cooldownBar.dataset.effect = effectName;
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
    `;

    const fill = document.createElement("div");
    fill.className = "effect-cooldown-fill";
    fill.style.cssText = `
      width: 100%;
      height: 100%;
      background: ${config.color};
      box-shadow: 0 0 8px ${config.color};
      border-radius: 3px;
      transition: width ${duration}ms linear;
    `;

    cooldownBar.appendChild(fill);
    pacmanElement.appendChild(cooldownBar);

    requestAnimationFrame(() => {
      fill.style.width = "0%";
    });
  }

  /**
   * Remove effect cooldown bar
   * @param {string} effectName - Name of the effect
   * @param {HTMLElement} pacmanElement - The Pac-Man element to remove cooldown from
   */
  removeEffectCooldown(effectName, pacmanElement) {
    const existingBar = pacmanElement.querySelector(
      `[data-effect="${effectName}"]`
    );
    if (existingBar) {
      existingBar.remove();
    }
  }

  /**
   * Show player name prompt modal
   * @returns {Promise<string>} Resolves with player name when submitted
   */
  showPlayerNamePrompt() {
    return new Promise((resolve) => {
      const buttons = this._createModalButtons(
        this._createModalButton("submit", "Continue", "bx-check", "primary")
      );

      const content = [
        this._createModalHeader("🎮", "Welcome!"),
        this._createModalMessage(
          "Enter your name to save your scores to the leaderboard"
        ),
        `<div class="modal-input-group">
          <input
            type="text"
            id="playerNameInput"
            class="modal-input"
            placeholder="Your Name"
            maxlength="50"
            autocomplete="off"
          />
        </div>`,
        buttons,
      ].join("");

      const modal = this._createModal("", this._createModalContent(content));
      const input = modal.querySelector("#playerNameInput");
      const submitBtn = modal.querySelector('[data-action="submit"]');

      setTimeout(() => input.focus(), 300);

      const handleSubmit = () => {
        const name = input.value.trim();
        if (name.length > 0) {
          modal.remove();
          resolve(name);
        } else {
          input.classList.add("error");
          setTimeout(() => input.classList.remove("error"), 500);
        }
      };

      submitBtn.addEventListener("click", handleSubmit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleSubmit();
        }
      });
    });
  }

  /**
   * Show leaderboard modal
   * @param {Object} leaderboardData - { global: [], player: { name, scores: [] } }
   * @param {Function} onClose - Callback when modal is closed
   */
  async showLeaderboardModal(leaderboardData, onClose) {
    if (this._modalExists("leaderboard-modal")) {
      return;
    }

    if (!leaderboardData) {
      return;
    }

    const { global = [], player = null } = leaderboardData;

    const globalHTML =
      global && global.length > 0
        ? global
            .map(
              (entry, index) => `
      <div class="leaderboard-row ${
        player && entry.player_name === player.name ? "highlighted" : ""
      }">
        <span class="rank">#${index + 1}</span>
        <span class="player-name">${he.encode(entry.player_name)}</span>
        <span class="win-badge">${entry.is_win ? "🏆" : ""}</span>
        <span class="score">${entry.score}</span>
      </div>
    `
            )
            .join("")
        : '<div class="no-scores">No scores yet. Be the first!</div>';

    const playerHTML =
      player && player.scores && player.scores.length > 0
        ? player.scores
            .map(
              (entry, index) => `
      <div class="leaderboard-row">
        <span class="rank">#${index + 1}</span>
        <span class="score">${entry.score}</span>
        <span class="win-badge">${entry.is_win ? "🏆" : ""}</span>
        <span class="date">${this.formatDate(entry.played_at)}</span>
      </div>
    `
            )
            .join("")
        : '<div class="no-scores">Play to see your scores here!</div>';

    const tabsHtml = [
      '<button class="leaderboard-tab active" data-tab="global">Top Players</button>',
      player
        ? '<button class="leaderboard-tab" data-tab="player">My Scores</button>'
        : "",
    ]
      .filter(Boolean)
      .join("");

    const leaderboardContent = `
      <div class="leaderboard-tabs">${tabsHtml}</div>

      <div class="leaderboard-container">
        <div class="leaderboard-panel active" data-panel="global">
          <div class="leaderboard-header">
            <span>Rank</span>
            <span>Player</span>
            <span></span>
            <span>Score</span>
          </div>
          <div class="leaderboard-list">${globalHTML}</div>
        </div>

        ${
          player
            ? `
          <div class="leaderboard-panel" data-panel="player">
            <div class="leaderboard-header player-header">
              <span>Rank</span>
              <span>Score</span>
              <span></span>
              <span>Date</span>
            </div>
            <div class="leaderboard-list">${playerHTML}</div>
          </div>
        `
            : ""
        }
      </div>
    `;

    const buttons = this._createModalButtons(
      this._createModalButton("close", "Close", "bx-x", "secondary")
    );

    const content = [
      this._createModalHeader("🏆", "Leaderboard"),
      leaderboardContent,
      buttons,
    ].join("");

    const html = this._createModalContent(content, "leaderboard-content");
    const modal = this._createModal("leaderboard-modal", html);

    const tabs = modal.querySelectorAll(".leaderboard-tab");
    const panels = modal.querySelectorAll(".leaderboard-panel");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetTab = tab.dataset.tab;

        tabs.forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));

        tab.classList.add("active");
        modal
          .querySelector(`[data-panel="${targetTab}"]`)
          .classList.add("active");
      });
    });

    const closeHandler = () => {
      modal.remove();
      onClose?.();
    };

    const keydownHandler = (e) => {
      const key = e.key.toLowerCase();
      if (key === "l") {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
      }
    };
    document.addEventListener("keydown", keydownHandler);

    this._bindModalActions(modal, {
      close: () => {
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
      },
    });
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const daysDiff = differenceInDays(now, date);

    if (daysDiff === 0) return "Today";
    if (daysDiff === 1) return "Yesterday";
    if (daysDiff < 7) return formatDistanceToNow(date, { addSuffix: true });
    return format(date, "MMM d, yyyy");
  }

  /**
   * Show confirmation modal
   * @param {string} title - Modal title
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback when user confirms
   * @param {Function} onCancel - Callback when user cancels
   */
  showConfirmationModal(title, message, onConfirm, onCancel) {
    if (this._modalExists("confirmation-modal")) {
      return;
    }

    const buttons = this._createModalButtons(
      [
        this._createModalButton("confirm", "Yes, Quit", "bx-check", "primary"),
        this._createModalButton("cancel", "Cancel", "bx-x", "secondary"),
      ].join("")
    );

    const content = [
      this._createModalHeader("⚠️", he.encode(title)),
      this._createModalMessage(message),
      buttons,
    ].join("");

    const modal = this._createModal(
      "confirmation-modal",
      this._createModalContent(content)
    );

    const handleCancel = () => {
      modal.remove();
      onCancel?.();
    };

    const keydownHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
        document.removeEventListener("keydown", keydownHandler);
      }
    };
    document.addEventListener("keydown", keydownHandler);

    this._bindModalActions(modal, {
      confirm: () => {
        modal.remove();
        onConfirm?.();
        document.removeEventListener("keydown", keydownHandler);
      },
      cancel: handleCancel,
    });
  }

  /**
   * Show menu modal with navigation buttons
   * @param {Object} callbacks - { onSettings, onControls, onLeaderboard, onResume, onQuit }
   */
  showMenuModal(callbacks = {}) {
    if (this._modalExists("pacman-menu-modal")) {
      return;
    }

    const { onSettings, onControls, onLeaderboard, onResume, onQuit } =
      callbacks;

    const menuItems = [
      onSettings
        ? `<button class="menu-item-btn" data-action="settings">
            <i class="bx bx-slider"></i>
            <span>Audio Settings</span>
          </button>`
        : "",
      onControls
        ? `<button class="menu-item-btn" data-action="controls">
            <i class="bx bx-joystick"></i>
            <span>Controls</span>
          </button>`
        : "",
      onLeaderboard
        ? `<button class="menu-item-btn" data-action="leaderboard">
            <i class="bx bx-trophy"></i>
            <span>Leaderboard</span>
          </button>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const buttons = this._createModalButtons(
      [
        onResume
          ? this._createModalButton(
              "resume",
              "Resume Game",
              "bx-play",
              "primary"
            )
          : "",
        onQuit
          ? this._createModalButton("quit", "Quit Game", "bx-exit", "secondary")
          : "",
      ]
        .filter(Boolean)
        .join("")
    );

    const content = [
      this._createModalHeader("🎮", "Menu"),
      `<div class="menu-buttons">${menuItems}</div>`,
      buttons,
    ].join("");

    const modal = this._createModal(
      "pacman-menu-modal",
      this._createModalContent(content)
    );

    const closeHandler = () => {
      modal.remove();
    };

    const keydownHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (onResume) {
          closeHandler();
          onResume();
        }
      }
    };
    document.addEventListener("keydown", keydownHandler);

    const actions = {};
    if (onSettings) {
      actions.settings = () => {
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
        onSettings();
      };
    }
    if (onControls) {
      actions.controls = () => {
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
        onControls();
      };
    }
    if (onLeaderboard) {
      actions.leaderboard = () => {
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
        onLeaderboard();
      };
    }
    if (onResume) {
      actions.resume = () => {
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
        onResume();
      };
    }
    if (onQuit) {
      actions.quit = () => {
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
        onQuit();
      };
    }

    this._bindModalActions(modal, actions);
  }

  /**
   * Show settings modal (audio controls only)
   * @param {number} musicVolume - Current music volume (0.0 to 1.0)
   * @param {number} sfxVolume - Current SFX volume (0.0 to 1.0)
   * @param {boolean} isMuted - Whether audio is currently muted
   * @param {Object} callbacks - { onMusicVolumeChange, onSFXVolumeChange, onMuteToggle, onClose }
   */
  showSettingsModal(musicVolume, sfxVolume, isMuted, callbacks = {}) {
    if (this._modalExists("pacman-settings-modal")) {
      return;
    }

    const { onMusicVolumeChange, onSFXVolumeChange, onMuteToggle, onClose } =
      callbacks;

    const settingsSection = `
      <div class="settings-section">
        <div class="settings-control">
          <div class="settings-control-header">
            <label class="settings-label">
              <i class="bx bx-music"></i>
              <span>Music Volume</span>
            </label>
            <button class="settings-mute-btn ${
              isMuted ? "muted" : ""
            }" data-action="mute" title="Toggle Mute (M)">
              <i class="bx ${
                isMuted ? "bx-volume-mute" : "bx-volume-full"
              }"></i>
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value="${Math.round(musicVolume * 100)}"
            class="settings-volume-slider"
            data-action="music-volume"
          >
        </div>

        <div class="settings-control">
          <label class="settings-label">
            <i class="bx bxs-volume"></i>
            <span>SFX Volume</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value="${Math.round(sfxVolume * 100)}"
            class="settings-volume-slider"
            data-action="sfx-volume"
          >
        </div>
      </div>
    `;

    const buttons = this._createModalButtons(
      this._createModalButton(
        "back",
        "Back to Menu",
        "bx-arrow-back",
        "primary"
      )
    );

    const content = [
      this._createModalHeader("🔊", "Audio Settings"),
      settingsSection,
      buttons,
    ].join("");

    const modal = this._createModal(
      "pacman-settings-modal",
      this._createModalContent(content)
    );

    const musicSlider = modal.querySelector('[data-action="music-volume"]');
    const sfxSlider = modal.querySelector('[data-action="sfx-volume"]');
    const muteBtn = modal.querySelector('[data-action="mute"]');

    if (onMusicVolumeChange) {
      musicSlider.addEventListener("input", (e) => {
        onMusicVolumeChange(parseInt(e.target.value) / 100);
      });
    }

    if (onSFXVolumeChange) {
      sfxSlider.addEventListener("input", (e) => {
        onSFXVolumeChange(parseInt(e.target.value) / 100);
      });
    }

    if (onMuteToggle) {
      muteBtn.addEventListener("click", () => {
        onMuteToggle();
        const isNowMuted = muteBtn.classList.toggle("muted");
        muteBtn.querySelector("i").className = `bx ${
          isNowMuted ? "bx-volume-mute" : "bx-volume-full"
        }`;
      });
    }

    const closeHandler = () => {
      modal.remove();
      onClose?.();
    };

    const keydownHandler = (e) => {
      const key = e.key.toLowerCase();
      if (key === "m" && onMuteToggle) {
        e.preventDefault();
        muteBtn.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
      }
    };
    document.addEventListener("keydown", keydownHandler);

    this._bindModalActions(modal, {
      back: () => {
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
      },
    });
  }

  /**
   * Show controls modal (keyboard reference)
   * @param {Function} onClose - Callback when modal is closed
   */
  showControlsModal(onClose) {
    if (this._modalExists("pacman-controls-modal")) {
      return;
    }

    const controlsSection = `
      <div class="controls-section">
        <div class="controls-grid">
          <div class="control-item">
            <div class="control-keys">
              <kbd class="control-key">W</kbd>
              <kbd class="control-key">A</kbd>
              <kbd class="control-key">S</kbd>
              <kbd class="control-key">D</kbd>
            </div>
            <span class="control-desc">Move</span>
          </div>
          <div class="control-item">
            <div class="control-keys">
              <kbd class="control-key">←</kbd>
              <kbd class="control-key">↑</kbd>
              <kbd class="control-key">↓</kbd>
              <kbd class="control-key">→</kbd>
            </div>
            <span class="control-desc">Move</span>
          </div>
          <div class="control-item">
            <kbd class="control-key">M</kbd>
            <span class="control-desc">Mute/Unmute</span>
          </div>
          <div class="control-item">
            <kbd class="control-key">Esc</kbd>
            <span class="control-desc">Menu</span>
          </div>
        </div>
      </div>
    `;

    const buttons = this._createModalButtons(
      this._createModalButton(
        "back",
        "Back to Menu",
        "bx-arrow-back",
        "primary"
      )
    );

    const content = [
      this._createModalHeader("🎮", "Controls"),
      controlsSection,
      buttons,
    ].join("");

    const modal = this._createModal(
      "pacman-controls-modal",
      this._createModalContent(content)
    );

    const closeHandler = () => {
      modal.remove();
      onClose?.();
    };

    const keydownHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
      }
    };
    document.addEventListener("keydown", keydownHandler);

    this._bindModalActions(modal, {
      back: () => {
        closeHandler();
        document.removeEventListener("keydown", keydownHandler);
      },
    });
  }
}
