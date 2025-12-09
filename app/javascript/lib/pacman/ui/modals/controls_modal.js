/**
 * Controls Modal
 *
 * Displays keyboard controls reference
 */
import {
  createModal,
  createModalContent,
  createModalHeader,
  createModalButtons,
  createModalButton,
  bindModalActions,
  setupKeyboardHandler,
  modalExists,
} from "lib/pacman/ui/modal_system";

/**
 * Show controls modal (keyboard reference)
 * @param {Function} onClose - Callback when modal is closed
 * @returns {HTMLElement|null} The created modal element or null if already exists
 */
export function showControlsModal(onClose) {
  if (modalExists("pacman-controls-modal")) {
    return null;
  }

  const controlsSection = `
    <div class="controls-section">
      <div class="controls-grid">
        <div class="control-item">
          <div class="control-keys">
            <kbd class="control-key">W</kbd>
            <kbd class="control-key">A</kbd>
            <kbd class="control-key">S</kbd>
            <kbd class="control-key">D</kbd>
          </div>
          <span class="control-desc">Move</span>
        </div>
        <div class="control-item">
          <div class="control-keys">
            <kbd class="control-key">←</kbd>
            <kbd class="control-key">↑</kbd>
            <kbd class="control-key">↓</kbd>
            <kbd class="control-key">→</kbd>
          </div>
          <span class="control-desc">Move</span>
        </div>
        <div class="control-item">
          <kbd class="control-key">M</kbd>
          <span class="control-desc">Mute/Unmute</span>
        </div>
        <div class="control-item">
          <kbd class="control-key">Esc</kbd>
          <span class="control-desc">Menu</span>
        </div>
      </div>
    </div>
  `;

  const buttons = createModalButtons(
    createModalButton("back", "Back to Menu", "bx-arrow-back", "primary")
  );

  const content = [
    createModalHeader("🎮", "Controls"),
    controlsSection,
    buttons,
  ].join("");

  const modal = createModal(
    "pacman-controls-modal",
    createModalContent(content)
  );

  const closeHandler = () => {
    modal.remove();
    onClose?.();
  };

  const keydownHandler = setupKeyboardHandler({}, closeHandler);

  bindModalActions(modal, {
    back: () => {
      closeHandler();
      document.removeEventListener("keydown", keydownHandler);
    },
  });

  return modal;
}
