import "@hotwired/turbo-rails";
import "controllers";
import * as bootstrap from "bootstrap";

window.bootstrap = bootstrap;

// Mobile menu modal cleanup
document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuModal = document.getElementById("mobileMenu");

  // Clear URL hash on page load to prevent modal auto-showing
  if (window.location.hash === "#mobileMenu") {
    window.history.replaceState(
      null,
      null,
      window.location.pathname + window.location.search
    );
  }

  // Ensure modal is hidden on page load
  if (mobileMenuModal) {
    const modalInstance = bootstrap.Modal.getInstance(mobileMenuModal);
    if (modalInstance && modalInstance._isShown) {
      modalInstance.hide();
    }
  }
});

// Dismiss modal before Turbo navigation
document.addEventListener("turbo:before-visit", () => {
  const mobileMenuModal = document.getElementById("mobileMenu");
  if (mobileMenuModal) {
    const modalInstance = bootstrap.Modal.getInstance(mobileMenuModal);
    if (modalInstance && modalInstance._isShown) {
      modalInstance.hide();
    }
  }
});

// Store event listener references for cleanup
let mobileMenuHandlers = {
  click: null,
  shown: null,
  hidden: null,
  sublinkHandlers: [],
};

// Clear URL hash after Turbo page load
document.addEventListener("turbo:load", () => {
  if (window.location.hash === "#mobileMenu") {
    window.history.replaceState(
      null,
      null,
      window.location.pathname + window.location.search
    );
  }

  // Ensure modal is hidden after navigation
  const mobileMenuModal = document.getElementById("mobileMenu");
  if (mobileMenuModal) {
    const modalInstance = bootstrap.Modal.getInstance(mobileMenuModal);
    if (modalInstance && modalInstance._isShown) {
      modalInstance.hide();
    }
  }

  // Initialize mobile menu collapse toggle
  initializeMobileMenuCollapse();
  // Initialize mobile menu child link handlers
  initializeMobileMenuLinks();
});

// Cleanup event listeners before Turbo caches the page
document.addEventListener("turbo:before-cache", () => {
  cleanupMobileMenuHandlers();
});

// Initialize mobile menu collapse on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initializeMobileMenuCollapse();
  initializeMobileMenuLinks();
});

// Cleanup function to remove event listeners
function cleanupMobileMenuHandlers() {
  const projectsToggle = document.querySelector(
    '[data-bs-target="#mobileProjectsDropdown"]'
  );
  const projectsDropdown = document.getElementById("mobileProjectsDropdown");

  if (projectsToggle && mobileMenuHandlers.click) {
    projectsToggle.removeEventListener("click", mobileMenuHandlers.click);
    mobileMenuHandlers.click = null;
  }

  if (projectsDropdown && mobileMenuHandlers.shown) {
    projectsDropdown.removeEventListener(
      "shown.bs.collapse",
      mobileMenuHandlers.shown
    );
    mobileMenuHandlers.shown = null;
  }

  if (projectsDropdown && mobileMenuHandlers.hidden) {
    projectsDropdown.removeEventListener(
      "hidden.bs.collapse",
      mobileMenuHandlers.hidden
    );
    mobileMenuHandlers.hidden = null;
  }

  // Clean up child link handlers
  mobileMenuHandlers.sublinkHandlers.forEach(({ element, handler }) => {
    if (element && handler) {
      // Remove with capture phase to match how we added it
      try {
        element.removeEventListener("click", handler, true);
      } catch (e) {
        // Fallback if capture phase removal fails
        element.removeEventListener("click", handler);
      }
    }
  });
  mobileMenuHandlers.sublinkHandlers = [];
}

