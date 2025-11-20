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
    // Cleanup if needed
  }

  /**
   * Show leaderboard from menu
   */
  async showLeaderboardFromMenu() {
    if (!this.hasPacmanGameOutlet) return;

    const data = await this.leaderboardManager.fetchLeaderboardData();
    this.pacmanGameOutlet.showLeaderboardModal(data, () => {
      // Return to menu (delegated to game controller)
      this.pacmanGameOutlet.showMenu();
    });
  }

  /**
   * Show leaderboard after game ends (calls stopGame when closed)
   */
  async showLeaderboardFromGameEnd() {
    if (!this.hasPacmanGameOutlet) return;

    const data = await this.leaderboardManager.fetchLeaderboardData();
    this.pacmanGameOutlet.showLeaderboardModal(data, () => {
      this.pacmanGameOutlet.stopGame();
    });
  }

  /**
   * Get player name from localStorage
   * @returns {string|null} Player name or null if not set
   */
  getPlayerName() {
    return this.leaderboardManager.getPlayerName();
  }

  /**
   * Save player name to localStorage
   * @param {string} name - Player name to save
   */
  savePlayerName(name) {
    this.leaderboardManager.savePlayerName(name);
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
