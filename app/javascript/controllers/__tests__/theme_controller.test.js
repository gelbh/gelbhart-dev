import ThemeController from "../ui/theme_controller";

// Mock localforage
const mockStorage = new Map();
jest.mock("localforage", () => {
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => Promise.resolve(mockStorage.get(key) || null)),
      setItem: jest.fn((key, value) => {
        mockStorage.set(key, value);
        return Promise.resolve(value);
      }),
      removeItem: jest.fn((key) => {
        mockStorage.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        mockStorage.clear();
        return Promise.resolve();
      }),
    },
  };
});

describe("ThemeController", () => {
  let controller;
  let element;
  let checkbox;
  let lightLabel;
  let darkLabel;
  let localforage;

  beforeEach(async () => {
    // Clear mock storage
    mockStorage.clear();

    // Get the mocked localforage
    const localforageModule = await import("localforage");
    localforage = localforageModule.default;
    localforage.getItem.mockClear();
    localforage.setItem.mockClear();

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

    controller = global.setupController("theme", ThemeController, element);

    // Wait for async initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    global.cleanupController(element, controller);
    mockStorage.clear();
  });

  test("connect initializes theme from localforage", async () => {
    mockStorage.set("theme", "dark");
    localforage.getItem.mockResolvedValueOnce("dark");

    // Re-initialize controller with new localforage value
    global.cleanupController(element, controller);
    controller = global.setupController("theme", ThemeController, element);

    // Wait for async initialization
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");
  });

  test("connect defaults to dark theme if no stored preference", () => {
    // Controller already connected in beforeEach, check the result
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");
  });

  test("toggleTheme switches between light and dark", async () => {
    document.documentElement.setAttribute("data-bs-theme", "light");
    await controller.toggleTheme();
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");

    await controller.toggleTheme();
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe(
      "light"
    );
  });

  test("handleThemeChange updates localforage", async () => {
    await controller.handleThemeChange("dark");
    expect(mockStorage.get("theme")).toBe("dark");
    expect(localforage.setItem).toHaveBeenCalledWith("theme", "dark");

    await controller.handleThemeChange("light");
    expect(mockStorage.get("theme")).toBe("light");
    expect(localforage.setItem).toHaveBeenCalledWith("theme", "light");
  });

  test("handleThemeChange updates checkbox state", async () => {
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

    await controller.handleThemeChange("dark");
    expect(checkbox.checked).toBe(true);

    await controller.handleThemeChange("light");
    expect(checkbox.checked).toBe(false);
  });
});
