import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  connect() {
    this.initializeTheme();
  }

  initializeTheme() {
    const html = document.documentElement;
    const checkbox = this.element.querySelector('input[type="checkbox"]');
    if (!checkbox) return;

    // Initialize theme from storage or system preference
    this.setTheme(this.getPreferredTheme());

    // Handle checkbox changes
    checkbox.addEventListener("change", (e) => {
      const theme = e.target.checked ? "dark" : "light";
      localStorage.setItem("theme", theme);
      this.setTheme(theme);
    });

    // Watch system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
          this.setTheme(e.matches ? "dark" : "light");
        }
      });
  }

  getPreferredTheme() {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) return storedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  setTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    this.element.querySelector('input[type="checkbox"]').checked =
      theme === "dark";
  }
}
