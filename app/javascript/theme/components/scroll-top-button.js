/**
 * Animate scroll to top button in/off view
 */

import throttle from "lodash.throttle";

function initializeScrollTopButton() {
  const element = document.querySelector(".btn-scroll-top");
  const scrollOffset = 600;

  if (element == null) return;

  let offsetFromTop = parseInt(scrollOffset, 10);

  const handleScroll = throttle(() => {
    const scrollY = window.pageYOffset || window.scrollY || 0;
    if (scrollY > offsetFromTop) {
      element.classList.add("show");
    } else {
      element.classList.remove("show");
    }
  }, 100);

  window.addEventListener("scroll", handleScroll);

  // Return cleanup function
  return () => {
    window.removeEventListener("scroll", handleScroll);
  };
}

// Initialize on page load
let cleanup = null;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    cleanup = initializeScrollTopButton();
  });
} else {
  cleanup = initializeScrollTopButton();
}

// Re-initialize on Turbo navigation
document.addEventListener("turbo:load", () => {
  if (cleanup) cleanup();
  cleanup = initializeScrollTopButton();
});

document.addEventListener("turbo:before-cache", () => {
  if (cleanup) cleanup();
  cleanup = null;
});

export default initializeScrollTopButton;
