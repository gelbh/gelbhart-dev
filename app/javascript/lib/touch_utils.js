/**
 * Touch Utilities
 * Modern touch and pointer event helpers for cross-device compatibility
 */

/**
 * Detect if device supports touch input
 * @returns {boolean}
 */
export function isTouchDevice() {
  return window.matchMedia("(any-pointer: coarse)").matches;
}

/**
 * Detect if device has precise pointing (mouse)
 * @returns {boolean}
 */
export function isPrecisePointer() {
  return window.matchMedia("(pointer: fine)").matches;
}

/**
 * Detect if device supports hover
 * @returns {boolean}
 */
export function supportsHover() {
  return window.matchMedia("(hover: hover)").matches;
}

/**
 * Add pointer event listener with automatic fallback
 * @param {HTMLElement} element - Element to attach listener to
 * @param {string} eventType - Event type (pointerdown, pointerup, etc.)
 * @param {Function} handler - Event handler
 * @param {Object} options - Event listener options
 */
export function addPointerListener(element, eventType, handler, options = {}) {
  if (window.PointerEvent) {
    element.addEventListener(eventType, handler, options);
  } else {
    // Fallback for older browsers
    const fallbackType = eventType.replace("pointer", "mouse");
    element.addEventListener(fallbackType, handler, options);

    // Also add touch events if available
    if ("ontouchstart" in window) {
      const touchType = eventType.replace("pointer", "touch");
      element.addEventListener(touchType, handler, options);
    }
  }
}

/**
 * Prevent both touch and mouse events from firing (for hybrid devices)
 * @param {Event} event - The event to check
 * @returns {boolean} - True if event should be processed
 */
export function shouldProcessEvent(event) {
  // If it's a pointer event, always process
  if (event instanceof PointerEvent) {
    return true;
  }

  // For mouse events on touch devices, ignore if touch is available
  if (event.type.startsWith("mouse") && "ontouchstart" in window) {
    // Only process if it's not immediately after a touch event
    return false;
  }

  return true;
}

/**
 * Get touch coordinates from event (works for both touch and pointer events)
 * @param {Event} event - Touch or pointer event
 * @returns {{x: number, y: number}|null}
 */
export function getTouchCoordinates(event) {
  if (event instanceof TouchEvent && event.touches.length > 0) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }

  if (event instanceof PointerEvent) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }

  if (event instanceof MouseEvent) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }

  return null;
}
