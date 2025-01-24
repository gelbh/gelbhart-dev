import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["checkbox", "lightLabel", "darkLabel"];

  connect() {
    this.initializeTheme();
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.mediaQuery.addEventListener("change", (e) => {
      this.handleThemeChange(e.matches ? "dark" : "light");
    });
  }

  initializeTheme() {
    const storedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const theme = storedTheme || (systemDark ? "dark" : "light");
    this.handleThemeChange(theme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-bs-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.handleThemeChange(newTheme);
  }

  handleThemeChange(theme) {
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
