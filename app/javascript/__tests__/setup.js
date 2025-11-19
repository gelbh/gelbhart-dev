// Jest setup file for Stimulus controller tests
import { Application, Controller } from "@hotwired/stimulus";

// Create a global Stimulus application for testing
global.Stimulus = Application.start(document.documentElement);

// Disable Stimulus error logging in tests to avoid verbose output
global.Stimulus.debug = false;
// Override handleError to suppress error logging during tests
const originalHandleError = global.Stimulus.handleError.bind(global.Stimulus);
global.Stimulus.handleError = (error, message, detail) => {
  // Only log errors in debug mode, suppress during tests
  if (global.Stimulus.debug) {
    originalHandleError(error, message, detail);
  }
  // Otherwise silently ignore errors (common during test cleanup)
};

// Make Stimulus classes available globally for tests
global.Application = Application;
global.Controller = Controller;

// Helper function to setup a controller for testing
// Set skipConnect=true to skip calling connect() (useful if controller requires targets)
global.setupController = (
  controllerName,
  ControllerClass,
  element,
  skipConnect = false
) => {
  // Register controller with Stimulus
  global.Stimulus.register(controllerName, ControllerClass);

  // Append element to document if needed
  if (!element.parentNode) {
    document.body.appendChild(element);
  }

  if (skipConnect) {
    // Manually create controller instance without connecting
    // This is useful when controller requires targets that aren't set up
    const controller = new ControllerClass();
    Object.defineProperty(controller, "element", {
      value: element,
      writable: false,
      configurable: true,
    });
    Object.defineProperty(controller, "application", {
      value: global.Stimulus,
      writable: false,
      configurable: true,
    });
    return controller;
  } else {
    // Manually create and connect controller (more reliable than Application.load)
    const controller = new ControllerClass();

    // Use Object.defineProperty to set readonly properties
    Object.defineProperty(controller, "element", {
      value: element,
      writable: false,
      configurable: true,
    });
    Object.defineProperty(controller, "application", {
      value: global.Stimulus,
      writable: false,
      configurable: true,
    });

    // Initialize Stimulus values from data attributes before connecting
    // Stimulus uses data-controller-name-value-name format (e.g., data-counter-target-value)
    const camelName = controllerName.replace(/-([a-z])/g, (g) =>
      g[1].toUpperCase()
    );
    const valuePattern = new RegExp(`^${camelName}([A-Z]\\w+)Value$`, "i");

    Object.keys(element.dataset).forEach((attr) => {
      const match = attr.match(valuePattern);
      if (match) {
        // Extract value name (e.g., "counterTargetValue" -> "target")
        const valueName = match[1].charAt(0).toLowerCase() + match[1].slice(1);
        const value = element.dataset[attr];

        if (value !== undefined) {
          // Parse value based on type
          let parsedValue = value;
          if (value === "true") parsedValue = true;
          else if (value === "false") parsedValue = false;
          else if (!isNaN(value) && value !== "") parsedValue = Number(value);

          // Set the value property (e.g., targetValue, durationValue)
          const propertyName = `${valueName}Value`;
          try {
            controller[propertyName] = parsedValue;
          } catch (e) {
            // If property is read-only, define it
            Object.defineProperty(controller, propertyName, {
              value: parsedValue,
              writable: true,
              configurable: true,
            });
          }
        }
      }
    });

    // Connect the controller (targets will be initialized here)
    try {
      controller.connect();
    } catch (e) {
      // If connect fails (e.g., missing targets), just return controller without connecting
      // This allows basic tests to work
      if (e.message && e.message.includes("Missing target")) {
        // Return controller anyway for basic initialization tests
      } else {
        throw e;
      }
    }

    return controller;
  }
};

// Helper function to cleanup controller after testing
global.cleanupController = (element, controller = null) => {
  if (controller) {
    try {
      controller.disconnect();
    } catch (e) {
      // Ignore disconnect errors (targets might not be initialized)
    }
  }
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
};

// Mock IntersectionObserver if not available in jsdom
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock requestAnimationFrame if not available
global.requestAnimationFrame =
  global.requestAnimationFrame ||
  ((callback) => {
    return setTimeout(callback, 16);
  });

global.cancelAnimationFrame =
  global.cancelAnimationFrame ||
  ((id) => {
    clearTimeout(id);
  });

// Mock performance.now if needed
global.performance = global.performance || {
  now: () => Date.now(),
};

// Mock window.matchMedia for theme controller and other tests
global.window.matchMedia =
  global.window.matchMedia ||
  jest.fn((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

// Mock localStorage if not available
global.localStorage = global.localStorage || {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock fetch for API calls in tests
global.fetch =
  global.fetch ||
  jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    })
  );
