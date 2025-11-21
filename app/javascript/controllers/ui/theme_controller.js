import { Controller } from "@hotwired/stimulus";
import localforage from "localforage";

export default class extends Controller {
  static targets = ["checkbox", "lightLabel", "darkLabel"];

  connect() {
    this.initializeTheme();
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.mediaQuery.addEventListener("change", (e) => {
      this.handleThemeChange(e.matches ? "dark" : "light");
    });
  }

  async initializeTheme() {
    try {
      const storedTheme = await localforage.getItem("theme");
      // Default to dark mode if no stored preference
      const theme = storedTheme || "dark";
      this.handleThemeChange(theme);
    } catch (error) {
      console.warn("Could not load theme preference:", error);
      // Default to dark mode on error
      this.handleThemeChange("dark");
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-bs-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.handleThemeChange(newTheme);
  }

  async handleThemeChange(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    try {
      await localforage.setItem("theme", theme);
    } catch (error) {
      console.warn("Could not save theme preference:", error);
    }

    if (this.hasCheckboxTarget) {
      this.checkboxTarget.checked = theme === "dark";
    }

    if (this.hasLightLabelTarget && this.hasDarkLabelTarget) {
      this.lightLabelTarget.classList.toggle("d-none", theme === "dark");
      this.darkLabelTarget.classList.toggle("d-none", theme === "light");
    }
  }
}
