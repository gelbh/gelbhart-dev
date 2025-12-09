/**
 * Confirmation Modal
 *
 * Displays a confirmation dialog with yes/no options
 */
import he from "he";
import {
  createModal,
  createModalContent,
  createModalHeader,
  createModalMessage,
  createModalButtons,
  createModalButton,
  bindModalActions,
  setupKeyboardHandler,
  modalExists,
} from "lib/pacman/ui/modal_system";

/**
 * Show confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when user confirms
 * @param {Function} onCancel - Callback when user cancels
 * @returns {HTMLElement|null} The created modal element or null if already exists
 */
export function showConfirmationModal(title, message, onConfirm, onCancel) {
  if (modalExists("confirmation-modal")) {
    return null;
  }

  const buttons = createModalButtons(
    [
      createModalButton("confirm", "Yes, Quit", "bx-check", "primary"),
      createModalButton("cancel", "Cancel", "bx-x", "secondary"),
    ].join("")
  );

  const content = [
    createModalHeader("⚠️", he.encode(title)),
    createModalMessage(message),
    buttons,
  ].join("");

  const modal = createModal("confirmation-modal", createModalContent(content));

  const handleCancel = () => {
    modal.remove();
    onCancel?.();
  };

  const keydownHandler = setupKeyboardHandler({}, handleCancel);

  bindModalActions(modal, {
    confirm: () => {
      modal.remove();
      onConfirm?.();
      document.removeEventListener("keydown", keydownHandler);
    },
    cancel: () => {
      handleCancel();
      document.removeEventListener("keydown", keydownHandler);
    },
  });

  return modal;
}
