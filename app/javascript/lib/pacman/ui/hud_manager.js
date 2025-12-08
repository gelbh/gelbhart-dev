/**
 * HUDManager - Handles HUD (Heads-Up Display) updates and positioning
 *
 * Manages:
 * - Score display
 * - Lives display
 * - Progress indicators
 * - HUD positioning relative to viewport
 */
const EXTRA_LIFE_THRESHOLD = 10000;
const HUD_OFFSET_TOP = 20;

export class HUDManager {
  constructor(targets) {
    this.hudTarget = targets.hud;
    this.scoreTarget = targets.score;
    this.livesTarget = targets.lives;
    this.progressItemTarget = targets.progressItem;
    this.progressLabelTarget = targets.progressLabel;
    this.progressValueTarget = targets.progressValue;
  }

  /**
   * Update HUD position to stay in viewport
   */
  updateHUDPosition() {
    if (this.hudTarget) {
      const viewportTop = window.scrollY;
      this.hudTarget.style.top = `${viewportTop + HUD_OFFSET_TOP}px`;
    }
  }

  /**
   * Update HUD with current game state
   * @param {Object} gameState - Current game state { score, lives, dotsScore, sections, currentSection, extraLifeAwarded }
   * @param {Object} callbacks - Callback functions { onExtraLife }
   */
  updateHUD(gameState, callbacks = {}) {
    const {
      score,
      lives,
      dotsScore,
      sections,
      currentSection,
      extraLifeAwarded,
    } = gameState;
    const { onExtraLife } = callbacks;

    if (this.scoreTarget) {
      this.scoreTarget.textContent = score;
    }

    if (!extraLifeAwarded && score >= EXTRA_LIFE_THRESHOLD && onExtraLife) {
      onExtraLife();
    }

    if (this.livesTarget) {
      const livesCount = Math.max(0, lives);
      this.livesTarget.textContent = "❤️".repeat(livesCount);
    }

    if (
      this.progressItemTarget &&
      this.progressLabelTarget &&
      this.progressValueTarget
    ) {
      if (currentSection >= sections.length) {
        this.progressItemTarget.style.display = "flex";
        this.progressLabelTarget.textContent = "Goal:";
        this.progressValueTarget.textContent = "Clear All Dots!";
        this.progressValueTarget.style.color = "#00ff00";
        this.progressValueTarget.style.textShadow =
          "0 0 10px rgba(0, 255, 0, 0.8)";
      } else {
        this.progressItemTarget.style.display = "flex";
        const nextSection = sections[currentSection];
        const pointsNeeded = Math.max(0, nextSection.threshold - dotsScore);

        if (pointsNeeded === 0) {
          this.progressLabelTarget.textContent = "Unlock:";
          this.progressValueTarget.textContent = "🔑 Get Key!";
          this.progressValueTarget.style.color = "#ffd700";
          this.progressValueTarget.style.textShadow =
            "0 0 10px rgba(255, 215, 0, 0.8)";
        } else {
          this.progressLabelTarget.textContent = "Need:";
          this.progressValueTarget.textContent = `${pointsNeeded} pts`;
          this.progressValueTarget.style.color = "";
          this.progressValueTarget.style.textShadow = "";
        }
      }
    }
  }
}
