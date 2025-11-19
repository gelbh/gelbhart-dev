import ScrollAnimationController from "../scroll_animation_controller";

describe("ScrollAnimationController", () => {
  let controller;
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    element.setAttribute("data-controller", "scroll-animation");
    document.body.appendChild(element);

    controller = new ScrollAnimationController();
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

