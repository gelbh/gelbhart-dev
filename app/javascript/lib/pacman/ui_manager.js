/**
 * UIManager - Coordinates all UI-related functionality for the Pac-Man game
 *
 * Composes specialized managers to handle:
 * - HUD (score, lives, progress)
 * - Modals (game over, leaderboard, menu, settings, controls, confirmation, player name)
 * - Countdown display
 * - Item notifications
 * - Effect cooldown displays
 */
import { HUDManager } from "lib/pacman/ui/hud_manager";
import { NotificationManager } from "lib/pacman/ui/notification_manager";
import { EffectCooldownManager } from "lib/pacman/ui/effect_cooldown_manager";
import { showGameOverModal } from "lib/pacman/ui/modals/game_over_modal";
import { showLeaderboardModal } from "lib/pacman/ui/modals/leaderboard_modal";
import { showMenuModal } from "lib/pacman/ui/modals/menu_modal";
import { showSettingsModal } from "lib/pacman/ui/modals/settings_modal";
import { showControlsModal } from "lib/pacman/ui/modals/controls_modal";
import { showConfirmationModal } from "lib/pacman/ui/modals/confirmation_modal";
import { showPlayerNamePrompt } from "lib/pacman/ui/modals/player_name_modal";

export class UIManager {
  constructor(targets) {
    // Initialize specialized managers
    this.hudManager = new HUDManager({
      hud: targets.hud,
      score: targets.score,
      lives: targets.lives,
      progressItem: targets.progressItem,
      progressLabel: targets.progressLabel,
      progressValue: targets.progressValue,
    });

    this.notificationManager = new NotificationManager();
    this.effectCooldownManager = new EffectCooldownManager();
  }

  /**
   * Update HUD position to stay in viewport
   */
  updateHUDPosition() {
    this.hudManager.updateHUDPosition();
  }

  /**
   * Update HUD with current game state
   * @param {Object} gameState - Current game state { score, lives, dotsScore, sections, currentSection, extraLifeAwarded }
   * @param {Object} callbacks - Callback functions { onExtraLife }
   */
  updateHUD(gameState, callbacks = {}) {
    this.hudManager.updateHUD(gameState, callbacks);
  }

  /**
   * Show game over modal
   * @param {boolean} isWin - Whether the player won or lost
   * @param {number} finalScore - The final score
   * @param {Object} callbacks - Callback functions { onRestart, onQuit, onViewLeaderboard }
   */
  showGameOverModal(isWin, finalScore, callbacks = {}) {
    return showGameOverModal(isWin, finalScore, callbacks);
  }

  /**
   * Show countdown before game start/restart
   * @returns {Promise} Resolves when countdown completes
   */
  showCountdown() {
    return this.notificationManager.showCountdown();
  }

  /**
   * Show item notification when item is collected
   * @param {Object} item - Item object with config property
   */
  showItemNotification(item) {
    this.notificationManager.showItemNotification(item);
  }

  /**
   * Show effect cooldown bar under Pac-Man
   * @param {string} effectName - Name of the effect
   * @param {number} duration - Duration of the effect in milliseconds
   * @param {HTMLElement} pacmanElement - The Pac-Man element to attach cooldown to
   */
  showEffectCooldown(effectName, duration, pacmanElement) {
    this.effectCooldownManager.showEffectCooldown(
      effectName,
      duration,
      pacmanElement
    );
  }

  /**
   * Remove effect cooldown bar
   * @param {string} effectName - Name of the effect
   * @param {HTMLElement} pacmanElement - The Pac-Man element to remove cooldown from
   */
  removeEffectCooldown(effectName, pacmanElement) {
    this.effectCooldownManager.removeEffectCooldown(effectName, pacmanElement);
  }

  /**
   * Show player name prompt modal
   * @returns {Promise<string>} Resolves with player name when submitted
   */
  showPlayerNamePrompt() {
    return showPlayerNamePrompt();
  }

  /**
   * Show leaderboard modal
   * @param {Object} leaderboardData - { global: [], player: { name, scores: [] } }
   * @param {Function} onClose - Callback when modal is closed
   */
  async showLeaderboardModal(leaderboardData, onClose) {
    return showLeaderboardModal(leaderboardData, onClose);
  }

  /**
   * Show confirmation modal
   * @param {string} title - Modal title
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback when user confirms
   * @param {Function} onCancel - Callback when user cancels
   */
  showConfirmationModal(title, message, onConfirm, onCancel) {
    return showConfirmationModal(title, message, onConfirm, onCancel);
  }

  /**
   * Show menu modal with navigation buttons
   * @param {Object} callbacks - { onSettings, onControls, onLeaderboard, onResume, onQuit }
   */
  showMenuModal(callbacks = {}) {
    return showMenuModal(callbacks);
  }

  /**
   * Show settings modal (audio controls only)
   * @param {number} musicVolume - Current music volume (0.0 to 1.0)
   * @param {number} sfxVolume - Current SFX volume (0.0 to 1.0)
   * @param {boolean} isMuted - Whether audio is currently muted
   * @param {Object} callbacks - { onMusicVolumeChange, onSFXVolumeChange, onMuteToggle, onClose }
   */
  showSettingsModal(musicVolume, sfxVolume, isMuted, callbacks = {}) {
    return showSettingsModal(musicVolume, sfxVolume, isMuted, callbacks);
  }

  /**
   * Show controls modal (keyboard reference)
   * @param {Function} onClose - Callback when modal is closed
   */
  showControlsModal(onClose) {
    return showControlsModal(onClose);
  }
}
