import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["checkbox", "lightLabel", "darkLabel"];

  connect() {
    // Initialize theme immediately on connect
    this.initializeTheme();

    // Set up system theme change listener
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.mediaQuery.addEventListener("change", (e) => {
      this.setTheme(e.matches ? "dark" : "light");
    });

    // Initialize Bootstrap components
    if (typeof bootstrap !== "undefined") {
      // Initialize navbar toggler
      const navbarToggler = document.querySelector(".navbar-toggler");
      if (navbarToggler) {
        new bootstrap.Collapse(document.querySelector("#navbarNav"), {
          toggle: false,
        });
      }
    }
  }

  disconnect() {
    // Clean up event listener
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener("change");
    }
  }

  initializeTheme() {
    const storedTheme = localStorage.getItem("theme");
    const systemDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const theme = storedTheme || (systemDarkMode ? "dark" : "light");
    this.setTheme(theme);
  }

  toggleTheme() {
    const currentTheme =
      document.documentElement.getAttribute("data-bs-theme") || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("theme", theme);

    if (this.hasCheckboxTarget) {
      this.checkboxTarget.checked = theme === "dark";
    }

    if (this.hasLightLabelTarget && this.hasDarkLabelTarget) {
      this.lightLabelTarget.classList.toggle("d-none", theme === "dark");
      this.darkLabelTarget.classList.toggle("d-none", theme === "light");
    }
  }
}
