import PacmanPreviewController from "../pacman-preview_controller";

describe("PacmanPreviewController", () => {
  let controller;
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "pacman-preview");
    document.body.appendChild(element);

    controller = new PacmanPreviewController();
    controller.element = element;
  });

  afterEach(() => {
    if (element.parentNode) {
      document.body.removeChild(element);
    }
  });

  test("controller initializes", () => {
    expect(controller).toBeDefined();
  });
});

