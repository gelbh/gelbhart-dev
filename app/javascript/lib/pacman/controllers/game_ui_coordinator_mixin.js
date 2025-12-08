/**
 * Game UI Coordinator Mixin
 *
 * Handles all UI and menu coordination, including menu modals, settings, and controls.
 */

export class GameUICoordinatorMixin {
  /**
   * Show main menu
   */
  showMenu() {
    // Capture original game state only if not already paused for menu
    // This preserves the state across Settings -> Back to Menu transitions
    if (this.isGameActive) {
      this.wasActiveBeforePause = true;
      this.isGameActive = false;
    } else if (this.isStarting) {
      // If game is starting (during countdown), pause the starting sequence
      this.wasStartingBeforePause = true;
      this.isStarting = false;

      // Cancel the countdown
      const countdownOverlay = document.querySelector(".pacman-countdown");
      if (countdownOverlay && countdownOverlay._cancel) {
        countdownOverlay._cancel();
      }

      // Stop intro music
      this.audioManager.stopAll();

      // Clean up intro music listener
      if (this.introMusicListener) {
        this.introMusicListener.audio.removeEventListener(
          "ended",
          this.introMusicListener.handler
        );
        this.introMusicListener = null;
      }
      if (this.introMusicTimeout) {
        clearTimeout(this.introMusicTimeout);
        this.introMusicTimeout = null;
      }
    }

    // Show menu modal
    this.uiManager.showMenuModal({
      onSettings: () => this.showSettings(),
      onControls: () => this.showControls(),
      onLeaderboard: () => this.showLeaderboardFromMenu(),
      onResume: () => {
        // Resume game if it was active before pause
        if (this.wasActiveBeforePause) {
          this.isGameActive = true;
          this.wasActiveBeforePause = false;
          this.lastFrameTime = null; // Reset to prevent huge delta
          this.gameLoop();
        } else if (this.wasStartingBeforePause) {
          // Resume starting sequence
          this.wasStartingBeforePause = false;
          this.resumeStartingSequence();
        }
      },
      onQuit: () => {
        // Show confirmation modal
        this.uiManager.showConfirmationModal(
          "Quit Game",
          "Are you sure you want to quit? Your progress will be lost.",
          () => {
            // Confirmed quit
            this.wasActiveBeforePause = false;
            this.wasStartingBeforePause = false;
            this.stopGame();
          },
          () => {
            // Cancelled - reopen menu
            this.showMenu();
          }
        );
      },
    });
  }

  /**
   * Resume the starting sequence after pausing during countdown
   */
  async resumeStartingSequence() {
    this.isStarting = true;

    // Restart intro music
    this.audioManager.play("beginning", true);

    // Show countdown again
    await this.uiManager.showCountdown();

    // Wait for the beginning sound to finish before starting gameplay
    const beginningAudio = this.audioManager.getAudio("beginning");

    const onBeginningEnded = () => {
      this.isGameActive = true;
      this.isStarting = false;

      // Start game loop
      this.gameLoop();

      // Remove event listener
      beginningAudio.removeEventListener("ended", onBeginningEnded);
      this.introMusicListener = null;

      // Clear timeout to prevent memory leak
      if (this.introMusicTimeout) {
        clearTimeout(this.introMusicTimeout);
        this.introMusicTimeout = null;
      }
    };

    // Store listener for cleanup
    this.introMusicListener = {
      audio: beginningAudio,
      handler: onBeginningEnded,
    };
    beginningAudio.addEventListener("ended", onBeginningEnded);

    // Fallback: Start anyway after 5 seconds if sound doesn't fire ended event
    this.introMusicTimeout = setTimeout(() => {
      if (!this.isGameActive && this.isStarting) {
        beginningAudio.removeEventListener("ended", onBeginningEnded);
        this.isGameActive = true;
        this.isStarting = false;

        this.gameLoop();
        this.introMusicListener = null;
        this.introMusicTimeout = null;
      }
    }, 5000);
  }

  /**
   * Show settings modal from menu
   */
  showSettings() {
    // Game state is already captured in wasActiveBeforePause by showMenu()
    // No need to capture it again here

    this.uiManager.showSettingsModal(
      this.audioManager.musicVolume,
      this.audioManager.sfxVolume,
      this.audioManager.isMuted,
      {
        onMusicVolumeChange: (volume) => this.updateMusicVolume(volume),
        onSFXVolumeChange: (volume) => this.updateSFXVolume(volume),
        onMuteToggle: () => this.toggleMute(),
        onClose: () => {
          // Return to menu
          this.showMenu();
        },
      }
    );
  }

  /**
   * Show controls modal from menu
   */
  showControls() {
    this.uiManager.showControlsModal(() => {
      // Return to menu
      this.showMenu();
    });
  }

  /**
   * Show leaderboard from menu
   */
  async showLeaderboardFromMenu() {
    if (this.hasPacmanMenuOutlet) {
      await this.pacmanMenuOutlet.showLeaderboardFromMenu();
    } else {
      // Fallback: fetch data and show modal directly
      const data = await this.fetchLeaderboardData();
      this.uiManager.showLeaderboardModal(data, () => {
        this.showMenu();
      });
    }
  }
}
