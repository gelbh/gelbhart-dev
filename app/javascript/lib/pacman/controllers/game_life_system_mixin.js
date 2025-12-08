/**
 * Game Life System Mixin
 *
 * Handles life loss, death, respawn, win/lose conditions, and game end handling.
 */

export class GameLifeSystemMixin {
  /**
   * Lose a life and respawn or game over
   */
  async loseLife() {
    if (this.isDying) return; // Prevent multiple death triggers

    this.isDying = true;
    this.lives--;

    // Stop all sounds except death sound
    this.audioManager.stopAll();
    this.audioManager.play("death", true);

    // Reset power mode and clear timers
    this.powerMode = false;
    this.powerModeEnding = false;
    this.pacmanTarget.classList.remove("powered");
    this.ghostsEatenThisPowerMode = 0;

    // Clear power mode timers to prevent them firing after death
    if (this.powerModeTimer) {
      clearTimeout(this.powerModeTimer);
      this.powerModeTimer = null;
    }
    if (this.powerModeEndingTimer) {
      clearTimeout(this.powerModeEndingTimer);
      this.powerModeEndingTimer = null;
    }

    // Play death animation
    await this.animationManager.playDeathAnimation();

    // Update HUD
    this.updateHUD();

    if (this.lives <= 0) {
      // Game over
      this.gameOver();
    } else {
      // Respawn

      // Show countdown
      await this.uiManager.showCountdown();

      // Reset positions
      this.animationManager.resetPositions();

      // Exit all ghost modes
      this.ghostAI.exitPowerMode();
      this.ghosts.forEach((ghost) => {
        ghost.frightened = false;
        ghost.frozen = false;
        ghost.element.classList.remove("frightened", "frozen");
      });

      // Reset state
      this.isDying = false;
      this.lastFrameTime = null; // Reset frame time to prevent huge delta
    }
  }

  /**
   * Game over - player lost
   */
  async gameOver() {
    this.isGameActive = false;
    this.isDying = false;

    // Handle score submission
    await this.handleGameEnd(false);
  }

  /**
   * Win game - player cleared all dots
   */
  async winGame() {
    this.isGameActive = false;

    // Handle score submission (celebration sound played in handleGameEnd)
    await this.handleGameEnd(true);
  }

  /**
   * Handle game end - prompt for name if needed, submit score, show modal
   */
  async handleGameEnd(isWin) {
    // Hide game visuals (but keep game state for potential restart)
    this.gameContainerTarget.classList.remove("active");
    this.hudTarget.classList.remove("active");
    if (this.hasPageTintTarget) {
      this.pageTintTarget.classList.remove("active");
    }

    // Stop all sounds
    this.audioManager.stopAll();

    // Play celebration sound if win
    if (isWin) {
      this.audioManager.play("intermission", true);
    }

    // Check if player name exists
    let playerName = await this.getPlayerName();

    // If no player name, prompt for it
    if (!playerName) {
      playerName = await this.uiManager.showPlayerNamePrompt();
      await this.savePlayerName(playerName);
    }

    // Submit score to leaderboard
    await this.submitScore(playerName, this.score, isWin);

    // Show game over modal with leaderboard option
    this.uiManager.showGameOverModal(isWin, this.score, {
      onRestart: () => this.restartGame(),
      onQuit: () => this.stopGame(),
      onViewLeaderboard: () => this.showLeaderboardFromGameEnd(),
    });
  }
}
