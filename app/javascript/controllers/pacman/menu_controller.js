import { Controller } from "@hotwired/stimulus";
import { LeaderboardManager } from "lib/pacman/leaderboard_manager";

/**
 * Pac-Man Menu Controller
 *
 * Handles all menu-related functionality:
 * - Menu modal (pause/resume/quit/settings/controls/leaderboard)
 * - Settings modal (audio volume, mute)
 * - Controls modal (instructions)
 * - Leaderboard modal (fetch/display scores)
 * - Game over modal (win/lose)
 * - Player name prompt
 * - Score submission
 *
 * Uses outlet to communicate with pacman-game controller
 *
 * @extends Controller
 */
export default class extends Controller {
  static outlets = ["pacman-game"];

  connect() {
    // Initialize leaderboard manager
    this.leaderboardManager = new LeaderboardManager();
  }

  disconnect() {
    // No cleanup needed
  }

  /**
   * Get game controller reference from the same element.
   * Falls back to Stimulus API when outlets aren't available (same element controllers).
   * @returns {Controller|null} Game controller instance or null if not found
   */
  getGameController() {
    if (this.hasPacmanGameOutlet) {
      return this.pacmanGameOutlet;
    }

    if (this.element?._pacmanGameController) {
      return this.element._pacmanGameController;
    }

    if (this.application?.element) {
      try {
        return this.application.getControllerForElementAndIdentifier(
          this.element,
          "pacman-game"
        );
      } catch {
        // Fallback failed
      }
    }

    return null;
  }

  /**
   * Show leaderboard from menu
   */
  async showLeaderboardFromMenu() {
    const gameController = this.getGameController();
    if (!gameController) return;

    const data = await this.leaderboardManager.fetchLeaderboardData();
    await gameController.showLeaderboardModal(data, () => {
      gameController.showMenu();
    });
  }

  /**
   * Show leaderboard after game ends (calls stopGame when closed)
   * @throws {Error} If leaderboard fails to open
   */
  async showLeaderboardFromGameEnd() {
    const gameController = this.getGameController();
    if (!gameController) {
      throw new Error("Game controller not available");
    }

    try {
      const data = await this.leaderboardManager.fetchLeaderboardData();
      if (!data) {
        throw new Error("Failed to fetch leaderboard data");
      }

      const modal = await gameController.showLeaderboardModal(data, () => {
        gameController.stopGame();
      });

      if (!modal) {
        throw new Error("Leaderboard modal failed to open");
      }
    } catch (error) {
      console.error("Error showing leaderboard from game end:", error);
      throw error;
    }
  }

  /**
   * Get player name from localforage
   * @returns {Promise<string|null>} Player name or null if not set
   */
  async getPlayerName() {
    return await this.leaderboardManager.getPlayerName();
  }

  /**
   * Save player name to localforage
   * @param {string} name - Player name to save
   */
  async savePlayerName(name) {
    await this.leaderboardManager.savePlayerName(name);
  }

  /**
   * Submit score to leaderboard API
   * @param {string} playerName - Player name
   * @param {number} score - Score achieved
   * @param {boolean} isWin - Whether the game was won
   * @returns {Promise<Object>} API response
   */
  async submitScore(playerName, score, isWin) {
    return await this.leaderboardManager.submitScore(playerName, score, isWin);
  }

  /**
   * Fetch leaderboard data from API
   * @returns {Promise<Object>} Leaderboard data with global and player scores
   */
  async fetchLeaderboardData() {
    return await this.leaderboardManager.fetchLeaderboardData();
  }
}