// Mobile menu collapse toggle handler
function initializeMobileMenuCollapse() {
  const projectsToggle = document.querySelector(
    '[data-bs-target="#mobileProjectsDropdown"]'
  );
  const projectsDropdown = document.getElementById("mobileProjectsDropdown");

  if (!projectsToggle || !projectsDropdown) return;

  // Clean up existing listeners before adding new ones
  cleanupMobileMenuHandlers();

  // Get or create Bootstrap collapse instance
  let collapseInstance = bootstrap.Collapse.getInstance(projectsDropdown);
  if (!collapseInstance) {
    collapseInstance = new bootstrap.Collapse(projectsDropdown, {
      toggle: false,
    });
  }

  // Handle toggle - use click event for better compatibility with child links
  // Prevent default to stop the link from navigating (it has href="#")
  const handleToggle = (e) => {
    // Only handle events on the toggle button itself or its direct children (icons, span)
    // Child links (.mobile-nav-sublink) are in a separate container and won't trigger this handler
    const target = e.target;
    if (target !== projectsToggle && !projectsToggle.contains(target)) {
      return;
    }

    // Check if the click is on a child link (shouldn't happen, but safety check)
    if (target.closest && target.closest(".mobile-nav-sublink")) {
      return;
    }

    // Prevent default to stop the link from navigating (it has href="#")
    // Stop propagation to ensure child link clicks in dropdown aren't affected
    e.preventDefault();
    e.stopPropagation();

    const isExpanded = projectsDropdown.classList.contains("show");

    // Toggle the collapse
    if (isExpanded) {
      collapseInstance.hide();
    } else {
      collapseInstance.show();
    }

    // Update aria-expanded immediately
    projectsToggle.setAttribute(
      "aria-expanded",
      !isExpanded ? "true" : "false"
    );
  };

  // Store handler reference for cleanup
  mobileMenuHandlers.click = handleToggle;

  // Use click event for better compatibility and to avoid interfering with child link clicks
  projectsToggle.addEventListener("click", handleToggle);

  // Update aria-expanded when collapse state changes via Bootstrap events
  // This ensures state is correct even if collapse is triggered elsewhere
  const handleShown = () => {
    projectsToggle.setAttribute("aria-expanded", "true");
  };

  const handleHidden = () => {
    projectsToggle.setAttribute("aria-expanded", "false");
  };

  mobileMenuHandlers.shown = handleShown;
  mobileMenuHandlers.hidden = handleHidden;

  projectsDropdown.addEventListener("shown.bs.collapse", handleShown);
  projectsDropdown.addEventListener("hidden.bs.collapse", handleHidden);

  // Update aria-expanded on initialization based on current state
  if (projectsDropdown.classList.contains("show")) {
    projectsToggle.setAttribute("aria-expanded", "true");
  } else {
    projectsToggle.setAttribute("aria-expanded", "false");
  }
}

// Initialize mobile menu child link handlers to ensure navigation works
function initializeMobileMenuLinks() {
  const mobileMenuModal = document.getElementById("mobileMenu");
  if (!mobileMenuModal) return;

  // Clean up existing handlers first
  mobileMenuHandlers.sublinkHandlers.forEach(({ element, handler }) => {
    if (element && handler) {
      element.removeEventListener("click", handler);
    }
  });
  mobileMenuHandlers.sublinkHandlers = [];

  // Find all child links in the mobile menu
  const sublinks = mobileMenuModal.querySelectorAll(".mobile-nav-sublink");

  sublinks.forEach((link) => {
    const handleLinkClick = (e) => {
      // Ensure the link has an href
      const href = link.getAttribute("href");
      if (!href || href === "#") {
        e.preventDefault();
        return;
      }

      // Store the href for potential programmatic navigation
      const targetUrl = link.href || href;

      // Dismiss the modal immediately - don't wait
      const modalInstance = bootstrap.Modal.getInstance(mobileMenuModal);
      if (modalInstance) {
        modalInstance.hide();
      }

      // Don't prevent default - let the link navigate
      // But if navigation doesn't happen (e.g., modal blocks it), trigger it manually
      const currentUrl = window.location.href;

      // Use requestAnimationFrame to ensure modal dismissal happens first
      requestAnimationFrame(() => {
        // Check after a brief moment if navigation occurred
        setTimeout(() => {
          // If we're still on the same page, trigger navigation manually
          if (window.location.href === currentUrl) {
            if (window.Turbo && window.Turbo.visit) {
              window.Turbo.visit(targetUrl);
            } else {
              window.location.href = targetUrl;
            }
          }
        }, 50);
      });
    };

    // Use capture phase to ensure this runs before other handlers
    link.addEventListener("click", handleLinkClick, true);
    mobileMenuHandlers.sublinkHandlers.push({
      element: link,
      handler: handleLinkClick,
    });
  });

  // Also handle the Contact link
  const contactLink = mobileMenuModal.querySelector(
    '.mobile-nav-link[href*="contact"]'
  );
  if (contactLink && !contactLink.hasAttribute("data-bs-toggle")) {
    const handleContactClick = (e) => {
      const href = contactLink.getAttribute("href");
      if (!href || href === "#") {
        e.preventDefault();
        return;
      }

      // Store the href for potential programmatic navigation
      const targetUrl = contactLink.href || href;

      // Dismiss the modal immediately - don't wait
      const modalInstance = bootstrap.Modal.getInstance(mobileMenuModal);
      if (modalInstance) {
        modalInstance.hide();
      }

      // Don't prevent default - let the link navigate
      // But if navigation doesn't happen (e.g., modal blocks it), trigger it manually
      const currentUrl = window.location.href;

      // Use requestAnimationFrame to ensure modal dismissal happens first
      requestAnimationFrame(() => {
        // Check after a brief moment if navigation occurred
        setTimeout(() => {
          // If we're still on the same page, trigger navigation manually
          if (window.location.href === currentUrl) {
            if (window.Turbo && window.Turbo.visit) {
              window.Turbo.visit(targetUrl);
            } else {
              window.location.href = targetUrl;
            }
          }
        }, 50);
      });
    };

    contactLink.addEventListener("click", handleContactClick, true);
    mobileMenuHandlers.sublinkHandlers.push({
      element: contactLink,
      handler: handleContactClick,
    });
  }
}
