import CodeTyperController from "../code_typer_controller";

describe("CodeTyperController", () => {
  let controller;
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "code-typer");
    // Create output target element - must be inside element
    const output = document.createElement("pre");
    output.setAttribute("data-code-typer-target", "output");
    element.appendChild(output);

    // Skip connect since code-typer needs proper target setup
    controller = global.setupController(
      "code-typer",
      CodeTyperController,
      element,
      true
    );

    // Manually set outputTarget for testing
    Object.defineProperty(controller, "outputTarget", {
      get: () => output,
      configurable: true,
    });
    Object.defineProperty(controller, "hasOutputTarget", {
      get: () => true,
      configurable: true,
    });
  });

  afterEach(() => {
    global.cleanupController(element, controller);
  });

  test("controller initializes", () => {
    expect(controller).toBeDefined();
    expect(controller.element).toBe(element);
  });
});
