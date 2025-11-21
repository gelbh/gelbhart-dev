/**
 * LeaderboardManager - Handles leaderboard operations for the Pac-Man game
 *
 * Manages:
 * - Score submission to API
 * - Fetching leaderboard data (global and player-specific)
 * - Player name storage in localforage
 */
import api from "lib/api_client";
import localforage from "localforage";

export class LeaderboardManager {
  constructor() {
    this.storageKey = "pacman_player_name";
  }

  /**
   * Get player name from localforage
   * @returns {Promise<string|null>} Player name or null if not set
   */
  async getPlayerName() {
    try {
      return await localforage.getItem(this.storageKey);
    } catch (e) {
      console.error("Error reading player name from localforage:", e);
      return null;
    }
  }

  /**
   * Save player name to localforage
   * @param {string} name - Player name to save
   */
  async savePlayerName(name) {
    try {
      await localforage.setItem(this.storageKey, name);
    } catch (e) {
      console.error("Error saving player name to localforage:", e);
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
      const data = await api.post("/pacman_scores", {
        pacman_score: {
          player_name: playerName,
          score: score,
          is_win: isWin,
        },
      });

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
      const playerName = await this.getPlayerName();

      // Fetch global leaderboard
      const globalData = await api.get("/pacman_scores/global");

      let playerData = null;
      if (playerName) {
        // Fetch player scores
        const playerScoreData = await api.get(
          `/pacman_scores/player/${encodeURIComponent(playerName)}`
        );
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
