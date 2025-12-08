/**
 * Modal System - Infrastructure utilities for creating and managing modals
 *
 * Provides helper functions for:
 * - Creating modal elements
 * - Setting up keyboard handlers
 * - Binding action buttons
 * - Managing modal lifecycle
 */
import he from "he";

/**
 * Create and show a modal with common structure
 * @param {string} className - Additional CSS class for the modal
 * @param {string} html - HTML content for the modal
 * @returns {HTMLElement} The created modal element
 */
export function createModal(className, html) {
  const modal = document.createElement("div");
  modal.className = `pacman-game-over-modal ${className}`.trim();
  modal.innerHTML = html;

  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    modal.classList.add("show");
  });

  return modal;
}

/**
 * Setup modal close handler with cleanup
 * @param {HTMLElement} modal - Modal element
 * @param {Function} onClose - Callback when modal closes
 * @param {Function} keyboardHandler - Optional keyboard handler to remove
 * @returns {Function} The close handler function
 */
export function setupModalCloseHandler(modal, onClose, keyboardHandler = null) {
  return () => {
    modal.remove();
    onClose?.();
    if (keyboardHandler) {
      document.removeEventListener("keydown", keyboardHandler);
    }
  };
}

/**
 * Setup keyboard handler for modal
 * @param {Object} handlers - Object mapping keys to handler functions
 * @param {Function} onClose - Optional close handler to call on Escape
 * @returns {Function} The keyboard handler function
 */
export function setupKeyboardHandler(handlers = {}, onClose = null) {
  const keydownHandler = (e) => {
    const handler = handlers[e.key] || handlers[e.key.toLowerCase()];
    if (handler) {
      e.preventDefault();
      handler(e);
    } else if (e.key === "Escape" && onClose) {
      e.preventDefault();
      onClose();
    }
  };
  document.addEventListener("keydown", keydownHandler);
  return keydownHandler;
}

/**
 * Bind action buttons in modal
 * @param {HTMLElement} modal - Modal element
 * @param {Object} actions - Object mapping data-action values to callbacks
 */
export function bindModalActions(modal, actions) {
  Object.entries(actions).forEach(([action, callback]) => {
    const button = modal.querySelector(`[data-action="${action}"]`);
    if (button && callback) {
      button.addEventListener("click", callback);
    }
  });
}

/**
 * Check if a modal with given class already exists
 * @param {string} className - CSS class to check
 * @returns {boolean} True if modal exists
 */
export function modalExists(className) {
  return !!document.querySelector(`.${className}`);
}

/**
 * Create modal button HTML
 * @param {string} action - Data action attribute value
 * @param {string} label - Button label text
 * @param {string} icon - Boxicons class (e.g., 'bx-refresh')
 * @param {string} variant - Button variant ('primary' or 'secondary')
 * @returns {string} Button HTML
 */
export function createModalButton(action, label, icon, variant = "primary") {
  return `
    <button class="modal-btn modal-btn-${variant}" data-action="${action}">
      <i class="bx ${icon}"></i>
      ${label}
    </button>
  `;
}

/**
 * Create modal buttons container
 * @param {string} buttonsHtml - HTML for buttons
 * @returns {string} Buttons container HTML
 */
export function createModalButtons(buttonsHtml) {
  return `<div class="modal-buttons">${buttonsHtml}</div>`;
}

/**
 * Create modal header (emoji and title)
 * @param {string} emoji - Emoji character
 * @param {string} title - Modal title
 * @returns {string} Header HTML
 */
export function createModalHeader(emoji, title) {
  return `
    <div class="modal-emoji">${emoji}</div>
    <h2 class="modal-title">${title}</h2>
  `;
}

/**
 * Create modal message
 * @param {string} message - Message text (will be escaped)
 * @returns {string} Message HTML
 */
export function createModalMessage(message) {
  return `<p class="modal-message">${he.encode(message)}</p>`;
}

/**
 * Create modal content wrapper
 * @param {string} content - Inner HTML content
 * @param {string} additionalClass - Additional CSS class for content div
 * @returns {string} Modal content HTML
 */
export function createModalContent(content, additionalClass = "") {
  const classAttr = additionalClass ? ` ${additionalClass}` : "";
  return `<div class="modal-content${classAttr}">${content}</div>`;
}
