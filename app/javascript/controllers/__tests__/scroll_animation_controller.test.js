import ScrollAnimationController from "../scroll_animation_controller";

describe("ScrollAnimationController", () => {
  let controller;
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "scroll-animation");
    controller = global.setupController(
      "scroll-animation",
      ScrollAnimationController,
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
