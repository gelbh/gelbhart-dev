/**
 * Game Collision Mixin
 *
 * Handles collision-related callbacks and win condition checks.
 *
 * @mixin
 */
export class GameCollisionMixin {
  /**
   * Called when a ghost is eaten
   *
   * @param {Object} ghost - Ghost object that was eaten
   * @returns {void}
   */
  onGhostEaten(ghost) {
    // Award points for eating ghost (200, 400, 800, 1600, 3200, 6400)
    // Cap exponent at 5 to prevent integer overflow (max 6400 points per ghost)
    const exponent = Math.min(this.ghostsEatenThisPowerMode || 0, 5);
    const baseGhostPoints = 200 * Math.pow(2, exponent);
    const ghostPoints =
      baseGhostPoints * (this.activeEffects.doublePoints ? 2 : 1);
    this.score += ghostPoints;
    this.ghostsEatenThisPowerMode = (this.ghostsEatenThisPowerMode || 0) + 1;
    this.updateHUD();
  }

  /**
   * Check if all sections unlocked and all dots collected
   *
   * @returns {void}
   */
  checkWinCondition() {
    // Don't check win condition during dot regeneration or if game is not active
    if (this.regeneratingDots || !this.isGameActive) {
      return;
    }

    try {
      const allSectionsUnlocked = this.sections.every((s) => s.unlocked);
      const allDotsCollected =
        this.dots.length > 0 && this.dots.every((d) => d.collected);

      if (allSectionsUnlocked && allDotsCollected) {
        this.winGame();
      }
    } catch (error) {
      console.warn("Error checking win condition:", error);
      // Don't throw - just log the error
    }
  }

  /**
   * Check if score reached a section threshold
   *
   * @returns {void}
   */
  checkSectionThreshold() {
    this.sectionManager.checkSectionThreshold();
    // Sync section state back to controller
    this.sections = this.sectionManager.sections;
    this.currentSection = this.sectionManager.currentSection;
  }
}
