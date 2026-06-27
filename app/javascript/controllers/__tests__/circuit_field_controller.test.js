import CircuitFieldController from "controllers/ui/circuit_field_controller";

describe("CircuitFieldController", () => {
  let controller;
  let element;

  function mount({ reducedMotion = false } = {}) {
    window.matchMedia = jest.fn((query) => ({
      matches:
        query === "(prefers-reduced-motion: reduce)" ? reducedMotion : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    element = document.createElement("div");
    element.setAttribute("data-controller", "circuit-field");
    element.setAttribute("data-circuit-field-fixed-value", "false");
    element.setAttribute("data-circuit-field-intensity-value", "1");
    element.innerHTML =
      '<canvas data-circuit-field-target="canvas" width="100" height="100"></canvas>';

    controller = global.setupController(
      "circuit-field",
      CircuitFieldController,
      element
    );
  }

  afterEach(() => {
    global.cleanupController(element, controller);
    controller = null;
    element = null;
  });

  test("disables rendering when prefers-reduced-motion is set", () => {
    mount({ reducedMotion: true });
    expect(element.classList.contains("circuit-field--disabled")).toBe(true);
  });

  test("stays enabled when motion is allowed", () => {
    mount({ reducedMotion: false });
    expect(element.classList.contains("circuit-field--disabled")).toBe(false);
  });
});
