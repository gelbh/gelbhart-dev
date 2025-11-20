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
});

// Initialize mobile menu collapse on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initializeMobileMenuCollapse();
});

// Mobile menu collapse toggle handler
function initializeMobileMenuCollapse() {
  const projectsToggle = document.querySelector(
    '[data-bs-target="#mobileProjectsDropdown"]'
  );
  const projectsDropdown = document.getElementById("mobileProjectsDropdown");

  if (!projectsToggle || !projectsDropdown) return;

  // Get or create Bootstrap collapse instance
  let collapseInstance = bootstrap.Collapse.getInstance(projectsDropdown);
  if (!collapseInstance) {
    collapseInstance = new bootstrap.Collapse(projectsDropdown, {
      toggle: false,
    });
  }

  // Handle toggle using Pointer Events API - works for mouse, touch, and pen
  // Since the HTML has onclick="event.preventDefault()", we need to manually toggle
  // Use pointerdown for better touch responsiveness
  const handleToggle = (e) => {
    // Prevent default to avoid double-firing with click
    e.preventDefault();
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

  // Use Pointer Events API for unified input handling
  projectsToggle.addEventListener("pointerdown", handleToggle, {
    passive: false,
  });

  // Fallback for older browsers that don't support pointer events
  if (!window.PointerEvent) {
    projectsToggle.addEventListener("click", handleToggle);
  }

  // Update aria-expanded when collapse state changes via Bootstrap events
  // This ensures state is correct even if collapse is triggered elsewhere
  projectsDropdown.addEventListener("shown.bs.collapse", () => {
    projectsToggle.setAttribute("aria-expanded", "true");
  });

  projectsDropdown.addEventListener("hidden.bs.collapse", () => {
    projectsToggle.setAttribute("aria-expanded", "false");
  });

  // Update aria-expanded on initialization based on current state
  if (projectsDropdown.classList.contains("show")) {
    projectsToggle.setAttribute("aria-expanded", "true");
  } else {
    projectsToggle.setAttribute("aria-expanded", "false");
  }
}
