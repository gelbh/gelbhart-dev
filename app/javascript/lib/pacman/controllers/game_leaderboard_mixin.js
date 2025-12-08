/**
 * Game Leaderboard Mixin
 *
 * Handles leaderboard-related functionality, delegated to menu controller.
 */

export class GameLeaderboardMixin {
  /**
   * Get player name from localforage (delegated to menu controller)
   */
  async getPlayerName() {
    if (this.hasPacmanMenuOutlet) {
      return await this.pacmanMenuOutlet.getPlayerName();
    }
    return null;
  }

  /**
   * Save player name to localforage (delegated to menu controller)
   */
  async savePlayerName(name) {
    if (this.hasPacmanMenuOutlet) {
      await this.pacmanMenuOutlet.savePlayerName(name);
    }
  }

  /**
   * Submit score to leaderboard API (delegated to menu controller)
   */
  async submitScore(playerName, score, isWin) {
    if (this.hasPacmanMenuOutlet) {
      return await this.pacmanMenuOutlet.submitScore(playerName, score, isWin);
    }
    return { success: false, error: "Menu controller not available" };
  }

  /**
   * Fetch leaderboard data from API (delegated to menu controller)
   */
  async fetchLeaderboardData() {
    if (this.hasPacmanMenuOutlet) {
      return await this.pacmanMenuOutlet.fetchLeaderboardData();
    }
    return { global: [], player: null };
  }

  /**
   * Show leaderboard modal (delegated to menu controller)
   */
  async showLeaderboard() {
    if (this.hasPacmanMenuOutlet) {
      const data = await this.pacmanMenuOutlet.fetchLeaderboardData();
      this.uiManager.showLeaderboardModal(data, () => {
        // Leaderboard closed
      });
    }
  }

  /**
   * Show leaderboard modal (with onClose callback)
   */
  showLeaderboardModal(data, onClose) {
    if (!this.uiManager) {
      return;
    }
    this.uiManager.showLeaderboardModal(data, onClose);
  }

  /**
   * Show leaderboard after game ends (calls stopGame when closed)
   */
  async showLeaderboardFromGameEnd() {
    if (this.hasPacmanMenuOutlet) {
      await this.pacmanMenuOutlet.showLeaderboardFromGameEnd();
    }
  }
}
