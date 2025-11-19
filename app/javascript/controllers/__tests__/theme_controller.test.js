import ThemeController from "../theme_controller";

describe("ThemeController", () => {
  let controller;
  let element;
  let checkbox;
  let lightLabel;
  let darkLabel;

  beforeEach(() => {
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
    document.body.appendChild(element);
    document.documentElement.setAttribute("data-bs-theme", "light");

    controller = new ThemeController();
    controller.element = element;
    controller.checkboxTarget = checkbox;
    controller.lightLabelTarget = lightLabel;
    controller.darkLabelTarget = darkLabel;

    global.localStorage.clear();
    global.window.matchMedia = jest.fn(() => ({
      matches: false,
      addEventListener: jest.fn()
    }));
  });

  afterEach(() => {
    if (element.parentNode) {
      document.body.removeChild(element);
    }
    global.localStorage.clear();
  });

  test("connect initializes theme from localStorage", () => {
    global.localStorage.setItem("theme", "dark");
    controller.connect();
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");
  });

  test("connect defaults to dark theme if no stored preference", () => {
    controller.connect();
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");
  });

  test("toggleTheme switches between light and dark", () => {
    document.documentElement.setAttribute("data-bs-theme", "light");
    controller.toggleTheme();
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");

    controller.toggleTheme();
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("light");
  });

  test("handleThemeChange updates localStorage", () => {
    controller.handleThemeChange("dark");
    expect(global.localStorage.getItem("theme")).toBe("dark");

    controller.handleThemeChange("light");
    expect(global.localStorage.getItem("theme")).toBe("light");
  });

  test("handleThemeChange updates checkbox state", () => {
    controller.handleThemeChange("dark");
    expect(checkbox.checked).toBe(true);

    controller.handleThemeChange("light");
    expect(checkbox.checked).toBe(false);
  });
});

