// Suppress hotwire-livereload console logs
const originalConsoleLog = console.log;
console.log = function (...args) {
  const message = args[0];
  if (
    typeof message === "string" &&
    message.includes("[Hotwire::Livereload]")
  ) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

import "@hotwired/turbo-rails";
import "controllers";
import * as bootstrap from "bootstrap";

window.bootstrap = bootstrap;

import "theme/theme";

// Constants
const NAVIGATION_FALLBACK_DELAY = 50;
const MOBILE_MENU_HASH = "#mobileMenu";

// AbortController for event listener cleanup
let abortController = new AbortController();

// Helper Functions
function clearMobileMenuHash() {
  if (window.location.hash === MOBILE_MENU_HASH) {
    window.history.replaceState(
      null,
      null,
      window.location.pathname + window.location.search
    );
  }
}

function hideMobileMenuModal() {
  const mobileMenuModal = document.getElementById("mobileMenu");
  if (!mobileMenuModal) return;

  const modalInstance = bootstrap.Modal.getInstance(mobileMenuModal);
  if (modalInstance?._isShown) {
    modalInstance.hide();
  }
}

function handleMobileMenuLinkClick(link, mobileMenuModal) {
  const href = link.getAttribute("href");
  if (!href || href === "#") return false;

  const targetUrl = link.href ?? href;
  const modalInstance = bootstrap.Modal.getInstance(mobileMenuModal);

  if (modalInstance) {
    modalInstance.hide();
  }

  const currentUrl = window.location.href;

  requestAnimationFrame(() => {
    setTimeout(() => {
      if (window.location.href === currentUrl) {
        if (window.Turbo?.visit) {
          window.Turbo.visit(targetUrl);
        } else {
          window.location.href = targetUrl;
        }
      }
    }, NAVIGATION_FALLBACK_DELAY);
  });

  return true;
}

function initializeMobileMenuCollapse() {
  const projectsToggle = document.querySelector(
    '[data-bs-target="#mobileProjectsDropdown"]'
  );
  const projectsDropdown = document.getElementById("mobileProjectsDropdown");

  if (!projectsToggle || !projectsDropdown) return;

  // Abort previous controller and create new one
  abortController.abort();
  abortController = new AbortController();
  const signal = abortController.signal;

  let collapseInstance = bootstrap.Collapse.getInstance(projectsDropdown);
  if (!collapseInstance) {
    collapseInstance = new bootstrap.Collapse(projectsDropdown, {
      toggle: false,
    });
  }

  const handleToggle = (e) => {
    const target = e.target;
    if (target !== projectsToggle && !projectsToggle.contains(target)) {
      return;
    }

    if (target.closest?.(".mobile-nav-sublink")) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const isExpanded = projectsDropdown.classList.contains("show");

    if (isExpanded) {
      collapseInstance.hide();
    } else {
      collapseInstance.show();
    }

    projectsToggle.setAttribute(
      "aria-expanded",
      !isExpanded ? "true" : "false"
    );
  };

  projectsToggle.addEventListener("click", handleToggle, { signal });

  const handleShown = () => {
    projectsToggle.setAttribute("aria-expanded", "true");
  };

  const handleHidden = () => {
    projectsToggle.setAttribute("aria-expanded", "false");
  };

  projectsDropdown.addEventListener("shown.bs.collapse", handleShown, {
    signal,
  });
  projectsDropdown.addEventListener("hidden.bs.collapse", handleHidden, {
    signal,
  });

  const isExpanded = projectsDropdown.classList.contains("show");
  projectsToggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
}

function initializeMobileMenuLinks() {
  const mobileMenuModal = document.getElementById("mobileMenu");
  if (!mobileMenuModal) return;

  // Abort previous controller and create new one
  abortController.abort();
  abortController = new AbortController();
  const signal = abortController.signal;

  // Use event delegation for all links
  const handleLinkClick = (e) => {
    const link = e.target.closest(".mobile-nav-sublink, .mobile-nav-link");
    if (!link) return;

    // Skip toggle button
    if (link.hasAttribute("data-bs-toggle")) return;

    if (!handleMobileMenuLinkClick(link, mobileMenuModal)) {
      e.preventDefault();
    }
  };

  mobileMenuModal.addEventListener("click", handleLinkClick, {
    signal,
    capture: true,
  });
}

function initializeMobileMenu() {
  clearMobileMenuHash();
  hideMobileMenuModal();
  initializeMobileMenuCollapse();
  initializeMobileMenuLinks();
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  clearMobileMenuHash();
  hideMobileMenuModal();
});

document.addEventListener("turbo:load", () => {
  initializeMobileMenu();
});

document.addEventListener("turbo:before-cache", () => {
  abortController.abort();
  abortController = new AbortController();
});
