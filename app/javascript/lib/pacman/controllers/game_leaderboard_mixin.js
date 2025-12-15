/**
 * Game Leaderboard Mixin
 *
 * Handles leaderboard-related functionality, delegated to menu controller.
 */

export class GameLeaderboardMixin {
  /**
   * Get menu controller reference from the same element.
   * Falls back to Stimulus API when outlets aren't available (same element controllers).
   * @returns {Controller|null} Menu controller instance or null if not found
   */
  getMenuController() {
    if (this.hasPacmanMenuOutlet) {
      return this.pacmanMenuOutlet;
    }

    if (this.application?.element) {
      try {
        return this.application.getControllerForElementAndIdentifier(
          this.element,
          "pacman-menu"
        );
      } catch {
        // Fallback failed
      }
    }

    return null;
  }

  /**
   * Get player name from localforage (delegated to menu controller)
   */
  async getPlayerName() {
    const menuController = this.getMenuController();
    if (menuController) {
      return await menuController.getPlayerName();
    }
    return null;
  }

  /**
   * Save player name to localforage (delegated to menu controller)
   */
  async savePlayerName(name) {
    const menuController = this.getMenuController();
    if (menuController) {
      await menuController.savePlayerName(name);
    }
  }

  /**
   * Submit score to leaderboard API (delegated to menu controller)
   */
  async submitScore(playerName, score, isWin) {
    const menuController = this.getMenuController();
    if (menuController) {
      return await menuController.submitScore(playerName, score, isWin);
    }
    return { success: false, error: "Menu controller not available" };
  }

  /**
   * Fetch leaderboard data from API (delegated to menu controller)
   */
  async fetchLeaderboardData() {
    const menuController = this.getMenuController();
    if (menuController) {
      return await menuController.fetchLeaderboardData();
    }
    return { global: [], player: null };
  }

  /**
   * Show leaderboard modal (delegated to menu controller)
   */
  async showLeaderboard() {
    const menuController = this.getMenuController();
    if (!menuController) return;

    const data = await menuController.fetchLeaderboardData();
    await this.uiManager.showLeaderboardModal(data);
  }

  /**
   * Show leaderboard modal (with onClose callback)
   * @returns {Promise<HTMLElement|null>} The created modal element or null
   */
  async showLeaderboardModal(data, onClose) {
    if (!this.uiManager) {
      return null;
    }
    return await this.uiManager.showLeaderboardModal(data, onClose);
  }

  /**
   * Show leaderboard after game ends (calls stopGame when closed)
   * @throws {Error} If leaderboard fails to open
   */
  async showLeaderboardFromGameEnd() {
    const menuController = this.getMenuController();
    if (menuController) {
      try {
        await menuController.showLeaderboardFromGameEnd();
        return;
      } catch (error) {
        console.error("Failed to show leaderboard from game end:", error);
        throw error;
      }
    }

    // Fallback: fetch data and show modal directly
    // This handles cases where controllers are on the same element (outlets don't work)
    try {
      const data = await this.fetchLeaderboardData();
      if (!data) {
        throw new Error("Failed to fetch leaderboard data");
      }

      const modal = await this.uiManager.showLeaderboardModal(data, () => {
        this.stopGame();
      });

      if (!modal) {
        throw new Error("Leaderboard modal failed to open");
      }
    } catch (error) {
      console.error("Error showing leaderboard from game end:", error);
      throw error;
    }
  }
}
