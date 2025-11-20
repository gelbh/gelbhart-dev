/**
 * LeaderboardManager - Handles leaderboard operations for the Pac-Man game
 *
 * Manages:
 * - Score submission to API
 * - Fetching leaderboard data (global and player-specific)
 * - Player name storage in localStorage
 */
export class LeaderboardManager {
  constructor() {
    this.storageKey = "pacman_player_name";
  }

  /**
   * Get player name from localStorage
   * @returns {string|null} Player name or null if not set
   */
  getPlayerName() {
    try {
      return localStorage.getItem(this.storageKey);
    } catch (e) {
      console.error("Error reading player name from localStorage:", e);
      return null;
    }
  }

  /**
   * Save player name to localStorage
   * @param {string} name - Player name to save
   */
  savePlayerName(name) {
    try {
      localStorage.setItem(this.storageKey, name);
    } catch (e) {
      console.error("Error saving player name to localStorage:", e);
    }
  }

  /**
   * Submit score to leaderboard API
   * @param {string} playerName - Player name
   * @param {number} score - Score achieved
   * @param {boolean} isWin - Whether the game was won
   * @returns {Promise<Object>} API response
   */
  async submitScore(playerName, score, isWin) {
    try {
      const response = await fetch("/api/pacman_scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pacman_score: {
            player_name: playerName,
            score: score,
            is_win: isWin,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("❌ Error submitting score:", data.errors);
      }

      return data;
    } catch (error) {
      console.error("❌ Error submitting score:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch leaderboard data from API
   * @returns {Promise<Object>} Leaderboard data with global and player scores
   */
  async fetchLeaderboardData() {
    try {
      const playerName = this.getPlayerName();

      // Fetch global leaderboard
      const globalResponse = await fetch("/api/pacman_scores/global");
      const globalData = await globalResponse.json();

      let playerData = null;
      if (playerName) {
        // Fetch player scores
        const playerResponse = await fetch(
          `/api/pacman_scores/player/${encodeURIComponent(playerName)}`
        );
        const playerScoreData = await playerResponse.json();
        playerData = {
          name: playerName,
          scores: playerScoreData.scores || [],
        };
      }

      return {
        global: globalData.leaderboard || [],
        player: playerData,
      };
    } catch (error) {
      console.error("❌ Error fetching leaderboard:", error);
      return {
        global: [],
        player: null,
      };
    }
  }
}
