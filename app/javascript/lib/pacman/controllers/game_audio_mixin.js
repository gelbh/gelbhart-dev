/**
 * Game Audio Mixin
 *
 * Handles audio controls and volume management.
 */

export class GameAudioMixin {
  /**
   * Initialize audio controls with saved preferences
   */
  initializeAudioControls() {
    // Update muted indicator visibility
    this.updateMutedIndicator();
  }

  /**
   * Toggle mute on/off (called by input controller)
   */
  toggleMute(event) {
    if (event) event.preventDefault();

    this.audioManager.toggleMute();
    this.updateMutedIndicator();
  }

  /**
   * Update muted indicator visibility in HUD
   */
  updateMutedIndicator() {
    if (!this.hasMutedIndicatorTarget) return;

    if (this.audioManager.isMuted) {
      this.mutedIndicatorTarget.style.display = "flex";
    } else {
      this.mutedIndicatorTarget.style.display = "none";
    }
  }

  /**
   * Update music volume
   */
  updateMusicVolume(volume) {
    this.audioManager.setMusicVolume(volume);

    // If adjusting volume, unmute automatically
    if (this.audioManager.isMuted && volume > 0) {
      this.audioManager.setMute(false);
      this.updateMutedIndicator();
    }
  }

  /**
   * Update SFX volume
   */
  updateSFXVolume(volume) {
    this.audioManager.setSFXVolume(volume);

    // If adjusting volume, unmute automatically
    if (this.audioManager.isMuted && volume > 0) {
      this.audioManager.setMute(false);
      this.updateMutedIndicator();
    }
  }
}
