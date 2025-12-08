/**
 * Game Over Modal
 *
 * Displays game over or victory message with restart, leaderboard, and quit options
 */
import {
  createModal,
  createModalContent,
  createModalHeader,
  createModalMessage,
  createModalButtons,
  createModalButton,
  bindModalActions,
} from "../modal_system";

/**
 * Show game over modal
 * @param {boolean} isWin - Whether the player won or lost
 * @param {number} finalScore - The final score
 * @param {Object} callbacks - Callback functions { onRestart, onQuit, onViewLeaderboard }
 * @returns {HTMLElement} The created modal element
 */
export function showGameOverModal(isWin, finalScore, callbacks = {}) {
  const { onRestart, onQuit, onViewLeaderboard } = callbacks;

  const title = isWin ? "🎉 Victory!" : "💀 Game Over";
  const message = isWin
    ? "Congratulations! You unlocked all sections!"
    : "Better luck next time!";
  const emoji = isWin ? "🏆" : "👾";

  const buttons = [
    createModalButton("restart", "Play Again", "bx-refresh", "primary"),
    onViewLeaderboard
      ? createModalButton(
          "leaderboard",
          "Leaderboard",
          "bx-trophy",
          "secondary"
        )
      : "",
    createModalButton("quit", "Quit", "bx-x", "secondary"),
  ]
    .filter(Boolean)
    .join("");

  const content = [
    createModalHeader(emoji, title),
    createModalMessage(message),
    `<div class="modal-score">
      <span class="score-label">Final Score</span>
      <span class="score-value">${finalScore}</span>
    </div>`,
    createModalButtons(buttons),
  ].join("");

  const modal = createModal("", createModalContent(content));

  bindModalActions(modal, {
    restart: () => {
      modal.remove();
      onRestart?.();
    },
    leaderboard: () => {
      modal.remove();
      onViewLeaderboard?.();
    },
    quit: () => {
      modal.remove();
      onQuit?.();
    },
  });

  return modal;
}
