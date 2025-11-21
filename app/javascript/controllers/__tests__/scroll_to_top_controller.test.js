import ScrollToTopController from "../animation/scroll_to_top_controller";

describe("ScrollToTopController", () => {
  let controller;
  let element;
  let button;

  beforeEach(() => {
    // Set up window mocks before connecting
    global.window.scrollY = 0;
    global.window.scrollTo = jest.fn();

    element = document.createElement("div");
    element.setAttribute("data-controller", "scroll-to-top");
    button = document.createElement("button");
    button.setAttribute("data-scroll-to-top-target", "button");
    element.appendChild(button);

    // Setup controller with skipConnect first, then manually set targets, then connect
    controller = global.setupController(
      "scroll-to-top",
      ScrollToTopController,
      element,
      true
    );

    // Manually set buttonTarget before connecting
    Object.defineProperty(controller, "buttonTarget", {
      get: () => button,
      configurable: true,
    });
    Object.defineProperty(controller, "hasButtonTarget", {
      get: () => true,
      configurable: true,
    });

    // Now connect the controller
    controller.connect();
  });

  afterEach(() => {
    global.cleanupController(element, controller);
  });

  test("connect adds scroll event listener", () => {
    // Controller already connected in beforeEach, so addEventListener should have been called
    // Mock it before setup to verify
    const addEventListenerSpy = jest.fn();
    global.window.addEventListener = addEventListenerSpy;

    // Re-connect to test
    controller.disconnect();
    controller.connect();
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function)
    );
  });

  test("checkScroll shows button when scrolled down", () => {
    global.window.scrollY = 400;
    controller.checkScroll();
    expect(button.classList.contains("visible")).toBe(true);
  });

  test("checkScroll hides button when at top", () => {
    global.window.scrollY = 100;
    controller.checkScroll();
    expect(button.classList.contains("visible")).toBe(false);
  });

  test("scrollToTop scrolls to top smoothly", () => {
    const event = { preventDefault: jest.fn() };
    controller.scrollToTop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(global.window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });
});
