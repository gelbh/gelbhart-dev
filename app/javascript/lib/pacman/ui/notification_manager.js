/**
 * NotificationManager - Handles countdown and item notifications
 *
 * Manages:
 * - Game start/restart countdown
 * - Item pickup notifications
 */
export class NotificationManager {
  /**
   * Show countdown before game start/restart
   * @returns {Promise} Resolves when countdown completes
   */
  showCountdown() {
    return new Promise((resolve) => {
      const countdown = document.createElement("div");
      countdown.className = "pacman-countdown";
      countdown.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 6rem;
        font-weight: 800;
        color: #ffd700;
        text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6);
        z-index: 10003;
        animation: countdownPulse 1s ease-in-out;
        pointer-events: none;
      `;

      document.body.appendChild(countdown);

      let count = 3;
      let countdownTimer1 = null;
      let countdownTimer2 = null;
      let cancelled = false;

      countdown._cancel = () => {
        cancelled = true;
        if (countdownTimer1) clearTimeout(countdownTimer1);
        if (countdownTimer2) clearTimeout(countdownTimer2);
        countdown.remove();
        resolve();
      };

      const updateCountdown = () => {
        if (cancelled) return;

        if (count > 0) {
          countdown.textContent = count;
          countdown.style.animation = "none";
          countdown.offsetHeight;
          countdown.style.animation = "countdownPulse 1s ease-in-out";
          count--;
          countdownTimer1 = setTimeout(updateCountdown, 1000);
        } else {
          countdown.textContent = "GO!";
          countdown.style.animation = "countdownGo 0.8s ease-out";
          countdownTimer2 = setTimeout(() => {
            if (!cancelled) {
              countdown.remove();
              resolve();
            }
          }, 800);
        }
      };

      updateCountdown();
    });
  }

  /**
   * Show item notification when item is collected
   * @param {Object} item - Item object with config property
   */
  showItemNotification(item) {
    const notification = document.createElement("div");
    notification.className = "item-notification";
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2.5rem;
      font-weight: 800;
      color: ${item.config.color};
      text-shadow: 0 0 20px ${item.config.color}, 0 0 40px ${item.config.color};
      z-index: 10005;
      animation: itemNotification 1.5s ease-out forwards;
      pointer-events: none;
    `;
    notification.textContent = `${item.config.emoji} ${item.config.name}`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 1500);
  }
}
