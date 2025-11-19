import PacmanGameController from "../pacman_controller";

describe("PacmanGameController", () => {
  let controller;
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "pacman-game");
    // Skip connect since pacman controller requires many targets
    controller = global.setupController(
      "pacman-game",
      PacmanGameController,
      element,
      true
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
