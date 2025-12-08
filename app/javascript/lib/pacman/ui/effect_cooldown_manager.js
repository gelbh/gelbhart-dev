/**
 * EffectCooldownManager - Handles effect cooldown bar displays
 *
 * Manages visual cooldown indicators for active item effects
 */
import { itemTypes } from "lib/pacman/config/item_types";

export class EffectCooldownManager {
  /**
   * Show effect cooldown bar under Pac-Man
   * @param {string} effectName - Name of the effect
   * @param {number} duration - Duration of the effect in milliseconds
   * @param {HTMLElement} pacmanElement - The Pac-Man element to attach cooldown to
   */
  showEffectCooldown(effectName, duration, pacmanElement) {
    this.removeEffectCooldown(effectName, pacmanElement);

    const config = itemTypes[effectName];
    if (!config) return;

    const cooldownBar = document.createElement("div");
    cooldownBar.className = "pacman-effect-cooldown";
    cooldownBar.dataset.effect = effectName;
    cooldownBar.style.cssText = `
      position: absolute;
      bottom: -15px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 6px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 3px;
      overflow: hidden;
      z-index: 10;
    `;

    const fill = document.createElement("div");
    fill.className = "effect-cooldown-fill";
    fill.style.cssText = `
      width: 100%;
      height: 100%;
      background: ${config.color};
      box-shadow: 0 0 8px ${config.color};
      border-radius: 3px;
      transition: width ${duration}ms linear;
    `;

    cooldownBar.appendChild(fill);
    pacmanElement.appendChild(cooldownBar);

    requestAnimationFrame(() => {
      fill.style.width = "0%";
    });
  }

  /**
   * Remove effect cooldown bar
   * @param {string} effectName - Name of the effect
   * @param {HTMLElement} pacmanElement - The Pac-Man element to remove cooldown from
   */
  removeEffectCooldown(effectName, pacmanElement) {
    const existingBar = pacmanElement.querySelector(
      `[data-effect="${effectName}"]`
    );
    if (existingBar) {
      existingBar.remove();
    }
  }
}
