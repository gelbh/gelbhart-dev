import PacmanGameController from "../pacman_game_controller";

describe("PacmanGameController", () => {
  let controller;
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "pacman-game");
    document.body.appendChild(element);

    controller = new PacmanGameController();
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

