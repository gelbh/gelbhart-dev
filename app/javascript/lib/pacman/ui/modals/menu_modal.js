/**
 * Menu Modal
 *
 * Displays game menu with navigation options (settings, controls, leaderboard, resume, quit)
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
 * Show menu modal with navigation buttons
 * @param {Object} callbacks - { onSettings, onControls, onLeaderboard, onResume, onQuit }
 * @returns {HTMLElement|null} The created modal element or null if already exists
 */
export function showMenuModal(callbacks = {}) {
  if (modalExists("pacman-menu-modal")) {
    return null;
  }

  const { onSettings, onControls, onLeaderboard, onResume, onQuit } = callbacks;

  const menuItems = [
    onSettings
      ? `<button class="menu-item-btn" data-action="settings">
          <i class="bx bx-slider"></i>
          <span>Audio Settings</span>
        </button>`
      : "",
    onControls
      ? `<button class="menu-item-btn" data-action="controls">
          <i class="bx bx-joystick"></i>
          <span>Controls</span>
        </button>`
      : "",
    onLeaderboard
      ? `<button class="menu-item-btn" data-action="leaderboard">
          <i class="bx bx-trophy"></i>
          <span>Leaderboard</span>
        </button>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const buttons = createModalButtons(
    [
      onResume
        ? createModalButton("resume", "Resume Game", "bx-play", "primary")
        : "",
      onQuit
        ? createModalButton("quit", "Quit Game", "bx-exit", "secondary")
        : "",
    ]
      .filter(Boolean)
      .join("")
  );

  const content = [
    createModalHeader("🎮", "Menu"),
    `<div class="menu-buttons">${menuItems}</div>`,
    buttons,
  ].join("");

  const modal = createModal("pacman-menu-modal", createModalContent(content));

  const closeHandler = () => {
    modal.remove();
  };

  const keydownHandler = setupKeyboardHandler(
    {},
    onResume
      ? () => {
          closeHandler();
          onResume();
        }
      : null
  );

  const actions = {};
  if (onSettings) {
    actions.settings = () => {
      closeHandler();
      document.removeEventListener("keydown", keydownHandler);
      onSettings();
    };
  }
  if (onControls) {
    actions.controls = () => {
      closeHandler();
      document.removeEventListener("keydown", keydownHandler);
      onControls();
    };
  }
  if (onLeaderboard) {
    actions.leaderboard = () => {
      closeHandler();
      document.removeEventListener("keydown", keydownHandler);
      onLeaderboard();
    };
  }
  if (onResume) {
    actions.resume = () => {
      closeHandler();
      document.removeEventListener("keydown", keydownHandler);
      onResume();
    };
  }
  if (onQuit) {
    actions.quit = () => {
      closeHandler();
      document.removeEventListener("keydown", keydownHandler);
      onQuit();
    };
  }

  bindModalActions(modal, actions);

  return modal;
}
