import { Controller } from "@hotwired/stimulus";

/**
 * Lazy Iframe Controller
 *
 * Loads iframe only when it's about to enter the viewport using Intersection Observer.
 * This prevents heavy iframes (like React/Three.js apps) from blocking initial page load.
 */
export default class extends Controller {
  static targets = ["iframe", "loading", "placeholder"];

  connect() {
    // Don't load on mobile - iframe container is hidden anyway
    if (window.innerWidth < 768) {
      return;
    }

    // Check if iframe is already loaded
    if (this.iframeTarget.src) {
      this.hideLoading();
      return;
    }

    // Set up Intersection Observer
    // Load when iframe is 200px away from viewport
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    );

    this.observer.observe(this.element);
  }

  handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        this.loadIframe();
        // Unobserve after loading starts
        this.observer.unobserve(this.element);
      }
    });
  }

  loadIframe() {
    const dataSrc = this.iframeTarget.getAttribute("data-src");
    if (!dataSrc) {
      return;
    }

    // Show loading state
    if (this.hasLoadingTarget) {
      this.loadingTarget.classList.remove("d-none");
      this.loadingTarget.style.zIndex = "10";
    }

    // Hide placeholder if exists
    if (this.hasPlaceholderTarget) {
      this.placeholderTarget.classList.add("d-none");
    }

    // Set src to trigger iframe load
    this.iframeTarget.src = dataSrc;

    // Hide loading when iframe loads
    this.iframeTarget.addEventListener("load", () => {
      this.hideLoading();
    });

    // Also hide loading on error (fallback)
    this.iframeTarget.addEventListener("error", () => {
      this.hideLoading();
    });
  }

  hideLoading() {
    if (this.hasLoadingTarget) {
      this.loadingTarget.classList.add("d-none");
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
