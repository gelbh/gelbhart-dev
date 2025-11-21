import ThemeController from "../ui/theme_controller";

describe("ThemeController", () => {
  let controller;
  let element;
  let checkbox;
  let lightLabel;
  let darkLabel;

  beforeEach(() => {
    // Mock matchMedia before controller connects
    global.window.matchMedia = jest.fn(() => ({
      matches: false,
      media: "(prefers-color-scheme: dark)",
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    element = document.createElement("div");
    element.setAttribute("data-controller", "theme");
    checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("data-theme-target", "checkbox");
    lightLabel = document.createElement("span");
    lightLabel.setAttribute("data-theme-target", "lightLabel");
    darkLabel = document.createElement("span");
    darkLabel.setAttribute("data-theme-target", "darkLabel");
    element.appendChild(checkbox);
    element.appendChild(lightLabel);
    element.appendChild(darkLabel);
    document.documentElement.setAttribute("data-bs-theme", "light");

    global.localStorage.clear();
    controller = global.setupController("theme", ThemeController, element);
  });

  afterEach(() => {
    global.cleanupController(element, controller);
    global.localStorage.clear();
  });

  test("connect initializes theme from localStorage", () => {
    global.localStorage.setItem("theme", "dark");
    // Re-initialize controller with new localStorage value
    global.cleanupController(element, controller);
    controller = global.setupController("theme", ThemeController, element);
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");
  });

  test("connect defaults to dark theme if no stored preference", () => {
    // Controller already connected in beforeEach, check the result
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");
  });

  test("toggleTheme switches between light and dark", () => {
    document.documentElement.setAttribute("data-bs-theme", "light");
    controller.toggleTheme();
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");

    controller.toggleTheme();
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe(
      "light"
    );
  });

  test("handleThemeChange updates localStorage", () => {
    controller.handleThemeChange("dark");
    expect(global.localStorage.getItem("theme")).toBe("dark");

    controller.handleThemeChange("light");
    expect(global.localStorage.getItem("theme")).toBe("light");
  });

  test("handleThemeChange updates checkbox state", () => {
    // Ensure checkboxTarget is accessible
    if (!controller.checkboxTarget) {
      Object.defineProperty(controller, "checkboxTarget", {
        get: () => checkbox,
        configurable: true,
      });
      Object.defineProperty(controller, "hasCheckboxTarget", {
        get: () => true,
        configurable: true,
      });
    }

    // Reset checkbox state
    checkbox.checked = false;

    controller.handleThemeChange("dark");
    expect(checkbox.checked).toBe(true);

    controller.handleThemeChange("light");
    expect(checkbox.checked).toBe(false);
  });
});
