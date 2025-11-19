import PacmanPreviewController from "../pacman-preview_controller";

describe("PacmanPreviewController", () => {
  let controller;
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "pacman-preview");
    controller = global.setupController(
      "pacman-preview",
      PacmanPreviewController,
      element
    );
  });

  afterEach(() => {
    global.cleanupController(element, controller);
  });

  test("controller initializes", () => {
    expect(controller).toBeDefined();
    expect(controller.element).toBe(element);
  });
});
