/**
 * Sticky Navbar
 * Enable sticky behavior of navigation bar on page scroll
 */

import throttle from "lodash.throttle";

function initializeStickyNavbar() {
  const navbar = document.querySelector(".navbar-sticky");

  if (navbar == null) return;

  const navbarClass = navbar.classList;
  const navbarH = navbar.offsetHeight;
  const scrollOffset = 500;

  const handleScroll = throttle(() => {
    if (window.pageYOffset > scrollOffset) {
      if (navbarClass.contains("position-absolute")) {
        navbar.classList.add("navbar-stuck");
      } else {
        document.body.style.paddingTop = navbarH + "px";
        navbar.classList.add("navbar-stuck");
      }
    } else {
      if (navbarClass.contains("position-absolute")) {
        navbar.classList.remove("navbar-stuck");
      } else {
        document.body.style.paddingTop = "";
        navbar.classList.remove("navbar-stuck");
      }
    }
  }, 100);

  window.addEventListener("scroll", handleScroll);

  // Return cleanup function
  return () => {
    window.removeEventListener("scroll", handleScroll);
    // Reset body padding if it was set
    if (document.body.style.paddingTop) {
      document.body.style.paddingTop = "";
    }
    // Remove navbar-stuck class if present
    navbar.classList.remove("navbar-stuck");
  };
}

// Initialize on page load
let cleanup = null;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    cleanup = initializeStickyNavbar();
  });
} else {
  cleanup = initializeStickyNavbar();
}

// Re-initialize on Turbo navigation
document.addEventListener("turbo:load", () => {
  if (cleanup) cleanup();
  cleanup = initializeStickyNavbar();
});

// Cleanup before Turbo caches the page
document.addEventListener("turbo:before-cache", () => {
  if (cleanup) cleanup();
  cleanup = null;
});

export default initializeStickyNavbar;
