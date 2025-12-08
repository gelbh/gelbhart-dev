/**
 * Player Name Modal
 *
 * Prompts user to enter their name for leaderboard submission
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
 * Show player name prompt modal
 * @returns {Promise<string>} Resolves with player name when submitted
 */
export function showPlayerNamePrompt() {
  return new Promise((resolve) => {
    const buttons = createModalButtons(
      createModalButton("submit", "Continue", "bx-check", "primary")
    );

    const content = [
      createModalHeader("🎮", "Welcome!"),
      createModalMessage(
        "Enter your name to save your scores to the leaderboard"
      ),
      `<div class="modal-input-group">
        <input
          type="text"
          id="playerNameInput"
          class="modal-input"
          placeholder="Your Name"
          maxlength="50"
          autocomplete="off"
        />
      </div>`,
      buttons,
    ].join("");

    const modal = createModal("", createModalContent(content));
    const input = modal.querySelector("#playerNameInput");
    const submitBtn = modal.querySelector('[data-action="submit"]');

    setTimeout(() => input.focus(), 300);

    const handleSubmit = () => {
      const name = input.value.trim();
      if (name.length > 0) {
        modal.remove();
        resolve(name);
      } else {
        input.classList.add("error");
        setTimeout(() => input.classList.remove("error"), 500);
      }
    };

    submitBtn.addEventListener("click", handleSubmit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    });
  });
}
